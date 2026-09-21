"""Offline preparation regressions. Run with Python 3.12+ and Pillow:
python -m unittest discover -s tests -p test_prepare_savanna_expansion.py -v
Only synthetic GLBs in owned temporary directories are prepared.
"""

from contextlib import redirect_stdout
from copy import deepcopy
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "prepare_savanna", PROJECT / "scripts/prepare-savanna-expansion.py")
prep = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(prep)
RUN = "https://github.com/amyleesterling/the-animal-game/actions/runs/123"


def png(size=(16, 16), alpha=False):
    image = Image.new("RGBA" if alpha else "RGB", size,
                      (80, 120, 180, 100) if alpha else (80, 120, 180))
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def synthetic_glb(texture):
    positions = struct.pack("<9f", 0, 0, 0, 1, 0, 0, 0, 1, 0)
    indices = struct.pack("<3H", 0, 1, 2)
    binary = positions + indices + b"\0\0" + texture
    binary += b"\0" * (-len(binary) % 4)
    model = {
        "asset": {"version": "2.0", "generator": "Offline test fixture"},
        "buffers": [{"byteLength": len(binary)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": 36},
            {"buffer": 0, "byteOffset": 36, "byteLength": 6},
            {"buffer": 0, "byteOffset": 44, "byteLength": len(texture)},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": 3, "type": "VEC3"},
            {"bufferView": 1, "componentType": 5123, "count": 3, "type": "SCALAR"},
        ],
        "images": [{"bufferView": 2, "mimeType": "image/png"}],
        "textures": [{"source": 0}],
        "materials": [{"pbrMetallicRoughness": {"baseColorTexture": {"index": 0}}}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "material": 0}]}],
        "nodes": [{"mesh": 0, "translation": [1, 2, 3]}],
        "scenes": [{"nodes": [0]}], "scene": 0,
    }
    encoded = json.dumps(model, separators=(",", ":")).encode()
    encoded += b" " * (-len(encoded) % 4)
    return (struct.pack("<III", 0x46546C67, 2, 28 + len(encoded) + len(binary))
            + struct.pack("<II", len(encoded), 0x4E4F534A) + encoded
            + struct.pack("<II", len(binary), 0x004E4942) + binary)


