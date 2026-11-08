import json
import math
import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
KERNEL_COMMIT = "21ffc01271904d6c5610f0f96afd84530968f11e"


@dataclass(frozen=True)
class Settings:
    kernel: Path
    data: Path
    credentials: Path
    config: Path
    sam_url: str = "http://127.0.0.1:18080"
    origins: tuple[str, ...] = ("http://127.0.0.1:5178", "http://localhost:5178")
    total_budget: float = 5.0
    max_jobs: int | None = None
    account_budgets_required: bool = False
    account_settings_file: Path | None = None

    @classmethod
    def from_env(cls):
        data = Path(os.environ.get("FIGFOX_LOCAL_DATA", ROOT / "data/local-reconstruction"))
        limits_path = data / "test-limits.json"
        limits = json.loads(limits_path.read_text(encoding="utf-8")) if limits_path.exists() else {}
        budget = limits.get("cumulative_budget_usd", 5.0)
        max_jobs = limits.get("max_jobs")
        if (
            isinstance(budget, bool)
            or not isinstance(budget, (int, float))
            or not math.isfinite(budget)
            or budget <= 0
        ):
            raise ValueError("Invalid local test budget")
        if max_jobs is not None and (type(max_jobs) is not int or max_jobs < 0):
            raise ValueError("Invalid local test count limit")
        return cls(
            kernel=Path(
                os.environ.get(
                    "FIGFOX_KERNEL_DIR", ROOT / "data/kernel" / f"FigFox-{KERNEL_COMMIT}"
                )
            ),
            data=data,
            credentials=Path(os.environ.get("FIGFOX_KERNEL_ENV", ROOT.parent / "FigFox-926/.env")),
            config=Path(
                os.environ.get("FIGFOX_KERNEL_CONFIG", ROOT / "data/local-kernel-config.json")
            ),
            total_budget=budget,
            max_jobs=max_jobs,
            account_budgets_required=os.environ.get("FIGFOX_ACCOUNT_BUDGETS_REQUIRED") == "1",
            account_settings_file=Path(os.environ["FIGFOX_ACCOUNT_SETTINGS"])
            if os.environ.get("FIGFOX_ACCOUNT_SETTINGS") else None,
        )


def load_credentials(path: Path) -> dict[str, str]:
    values = {}
    if path.is_file():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                if key.strip() == "OPENAI_API_KEY":
                    values[key.strip()] = value.strip().strip('"').strip("'")
    if os.environ.get("OPENAI_API_KEY"):
        values["OPENAI_API_KEY"] = os.environ["OPENAI_API_KEY"]
    return values


def exposure(data: Path) -> float:
    total = 0.0
    for path in data.glob("jobs/*/run/**/receipt.json"):
        # A partially written receipt is conservatively treated as unknown exposure.
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
            amounts = [record.get("known_usd"), record.get("reserved_usd")]
            for amount in amounts:
                if amount is not None and (
                    type(amount) not in (int, float) or not math.isfinite(amount) or amount < 0
                ):
                    return float("inf")
            total += sum(amount or 0 for amount in amounts)
        except (ValueError, OSError, TypeError, AttributeError):
            return float("inf")
    return total
