"""Install the pinned upstream runtime; refuse unknown source/configuration changes."""

import argparse
import hashlib
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend/src"))
from autodraftman_backend.local_reconstruction.kernel_contract import (  # noqa: E402
    ARCHIVE_SHA256,
    COMMIT,
    CONFIG_SOURCE,
    PATCHED_FILES,
    PROFILE,
    portable_source,
    runtime_config,
    validate_config,
    verify_kernel,
)

ARCHIVE = ROOT / "data/kernel/21ffc012.zip"
KERNEL = ARCHIVE.parent / f"FigFox-{COMMIT}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--restore-upstream-config", action="store_true")
    args = parser.parse_args()
    ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    if not ARCHIVE.is_file():
        urllib.request.urlretrieve(
            f"https://codeload.github.com/LawrenceRiver/FigFox/zip/{COMMIT}", ARCHIVE
        )
    if hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() != ARCHIVE_SHA256:
        raise ValueError("Kernel archive hash mismatch")
    with zipfile.ZipFile(ARCHIVE) as archive:
        if not KERNEL.exists():
            for name in archive.namelist():
                if (
                    not (ARCHIVE.parent / name)
                    .resolve()
                    .is_relative_to(ARCHIVE.parent.resolve())
                ):
                    raise ValueError("Unsafe archive member")
            archive.extractall(ARCHIVE.parent)
        for relative in PATCHED_FILES:
            original = archive.read(f"FigFox-{COMMIT}/{relative}").decode("utf-8")
            adapted = portable_source(relative, original)
            path = KERNEL / relative
            if path.read_text(encoding="utf-8") not in (original, adapted):
                raise ValueError(f"Unexpected local kernel modification: {relative}")
            path.write_text(adapted, encoding="utf-8", newline="\n")
    proof = verify_kernel(KERNEL)
    config_path = ROOT / "data/local-kernel-config.json"
    if args.restore_upstream_config and config_path.exists():
        digest = hashlib.sha256(config_path.read_bytes()).hexdigest()[:12]
        backup = config_path.with_name(
            f"local-kernel-config-before-original-{digest}.json"
        )
        if not backup.exists():
            backup.write_bytes(config_path.read_bytes())
    if not config_path.exists() or args.restore_upstream_config:
        config = runtime_config(KERNEL)
        config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")
    validate_config(json.loads(config_path.read_text(encoding="utf-8")), KERNEL)
    manifest = {
        "repository": "https://github.com/LawrenceRiver/FigFox",
        "profile": PROFILE,
        "config_source": CONFIG_SOURCE,
        "archive_sha256": ARCHIVE_SHA256,
        "declared_overrides": {"budget_usd": 5},
        **proof,
    }
    (KERNEL / "product-runtime-manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "kernel": str(KERNEL),
                "config": str(config_path),
                "commit": COMMIT,
                "verified_files": proof["files_checked"],
                "profile": PROFILE,
            }
        )
    )


if __name__ == "__main__":
    main()
