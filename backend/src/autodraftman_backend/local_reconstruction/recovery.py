"""Recover only before an unsent stage, with verified prior responses and checkpoints."""

import hashlib
import json
import math

from .kernel_contract import is_original_job


def recovery_mode(snapshot, folder):
    if (
        snapshot["status"] == "failed"
        and is_original_job(folder)
        and snapshot.get("error")
        not in (
            "background_identity_mismatch",
            "background_expired",
            "background_rejected",
            "original_contract_mismatch",
        )
    ):
        retained = retained_mode(folder)
        if retained:
            return retained
    if (
        snapshot["status"] != "failed"
        or snapshot.get("preflightRetryCount", snapshot.get("retryCount", 0)) >= 2
        or snapshot.get("error")
        not in (
            "input_too_large",
            "input_count_unavailable",
            "preparation_failed",
            "connection_unavailable",
            "interrupted",
            "budget_exceeded",
        )
    ):
        return None
    # Never continue requests prepared with removed thumbnail/background policies.
    if not is_original_job(folder):
        return None
    # An identical upstream request cannot cure a deterministic input limit.
    if snapshot.get("error") == "input_too_large":
        return None
    receipts = list(folder.glob("**/receipt.json"))
    try:
        receipts = [path for path in receipts if not is_unsent(path)]
    except (OSError, ValueError, TypeError):
        return None
    if not receipts:
        return None if snapshot.get("error") == "budget_exceeded" else "restart"
    pending = {"inspect": "G1", "repair": "G2"}.get(snapshot.get("stage"))
    if pending is None or snapshot.get("error") not in (
        "input_too_large",
        "input_count_unavailable",
        "connection_unavailable",
        "interrupted",
        "budget_exceeded",
    ):
        return None
    run = folder / "run"
    expected = [run / "G0/call/receipt.json"]
    if pending == "G2":
        expected.append(run / "G1/call/receipt.json")
    if set(receipts) != set(expected) or (run / pending / "model.json").exists():
        return None
    try:
        for path in expected:
            receipt = json.loads(path.read_text(encoding="utf-8"))
            known = receipt.get("known_usd")
            if (
                receipt.get("status") != "completed"
                or type(known) not in (int, float)
                or not math.isfinite(known)
                or known < 0
                or receipt.get("reserved_usd") != 0
            ):
                return None
            response = (path.parent / "response.json").read_bytes()
            if hashlib.sha256(response).hexdigest() != receipt.get("response_sha256"):
                return None
            if path.parent.parent.name == "G1":
                raw = json.loads(response)["text"]
                parsed = json.loads(raw.removeprefix("```json").removesuffix("```").strip())
                if parsed != json.loads((run / "G1/model.json").read_text(encoding="utf-8")):
                    return None
        source_hash = hashlib.sha256((folder / "source.png").read_bytes()).hexdigest()
        identity = json.loads((run / "identity.json").read_text(encoding="utf-8"))
        config = json.loads((folder / "effective-config.json").read_text(encoding="utf-8"))
        manifest = json.loads((run / "G0/manifest.json").read_text(encoding="utf-8"))
        if (
            identity["config"] != config
            or identity["source_sha256"] != source_hash
            or manifest["source_sha256"] != source_hash
            or manifest["initial_sha256"]
            != hashlib.sha256((run / "G0/initial.svg").read_bytes()).hexdigest()
        ):
            return None
    except (OSError, ValueError, KeyError, TypeError):
        return None
    return "resume"


def retained_mode(folder):
    """Only completed responses or an explicitly bound remote task can be replayed."""
    run = folder / "run"
    try:
        from .background import resumable_task

        identity = json.loads((run / "identity.json").read_text(encoding="utf-8"))
        config = json.loads((folder / "effective-config.json").read_text(encoding="utf-8"))
        source_hash = hashlib.sha256((folder / "source.png").read_bytes()).hexdigest()
        if identity["config"] != config or identity["source_sha256"] != source_hash:
            return None
        receipts = list(run.glob("**/receipt.json"))
        expected = [run / stage / "call/receipt.json" for stage in ("G0", "G1", "G2")]
        if not receipts or set(receipts) != set(expected[: len(receipts)]):
            return None
        pending = False
        for index, path in enumerate(expected[: len(receipts)]):
            receipt = json.loads(path.read_text(encoding="utf-8"))
            if not valid_retained_accounting(receipt):
                return None
            if receipt.get("status") != "completed":
                if index != len(receipts) - 1 or not resumable_task(path.parent, receipt):
                    return None
                pending = True
                if (path.parent.parent / "model.json").exists():
                    return None
            else:
                raw = (path.parent / "response.json").read_bytes()
                if hashlib.sha256(raw).hexdigest() != receipt.get("response_sha256"):
                    return None
                model = path.parent.parent / "model.json"
                if index and model.exists():
                    text = json.loads(raw)["text"]
                    if json.loads(
                        text.removeprefix("```json").removesuffix("```").strip()
                    ) != json.loads(model.read_text(encoding="utf-8")):
                        return None
        initial = run / "G0/initial.svg"
        if initial.exists():
            manifest = json.loads((run / "G0/manifest.json").read_text(encoding="utf-8"))
            if (
                manifest["source_sha256"] != source_hash
                or manifest["initial_sha256"] != hashlib.sha256(initial.read_bytes()).hexdigest()
            ):
                return None
        elif len(receipts) > 1:
            return None
        if pending:
            return "background"
        if len(receipts) == 3:
            return "finalize"
    except (ImportError, OSError, ValueError, KeyError, TypeError, AttributeError):
        return None
    return None


def valid_retained_accounting(receipt):
    """Replay cannot erase a missing/invalid charge or its conservative reserve."""
    if not isinstance(receipt, dict):
        return False
    known = receipt.get("known_usd")
    reserved = receipt.get("reserved_usd")

    def finite(value):
        return type(value) in (int, float) and math.isfinite(value) and value >= 0

    if not finite(reserved) or known is not None and not finite(known):
        return False
    if receipt.get("status") == "completed":
        return (known is not None and reserved == 0) or (known is None and reserved > 0)
    return receipt.get("status") == "uncertain" and known in (None, 0) and reserved > 0


def is_unsent(path):
    receipt = json.loads(path.read_text(encoding="utf-8"))
    return (
        receipt.get("status") == "not_submitted"
        and receipt.get("known_usd") == 0
        and receipt.get("reserved_usd") == 0
        and receipt.get("error_type") in ("RequestNotSubmitted", "ConnectError", "ConnectTimeout")
    )
