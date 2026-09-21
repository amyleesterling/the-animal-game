"""Prepare the 25 reviewed savanna models without changing geometry or animation.

Requires Python 3.9+ and Pillow. After reviewing all four cardinal renders per model:
  python scripts/prepare-savanna-expansion.py --workflow-run <GitHub run URL> \
      --reviewed-cardinal-renders \
      --revision-state generated/savanna-revisions/batch-state.json \
      --revision-workflow-run <revision GitHub run URL> \
      --porcupine-state generated/savanna-porcupine/batch-state.json \
      --porcupine-workflow-run <final porcupine GitHub run URL> \
      --authored-porcupine-manifest generated/authored-porcupine/manifest.json \
      --reviewed-authored-porcupine

Each pair of overlay arguments replaces only its authorized species. The final
porcupine overlay requires the first revision batch. Rejected candidate receipts
remain in provenance; combined credits include all three batches. The authored
replacement requires separate visual acceptance and adds no API credit charge.

Reads generated/savanna-expansion/batch-state.json relative to this repository.
No network calls or generation requests are made. Inputs are checked before any
public files change. All optimized outputs are staged and verified before publish.
"""

import argparse
from contextlib import redirect_stdout
from copy import deepcopy
import hashlib
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import re
import shutil
import struct
from tempfile import TemporaryDirectory
from uuid import uuid4

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
BATCH = "savanna-expansion-20260920-v1"
INVENTORY_ID = "meshy-savanna-expansion-20260920-v1"
IDS = (
    "lamarcks-dung-beetle", "mound-building-termite", "mopane-emperor-moth",
    "african-monarch", "desert-locust", "cape-porcupine",
    "south-african-springhare", "striped-grass-mouse", "naked-mole-rat",
    "secretarybird", "lilac-breasted-roller", "southern-ground-hornbill",
    "helmeted-guineafowl", "grey-crowned-crane", "white-backed-vulture",
    "red-billed-oxpecker", "marabou-stork", "aardvark", "bat-eared-fox",
    "banded-mongoose", "meerkat", "olive-baboon", "vervet-monkey",
    "african-buffalo", "nile-monitor",
)
REVISION_IDS = ("cape-porcupine", "south-african-springhare", "bat-eared-fox")
REVISION_BATCH = "savanna-revisions-20260921-v1"
PORCUPINE_BATCH = "savanna-porcupine-20260921-v1"
# Cardinal-render review on 2026-09-21 rejected these actual candidates. Keep the
# exact IDs blocked even if a caller accidentally omits an overlay argument.
REJECTED_TASK_IDS = frozenset({
    "01a0c199-e5f5-72b0-9e5a-a0e3a49dab7f",  # Original cape porcupine: flat slab.
    "01a0c19b-79f8-760f-ac1f-02547df55455",  # Original springhare: flat slab.
    "01a0c1a1-da31-77b3-8941-1c8990454274",  # Original bat-eared fox: flat slab.
    "01a0c416-5c43-7532-a202-5a38f016d670",  # First porcupine repair: incomplete body.
    "01a0c420-7580-7047-8554-6791d2a8bd59",  # Second porcupine repair: no torso/legs.
})
VIEWS = ("front", "right", "back", "left")
REQUEST = {
    "model_type": "standard", "ai_model": "meshy-7.1", "should_texture": True,
    "enable_pbr": False, "texture_resolution": "2k", "should_remesh": True,
    "topology": "triangle", "image_enhancement": False,
    "target_formats": ["glb"], "multi_view_thumbnails": True,
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    require(path.stat().st_size <= 4 * 1024 * 1024, "Oversized JSON input")
    return json.loads(path.read_text(encoding="utf-8"))


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode("utf-8")


def inside(root, relative):
    """Reject symlinks that would move an input or output outside its project."""
    path = (root / relative).resolve()
    require(path.is_relative_to(root), "Path escapes the project")
    return path


def checked_bytes(path, receipt, limit):
    require(path.is_file() and path.stat().st_size <= limit, "Missing or oversized input")
    data = path.read_bytes()
    require(type(receipt.get("bytes")) is int and receipt["bytes"] == len(data),
            "Input byte count does not match its receipt")
    require(isinstance(receipt.get("sha256"), str) and
            re.fullmatch(r"[0-9a-f]{64}", receipt["sha256"]), "Invalid SHA-256 receipt")
    require(sha(data) == receipt["sha256"], "Input hash does not match its receipt")
    return data


def verify_image(data, expected_format=None, max_side=8192):
    with Image.open(io.BytesIO(data)) as image:
        require(image.format in ("PNG", "JPEG"), "Only PNG/JPEG inputs are supported")
        require(expected_format is None or image.format == expected_format,
                "Image encoding does not match its filename")
        require(0 < min(image.size) and max(image.size) <= max_side and
                image.width * image.height <= 32 * 1024 * 1024,
                "Image dimensions exceed preparation bounds")
        dimensions = list(image.size)
        image.verify()
    # verify() alone does not fully decode a JPEG's pixels.
    with Image.open(io.BytesIO(data)) as image:
        image.load()
    return dimensions


def read_glb(path):
    require(path.stat().st_size <= 80 * 1024 * 1024, "Oversized GLB")
    data = path.read_bytes()
    require(len(data) >= 28 and struct.unpack_from("<III", data) ==
            (0x46546C67, 2, len(data)), "Expected a complete GLB 2.0 file")
    json_size, json_kind = struct.unpack_from("<II", data, 12)
    require(json_kind == 0x4E4F534A and json_size % 4 == 0 and
            28 + json_size <= len(data), "Invalid GLB JSON chunk")
    model = json.loads(data[20:20 + json_size])
    bin_size, bin_kind = struct.unpack_from("<II", data, 20 + json_size)
    require(bin_kind == 0x004E4942 and 28 + json_size + bin_size == len(data),
            "Expected exactly one complete binary chunk")
    buffers = model.get("buffers", [])
    require(len(buffers) == 1 and "uri" not in buffers[0], "External buffers are not supported")
    length = buffers[0].get("byteLength")
    require(type(length) is int and 0 <= bin_size - length <= 3, "Invalid buffer length")
    binary = data[28 + json_size:28 + json_size + length]
    views = model.get("bufferViews", [])
    require(isinstance(views, list) and views, "GLB has no buffer views")
    for view in views:
        offset, size = view.get("byteOffset", 0), view.get("byteLength")
        require(view.get("buffer", 0) == 0 and type(offset) is int and
                type(size) is int and offset >= 0 and size > 0 and offset + size <= length,
                "Buffer view exceeds its embedded buffer")
    images = model.get("images", [])
    require(isinstance(images, list) and images, "Expected embedded model textures")
    for image in images:
        index = image.get("bufferView")
        require("uri" not in image and type(index) is int and 0 <= index < len(views),
                "All textures must use valid embedded buffer views")
        require(image.get("mimeType") in ("image/png", "image/jpeg"),
                "Unsupported embedded image encoding")
        verify_image(view_bytes(model, binary, index),
                     "PNG" if image["mimeType"] == "image/png" else "JPEG")
    image_views = {image["bufferView"] for image in images}
    for accessor in model.get("accessors", []):
        referenced = [accessor["bufferView"]] if "bufferView" in accessor else []
        for field in ("indices", "values"):
            if field in accessor.get("sparse", {}):
                referenced.append(accessor["sparse"][field]["bufferView"])
        require(all(type(index) is int and 0 <= index < len(views) and
                    index not in image_views for index in referenced),
                "Geometry or animation accessor overlaps an image view")
    triangles = 0
    meshes = model.get("meshes", [])
    require(isinstance(meshes, list) and meshes, "GLB contains no meshes")
    for mesh in meshes:
        require(mesh.get("primitives"), "Mesh contains no primitives")
        for primitive in mesh["primitives"]:
            require(primitive.get("mode", 4) == 4 and
                    "POSITION" in primitive.get("attributes", {}),
                    "Expected triangle meshes with positions")
            accessor = primitive.get("indices", primitive["attributes"]["POSITION"])
            require(type(accessor) is int and 0 <= accessor < len(model.get("accessors", [])),
                    "Invalid mesh accessor")
            count = model["accessors"][accessor].get("count")
            require(type(count) is int and count > 0 and count % 3 == 0,
                    "Invalid triangle count")
            triangles += count // 3
    return model, binary, data, triangles


def view_bytes(model, binary, index):
    view = model["bufferViews"][index]
    start = view.get("byteOffset", 0)
    return binary[start:start + view["byteLength"]]


def verify_preserved(before, before_binary, after, after_binary):
    require(len(before["bufferViews"]) == len(after["bufferViews"]), "Buffer views changed")
    images = {image["bufferView"] for image in before["images"]}
    for index in range(len(before["bufferViews"])):
        if index not in images:
            require(view_bytes(before, before_binary, index) ==
                    view_bytes(after, after_binary, index), "Non-image buffer bytes changed")
    # Only storage offsets, texture byte lengths and image MIME types may change.
    def stable_metadata(model):
        model = deepcopy(model)
        model["buffers"][0].pop("byteLength")
        for view in model["bufferViews"]:
            view.pop("byteOffset", None)
        for index in images:
            model["bufferViews"][index].pop("byteLength")
        for image in model["images"]:
            image.pop("mimeType", None)
        return model
    require(stable_metadata(before) == stable_metadata(after),
            "Model metadata changed beyond image encoding and storage offsets")
    for image in after["images"]:
        size = verify_image(view_bytes(after, after_binary, image["bufferView"]), max_side=1024)
        require(max(size) <= 1024, "Optimized texture exceeds 1024 pixels")


def load_optimizer():
    spec = importlib.util.spec_from_file_location(
        "savanna_texture_optimizer", Path(__file__).with_name("optimize-character.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.optimize


def replace_from_sibling(source, target):
    """Create with the destination parent's ACL, then atomically replace.

    Moving files straight out of TemporaryDirectory preserves its restrictive
    Windows ACL. Copy bytes through a newly created sibling instead; do not copy
    source permissions or modify ACLs. Rollback uses this same path.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    sibling = target.with_name(f".{target.name}.{uuid4().hex}.tmp")
    created = False
    try:
        with source.open("rb") as original, sibling.open("xb") as replacement:
            created = True
            shutil.copyfileobj(original, replacement)
        os.replace(sibling, target)
    finally:
        if created:
            sibling.unlink(missing_ok=True)


def publish(root, stage, files):
    """Publish verified files; restore earlier outputs if any replacement fails."""
    backups = stage / "backups"
    backups.mkdir()
    replacements = []
    for index, (staged, relative) in enumerate(files):
        target = inside(root, relative)
        require(not target.exists() or target.is_file(), "Output target is not a file")
        backup = backups / str(index)
        if target.exists():
            shutil.copyfile(target, backup)
        replacements.append((staged, target, backup))
    applied = []
    try:
        for staged, target, backup in replacements:
            replace_from_sibling(staged, target)
            applied.append((target, backup))
    except Exception:
        for target, backup in reversed(applied):
            if backup.exists():
                replace_from_sibling(backup, target)
            else:
                target.unlink(missing_ok=True)
        raise


def validate_batch(root, folder, state, plan):
    """Validate receipts against local inputs before any public file changes."""
    require(isinstance(state, dict) and state.get("schemaVersion") == 1 and
            state.get("batch") == plan["batch"] and state.get("request") == REQUEST and
            isinstance(state.get("assets"), list) and
            [asset.get("id") for asset in state["assets"]] == [asset["id"] for asset in plan["assets"]],
            "Expected the exact version-one model batch")
    validated, task_ids, credits = [], set(), []
    for planned, asset in zip(plan["assets"], state["assets"]):
        asset_id = planned["id"]
        expected_reference = f"assets/references/{folder}/{asset_id}.png"
        require(planned.get("reference") == expected_reference and
                planned.get("targetPolycount") == 15000 and
                all(asset.get(key) == planned.get(key) for key in
                    ("id", "name", "scientificName", "reference", "targetPolycount")),
                f"Plan or identity mismatch: {asset_id}")
        require(asset.get("status") == "ready" and asset.get("task", {}).get("status") == "SUCCEEDED",
                f"All models must be ready: {asset_id}")
        task = asset["task"]
        require(isinstance(task.get("id"), str) and
                re.fullmatch(r"[A-Za-z0-9_-]{1,128}", task["id"]) and task["id"] not in task_ids,
                "Missing, duplicate or invalid task ID")
        task_ids.add(task["id"])
        credit = task.get("consumedCredits")
        require(type(credit) in (int, float) and math.isfinite(credit) and credit >= 0,
                "Missing or invalid reported credit usage")
        credits.append(credit)
        reference = checked_bytes(inside(root, expected_reference),
                                  {"bytes": asset.get("referenceBytes"),
                                   "sha256": asset.get("referenceSha256")}, 20 * 1024 * 1024)
        verify_image(reference, "PNG")
        require(asset.get("model", {}).get("file") == f"{asset_id}.glb", "Invalid model filename")
        original = inside(root, f"generated/{folder}/{asset_id}.glb")
        checked_bytes(original, asset["model"], 80 * 1024 * 1024)
        read_glb(original)
        thumbnails = []
        require(set(asset.get("thumbnails", {})) == set(VIEWS), "Four review views are required")
        for view in VIEWS:
            receipt = asset["thumbnails"][view]
            filename = receipt.get("file")
            require(filename in (f"{asset_id}-{view}.png", f"{asset_id}-{view}.jpg"),
                    "Invalid review thumbnail filename")
            image = checked_bytes(inside(root, f"generated/{folder}/{filename}"), receipt,
                                  8 * 1024 * 1024)
            verify_image(image, "PNG" if filename.endswith(".png") else "JPEG")
            thumbnails.append({"view": view, "file": filename,
                               "bytes": len(image), "sha256": sha(image)})
        validated.append((planned, asset, original, thumbnails))
    plan_hash = sha(json.dumps(
        {"plan": plan, "references": [asset["referenceSha256"] for asset in state["assets"]]},
        ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8"))
    require(state.get("planHash") == plan_hash, "Plan/reference hash mismatch")
    require(type(state.get("consumedCredits")) in (int, float) and
            math.isfinite(state["consumedCredits"]) and state["consumedCredits"] == sum(credits),
            "Batch credit total differs from individual task receipts")
    return validated, plan_hash, sum(credits)


def validate_workflow(workflow_run):
    require(isinstance(workflow_run, str) and re.fullmatch(
        r"https://github\.com/amyleesterling/the-animal-game/actions/runs/[0-9]+", workflow_run),
        "Provide the exact repository's GitHub Actions run URL without query parameters")


def generation_receipt(record, workflow_run):
    planned, asset, _, thumbnails = record
    return {
        "id": asset["id"], "imageTaskId": asset["task"]["id"],
        "reportedCredits": asset["task"]["consumedCredits"], "workflowRun": workflow_run,
        "referenceImage": planned["reference"], "referenceSha256": asset["referenceSha256"],
        "sourceBytes": asset["model"]["bytes"], "sourceSha256": asset["model"]["sha256"],
        "reviewThumbnails": thumbnails,
    }


def load_overlay(root, folder, batch, ids, state_path, workflow_run, previous_records):
    """Validate a bounded repair batch without losing any preceding receipt."""
    require(state_path is not None and workflow_run is not None,
            f"Provide both the {folder} state and workflow run")
    validate_workflow(workflow_run)
    path = inside(root, state_path)
    require(path == inside(root, f"generated/{folder}/batch-state.json"),
            f"Use the expected {folder} batch-state.json")
    plan = read_json(inside(root, f"scripts/{folder}.json"))
    require(plan.get("batch") == batch and plan.get("request") == REQUEST and
            plan.get("concurrency") in (1, 2) and plan.get("estimatedCreditsPerAsset") == 30 and
            tuple(asset.get("id") for asset in plan.get("assets", [])) == tuple(ids),
            f"Expected exactly the authorized {folder} species")
    records, plan_hash, credits = validate_batch(root, folder, read_json(path), plan)
    previous_tasks = {record[1]["task"]["id"] for record in previous_records}
    previous_by_id = {}
    for record in previous_records:
        previous_by_id.setdefault(record[1]["id"], []).append(record[1])
    for _, asset, _, _ in records:
        history = previous_by_id[asset["id"]]
        require(all(asset["name"] == old["name"] and
                    asset["scientificName"] == old["scientificName"] for old in history),
                "Revision species identity changed")
        require(asset["task"]["id"] not in previous_tasks, "Revision reused a previous task ID")
        require(all(asset["referenceSha256"] != old["referenceSha256"] for old in history),
                "A revision must use its new reference image")
    return records, {
        "batch": batch, "planHash": plan_hash, "workflowRun": workflow_run,
        "reportedCredits": credits, "reviewedCardinalRenders": True,
        "assets": [generation_receipt(record, workflow_run) for record in records],
    }


def load_authored_porcupine(root, manifest_path, reviewed, planned):
    """Accept only the reviewed local porcupine builder's hash-bound GLB."""
    require(reviewed, "Visually accept the authored porcupine before preparation")
    path = inside(root, manifest_path)
    require(path == inside(root, "generated/authored-porcupine/manifest.json"),
            "Use the expected authored porcupine manifest")
    receipt = read_json(path)
    require(isinstance(receipt, dict) and receipt.get("schemaVersion") == 1 and
            receipt.get("id") == "cape-porcupine" and receipt.get("authored") is True and
            receipt.get("file") == "cape-porcupine.glb" and
            receipt.get("sourceScript") == "scripts/build-cape-porcupine.mjs",
            "Expected exactly the authored Cape porcupine replacement")
    script = inside(root, receipt["sourceScript"])
    script_bytes = checked_bytes(script, {"bytes": script.stat().st_size,
                                          "sha256": receipt.get("sourceScriptSha256")}, 2 * 1024 * 1024)
    source_path = "generated/authored-porcupine/cape-porcupine.glb"
    source = inside(root, source_path)
    source_bytes = checked_bytes(source, receipt, 80 * 1024 * 1024)
    read_glb(source)
    for key in ("authorship", "textureProvenance"):
        require(isinstance(receipt.get(key), str) and 0 < len(receipt[key]) <= 2000,
                f"Authored porcupine requires a concise {key} statement")
    metadata = {
        "authored": True, "reviewedAuthoredPorcupine": True, "reportedCredits": 0,
        "generationMethod": "Locally authored procedural Cape porcupine geometry and textures",
        "sourceScript": receipt["sourceScript"], "sourceScriptBytes": len(script_bytes),
        "sourceScriptSha256": sha(script_bytes), "sourceFile": source_path,
        "sourceBytes": len(source_bytes), "sourceSha256": sha(source_bytes),
        "authorship": receipt["authorship"], "textureProvenance": receipt["textureProvenance"],
    }
    require("license" not in receipt and "licenseUrl" not in receipt,
            "The repository has not selected a distribution license; omit new license declarations")
    asset = {key: planned[key] for key in ("id", "name", "scientificName")}
    asset["authored"] = True
    return (planned, asset, source, []), metadata


def prepare(workflow_run, reviewed=False, root=ROOT, optimize=None,
            revision_state=None, revision_workflow_run=None,
            porcupine_state=None, porcupine_workflow_run=None,
            authored_porcupine_manifest=None, reviewed_authored_porcupine=False):
    require(reviewed, "Review every model's four cardinal renders before preparation")
    validate_workflow(workflow_run)
    root = Path(root).resolve()
    source = inside(root, "generated/savanna-expansion")
    state = read_json(inside(root, "generated/savanna-expansion/batch-state.json"))
    plan = read_json(inside(root, "scripts/savanna-expansion.json"))
    require(plan.get("batch") == BATCH and plan.get("request") == REQUEST and
            plan.get("concurrency") == 2 and plan.get("estimatedCreditsPerAsset") == 30 and
            tuple(asset.get("id") for asset in plan.get("assets", [])) == IDS,
            "Unexpected generation plan")
    require(state.get("schemaVersion") == 1 and state.get("batch") == BATCH and
            state.get("request") == REQUEST and
            tuple(asset.get("id") for asset in state.get("assets", [])) == IDS,
            "Expected the exact version-one 25-model batch")
    inventory_path = inside(root, "public/assets-manifest.json")
    inventory = read_json(inventory_path)
    require(isinstance(inventory.get("assets"), list), "Invalid existing asset inventory")
    validated, plan_hash, original_credits = validate_batch(root, "savanna-expansion", state, plan)
    original_validated = list(validated)
    require((porcupine_state is None and porcupine_workflow_run is None) or
            (revision_state is not None and revision_workflow_run is not None),
            "The final porcupine overlay requires the preceding revision batch")
    selected = {record[1]["id"]: record for record in original_validated}
    selected_runs = {asset_id: workflow_run for asset_id in selected}
    rejected_history = {asset_id: [] for asset_id in selected}
    all_records = list(original_validated)
    overlays = []
    for key, folder, batch, ids, path, run, rejection in (
        ("revisionGeneration", "savanna-revisions", REVISION_BATCH, REVISION_IDS,
         revision_state, revision_workflow_run,
         "Original model rejected during cardinal-render review for slab-like, flattened anatomy."),
        ("porcupineGeneration", "savanna-porcupine", PORCUPINE_BATCH, ("cape-porcupine",),
         porcupine_state, porcupine_workflow_run,
         "First porcupine repair rejected during cardinal-render review: detached head and quills, without a complete torso and legs."),
    ):
        if path is None and run is None:
            continue
        records, generation = load_overlay(root, folder, batch, ids, path, run, all_records)
        for record in records:
            asset_id = record[1]["id"]
            rejected_history[asset_id].append({
                **generation_receipt(selected[asset_id], selected_runs[asset_id]),
                "rejectionReason": rejection,
            })
            selected[asset_id] = record
            selected_runs[asset_id] = run
        all_records.extend(records)
        overlays.append((key, generation))
    authored_metadata = None
    if authored_porcupine_manifest is not None or reviewed_authored_porcupine:
        require(authored_porcupine_manifest is not None and reviewed_authored_porcupine,
                "Provide the authored porcupine manifest and its explicit visual acceptance")
        require(revision_state is not None and porcupine_state is not None and
                revision_workflow_run is not None and porcupine_workflow_run is not None,
                "The authored replacement requires all three paid generation histories")
        record, authored_metadata = load_authored_porcupine(
            root, authored_porcupine_manifest, reviewed_authored_porcupine,
            selected["cape-porcupine"][0])
        rejected_history["cape-porcupine"].append({
            **generation_receipt(selected["cape-porcupine"], selected_runs["cape-porcupine"]),
            "rejectionReason": "Second porcupine repair rejected during cardinal-render review: no complete torso or legs.",
        })
        selected["cape-porcupine"] = record
    validated = [selected[asset_id] for asset_id in IDS]
    require(all((authored_metadata is not None and record[1]["id"] == "cape-porcupine") or
                record[1]["task"]["id"] not in REJECTED_TASK_IDS for record in validated),
            "A selected model was rejected during anatomy review; provide all reviewed repair overlays")
    total_credits = original_credits + sum(generation["reportedCredits"] for _, generation in overlays)
    optimize = optimize or load_optimizer()
    reports = []
    with TemporaryDirectory(prefix=".savanna-prepare-", dir=source.parent) as temporary:
        stage = Path(temporary)
        files = []
        for planned, asset, original, thumbnails in validated:
            asset_id = asset["id"]
            destination = stage / f"{asset_id}.glb"
            with redirect_stdout(io.StringIO()) as output:
                optimize(original, destination)
            result = json.loads(output.getvalue())
            before, before_binary, raw, _ = read_glb(original)
            after, after_binary, optimized, triangles = read_glb(destination)
            verify_preserved(before, before_binary, after, after_binary)
            require(result["sourceSha256"] == sha(raw) and result["outputSha256"] == sha(optimized),
                    "Optimizer report hash mismatch")
            texture_reports = [{key: texture[key] for key in ("sourceSize", "outputSize", "mimeType")}
                               for texture in result["textures"]]
            source_metadata = authored_metadata if authored_metadata is not None and asset_id == "cape-porcupine" else {
                "generationMethod": "Meshy Image-to-3D, meshy-7.1 standard geometry and textures",
                "imageTaskId": asset["task"]["id"], "reportedCredits": asset["task"]["consumedCredits"],
                "referenceImage": planned["reference"], "referenceSha256": asset["referenceSha256"],
                "reviewThumbnails": thumbnails, "workflowRun": selected_runs[asset_id],
            }
            reports.append({
                "id": asset_id, "name": planned["name"], "scientificName": planned["scientificName"],
                "file": f"{asset_id}.glb", "status": "ready", "bytes": len(optimized),
                "sha256": sha(optimized), "sourceBytes": len(raw), "sourceSha256": sha(raw),
                "polygonCount": triangles, "textures": texture_reports,
                "embeddedAnimations": [clip.get("name", "Unnamed clip") for clip in after.get("animations", [])],
                "skinCount": len(after.get("skins", [])),
                **source_metadata,
                "nonImageBuffersPreserved": True,
                "modifications": "Embedded textures resized to at most 1024px; every non-image buffer and authored model metadata verified unchanged.",
            })
            history = rejected_history[asset_id]
            if history:
                reports[-1]["replacedOriginal"] = history[0]
            if len(history) > 1:
                reports[-1]["replacedRevisions"] = history[1:]
            files.append((destination, f"public/models/savanna-expansion/{asset_id}.glb"))
        manifest = {
            "schemaVersion": 1, "batch": BATCH, "workflowRun": workflow_run,
            "reportedCredits": total_credits, "reviewStatus": "Four cardinal renders reviewed before preparation; generated models remain subject to in-game anatomy review.",
            "preparationScript": "scripts/prepare-savanna-expansion.py", "animals": reports,
        }
        # Public documents are constructed from an allowlist. Never copy raw
        # API state, account balance, service URLs, errors, or base64 references.
        provenance = {
            "schemaVersion": 1, "batch": BATCH, "planHash": plan_hash,
            "request": REQUEST, "workflowRun": workflow_run,
            "estimatedCredits": 750 + sum(30 * len(generation["assets"]) for _, generation in overlays),
            "reportedCredits": total_credits,
            "reviewedCardinalRenders": True,
            "preparationScript": "scripts/prepare-savanna-expansion.py",
            "optimizer": "scripts/optimize-character.py", "pillowVersion": Image.__version__,
            "assets": reports,
        }
        provenance["originalGeneration"] = {
            "batch": BATCH, "planHash": plan_hash, "workflowRun": workflow_run,
            "reportedCredits": original_credits,
            "assets": [generation_receipt(record, workflow_run) for record in original_validated],
        }
        for key, generation in overlays:
            manifest[key] = generation
            provenance[key] = generation
        if authored_metadata is not None:
            manifest["authoredPorcupine"] = authored_metadata
            provenance["authoredPorcupine"] = authored_metadata
        inventory_entry = {
            "id": INVENTORY_ID, "type": "glb-model-batch",
            "title": ("25 African savanna animals: 24 Meshy models and one authored Cape porcupine"
                      if authored_metadata else "25 image-guided African savanna animal models"),
            "path": "public/models/savanna-expansion/manifest.json", "modelCount": 25,
            "bytes": sum(item["bytes"] for item in reports),
            "reportedGenerationCredits": total_credits, "source": workflow_run,
            "preparationRecord": "docs/SAVANNA_EXPANSION_GENERATION.json",
            "provenance": ("24 Meshy Image-to-3D models plus a locally authored Cape porcupine. All three rejected Meshy porcupine attempts remain in the generation history. No asset license is inferred from an API credential."
                           if authored_metadata else "Generated at Amy's request using the committed reference images and Meshy Image-to-3D. No asset license is inferred from the API credential."),
            "reviewStatus": manifest["reviewStatus"],
        }
        inventory["assets"] = [entry for entry in inventory["assets"] if entry.get("id") != INVENTORY_ID]
        inventory["assets"].append(inventory_entry)
        for filename, relative, payload in (
            ("manifest.json", "public/models/savanna-expansion/manifest.json", manifest),
            ("generation.json", "docs/SAVANNA_EXPANSION_GENERATION.json", provenance),
            ("inventory.json", "public/assets-manifest.json", inventory),
        ):
            file = stage / filename
            file.write_bytes(json_bytes(payload))
            files.append((file, relative))
        publish(root, stage, files)
    summary = {"models": len(reports), "totalBytes": sum(item["bytes"] for item in reports),
               "reportedCredits": total_credits, "nonImageBuffersPreserved": True}
    print(json.dumps(summary, indent=2))
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workflow-run", required=True)
    parser.add_argument("--reviewed-cardinal-renders", action="store_true")
    parser.add_argument("--revision-state", type=Path)
    parser.add_argument("--revision-workflow-run")
    parser.add_argument("--porcupine-state", type=Path)
    parser.add_argument("--porcupine-workflow-run")
    parser.add_argument("--authored-porcupine-manifest", type=Path)
    parser.add_argument("--reviewed-authored-porcupine", action="store_true")
    args = parser.parse_args()
    prepare(args.workflow_run, args.reviewed_cardinal_renders,
            revision_state=args.revision_state, revision_workflow_run=args.revision_workflow_run,
            porcupine_state=args.porcupine_state, porcupine_workflow_run=args.porcupine_workflow_run,
            authored_porcupine_manifest=args.authored_porcupine_manifest,
            reviewed_authored_porcupine=args.reviewed_authored_porcupine)
