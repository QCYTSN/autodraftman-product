import json
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

    @classmethod
    def from_env(cls):
        return cls(
            kernel=Path(
                os.environ.get(
                    "FIGFOX_KERNEL_DIR", ROOT / "data/kernel" / f"FigFox-{KERNEL_COMMIT}"
                )
            ),
            data=Path(os.environ.get("FIGFOX_LOCAL_DATA", ROOT / "data/local-reconstruction")),
            credentials=Path(os.environ.get("FIGFOX_KERNEL_ENV", ROOT.parent / "FigFox-926/.env")),
            config=Path(
                os.environ.get("FIGFOX_KERNEL_CONFIG", ROOT / "data/local-kernel-config.json")
            ),
        )


def load_credentials(path: Path) -> dict[str, str]:
    values = {}
    if path.is_file():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                if key.strip() in {"OPENAI_API_KEY", "DEEPSEEK_API_KEY"}:
                    values[key.strip()] = value.strip().strip('"').strip("'")
    for key in ("OPENAI_API_KEY", "DEEPSEEK_API_KEY"):
        if os.environ.get(key):
            values[key] = os.environ[key]
    return values


def exposure(data: Path) -> float:
    total = 0.0
    for path in data.glob("jobs/*/run/**/receipt.json"):
        # A partially written receipt is conservatively treated as unknown exposure.
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
            total += float(record.get("known_usd") or 0) + float(record.get("reserved_usd") or 0)
        except (ValueError, OSError):
            return float("inf")
    return total
