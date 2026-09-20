"""Optimize a completed Meshy batch and record verifiable public provenance.

Run from the repository root after downloading the Actions artifact into
generated/meshy-tests. Original files and recovery state remain there, ignored
by Git. Uses the same image-only optimization as the supplied character.
"""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import struct

spec = importlib.util.spec_from_file_location("optimize_model", Path(__file__).with_name("optimize-character.py"))
optimizer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(optimizer)


def read_glb(path):
    data = path.read_bytes()
    json_size = struct.unpack_from("<I", data, 12)[0]
    model = json.loads(data[20:20 + json_size])
    return model, data[28 + json_size:]


def prepare():
    source = Path("generated/meshy-tests")
    target = Path("public/models/test-animals")
    target.mkdir(parents=True, exist_ok=True)
    state = json.loads((source / "batch-state.json").read_text())
    manifest = json.loads((source / "manifest.json").read_text())
    reports = []
    for animal in manifest["animals"]:
        original = source / animal["file"]
        destination = target / animal["file"]
        if hashlib.sha256(original.read_bytes()).hexdigest() != animal["sha256"]:
            raise ValueError(f"Source hash mismatch for {animal['id']}")
        with contextlib.redirect_stdout(io.StringIO()) as report:
            optimizer.optimize(original, destination)
        optimized = json.loads(report.getvalue())
        before, before_binary = read_glb(original)
        after, after_binary = read_glb(destination)
        image_views = {image["bufferView"] for image in before["images"]}
        for index, view in enumerate(before["bufferViews"]):
            if index in image_views:
                continue
            other = after["bufferViews"][index]
            old = before_binary[view.get("byteOffset", 0):view.get("byteOffset", 0) + view["byteLength"]]
            new = after_binary[other.get("byteOffset", 0):other.get("byteOffset", 0) + other["byteLength"]]
            if old != new:
                raise ValueError(f"Geometry buffer changed for {animal['id']}")
        triangles = sum(after["accessors"][primitive["indices"]]["count"] // 3
                        for mesh in after["meshes"] for primitive in mesh["primitives"])
        animal.update({
            "sourceBytes": animal["bytes"], "sourceSha256": animal["sha256"],
            "bytes": optimized["outputBytes"], "sha256": optimized["outputSha256"],
            "polygonCount": triangles, "textures": optimized["textures"],
            "embeddedAnimations": optimized["animationNames"], "skinCount": optimized["skinCount"],
            "modifications": "Embedded textures resized to 1024px. Non-image buffers verified byte-identical.",
        })
        reports.append({"id": animal["id"], "sourceBytes": animal["sourceBytes"], "bytes": animal["bytes"], "triangles": triangles})
    manifest.update({
        "generatedAt": state["finishedAt"], "reportedCredits": state["consumedCredits"],
        "workflowRun": "https://github.com/amyleesterling/the-animal-game/actions/runs/35526999078",
        "generationModels": {"geometry": state["previewModel"], "texture": state["textureModel"]},
        "provenance": "Generated at Amy's request through her Meshy API account. No source images were uploaded; prompts are recorded in the repository. No license is inferred from the API credential.",
        "preparationScript": "scripts/prepare-test-animals.py",
    })
    (target / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    # Account balances and signed service URLs are intentionally not published.
    receipt = {key: state[key] for key in ["batch", "startedAt", "finishedAt", "previewModel", "textureModel", "consumedCredits"]}
    receipt["animals"] = [{key: animal[key] for key in ["id", "name", "scientificName", "prompt", "texturePrompt", "preview", "refine", "status"]} for animal in state["animals"]]
    Path("docs/TEST_ANIMAL_GENERATION.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"animals": reports, "totalBytes": sum(a["bytes"] for a in manifest["animals"]), "reportedCredits": state["consumedCredits"]}, indent=2))


if __name__ == "__main__":
    prepare()