class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = TemporaryDirectory(prefix="savanna-prepare-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.source = self.root / "generated/savanna-expansion"
        self.source.mkdir(parents=True)
        self.plan = json.loads((PROJECT / "scripts/savanna-expansion.json").read_text(encoding="utf-8"))
        self.write("scripts/savanna-expansion.json", prep.json_bytes(self.plan))
        self.inventory = prep.json_bytes({"assets": [{"id": "existing-zebra", "path": "keep.glb"}]})
        self.write("public/assets-manifest.json", self.inventory)
        self.reference = png()
        small_glb = synthetic_glb(png())
        large_glb = synthetic_glb(png((2048, 1024), alpha=True))
        assets = []
        for index, planned in enumerate(self.plan["assets"]):
            asset_id = planned["id"]
            self.write(planned["reference"], self.reference)
            data = large_glb if index == 0 else small_glb
            self.write(f"generated/savanna-expansion/{asset_id}.glb", data)
            thumbnails = {}
            for view in prep.VIEWS:
                filename = f"{asset_id}-{view}.png"
                self.write(f"generated/savanna-expansion/{filename}", self.reference)
                thumbnails[view] = self.receipt(filename, self.reference)
            assets.append({**planned, "referenceBytes": len(self.reference),
                           "referenceSha256": prep.sha(self.reference), "status": "ready",
                           "task": {"id": f"offline-{index}", "status": "SUCCEEDED",
                                    "consumedCredits": 30, "submissionStartedAt": "2026-09-20T00:00:00Z"},
                           "model": self.receipt(f"{asset_id}.glb", data), "thumbnails": thumbnails})
        self.state = {"schemaVersion": 1, "batch": prep.BATCH, "request": self.plan["request"],
                      "consumedCredits": 750, "assets": assets}
        self.state["planHash"] = prep.sha(json.dumps(
            {"plan": self.plan, "references": [item["referenceSha256"] for item in assets]},
            ensure_ascii=False, separators=(",", ":")).encode())
        self.save_state()

    def write(self, path, data):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return target

    def receipt(self, filename, data):
        return {"file": filename, "bytes": len(data), "sha256": prep.sha(data)}

    def save_state(self):
        self.write("generated/savanna-expansion/batch-state.json", prep.json_bytes(self.state))

    def run_prepare(self, **kwargs):
        with redirect_stdout(io.StringIO()):
            return prep.prepare(RUN, reviewed=True, root=self.root, **kwargs)

    def assert_unpublished(self):
        self.assertEqual((self.root / "public/assets-manifest.json").read_bytes(), self.inventory)
        self.assertFalse((self.root / "docs/SAVANNA_EXPANSION_GENERATION.json").exists())
        self.assertEqual(list((self.root / "public/models").rglob("*.glb")), [])

    def add_overlay(self, folder, batch, ids, size):
        plan = {**deepcopy(self.plan), "batch": batch, "assets": []}
        reference = png((size, size))
        model = synthetic_glb(png((size * 2, size)))
        assets = []
        for index, asset_id in enumerate(ids):
            planned = deepcopy(next(asset for asset in self.plan["assets"] if asset["id"] == asset_id))
            planned["reference"] = f"assets/references/{folder}/{asset_id}.png"
            plan["assets"].append(planned)
            self.write(planned["reference"], reference)
            self.write(f"generated/{folder}/{asset_id}.glb", model)
            thumbnails = {}
            for view in prep.VIEWS:
                filename = f"{asset_id}-{view}.png"
                self.write(f"generated/{folder}/{filename}", reference)
                thumbnails[view] = self.receipt(filename, reference)
            assets.append({**planned, "referenceBytes": len(reference),
                           "referenceSha256": prep.sha(reference), "status": "ready",
                           "task": {"id": f"{folder}-{index}", "status": "SUCCEEDED",
                                    "consumedCredits": 30, "submissionStartedAt": "2026-09-21T00:00:00Z"},
                           "model": self.receipt(f"{asset_id}.glb", model), "thumbnails": thumbnails})
        state = {"schemaVersion": 1, "batch": batch, "request": plan["request"],
                 "consumedCredits": 30 * len(ids), "assets": assets}
        state["planHash"] = prep.sha(json.dumps(
            {"plan": plan, "references": [asset["referenceSha256"] for asset in assets]},
            ensure_ascii=False, separators=(",", ":")).encode())
        self.write(f"scripts/{folder}.json", prep.json_bytes(plan))
        self.write(f"generated/{folder}/batch-state.json", prep.json_bytes(state))
        return state

    def add_revisions(self):
        return self.add_overlay("savanna-revisions", prep.REVISION_BATCH, prep.REVISION_IDS, 17)

    def add_porcupine(self):
        return self.add_overlay("savanna-porcupine", prep.PORCUPINE_BATCH, ("cape-porcupine",), 18)

    def add_authored_porcupine(self):
        script = b"// Synthetic authored-porcupine builder fixture; no execution.\n"
        self.write("scripts/build-cape-porcupine.mjs", script)
        data = synthetic_glb(png((96, 64)))
        self.write("generated/authored-porcupine/cape-porcupine.glb", data)
        receipt = {
            "schemaVersion": 1, "id": "cape-porcupine", "authored": True,
            "sourceScript": "scripts/build-cape-porcupine.mjs", "sourceScriptSha256": prep.sha(script),
            **self.receipt("cape-porcupine.glb", data),
            "authorship": "Original local procedural geometry authored for the game.",
            "textureProvenance": "Original procedural palette and quill-band PNGs.",
        }
        self.write("generated/authored-porcupine/manifest.json", prep.json_bytes(receipt))
        return receipt

    def authored_options(self):
        return {
            "revision_state": "generated/savanna-revisions/batch-state.json",
            "revision_workflow_run": RUN + "4",
            "porcupine_state": "generated/savanna-porcupine/batch-state.json",
            "porcupine_workflow_run": RUN + "5",
            "authored_porcupine_manifest": "generated/authored-porcupine/manifest.json",
            "reviewed_authored_porcupine": True,
        }

    def test_authored_replacement_retains_all_three_failures_and_870_paid_credits(self):
        revision = self.add_revisions()
        porcupine = self.add_porcupine()
        authored = self.add_authored_porcupine()
        original = next(asset for asset in self.state["assets"] if asset["id"] == "cape-porcupine")
        original["task"]["id"] = "01a0c199-e5f5-72b0-9e5a-a0e3a49dab7f"
        revision["assets"][0]["task"]["id"] = "01a0c416-5c43-7532-a202-5a38f016d670"
        porcupine["assets"][0]["task"]["id"] = "01a0c420-7580-7047-8554-6791d2a8bd59"
        self.save_state()
        self.write("generated/savanna-revisions/batch-state.json", prep.json_bytes(revision))
        self.write("generated/savanna-porcupine/batch-state.json", prep.json_bytes(porcupine))
        result = self.run_prepare(**self.authored_options())
        self.assertEqual(result["reportedCredits"], 870)
        manifest = json.loads((self.root / "public/models/savanna-expansion/manifest.json").read_bytes())
        output = next(asset for asset in manifest["animals"] if asset["id"] == "cape-porcupine")
        self.assertTrue(output["authored"])
        self.assertTrue(output["reviewedAuthoredPorcupine"])
        self.assertEqual(output["reportedCredits"], 0)
        self.assertEqual(output["sourceSha256"], authored["sha256"])
        self.assertEqual(output["sourceScriptSha256"], authored["sourceScriptSha256"])
        self.assertIn("Locally authored", output["generationMethod"])
        for misleading in ("imageTaskId", "workflowRun", "referenceImage", "referenceSha256"):
            self.assertNotIn(misleading, output)
        rejected = [output["replacedOriginal"], *output["replacedRevisions"]]
        self.assertEqual([item["imageTaskId"] for item in rejected],
                         [original["task"]["id"], revision["assets"][0]["task"]["id"],
                          porcupine["assets"][0]["task"]["id"]])
        self.assertEqual(sum(item["reportedCredits"] for item in rejected), 90)
        self.assertTrue(all(item["rejectionReason"] for item in rejected))
        provenance = json.loads((self.root / "docs/SAVANNA_EXPANSION_GENERATION.json").read_bytes())
        self.assertEqual(provenance["reportedCredits"], 870)
        self.assertEqual(provenance["authoredPorcupine"]["sourceScript"], "scripts/build-cape-porcupine.mjs")
        self.assertEqual(len(provenance["originalGeneration"]["assets"]), 25)
        self.assertEqual(len(provenance["revisionGeneration"]["assets"]), 3)
        self.assertEqual(len(provenance["porcupineGeneration"]["assets"]), 1)
        self.assertEqual(len(manifest["animals"]), 25)
        for asset in manifest["animals"]:
            if asset["id"] == "cape-porcupine":
                continue
            expected = next(item for item in (revision["assets"] if asset["id"] in prep.REVISION_IDS
                                              else self.state["assets"]) if item["id"] == asset["id"])
            self.assertEqual(asset["imageTaskId"], expected["task"]["id"])
            self.assertEqual(asset["sourceSha256"], expected["model"]["sha256"])
        inventory = json.loads((self.root / "public/assets-manifest.json").read_bytes())
        self.assertIn("24 Meshy", inventory["assets"][-1]["title"])
        self.assertEqual(inventory["assets"][-1]["reportedGenerationCredits"], 870)

    def test_authored_replacement_requires_review_complete_history_and_matching_hashes(self):
        self.add_revisions()
        porcupine = self.add_porcupine()
        porcupine["assets"][0]["task"]["id"] = "01a0c420-7580-7047-8554-6791d2a8bd59"
        self.write("generated/savanna-porcupine/batch-state.json", prep.json_bytes(porcupine))
        receipt = self.add_authored_porcupine()
        options = self.authored_options()
        with self.assertRaisesRegex(ValueError, "visual acceptance"):
            self.run_prepare(**{**options, "reviewed_authored_porcupine": False})
        with self.assertRaisesRegex(ValueError, "all three paid"):
            self.run_prepare(**{**options, "porcupine_state": None, "porcupine_workflow_run": None})
        with self.assertRaisesRegex(ValueError, "rejected during anatomy"):
            self.run_prepare(**{**options, "authored_porcupine_manifest": None,
                                "reviewed_authored_porcupine": False})
        mutations = {
            "wrong species": lambda data: data.update(id="bat-eared-fox"),
            "wrong builder": lambda data: data.update(sourceScript="scripts/another.mjs"),
            "changed builder hash": lambda data: data.update(sourceScriptSha256="0" * 64),
            "changed model hash": lambda data: data.update(sha256="0" * 64),
            "missing provenance": lambda data: data.pop("textureProvenance"),
            "unspecified distribution license": lambda data: data.update(license="CC0-1.0"),
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label):
                changed = deepcopy(receipt)
                mutate(changed)
                self.write(options["authored_porcupine_manifest"], prep.json_bytes(changed))
                with self.assertRaises(ValueError):
                    self.run_prepare(**options)
                self.assert_unpublished()

    def test_final_porcupine_override_preserves_two_rejected_candidates_and_870_credits(self):
        revision = self.add_revisions()
        porcupine = self.add_porcupine()
        original = next(asset for asset in self.state["assets"] if asset["id"] == "cape-porcupine")
        original["task"]["id"] = "01a0c199-e5f5-72b0-9e5a-a0e3a49dab7f"
        self.save_state()
        first_repair = revision["assets"][0]
        first_repair["task"]["id"] = "01a0c416-5c43-7532-a202-5a38f016d670"
        self.write("generated/savanna-revisions/batch-state.json", prep.json_bytes(revision))
        result = self.run_prepare(
            revision_state="generated/savanna-revisions/batch-state.json", revision_workflow_run=RUN + "4",
            porcupine_state="generated/savanna-porcupine/batch-state.json", porcupine_workflow_run=RUN + "5")
        self.assertEqual(result["reportedCredits"], 870)
        manifest_path = self.root / "public/models/savanna-expansion/manifest.json"
        manifest = json.loads(manifest_path.read_bytes())
        provenance = json.loads((self.root / "docs/SAVANNA_EXPANSION_GENERATION.json").read_bytes())
        self.assertEqual(len(manifest["animals"]), 25)
        self.assertEqual(provenance["reportedCredits"], 870)
        self.assertEqual(provenance["estimatedCredits"], 870)
        for key, credits, count in (("originalGeneration", 750, 25), ("revisionGeneration", 90, 3),
                                    ("porcupineGeneration", 30, 1)):
            self.assertEqual(provenance[key]["reportedCredits"], credits)
            self.assertEqual(len(provenance[key]["assets"]), count)
        output = next(asset for asset in manifest["animals"] if asset["id"] == "cape-porcupine")
        final = porcupine["assets"][0]
        self.assertEqual(output["imageTaskId"], final["task"]["id"])
        self.assertEqual(output["sourceSha256"], final["model"]["sha256"])
        self.assertEqual(output["workflowRun"], RUN + "5")
        self.assertEqual(output["replacedOriginal"]["imageTaskId"], original["task"]["id"])
        self.assertEqual(len(output["replacedRevisions"]), 1)
        self.assertEqual(output["replacedRevisions"][0]["imageTaskId"], first_repair["task"]["id"])
        self.assertEqual(output["replacedRevisions"][0]["sourceSha256"], first_repair["model"]["sha256"])
        self.assertIn("detached head", output["replacedRevisions"][0]["rejectionReason"])
        before, before_binary, _, _ = prep.read_glb(self.root / "generated/savanna-porcupine/cape-porcupine.glb")
        after, after_binary, _, _ = prep.read_glb(manifest_path.parent / "cape-porcupine.glb")
        prep.verify_preserved(before, before_binary, after, after_binary)
        for asset in manifest["animals"]:
            self.assertNotIn(asset["imageTaskId"], prep.REJECTED_TASK_IDS)
            if asset["id"] in ("south-african-springhare", "bat-eared-fox"):
                self.assertEqual(asset["workflowRun"], RUN + "4")
                self.assertNotIn("replacedRevisions", asset)
        inventory = json.loads((self.root / "public/assets-manifest.json").read_bytes())
        self.assertEqual(inventory["assets"][-1]["reportedGenerationCredits"], 870)

    def test_known_rejected_candidates_cannot_be_selected_when_overlays_are_omitted(self):
        original = next(asset for asset in self.state["assets"] if asset["id"] == "cape-porcupine")
        original["task"]["id"] = "01a0c199-e5f5-72b0-9e5a-a0e3a49dab7f"
        self.save_state()
        with self.assertRaisesRegex(ValueError, "rejected during anatomy review"):
            self.run_prepare()
        self.assert_unpublished()
        revision = self.add_revisions()
        revision["assets"][0]["task"]["id"] = "01a0c416-5c43-7532-a202-5a38f016d670"
        self.write("generated/savanna-revisions/batch-state.json", prep.json_bytes(revision))
        with self.assertRaisesRegex(ValueError, "rejected during anatomy review"):
            self.run_prepare(revision_state="generated/savanna-revisions/batch-state.json",
                             revision_workflow_run=RUN + "4")
        self.assert_unpublished()

    def test_final_overlay_requires_valid_preceding_batch_and_a_new_task(self):
        self.add_revisions()
        original_final = self.add_porcupine()
        options = {"porcupine_state": "generated/savanna-porcupine/batch-state.json",
                   "porcupine_workflow_run": RUN + "5"}
        with self.assertRaisesRegex(ValueError, "preceding revision batch"):
            self.run_prepare(**options)
        options.update(revision_state="generated/savanna-revisions/batch-state.json",
                       revision_workflow_run=RUN + "4")
        mutations = {
            "reused original ID": lambda state: state["assets"][0]["task"].update(id="offline-0"),
            "reused repair ID": lambda state: state["assets"][0]["task"].update(id="savanna-revisions-0"),
            "not ready": lambda state: state["assets"][0].update(status="failed"),
            "bad model hash": lambda state: state["assets"][0]["model"].update(sha256="0" * 64),
            "missing view": lambda state: state["assets"][0]["thumbnails"].pop("left"),
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label):
                state = deepcopy(original_final)
                mutate(state)
                self.write(options["porcupine_state"], prep.json_bytes(state))
                with self.assertRaises(ValueError):
                    self.run_prepare(**options)
                self.assert_unpublished()
        options.pop("porcupine_workflow_run")
        with self.assertRaisesRegex(ValueError, "Provide both"):
            self.run_prepare(**options)
        self.assert_unpublished()

    def test_three_revisions_replace_only_rejected_models_and_preserve_both_histories(self):
        revision = self.add_revisions()
        source_path = self.source / "batch-state.json"
        original_receipts = source_path.read_bytes()
        revision_path = self.root / "generated/savanna-revisions/batch-state.json"
        revision_receipts = revision_path.read_bytes()
        revision_run = RUN + "4"
        result = self.run_prepare(revision_state=revision_path, revision_workflow_run=revision_run)
        self.assertEqual(result["reportedCredits"], 840)
        manifest = json.loads((self.root / "public/models/savanna-expansion/manifest.json").read_bytes())
        provenance = json.loads((self.root / "docs/SAVANNA_EXPANSION_GENERATION.json").read_bytes())
        self.assertEqual(len(manifest["animals"]), 25)
        self.assertEqual(provenance["originalGeneration"]["planHash"], self.state["planHash"])
        self.assertEqual(provenance["originalGeneration"]["reportedCredits"], 750)
        self.assertEqual(len(provenance["originalGeneration"]["assets"]), 25)
        self.assertEqual(provenance["revisionGeneration"]["planHash"], revision["planHash"])
        self.assertEqual(provenance["revisionGeneration"]["reportedCredits"], 90)
        self.assertEqual(provenance["reportedCredits"], 840)
        self.assertEqual(provenance["estimatedCredits"], 840)
        for output in manifest["animals"]:
            original = next(asset for asset in self.state["assets"] if asset["id"] == output["id"])
            if output["id"] in prep.REVISION_IDS:
                revised = next(asset for asset in revision["assets"] if asset["id"] == output["id"])
                self.assertEqual(output["sourceSha256"], revised["model"]["sha256"])
                self.assertEqual(output["imageTaskId"], revised["task"]["id"])
                self.assertEqual(output["workflowRun"], revision_run)
                self.assertEqual(output["replacedOriginal"]["imageTaskId"], original["task"]["id"])
                self.assertEqual(output["replacedOriginal"]["referenceSha256"], original["referenceSha256"])
                self.assertIn("flattened", output["replacedOriginal"]["rejectionReason"])
            else:
                self.assertEqual(output["sourceSha256"], original["model"]["sha256"])
                self.assertEqual(output["workflowRun"], RUN)
                self.assertNotIn("replacedOriginal", output)
        self.assertEqual(source_path.read_bytes(), original_receipts)
        self.assertEqual(revision_path.read_bytes(), revision_receipts)

    def test_incomplete_duplicate_and_corrupt_revision_receipts_block_publication(self):
        original_revision = self.add_revisions()
        relative = "generated/savanna-revisions/batch-state.json"
        mutations = {
            "not ready": lambda state: state["assets"][0].update(status="failed"),
            "only two": lambda state: state["assets"].pop(),
            "old task ID": lambda state: state["assets"][0]["task"].update(id="offline-0"),
            "bad reference": lambda state: state["assets"][0].update(referenceSha256="0" * 64),
            "bad credit sum": lambda state: state.update(consumedCredits=60),
            "bad revision hash": lambda state: state.update(planHash="0" * 64),
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label):
                state = deepcopy(original_revision)
                mutate(state)
                self.write(relative, prep.json_bytes(state))
                with self.assertRaises(ValueError):
                    self.run_prepare(revision_state=relative, revision_workflow_run=RUN + "4")
                self.assert_unpublished()
        with self.assertRaisesRegex(ValueError, "Provide both"):
            self.run_prepare(revision_state=relative)
        self.assert_unpublished()

    def test_review_and_exact_workflow_required(self):
        with self.assertRaisesRegex(ValueError, "Review every model"):
            prep.prepare(RUN, root=self.root)
        with self.assertRaisesRegex(ValueError, "exact repository"):
            prep.prepare(RUN + "?private=secret", reviewed=True, root=self.root)
        self.assert_unpublished()

    def test_25_models_real_optimizer_preserves_geometry_alpha_and_sanitizes_provenance(self):
        self.state["accountBalance"] = "PRIVATE_TEST_BALANCE"
        self.state["assets"][0]["error"] = "PRIVATE_TEST_API_KEY"
        self.state["assets"][0]["task"]["model_urls"] = {"glb": "https://private.invalid/?signature=PRIVATE_TEST_URL"}
        self.save_state()
        result = self.run_prepare()
        self.assertEqual(result["models"], 25)
        self.assertEqual(result["reportedCredits"], 750)
        manifest_path = self.root / "public/models/savanna-expansion/manifest.json"
        manifest_bytes = manifest_path.read_bytes()
        manifest = json.loads(manifest_bytes)
        self.assertEqual([entry["id"] for entry in manifest["animals"]], list(prep.IDS))
        for entry in manifest["animals"]:
            original = self.source / entry["file"]
            output = manifest_path.parent / entry["file"]
            before, before_binary, _, _ = prep.read_glb(original)
            after, after_binary, data, triangles = prep.read_glb(output)
            prep.verify_preserved(before, before_binary, after, after_binary)
            self.assertEqual(entry["sha256"], prep.sha(data))
            self.assertEqual(triangles, 1)
            self.assertEqual(after["nodes"], before["nodes"])
        self.assertEqual(manifest["animals"][0]["textures"][0]["outputSize"], [1024, 512])
        self.assertEqual(manifest["animals"][0]["textures"][0]["mimeType"], "image/png")
        self.assertEqual(manifest["animals"][1]["textures"][0]["mimeType"], "image/jpeg")
        provenance = (self.root / "docs/SAVANNA_EXPANSION_GENERATION.json").read_text()
        inventory_path = self.root / "public/assets-manifest.json"
        for private in ("PRIVATE_TEST_BALANCE", "PRIVATE_TEST_API_KEY", "PRIVATE_TEST_URL", "model_urls"):
            self.assertNotIn(private, manifest_bytes.decode() + provenance + inventory_path.read_text())
        self.run_prepare()
        self.assertEqual(manifest_path.read_bytes(), manifest_bytes)
        inventory = json.loads(inventory_path.read_bytes())
        self.assertEqual(inventory["assets"][0], {"id": "existing-zebra", "path": "keep.glb"})
        self.assertEqual(sum(entry["id"] == prep.INVENTORY_ID for entry in inventory["assets"]), 1)

    def test_corrupt_or_incomplete_receipts_never_publish(self):
        original = deepcopy(self.state)
        mutations = {
            "cardinality": lambda state: state["assets"].pop(),
            "unready": lambda state: state["assets"][24].update(status="failed"),
            "duplicate task": lambda state: state["assets"][24]["task"].update(id="offline-0"),
            "model hash": lambda state: state["assets"][24]["model"].update(sha256="0" * 64),
            "reference hash": lambda state: state["assets"][24].update(referenceSha256="0" * 64),
            "missing view": lambda state: state["assets"][24]["thumbnails"].pop("left"),
            "unsafe path": lambda state: state["assets"][24]["model"].update(file="../elsewhere.glb"),
            "plan hash": lambda state: state.update(planHash="0" * 64),
            "credits": lambda state: state.update(consumedCredits=749),
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label):
                self.state = deepcopy(original)
                mutate(self.state)
                self.save_state()
                with self.assertRaises(ValueError):
                    self.run_prepare()
                self.assert_unpublished()

    def test_late_optimizer_failure_leaves_existing_public_files_untouched(self):
        optimize = prep.load_optimizer()
        calls = 0

        def fail_last(source, output):
            nonlocal calls
            calls += 1
            if calls == 25:
                raise RuntimeError("Synthetic final optimizer failure")
            optimize(source, output)

        with self.assertRaisesRegex(RuntimeError, "final optimizer"):
            self.run_prepare(optimize=fail_last)
        self.assertEqual(calls, 25)
        self.assert_unpublished()

    def test_geometry_and_metadata_mutations_are_rejected(self):
        original = self.source / (prep.IDS[0] + ".glb")
        model, binary, _, _ = prep.read_glb(original)
        with self.assertRaisesRegex(ValueError, "Non-image buffer"):
            prep.verify_preserved(model, binary, model, b"X" + binary[1:])
        changed = deepcopy(model)
        changed["nodes"][0]["translation"][0] = 9
        with self.assertRaisesRegex(ValueError, "Model metadata"):
            prep.verify_preserved(model, binary, changed, binary)

    def test_publish_failure_restores_previous_files_and_inventory(self):
        previous = self.write(f"public/models/savanna-expansion/{prep.IDS[0]}.glb", b"previous public asset")
        original_replace = prep.os.replace
        calls = 0

        def fail_once(source, target):
            nonlocal calls
            calls += 1
            self.assertEqual(Path(source).parent, Path(target).parent,
                             "Publication and rollback must both replace from a destination sibling")
            if calls == 3:
                raise OSError("Synthetic publication failure")
            return original_replace(source, target)

        with patch.object(prep.os, "replace", side_effect=fail_once):
            with self.assertRaisesRegex(OSError, "publication failure"):
                self.run_prepare()
        self.assertEqual(previous.read_bytes(), b"previous public asset")
        self.assertEqual(list(previous.parent.glob("*.glb")), [previous])
        self.assertEqual((self.root / "public/assets-manifest.json").read_bytes(), self.inventory)
        self.assertFalse((self.root / "docs/SAVANNA_EXPANSION_GENERATION.json").exists())
        self.assertEqual(list((self.root / "public").rglob("*.tmp")), [])


class PublishTests(unittest.TestCase):
    """Small file transactions; no image processing or production paths."""

    def setUp(self):
        self.temporary = TemporaryDirectory(prefix="savanna-publish-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.stage = self.root / "private-stage"
        self.stage.mkdir()
        self.target = self.root / "public" / "asset.glb"
        self.target.parent.mkdir()
        self.target.write_bytes(b"old destination bytes")
        self.source = self.stage / "new.glb"
        self.source.write_bytes(b"new staged bytes")

    def test_all_replacements_use_fresh_siblings_without_moving_staged_files(self):
        original_replace = prep.os.replace
        seen = []

        def inspect(source, target):
            source, target = Path(source), Path(target)
            self.assertEqual(source.parent, target.parent)
            self.assertNotEqual(source, self.source)
            self.assertEqual(source.read_bytes(), b"new staged bytes")
            seen.append((source, target))
            return original_replace(source, target)

        with patch.object(prep.os, "replace", side_effect=inspect):
            prep.publish(self.root, self.stage, [(self.source, "public/asset.glb")])
        self.assertEqual(len(seen), 1)
        self.assertEqual(self.target.read_bytes(), b"new staged bytes")
        self.assertEqual(self.source.read_bytes(), b"new staged bytes")
        self.assertEqual(list(self.target.parent.glob("*.tmp")), [])

    def test_failed_copy_cleans_partial_sibling_and_preserves_destination(self):
        def partial_copy(original, destination):
            destination.write(b"partial")
            raise OSError("Synthetic write failure")

        with patch.object(prep.shutil, "copyfileobj", side_effect=partial_copy):
            with self.assertRaisesRegex(OSError, "Synthetic write failure"):
                prep.replace_from_sibling(self.source, self.target)
        self.assertEqual(self.target.read_bytes(), b"old destination bytes")
        self.assertEqual(list(self.target.parent.glob("*.tmp")), [])

    def test_failed_replace_rolls_back_through_fresh_siblings_and_cleans_them(self):
        second = self.stage / "second.glb"
        second.write_bytes(b"second new bytes")
        original_replace = prep.os.replace
        calls = []

        def fail_second(source, target):
            source, target = Path(source), Path(target)
            self.assertEqual(source.parent, target.parent)
            calls.append(source.read_bytes())
            if len(calls) == 2:
                raise OSError("Synthetic replacement failure")
            return original_replace(source, target)

        with patch.object(prep.os, "replace", side_effect=fail_second):
            with self.assertRaisesRegex(OSError, "Synthetic replacement failure"):
                prep.publish(self.root, self.stage,
                             [(self.source, "public/asset.glb"), (second, "public/second.glb")])
        self.assertEqual(calls, [b"new staged bytes", b"second new bytes", b"old destination bytes"])
        self.assertEqual(self.target.read_bytes(), b"old destination bytes")
        self.assertFalse((self.target.parent / "second.glb").exists())
        self.assertEqual(list(self.target.parent.glob("*.tmp")), [])

    @unittest.skipUnless(os.name == "nt" and shutil.which("powershell.exe"),
                         "Windows PowerShell is needed for the read-only inherited-ACL check")
    def test_windows_published_acl_matches_fresh_destination_sibling(self):
        baseline = self.target.parent / "baseline.glb"
        baseline.write_bytes(b"normal sibling creation")
        prep.publish(self.root, self.stage, [(self.source, "public/asset.glb")])
        # Read-only security comparison: no Set-Acl, privilege request, or ACL API mutation.
        command = (
            "$baseline = Get-Acl -LiteralPath $env:SAVANNA_ACL_BASELINE; "
            "$published = Get-Acl -LiteralPath $env:SAVANNA_ACL_PUBLISHED; "
            "@{ baselineProtected=$baseline.AreAccessRulesProtected; "
            "publishedProtected=$published.AreAccessRulesProtected; "
            "baselineSddl=$baseline.Sddl; publishedSddl=$published.Sddl } | ConvertTo-Json -Compress"
        )
        result = subprocess.run(
            [shutil.which("powershell.exe"), "-NoProfile", "-NonInteractive", "-Command", command],
            capture_output=True, text=True, check=True, timeout=20,
            env={**os.environ, "SAVANNA_ACL_BASELINE": str(baseline),
                 "SAVANNA_ACL_PUBLISHED": str(self.target)})
        observed = json.loads(result.stdout)
        self.assertFalse(observed["publishedProtected"])
        self.assertEqual(observed["publishedProtected"], observed["baselineProtected"])
        self.assertEqual(observed["publishedSddl"], observed["baselineSddl"])


if __name__ == "__main__":
    unittest.main()
