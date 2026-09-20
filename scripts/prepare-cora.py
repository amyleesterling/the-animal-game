"""Merge Cora's supplied clips onto one rig and optimize its embedded texture.

Requires Python 3 and Pillow. From the repository root:
  python scripts/prepare-cora.py "path/cora walking 3d.glb" "path/cora character wave.glb"

The walking file supplies the sole mesh, skin, and images. Only the wave clip's
referenced accessors/buffer views are appended. Both clips' sample bytes are
checked against their original sources again after texture optimization.
"""

import argparse
from contextlib import redirect_stdout
from copy import deepcopy
import hashlib
import importlib.util
import io
import json
import math
from pathlib import Path
import struct
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parent.parent
WALK = "Walking_Woman"
WAVE = "Wave_for_Help_4"
COMPONENT_BYTES = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
VECTOR_COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load_glb(path):
    raw = path.read_bytes()
    require(len(raw) >= 28, "Truncated GLB")
    require(struct.unpack_from("<III", raw) == (0x46546C67, 2, len(raw)),
            "Expected a complete GLB 2.0 file")
    json_size, json_kind = struct.unpack_from("<II", raw, 12)
    require(json_kind == 0x4E4F534A and json_size % 4 == 0, "Invalid JSON chunk")
    require(28 + json_size <= len(raw), "Truncated GLB JSON chunk")
    model = json.loads(raw[20:20 + json_size])
    bin_size, bin_kind = struct.unpack_from("<II", raw, 20 + json_size)
    require(bin_kind == 0x004E4942 and 28 + json_size + bin_size == len(raw),
            "Expected one complete binary chunk")
    require(len(model.get("buffers", [])) == 1 and "uri" not in model["buffers"][0],
            "Only a self-contained GLB is supported")
    length = model["buffers"][0]["byteLength"]
    require(0 <= bin_size - length <= 3, "Invalid embedded buffer length")
    binary = raw[28 + json_size:28 + json_size + length]
    for view in model.get("bufferViews", []):
        require(view.get("buffer", 0) == 0 and view.get("byteOffset", 0) >= 0 and
                view["byteLength"] >= 0 and
                view.get("byteOffset", 0) + view["byteLength"] <= length,
                "A buffer view points outside the embedded buffer")
    require(all("bufferView" in image and "uri" not in image
                for image in model.get("images", [])), "Images must be embedded")
    return model, binary, raw


def view_bytes(model, binary, index):
    view = model["bufferViews"][index]
    start = view.get("byteOffset", 0)
    return binary[start:start + view["byteLength"]]


