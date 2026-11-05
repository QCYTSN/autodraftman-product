"""Pack SAM crop attachments when their per-image overhead exceeds the input budget."""

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def input_bound(prompt, images):
    bound = len(prompt.encode("utf-8"))
    for path in images:
        with Image.open(path) as image:
            bound += 4096 * math.ceil(image.width / 512) * math.ceil(image.height / 512) + 4096
    return bound


def pack_sam_inputs(prompt, payload, images, folder, limit):
    """Keep the full source and overview; group every crop into labelled contact sheets.

    Asset IDs and source coordinates remain unchanged. Only model attachments change;
    original crops remain available to the kernel's SVG asset binding.
    """
    serialized = "\n" + json.dumps(payload, ensure_ascii=False)
    before = input_bound(prompt + serialized, images)
    if before <= limit:
        return prompt, images
    folder = Path(folder)
    sam_file = folder.parent / "sam.json"
    if not sam_file.is_file():
        return prompt, images
    assets = json.loads(sam_file.read_text(encoding="utf-8"))["assets"]
    by_path = {Path(asset["path"]).resolve(): asset for asset in assets}
    crops = [
        by_path[Path(path).resolve()] for path in images[1:] if Path(path).resolve() in by_path
    ]
    if not crops:
        return prompt, images
    keep = [images[0]] + [path for path in images[1:] if Path(path).resolve() not in by_path]
    output = folder.parent / "model-attachments"
    output.mkdir(exist_ok=True)
    sheets, entries = [], []
    font = ImageFont.load_default(size=14)
    small_font = ImageFont.load_default(size=12)
    for page in range(0, len(crops), 16):
        batch = crops[page : page + 16]
        sheet = Image.new("RGB", (1024, math.ceil(len(batch) / 4) * 256), "white")
        draw = ImageDraw.Draw(sheet)
        for index, asset in enumerate(batch):
            x, y = (index % 4) * 256, (index // 4) * 256
            with Image.open(asset["path"]) as source:
                crop = source.convert("RGBA")
                size = list(source.size)
                crop.thumbnail((232, 202), Image.Resampling.LANCZOS)
                sheet.paste(
                    crop, (x + (256 - crop.width) // 2, y + 40 + (202 - crop.height) // 2), crop
                )
            draw.rectangle((x, y, x + 255, y + 255), outline="#dedbe8")
            draw.text((x + 8, y + 7), str(asset["id"]), font=font, fill="#19152d")
            draw.text((x + 8, y + 24), f"{size[0]} x {size[1]} px", font=small_font, fill="#666070")
            entries.append(
                {
                    "id": asset["id"],
                    "sheet": len(sheets) + 1,
                    "cell": index + 1,
                    "original_size": size,
                    "sha256": hashlib.sha256(Path(asset["path"]).read_bytes()).hexdigest(),
                }
            )
        path = output / f"sam-crops-{len(sheets) + 1}.png"
        sheet.save(path)
        sheets.append(path)
    # Replace the kernel's individual-attachment manifest so it matches the actual request.
    prompt = prompt.split("\nActual attachment manifest (in order):", 1)[0] + (
        "\nSAM crops are grouped in labelled contact sheets. Each cell is labelled with its "
        "original asset ID and pixel dimensions. Use the SAM source_crop coordinates above "
        "for placement, not the contact-sheet positions. The original image and annotated "
        "overviews remain full resolution.\nActual attachment manifest (in order): "
        + json.dumps(
            ["original"]
            + ["annotated overview " + Path(p).name for p in keep[1:]]
            + ["SAM crop contact sheet " + str(i + 1) for i in range(len(sheets))]
        )
    )
    packed = keep + sheets
    (output / "manifest.json").write_text(
        json.dumps(
            {
                "policy": "sam-contact-sheets-v1",
                "before_bound": before,
                "after_bound": input_bound(prompt + serialized, packed),
                "assets": entries,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return prompt, packed
