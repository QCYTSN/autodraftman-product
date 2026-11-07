"""Generate display-only WebP previews; preserve original comparison/download assets."""
from pathlib import Path
from PIL import Image

public = Path(__file__).resolve().parents[1] / 'public'
jobs = [(public / f'assets/demo/cases/{case}/input.png', public / f'assets/demo/cases/{case}/thumbnail.webp', 320) for case in ('study', 'diffusion', 'vit')]
jobs += [(public / 'assets/research/samples/sample-0001/source.webp', public / 'assets/demo/cases/sample-0001/thumbnail.webp', 320),
         (public / 'assets/demo/figfox-method-20261103.png', public / 'assets/demo/figfox-method-20261103.webp', 1208)]
for source, target, width in jobs:
    with Image.open(source) as original:
        image = original.convert('RGB')
        image.thumbnail((width, width), Image.Resampling.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, 'WEBP', quality=88, method=6)
        print(f'{target.relative_to(public)}: {image.width}x{image.height}, {target.stat().st_size:,} bytes')