def accessor_bytes(model, binary, index):
    accessor = model["accessors"][index]
    require("sparse" not in accessor and "bufferView" in accessor,
            "This preparation expects ordinary, non-sparse accessors")
    width = COMPONENT_BYTES[accessor["componentType"]]
    kind = accessor["type"]
    if kind.startswith("MAT"):
        columns = int(kind[3:])
        element_size = ((columns * width + 3) // 4) * 4 * columns
    else:
        element_size = width * VECTOR_COMPONENTS[kind]
    view = model["bufferViews"][accessor["bufferView"]]
    payload = view_bytes(model, binary, accessor["bufferView"])
    offset = accessor.get("byteOffset", 0)
    stride = view.get("byteStride", element_size)
    count = accessor["count"]
    require(count > 0 and offset >= 0 and stride >= element_size and
            offset + (count - 1) * stride + element_size <= len(payload),
            "Accessor samples extend outside their buffer view")
    return b"".join(payload[offset + i * stride:offset + i * stride + element_size]
                    for i in range(count))


def geometry_accessors(model):
    indices = set()
    for mesh in model.get("meshes", []):
        for primitive in mesh["primitives"]:
            indices.update(primitive["attributes"].values())
            if "indices" in primitive:
                indices.add(primitive["indices"])
            for target in primitive.get("targets", []):
                indices.update(target.values())
    for skin in model.get("skins", []):
        if "inverseBindMatrices" in skin:
            indices.add(skin["inverseBindMatrices"])
    return sorted(indices)


def verify_compatible(walk, walk_bin, wave, wave_bin):
    for key in ("nodes", "skins", "meshes", "scene", "scenes", "materials",
                "textures", "samplers", "extensionsUsed", "extensionsRequired"):
        require(walk.get(key) == wave.get(key), f"Incompatible character {key}")
    for index in geometry_accessors(walk):
        require(walk["accessors"][index] == wave["accessors"][index],
                f"Incompatible geometry/skin accessor {index}")
        require(accessor_bytes(walk, walk_bin, index) == accessor_bytes(wave, wave_bin, index),
                f"Different geometry/skin samples in accessor {index}")
    require(len(walk.get("images", [])) == len(wave.get("images", [])), "Different images")
    for a, b in zip(walk.get("images", []), wave.get("images", [])):
        require(a == b and view_bytes(walk, walk_bin, a["bufferView"]) ==
                view_bytes(wave, wave_bin, b["bufferView"]), "Different character texture")


def named_clip(model, name):
    clips = [clip for clip in model.get("animations", []) if clip.get("name") == name]
    require(len(clips) == 1, f"Expected exactly one {name} animation")
    return clips[0]


def verify_clip(source, source_bin, output, output_bin, name):
    original, merged = named_clip(source, name), named_clip(output, name)
    require(original["channels"] == merged["channels"], f"Changed {name} channel targets")
    require(len(original["samplers"]) == len(merged["samplers"]), f"Changed {name} samplers")
    digest = hashlib.sha256()
    times = []
    inputs = set()
    for a, b in zip(original["samplers"], merged["samplers"]):
        require({k: v for k, v in a.items() if k not in ("input", "output")} ==
                {k: v for k, v in b.items() if k not in ("input", "output")},
                f"Changed {name} interpolation")
        for key in ("input", "output"):
            before, after = source["accessors"][a[key]], output["accessors"][b[key]]
            require({k: v for k, v in before.items() if k != "bufferView"} ==
                    {k: v for k, v in after.items() if k != "bufferView"},
                    f"Changed {name} accessor metadata")
            samples = accessor_bytes(source, source_bin, a[key])
            require(samples == accessor_bytes(output, output_bin, b[key]),
                    f"Changed {name} {key} sample bytes")
            digest.update(samples)
        if a["input"] not in inputs:
            inputs.add(a["input"])
            accessor = source["accessors"][a["input"]]
            require(accessor["type"] == "SCALAR" and accessor["componentType"] == 5126,
                    "Animation time samples must be float scalars")
            values = struct.unpack("<" + "f" * accessor["count"],
                                   accessor_bytes(source, source_bin, a["input"]))
            require(all(math.isfinite(t) for t in values) and
                    all(a < b for a, b in zip(values, values[1:])),
                    "Animation time samples must be finite and increasing")
            times.extend(values)
    return {"name": name, "startSeconds": min(times), "endSeconds": max(times),
            "durationSeconds": max(times) - min(times),
            "channelCount": len(original["channels"]),
            "samplerCount": len(original["samplers"]),
            "sampleSha256": digest.hexdigest(), "sampleBytesPreserved": True}


def encode_glb(model, binary):
    binary = bytes(binary) + b"\0" * (-len(binary) % 4)
    model["buffers"][0]["byteLength"] = len(binary)
    metadata = json.dumps(model, separators=(",", ":")).encode()
    metadata += b" " * (-len(metadata) % 4)
    return (struct.pack("<III", 0x46546C67, 2, 28 + len(metadata) + len(binary)) +
            struct.pack("<II", len(metadata), 0x4E4F534A) + metadata +
            struct.pack("<II", len(binary), 0x004E4942) + binary)


def prepare(walk_path, wave_path, output_path, report_path):
    walk, walk_bin, walk_raw = load_glb(walk_path)
    wave, wave_bin, wave_raw = load_glb(wave_path)
    verify_compatible(walk, walk_bin, wave, wave_bin)
    named_clip(walk, WALK)
    require(len(walk["animations"]) == 1 and len(wave["animations"]) == 1,
            "The supplied files must each contain only their intended clip")
    merged = deepcopy(walk)
    binary = bytearray(walk_bin)
    clip = deepcopy(named_clip(wave, WAVE))
    accessor_map, view_map = {}, {}
    image_views = {image["bufferView"] for image in wave.get("images", [])}
    for sampler in clip["samplers"]:
        for key in ("input", "output"):
            original_index = sampler[key]
            if original_index not in accessor_map:
                accessor = deepcopy(wave["accessors"][original_index])
                accessor_bytes(wave, wave_bin, original_index)
                original_view = accessor["bufferView"]
                require(original_view not in image_views, "An animation references image bytes")
                if original_view not in view_map:
                    view = deepcopy(wave["bufferViews"][original_view])
                    binary.extend(b"\0" * (-len(binary) % 4))
                    view["byteOffset"] = len(binary)
                    binary.extend(view_bytes(wave, wave_bin, original_view))
                    view_map[original_view] = len(merged["bufferViews"])
                    merged["bufferViews"].append(view)
                accessor["bufferView"] = view_map[original_view]
                accessor_map[original_index] = len(merged["accessors"])
                merged["accessors"].append(accessor)
            sampler[key] = accessor_map[original_index]
    merged["animations"].append(clip)
    spec = importlib.util.spec_from_file_location("optimize_character", ROOT / "scripts/optimize-character.py")
    optimizer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(optimizer)
    with TemporaryDirectory(prefix="prepare-cora-") as directory:
        source = Path(directory) / "merged.glb"
        optimized = Path(directory) / "cora.glb"
        source.write_bytes(encode_glb(merged, binary))
        log = io.StringIO()
        with redirect_stdout(log):
            optimizer.optimize(source, optimized)
        optimization = json.loads(log.getvalue())
        final, final_bin, final_raw = load_glb(optimized)
        clips = [verify_clip(walk, walk_bin, final, final_bin, WALK),
                 verify_clip(wave, wave_bin, final, final_bin, WAVE)]
        for key in ("nodes", "skins", "meshes", "materials", "textures"):
            require(final[key] == walk[key], f"Optimization changed {key}")
        require(len(final["images"]) == len(walk["images"]), "Images were duplicated")
        original_images = {image["bufferView"] for image in walk["images"]}
        for index in range(len(walk["bufferViews"])):
            if index not in original_images:
                require(view_bytes(walk, walk_bin, index) == view_bytes(final, final_bin, index),
                        f"Optimization changed non-image buffer view {index}")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(final_raw)
    report = {
        "sources": [{"file": walk_path.name, "bytes": len(walk_raw), "sha256": sha(walk_raw), "clip": WALK},
                    {"file": wave_path.name, "bytes": len(wave_raw), "sha256": sha(wave_raw), "clip": WAVE}],
        "output": {"file": output_path.name, "bytes": len(final_raw), "sha256": sha(final_raw)},
        "preparation": {"script": "scripts/prepare-cora.py", "scriptSha256": sha(Path(__file__).read_bytes()),
                        "textureOptimizer": "scripts/optimize-character.py",
                        "textureOptimizerSha256": sha((ROOT / "scripts/optimize-character.py").read_bytes()),
                        "appendedAnimationAccessors": len(accessor_map), "appendedBufferViews": len(view_map),
                        "meshCount": len(final["meshes"]), "skinCount": len(final["skins"]),
                        "nodeCount": len(final["nodes"]), "imageCount": len(final["images"])},
        "animations": clips,
        "textures": optimization["textures"], "pillowVersion": optimization["pillowVersion"],
        "verification": {"sourceNodesSkinsMeshesCompatible": True, "sourceGeometryAndBindPoseBytesEqual": True,
                         "sourceTextureBytesEqual": True, "bothClipsPreservedByteForByte": True,
                         "allOriginalNonImageBufferViewsPreserved": True, "noDuplicateMeshesSkinsOrImages": True},
        "provenance": "Both source GLBs supplied by Amy; Cora's original geometry, rig, walking and waving clips retained. Only embedded textures resized/re-encoded. No generated animation or replacement appearance added.",
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("walking", type=Path)
    parser.add_argument("waving", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "public/models/cora.glb")
    parser.add_argument("--report", type=Path, default=ROOT / "docs/CORA_ASSET_PREPARATION.json")
    args = parser.parse_args()
    prepare(args.walking, args.waving, args.output, args.report)
