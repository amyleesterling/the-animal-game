"""Prepare the four reviewed image-guided models, preserving all mesh buffers.

Run only after checking the source images and Meshy's cardinal renders.
The three replacement animals keep their existing URLs. The jeep is separate.
"""
import argparse
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("prepare_models", Path(__file__).with_name("prepare-test-animals.py"))
prepare_models = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare_models)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(workflow_run):
    source = Path("generated/safari-assets")
    state = json.loads((source / "batch-state.json").read_text())
    expected = ["lion", "common-ostrich", "hippopotamus", "safari-jeep"]
    if [entry["id"] for entry in state["assets"]] != expected:
        raise ValueError("Unexpected asset batch")
    if any(entry["status"] != "ready" for entry in state["assets"]):
        raise ValueError("All four models must finish before preparation")
    target = Path("public/models/test-animals")
    manifest_path = target / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    reports = []
    for asset in state["assets"]:
        asset_id = asset["id"]
        if asset["model"]["file"] != f"{asset_id}.glb":
            raise ValueError("Unexpected model filename")
        original = source / asset["model"]["file"]
        reference = Path(f"assets/references/{asset_id}.png")
        if digest(original) != asset["model"]["sha256"] or digest(reference) != asset["referenceSha256"]:
            raise ValueError(f"Source or reference hash mismatch: {asset_id}")
        destination = Path("public/models/safari-jeep.glb") if asset_id == "safari-jeep" else target / f"{asset_id}.glb"
        with contextlib.redirect_stdout(io.StringIO()) as output:
            prepare_models.optimizer.optimize(original, destination)
        optimized = json.loads(output.getvalue())
        before, before_binary = prepare_models.read_glb(original)
        after, after_binary = prepare_models.read_glb(destination)
        image_views = {image["bufferView"] for image in before["images"]}
        for index, view in enumerate(before["bufferViews"]):
            if index in image_views:
                continue
            other = after["bufferViews"][index]
            old = before_binary[view.get("byteOffset", 0):view.get("byteOffset", 0) + view["byteLength"]]
            new = after_binary[other.get("byteOffset", 0):other.get("byteOffset", 0) + other["byteLength"]]
            if old != new:
                raise ValueError(f"Mesh buffer changed: {asset_id}")
        triangles = sum(after["accessors"][primitive["indices"]]["count"] // 3
                        for mesh in after["meshes"] for primitive in mesh["primitives"])
        entry = {
            "id": asset_id, "name": asset["name"],
            "file": destination.name, "status": "ready",
            "bytes": optimized["outputBytes"], "sha256": optimized["outputSha256"],
            "sourceBytes": optimized["sourceBytes"], "sourceSha256": optimized["sourceSha256"],
            "polygonCount": triangles, "textures": optimized["textures"],
            "embeddedAnimations": optimized["animationNames"], "skinCount": optimized["skinCount"],
            "generationMethod": "Meshy Image-to-3D, meshy-7.1 standard geometry and textures",
            "imageTaskId": asset["task"]["id"], "referenceImage": asset["reference"],
            "referenceSha256": asset["referenceSha256"], "workflowRun": workflow_run,
            "reportedCredits": asset["task"]["consumedCredits"],
            "modifications": "Embedded textures resized to 1024px. Every non-image buffer verified byte-identical.",
        }
        if asset_id != "safari-jeep":
            entry["scientificName"] = asset["scientificName"]
            index = next(i for i, previous in enumerate(manifest["animals"]) if previous["id"] == asset_id)
            previous = manifest["animals"][index]
            entry["replacesSha256"] = previous.get("replacesSha256", previous["sha256"])
            manifest["animals"][index] = entry
        reports.append(entry)
    manifest["reviewStatus"] = "Seven species in the story safari; image-guided lion, ostrich and hippo revisions in the gallery. Static animal models."
    manifest["provenance"] = "Initial text-generated batch with image-guided lion, ostrich and hippo replacements. See per-model generation fields and repository receipts."
    manifest["imageRevision"] = {"batch": state["batch"], "workflowRun": workflow_run,
                                 "reportedCredits": state["consumedCredits"], "includesVehicle": True}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    receipt = {key: state[key] for key in ["batch", "startedAt", "finishedAt", "request", "consumedCredits"]}
    receipt.update({"workflowRun": workflow_run, "references": "assets/references/prompts.json", "assets": reports})
    Path("docs/SAFARI_ASSET_GENERATION.json").write_text(json.dumps(receipt, indent=2) + "\n")
    inventory_path = Path("public/assets-manifest.json")
    inventory = json.loads(inventory_path.read_text())
    inventory["stage"] = "Seven-stop Sunset Safari playtest"
    batch = next(item for item in inventory["assets"] if item["id"] == "meshy-savanna-test-animals-20260920")
    batch.update({"title": "Nine animal models, including three image-guided revisions",
                  "bytes": sum(item["bytes"] for item in manifest["animals"]),
                  "reportedGenerationCredits": 225,
                  "revisionSource": workflow_run,
                  "provenance": "Initial nine text-generated models cost 135 credits. Lion, ostrich and hippo were replaced with reviewed OpenAI image references through Meshy Image-to-3D for 90 additional credits. Per-model source and output hashes and task IDs are retained in generation receipts.",
                  "reviewStatus": "Seven species including the supplied zebra are in the story safari. The three image-guided animal revisions are in the gallery. Reference images and four cardinal renders of each revision were visually inspected; all animal models remain static."})
    jeep = next(item for item in reports if item["id"] == "safari-jeep")
    jeep_entry = {**jeep, "id": "safari-land-cruiser-v1", "type": "glb-model",
                  "path": "public/models/safari-jeep.glb", "forwardAxis": "-x",
                  "provenance": "Created at Amy's request. OpenAI-generated FJ40 reference supplied to Meshy Image-to-3D. No third-party mesh was copied.",
                  "reviewStatus": "Reference and four cardinal renders visually inspected. Static vehicle used for instant travel between story stops."}
    inventory["assets"] = [item for item in inventory["assets"] if item["id"] != jeep_entry["id"]]
    inventory["assets"].insert(0, jeep_entry)
    inventory_path.write_text(json.dumps(inventory, indent=2) + "\n")
    print(json.dumps({"models": [{"id": item["id"], "bytes": item["bytes"], "triangles": item["polygonCount"]} for item in reports],
                      "reportedCredits": state["consumedCredits"]}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workflow-run", required=True)
    prepare(parser.parse_args().workflow_run)
