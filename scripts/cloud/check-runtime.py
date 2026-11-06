"""Check service filesystem permissions; optional local-only renderer smoke test."""

import argparse
import os
import sys
import tempfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--render", action="store_true")
    args = parser.parse_args()
    if os.geteuid() == 0:
        raise SystemExit("Run as the figfox service user, inside its service restrictions.")
    kernel = Path(os.environ["FIGFOX_KERNEL_DIR"]).resolve(strict=True)
    cache = kernel / "runs/sam-cache"
    state = Path("/var/lib/figfox").resolve(strict=True)
    if not cache.resolve(strict=True).is_relative_to(state):
        raise SystemExit("SAM cache must resolve inside persistent /var/lib/figfox.")
    if os.access(kernel / "src", os.W_OK):
        raise SystemExit("Frozen kernel source must not be writable by the service.")
    sys.path.insert(0, str(kernel / "src"))
    from figfox_plus.state import new_run, write_json

    # Exercise upstream mkdir, temporary file, fsync and atomic rename on the
    # same cache mount used by native.first, without sending a SAM/GPT request.
    for directory in (cache, Path(os.environ["FIGFOX_LOCAL_DATA"])):
        with tempfile.TemporaryDirectory(prefix=".deployment-check-", dir=directory) as temp:
            folder = new_run(Path(temp), "probe")
            write_json(folder / "probe.json", {"deployment_check": True})
    if args.render:
        from figfox_plus.native.document import parse, measure
        from figfox_plus.factual.pipeline import render

        with tempfile.TemporaryDirectory(prefix="render-check-", dir=state / "checks") as temp:
            folder = Path(temp)
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect id="probe" x="10" y="20" width="30" height="40" fill="purple"/></svg>'
            boxes = measure(parse(svg), folder / "browser.png")
            assert boxes["objects"]["probe"]["geometry_bbox"] == {
                "left": 10, "top": 20, "right": 40, "bottom": 60,
            }
            source = folder / "probe.svg"
            source.write_text(svg, encoding="utf-8")
            render(source, folder / "native.png")
            assert all((folder / name).stat().st_size > 0 for name in ("browser.png", "native.png"))
        print("Original Chromium measurement and CairoSVG rendering passed.")
    print("SAM cache and task-state writes passed; frozen source remains read-only. No model requests.")


if __name__ == "__main__":
    main()
