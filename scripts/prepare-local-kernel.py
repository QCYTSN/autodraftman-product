"""Fetch the verified kernel snapshot and apply the Windows-only file-lock adaptation."""

import hashlib
import json
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "21ffc01271904d6c5610f0f96afd84530968f11e"
ARCHIVE = ROOT / "data/kernel/21ffc012.zip"
KERNEL = ARCHIVE.parent / f"FigFox-{COMMIT}"


def archived(relative):
    with zipfile.ZipFile(ARCHIVE) as archive:
        return archive.read(f"FigFox-{COMMIT}/{relative}").decode("utf-8")


def write_verified(path, original, adapted):
    current = path.read_text(encoding="utf-8")
    if current not in (original, adapted):
        raise ValueError(f"Unexpected local kernel modification: {path.name}")
    if current != adapted:
        path.write_text(adapted, encoding="utf-8", newline="\n")


def main():
    ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    if not ARCHIVE.is_file():
        urllib.request.urlretrieve(
            f"https://codeload.github.com/LawrenceRiver/FigFox/zip/{COMMIT}", ARCHIVE
        )
    if (
        hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
        != "cb8dd3e9bb794fda4fef627b5468e2d42179f5a5cb8ed3e082262c5d0ad0603f"
    ):
        raise ValueError("Kernel archive hash mismatch")
    if not KERNEL.exists():
        with zipfile.ZipFile(ARCHIVE) as archive:
            for name in archive.namelist():
                if (
                    not (ARCHIVE.parent / name)
                    .resolve()
                    .is_relative_to(ARCHIVE.parent.resolve())
                ):
                    raise ValueError("Unsafe archive member")
            archive.extractall(ARCHIVE.parent)
    source = KERNEL / "src/figfox_plus/factual/pipeline.py"
    original = archived("src/figfox_plus/factual/pipeline.py")
    # POSIX behavior is unchanged. Windows locks byte zero until the descriptor closes.
    patched = (
        original.replace("import fcntl\n", "import os\n", 1)
        if "msvcrt.locking" not in original
        else original
    )
    patched = patched.replace(
        "with (out/'run.lock').open('a+') as lock:\n        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)",
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
    if "msvcrt.locking" not in patched:
        raise ValueError("Pinned kernel lock layout changed")
    write_verified(source, original, patched)
    # The factual transport replaces this historical provider; defer its POSIX-only
    # import until that unused legacy function is explicitly called.
    providers = KERNEL / "src/figfox_plus/providers.py"
    original_provider = archived("src/figfox_plus/providers.py")
    if "\nimport fcntl\n" in original_provider:
        adapted = original_provider.replace("\nimport fcntl\n", "\n", 1).replace(
            "    budget=BUDGET if budget is None else budget",
            "    import fcntl\n    budget=BUDGET if budget is None else budget",
            1,
        )
        write_verified(providers, original_provider, adapted)
    adapter = KERNEL / "adapters/raw_evidence.py"
    original_adapter = archived("adapters/raw_evidence.py")
    adapted_adapter = original_adapter.replace(
        "def _fsync_directory(path: Path) -> None:\n    descriptor = os.open(path, os.O_RDONLY)",
        "def _fsync_directory(path: Path) -> None:\n"
        "    # Windows cannot open directories with os.open. Files are fsynced before rename.\n"
        "    if os.name == 'nt':\n        return\n"
        "    descriptor = os.open(path, os.O_RDONLY)",
    )
    write_verified(adapter, original_adapter, adapted_adapter)
    config_path = ROOT / "data/local-kernel-config.json"
    if not config_path.exists():
        config = json.loads(
            (KERNEL / "configs/historical-cohort.json").read_text(encoding="utf-8")
        )
        config["budget_usd"] = 5
        # SAM crops are charged conservatively as separate image tiles by the kernel.
        config["stages"]["G0"]["max_input_tokens"] = 262144
        config["price_basis"] += (
            "; local smoke limit USD 5, including retained uncertain reserves"
        )
        config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")
    manifest = {
        "repository": "https://github.com/LawrenceRiver/FigFox",
        "commit": COMMIT,
        "archive_sha256": hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),
        "adaptation": "Windows file lock, lazy legacy POSIX import, directory fsync guard; no prompt or SVG repair change",
        "pipeline_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "providers_sha256": hashlib.sha256(providers.read_bytes()).hexdigest(),
        "sam_adapter_sha256": hashlib.sha256(adapter.read_bytes()).hexdigest(),
    }
    (KERNEL / "product-runtime-manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    print(
        json.dumps(
            {"kernel": str(KERNEL), "config": str(config_path), "commit": COMMIT}
        )
    )


if __name__ == "__main__":
    main()
