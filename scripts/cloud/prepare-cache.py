"""Map the frozen kernel's SAM cache to persistent state without editing it."""

import argparse
import os
import pwd
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kernel", type=Path)
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit("Run this deployment step as root.")
    kernel = args.kernel.resolve(strict=True)
    if not kernel.is_relative_to(Path("/opt/figfox/releases")):
        raise SystemExit("Expected a kernel inside /opt/figfox/releases.")
    if not (kernel / "src/figfox_plus/native/pipeline.py").is_file():
        raise SystemExit("Native pipeline missing.")
    account = pwd.getpwnam("figfox")
    state = Path("/var/lib/figfox/kernel-cache")
    cache = state / kernel.name / "sam-cache"
    for path in (state, cache.parent, cache):
        if not path.exists():
            path.mkdir(mode=0o750)
            os.chown(path, account.pw_uid, account.pw_gid)
        if path.is_symlink() or not path.is_dir():
            raise SystemExit(f"Unexpected state path: {path}")
    runs = kernel / "runs"
    if runs.is_symlink() or (runs.exists() and not runs.is_dir()):
        raise SystemExit("Unexpected runs path; retained unchanged.")
    if not runs.exists():
        runs.mkdir(mode=0o750)
        os.chown(runs, 0, account.pw_gid)
    link = runs / "sam-cache"
    if link.is_symlink():
        if link.resolve() != cache:
            raise SystemExit("Existing SAM cache points elsewhere; retained unchanged.")
    elif link.exists():
        raise SystemExit("Existing SAM cache retained; migrate it explicitly first.")
    else:
        link.symlink_to(cache, target_is_directory=True)
    print(f"SAM cache: {link} -> {cache}")


if __name__ == "__main__":
    main()
