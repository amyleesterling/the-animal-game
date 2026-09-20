"""Make the supplied static Meshy GLB lighter without changing its geometry.

Requires Python 3 and Pillow. Run from the repository root:
  python scripts/optimize-zebra.py /path/to/original.glb
Only embedded JPEG textures are resized; geometry/UV bytes are preserved.
"""

import argparse
import hashlib
import io
import json
from pathlib import Path
import struct

from PIL import Image


def optimize(source: Path, output: Path) -> None:
    original = source.read_bytes()
    magic, version, total = struct.unpack_from("<III", original)
    if (magic, version, total) != (0x46546C67, 2, len(original)):
        raise ValueError("Expected a valid GLB 2.0 file")
    json_size, json_kind = struct.unpack_from("<II", original, 12)
    if json_kind != 0x4E4F534A:
        raise ValueError("Expected GLB JSON chunk")
    model = json.loads(original[20:20 + json_size])
    bin_size, bin_kind = struct.unpack_from("<II", original, 20 + json_size)
    if bin_kind != 0x004E4942:
        raise ValueError("Expected GLB binary chunk")
    binary = original[28 + json_size:28 + json_size + bin_size]
    if len(model["buffers"]) != 1 or "uri" in model["buffers"][0]:
        raise ValueError("Only a self-contained GLB is supported")
    image_views = {image["bufferView"] for image in model["images"]}
    if any(image["mimeType"] != "image/jpeg" for image in model["images"]):
        raise ValueError("This recipe is only for the supplied JPEG textures")

    packed = bytearray()
    texture_sizes = []
    for index, view in enumerate(model["bufferViews"]):
        start = view.get("byteOffset", 0)
        payload = binary[start:start + view["byteLength"]]
        if index in image_views:
            with Image.open(io.BytesIO(payload)) as image:
                image = image.convert("RGB")
                image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                texture_sizes.append(list(image.size))
                encoded = io.BytesIO()
                image.save(encoded, format="JPEG", quality=90,
                           subsampling=0, optimize=True)
                payload = encoded.getvalue()
        view["byteOffset"] = len(packed)
        view["byteLength"] = len(payload)
        packed.extend(payload)
        packed.extend(b"\0" * (-len(packed) % 4))

    model["buffers"][0]["byteLength"] = len(packed)
    model["asset"]["copyright"] = (
        "Zebra Portrait by amyleerobinson via Meshy, CC BY 4.0. "
        "Source: https://www.meshy.ai/s/fURUJE. "
        "Modified: texture downsampling and JPEG compression."
    )
    encoded_json = json.dumps(model, separators=(",", ":")).encode()
    encoded_json += b" " * (-len(encoded_json) % 4)
    result = (
        struct.pack("<III", magic, version, 28 + len(encoded_json) + len(packed))
        + struct.pack("<II", len(encoded_json), json_kind) + encoded_json
        + struct.pack("<II", len(packed), bin_kind) + packed
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(result)
    print(json.dumps({
        "sourceBytes": len(original), "outputBytes": len(result),
        "sourceSha256": hashlib.sha256(original).hexdigest(),
        "outputSha256": hashlib.sha256(result).hexdigest(),
        "textureSizes": texture_sizes,
        "geometryChanged": False,
        "pillowVersion": Image.__version__,
    }, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path,
                        default=Path("public/models/zebra.glb"))
    args = parser.parse_args()
    optimize(args.source, args.output)
