"""Pinned upstream contract with explicit portability and input-counting patches."""

import hashlib
import json
import math
import zipfile
from pathlib import Path

COMMIT = "21ffc01271904d6c5610f0f96afd84530968f11e"
ARCHIVE_SHA256 = "cb8dd3e9bb794fda4fef627b5468e2d42179f5a5cb8ed3e082262c5d0ad0603f"
PROFILE = "upstream-factual-gpt55-count-v1"
CONFIG_SOURCE = "configs/historical-cohort.json"


class KernelContractError(ValueError):
    pass


def portable_source(relative, original):
    """Pure, inspectable patch definition shared by installation and verification."""
    if relative == "src/figfox_plus/factual/pipeline.py":
        return original.replace("import fcntl\n", "import os\n", 1).replace(
            "with (out/'run.lock').open('a+') as lock:\n"
            "        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)",
            "with (out/'run.lock').open('a+b') as lock:\n"
            "        if os.name == 'nt':\n"
            "            import msvcrt\n"
            "            if lock.tell() == 0:\n"
            "                lock.write(b'0'); lock.flush()\n"
            "            lock.seek(0)\n"
            "            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)\n"
            "        else:\n"
            "            import fcntl\n"
            "            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)",
        )
    if relative == "src/figfox_plus/providers.py":
        return original.replace("\nimport fcntl\n", "\n", 1).replace(
            "    budget=BUDGET if budget is None else budget",
            "    import fcntl\n    budget=BUDGET if budget is None else budget",
            1,
        )
    if relative == "adapters/raw_evidence.py":
        return original.replace(
            "def _fsync_directory(path: Path) -> None:\n"
            "    descriptor = os.open(path, os.O_RDONLY)",
            "def _fsync_directory(path: Path) -> None:\n"
            "    # Windows cannot open directories with os.open. Files are fsynced before rename.\n"
            "    if os.name == 'nt':\n        return\n"
            "    descriptor = os.open(path, os.O_RDONLY)",
        )
    if relative == "src/figfox_plus/factual/transport.py":
        # Keep the original request body, limits, accounting and recovery intact.
        # Without the optional callback, standalone upstream behavior is unchanged.
        return original.replace(
            "def request(folder,prompt,images,settings,*,http=None):",
            "def request(folder,prompt,images,settings,*,http=None,input_token_counter=None):",
            1,
        ).replace(
            "    if bound>settings['max_input_tokens']:",
            "    if input_token_counter is not None:\n"
            "        bound=input_token_counter(content,settings,folder)\n"
            "    if bound>settings['max_input_tokens']:",
            1,
        )
    return original


PATCHED_FILES = (
    "src/figfox_plus/factual/pipeline.py",
    "src/figfox_plus/providers.py",
    "adapters/raw_evidence.py",
    "src/figfox_plus/factual/transport.py",
)


def verify_kernel(kernel):
    kernel = Path(kernel)
    archive = kernel.parent / "21ffc012.zip"
    if hashlib.sha256(archive.read_bytes()).hexdigest() != ARCHIVE_SHA256:
        raise KernelContractError("Upstream archive hash mismatch")
    files, patches, mismatches = {}, [], []
    with zipfile.ZipFile(archive) as source:
        for item in source.infolist():
            if item.is_dir():
                continue
            relative = item.filename.split("/", 1)[1]
            raw = source.read(item)
            expected = (
                portable_source(relative, raw.decode("utf-8")).encode("utf-8")
                if relative in PATCHED_FILES
                else raw
            )
            path = kernel / relative
            if not path.is_file() or path.read_bytes() != expected:
                mismatches.append(relative)
            files[relative] = hashlib.sha256(expected).hexdigest()
            if expected != raw:
                patches.append(relative)
    # An added Python module could shadow a verified upstream module/package.
    for directory in ("src", "adapters"):
        for path in (kernel / directory).rglob("*.py"):
            if path.relative_to(kernel).as_posix() not in files:
                mismatches.append(path.relative_to(kernel).as_posix())
    if mismatches:
        raise KernelContractError("Unexpected upstream file changes: " + ", ".join(mismatches))
    return {
        "commit": COMMIT,
        "files_checked": len(files),
        "portability_patches": [p for p in patches if p != "src/figfox_plus/factual/transport.py"],
        "input_count_patches": [p for p in patches if p == "src/figfox_plus/factual/transport.py"],
        "file_hashes": files,
    }


def upstream_config(kernel):
    return json.loads((Path(kernel) / CONFIG_SOURCE).read_text(encoding="utf-8"))


def runtime_config(kernel):
    config = upstream_config(kernel)
    config["budget_usd"] = 5
    return config


def validate_config(config, kernel):
    baseline = runtime_config(kernel)
    budget = config.get("budget_usd")
    if type(budget) not in (int, float) or not math.isfinite(budget) or not 0 < budget <= 5:
        raise KernelContractError("Local per-image budget must remain within USD 5")
    if {**config, "budget_usd": baseline["budget_usd"]} != baseline:
        raise KernelContractError(
            "Runtime configuration differs from the declared upstream profile"
        )


def is_original_job(folder):
    path = Path(folder) / "adapter-contract.json"
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value.get("profile") == PROFILE and value.get("commit") == COMMIT
    except (OSError, ValueError):
        return False
