"""Start the unchanged local SAM bridge with Linux deployment paths."""

import importlib.util
import os
from pathlib import Path


def main():
    assets = Path(os.environ["FIGFOX_SAM_ASSETS"]).resolve(strict=True)
    runtime = Path(os.environ["FIGFOX_SAM_RUNTIME"]).resolve(strict=True)
    source = assets / "sam_bridge.py"
    spec = importlib.util.spec_from_file_location("figfox_deployed_sam_bridge", source)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load the original SAM bridge")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    # Device, model construction, segmentation and response handling stay upstream-owned.
    module.DRAWAI_SRC = str((assets / "drawai-src").resolve(strict=True))
    module.SAM3_SOURCE = str((assets / "sam3-source").resolve(strict=True))
    module.RUNTIME_ROOT = str(runtime)
    return module.main()


if __name__ == "__main__":
    raise SystemExit(main())
