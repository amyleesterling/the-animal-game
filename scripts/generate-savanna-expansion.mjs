/** Twenty-five explicitly requested image-to-3D tasks, never an automatic paid retry.
 * Run --dry-run first. Resume downloaded batch-state.json with --resume <path>.
 * Reconcile a SUBMITTING record without an ID against Meshy's task list; never
 * clear that marker to retry. Keep the one-time workflow tag immutable.
 * API docs/pricing checked 2026-09-20: https://docs.meshy.ai/en/api/image-to-3d
 * https://docs.meshy.ai/en/api/pricing — 25 textured standard tasks × 30 credits.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const project = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(
  process.env.MESHY_OUTPUT_DIR || join(project, "generated/savanna-expansion"),
);
const stateFile = join(output, "batch-state.json");
const key = process.env.MESHY_API_KEY;
const ids = [
  "lamarcks-dung-beetle",
  "mound-building-termite",
  "mopane-emperor-moth",
  "african-monarch",
  "desert-locust",
  "cape-porcupine",
  "south-african-springhare",
  "striped-grass-mouse",
  "naked-mole-rat",
  "secretarybird",
  "lilac-breasted-roller",
  "southern-ground-hornbill",
  "helmeted-guineafowl",
  "grey-crowned-crane",
  "white-backed-vulture",
  "red-billed-oxpecker",
  "marabou-stork",
  "aardvark",
  "bat-eared-fox",
  "banded-mongoose",
  "meerkat",
  "olive-baboon",
  "vervet-monkey",
  "african-buffalo",
  "nile-monitor",
];
const views = ["front", "right", "back", "left"];
const taskStates = new Set([
  "PENDING",
  "IN_PROGRESS",
  "SUCCEEDED",
  "FAILED",
  "CANCELED",
]);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
let state;

function safeError(error) {
  return String(error?.message || "Generation failed")
    .split(key || "FAKE_ABSENT_KEY_SENTINEL")
    .join("[redacted]")
    .replace(/data:image\/[^;\s]+;base64,[A-Za-z0-9+/=]+/g, "[image data]")
    .replace(/https?:\/\/\S+/g, "[url]");
}

function atomicWrite(filename, value) {
  writeFileSync(`${filename}.tmp`, JSON.stringify(value, null, 2) + "\n");
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      renameSync(`${filename}.tmp`, filename);
      return;
    } catch (error) {
      if (attempt === 4 || !["EPERM", "EBUSY"].includes(error?.code))
        throw error;
      Atomics.wait(
        new Int32Array(new SharedArrayBuffer(4)),
        0,
        0,
        25 * 2 ** attempt,
      );
    }
  }
}
const save = () => atomicWrite(stateFile, state);

function validSavedTask(asset) {
  if (!["planned", "ready", "failed"].includes(asset.status)) return false;
  const task = asset.task;
  if (task === undefined)
    return asset.status === "planned" && !asset.model && !asset.thumbnails;
  if (!task || typeof task !== "object" || Array.isArray(task)) return false;
  if (
    typeof task.submissionStartedAt !== "string" ||
    !Number.isFinite(Date.parse(task.submissionStartedAt))
  )
    return false;
  if (task.id === undefined)
    return task.status === "SUBMITTING" && asset.status !== "ready";
  return (
    typeof task.id === "string" &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(task.id) &&
    taskStates.has(task.status) &&
    (asset.status !== "ready" || task.status === "SUCCEEDED") &&
    (task.consumedCredits === undefined ||
      (Number.isFinite(task.consumedCredits) && task.consumedCredits >= 0))
  );
}

function png(bytes) {
  return (
    bytes.length >= 33 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString("ascii", 12, 16) === "IHDR" &&
    bytes.readUInt32BE(16) > 0 &&
    bytes.readUInt32BE(20) > 0
  );
}

async function api(path, body) {
  const method = body ? "POST" : "GET";
  for (let attempt = 0; attempt < (body ? 1 : 4); attempt++) {
    let response;
    try {
      response = await fetch(`https://api.meshy.ai${path}`, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(60_000),
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      if (!body && attempt < 3) {
        await delay((attempt + 1) * 5000);
        continue;
      }
      throw error;
    }
    if (!response.ok) {
      if (
        !body &&
        (response.status === 429 || response.status >= 500) &&
        attempt < 3
      ) {
        await delay((attempt + 1) * 5000);
        continue;
      }
      throw new Error(
        `Meshy ${method} HTTP ${response.status}; ${body ? "submission not retried" : "request stopped"}`,
      );
    }
    return response.json();
  }
}

async function submit(asset, reference, request) {
  if (asset.task?.id) return asset.task.id;
  if (asset.task?.submissionStartedAt)
    throw new Error(
      `${asset.id}: uncertain submission; reconcile task list before resuming`,
    );
  asset.task = {
    status: "SUBMITTING",
    submissionStartedAt: new Date().toISOString(),
  };
  save(); // Persist intent before a request can consume credits.
  const result = await api("/openapi/v1/image-to-3d", {
    ...request,
    target_polycount: asset.targetPolycount,
    image_url: `data:image/png;base64,${reference.toString("base64")}`,
  });
  if (
    typeof result.result !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(result.result)
  )
    throw new Error(
      "Submission returned no valid task ID; reconcile before resuming",
    );
  asset.task.id = result.result;
  asset.task.status = "PENDING";
  save();
  console.log(`${asset.id}: saved task ${asset.task.id}`);
  return asset.task.id;
}

async function awaitTask(asset, id) {
  const deadline = Date.now() + 25 * 60_000;
  let lastStatus;
  while (Date.now() < deadline) {
    const result = await api(
      `/openapi/v1/image-to-3d/${encodeURIComponent(id)}`,
    );
    if (!taskStates.has(result.status))
      throw new Error("Meshy returned an unknown task status");
    asset.task.status = result.status;
    if (Number.isFinite(result.progress))
      asset.task.progress = Math.max(0, Math.min(100, result.progress));
    if (
      Number.isFinite(result.consumed_credits) &&
      result.consumed_credits >= 0
    )
      asset.task.consumedCredits = result.consumed_credits;
    save();
    if (lastStatus !== result.status) {
      console.log(`${asset.id}: ${result.status}`);
      lastStatus = result.status;
    }
    if (result.status === "SUCCEEDED") return result;
    if (["FAILED", "CANCELED"].includes(result.status))
      throw new Error(`${asset.id}: task ${result.status}; ID retained`);
    await delay(20_000);
  }
  throw new Error(`${asset.id}: polling timed out; resume the saved task ID`);
}

async function download(urlString, stem, kind) {
  const url = new URL(urlString);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !(url.hostname === "meshy.ai" || url.hostname.endsWith(".meshy.ai"))
  )
    throw new Error("Unexpected asset host; inspect before downloading");
  // Never forward API credentials to an asset URL, and never follow redirects.
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Asset download HTTP ${response.status}`);
  const limit = (kind === "model" ? 80 : 8) * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > limit)
    throw new Error("Asset exceeds download size limit");
  if (!response.body) throw new Error("Asset download was empty");
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new Error("Asset exceeds download size limit");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(chunks, length);
  let extension;
  if (kind === "model") {
    if (
      bytes.length < 28 ||
      bytes.readUInt32LE(0) !== 0x46546c67 ||
      bytes.readUInt32LE(4) !== 2 ||
      bytes.readUInt32LE(8) !== bytes.length ||
      bytes.readUInt32LE(16) !== 0x4e4f534a ||
      bytes.readUInt32LE(12) > bytes.length - 20
    )
      throw new Error("Invalid GLB download");
    const content = JSON.parse(
      bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
    );
    if (
      !Array.isArray(content.meshes) ||
      !content.meshes.length ||
      (content.buffers || []).some((buffer) => buffer.uri) ||
      (content.images || []).some(
        (image) => image.uri && !image.uri.startsWith("data:image/"),
      )
    )
      throw new Error("Expected a self-contained GLB with visible meshes");
    extension = "glb";
  } else if (png(bytes)) extension = "png";
  else if (
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[bytes.length - 2] === 255 &&
    bytes[bytes.length - 1] === 217
  )
    extension = "jpg";
  else throw new Error("Invalid thumbnail image download");
  const file = `${stem}.${extension}`;
  writeFileSync(join(output, file), bytes);
  return { file, bytes: bytes.length, sha256: sha256(bytes) };
}

function localComplete(receipt, expectedStem) {
  if (
    !receipt ||
    !new RegExp(`^${expectedStem}\\.(glb|png|jpg)$`).test(receipt.file)
  )
    return false;
  const file = join(output, receipt.file);
  return existsSync(file) && sha256(readFileSync(file)) === receipt.sha256;
}

async function generate(asset, reference, request) {
  const id = await submit(asset, reference, request);
  const result = await awaitTask(asset, id);
  if (!localComplete(asset.model, asset.id)) {
    if (!result.model_urls?.glb)
      throw new Error(`${asset.id}: task has no GLB`);
    asset.model = await download(result.model_urls.glb, asset.id, "model");
    save();
  }
  asset.thumbnails ??= {};
  for (const view of views) {
    if (localComplete(asset.thumbnails[view], `${asset.id}-${view}`)) continue;
    const url = result.thumbnail_urls?.[view];
    if (typeof url !== "string")
      throw new Error(
        `${asset.id}: ${view} thumbnail missing; resume the same ID`,
      );
    asset.thumbnails[view] = await download(
      url,
      `${asset.id}-${view}`,
      "thumbnail",
    );
    save();
  }
  asset.status = "ready";
  asset.finishedAt = new Date().toISOString();
  delete asset.error;
  save();
  console.log(`${asset.id}: GLB and four review thumbnails saved`);
}

async function main() {
  const plan = JSON.parse(
    readFileSync(new URL("./savanna-expansion.json", import.meta.url), "utf8"),
  );
  const expectedRequest = {
    model_type: "standard",
    ai_model: "meshy-7.1",
    should_texture: true,
    enable_pbr: false,
    texture_resolution: "2k",
    should_remesh: true,
    topology: "triangle",
    image_enhancement: false,
    target_formats: ["glb"],
    multi_view_thumbnails: true,
  };
  if (
    plan.batch !== "savanna-expansion-20260920-v1" ||
    plan.concurrency !== 2 ||
    plan.estimatedCreditsPerAsset !== 30 ||
    JSON.stringify(plan.request) !== JSON.stringify(expectedRequest) ||
    plan.assets?.length !== 25 ||
    plan.assets.some(
      (asset, i) =>
        asset.id !== ids[i] ||
        asset.reference !==
          `assets/references/savanna-expansion/${asset.id}.png` ||
        asset.targetPolycount !== 15_000,
    )
  )
    throw new Error("Plan differs from the authorized 25-asset batch");
  // Validate every input before any charge; bind resume state to exact images.
  const references = plan.assets.map((asset) => {
    const bytes = readFileSync(join(project, asset.reference));
    if (bytes.length > 20 * 1024 * 1024 || !png(bytes))
      throw new Error(`${asset.id}: reference must be a valid PNG under 20 MB`);
    return bytes;
  });
  const planned = plan.assets.map((asset, index) => ({
    ...asset,
    referenceBytes: references[index].length,
    referenceSha256: sha256(references[index]),
    status: "planned",
  }));
  const planHash = sha256(
    JSON.stringify({
      plan,
      references: planned.map((asset) => asset.referenceSha256),
    }),
  );
  if (process.argv.includes("--dry-run")) {
    console.log(
      JSON.stringify(
        { batch: plan.batch, estimatedCredits: 750, assets: planned },
        null,
        2,
      ),
    );
    return;
  }
  if (!key)
    throw new Error(
      "MESHY_API_KEY is missing from the selected GitHub environment",
    );
  const resumeIndex = process.argv.indexOf("--resume");
  if (resumeIndex >= 0 && !process.argv[resumeIndex + 1])
    throw new Error("--resume requires a saved batch-state.json path");
  if (existsSync(stateFile) && resumeIndex < 0)
    throw new Error(
      "Existing state found; resume explicitly to avoid duplicate charges",
    );
  const previous =
    resumeIndex < 0
      ? undefined
      : JSON.parse(readFileSync(process.argv[resumeIndex + 1], "utf8"));
  if (
    resumeIndex >= 0 &&
    (!previous || typeof previous !== "object" || Array.isArray(previous))
  )
    throw new Error("Resume state must be a saved batch object");
  // A stale downloaded checkpoint must never erase task IDs already saved here.
  // Exact copies are safe; differing histories require human reconciliation.
  if (
    previous &&
    existsSync(stateFile) &&
    JSON.stringify(previous) !==
      JSON.stringify(JSON.parse(readFileSync(stateFile, "utf8")))
  )
    throw new Error(
      "Resume conflicts with the existing checkpoint; preserve both and reconcile task IDs",
    );
  if (
    previous &&
    (previous.schemaVersion !== 1 ||
      previous.batch !== plan.batch ||
      previous.planHash !== planHash ||
      JSON.stringify(previous.request) !== JSON.stringify(plan.request) ||
      previous.assets?.length !== 25 ||
      previous.assets.some(
        (asset, i) =>
          asset.id !== ids[i] ||
          asset.reference !== planned[i].reference ||
          asset.referenceSha256 !== planned[i].referenceSha256 ||
          asset.targetPolycount !== planned[i].targetPolycount ||
          !validSavedTask(asset),
      ) ||
      new Set(
        previous.assets.flatMap((asset) =>
          asset.task?.id ? [asset.task.id] : [],
        ),
      ).size !== previous.assets.filter((asset) => asset.task?.id).length)
  )
    throw new Error(
      "Resume state does not match this plan and its reference images",
    );
  state = previous || {
    schemaVersion: 1,
    batch: plan.batch,
    planHash,
    request: plan.request,
    startedAt: new Date().toISOString(),
    estimatedCredits: 750,
    assets: planned,
  };
  mkdirSync(output, { recursive: true });
  save();
  if (
    state.assets.some(
      (asset) => asset.task?.submissionStartedAt && !asset.task.id,
    )
  )
    throw new Error(
      "Uncertain prior submission; reconcile task IDs before resuming this batch",
    );
  const estimatedRemaining =
    state.assets.filter((asset) => !asset.task?.id).length * 30;
  const { balance } = await api("/openapi/v1/balance");
  if (!Number.isFinite(balance))
    throw new Error("Could not verify available API credits");
  if (balance < estimatedRemaining)
    throw new Error(
      "Insufficient API credits for the remaining authorized tasks",
    );
  console.log(
    `Starting bounded batch: at most 25 tasks, ${estimatedRemaining} estimated remaining credits.`,
  );
  let next = 0;
  const workers = await Promise.allSettled(
    Array.from({ length: 2 }, async () => {
      while (next < state.assets.length) {
        const index = next++;
        const asset = state.assets[index];
        try {
          await generate(asset, references[index], plan.request);
        } catch (error) {
          asset.status = "failed";
          asset.error = safeError(error);
          save();
          console.error(`${asset.id}: ${asset.error}`);
        }
      }
    }),
  );
  const workerError = workers.find((result) => result.status === "rejected");
  if (workerError) throw workerError.reason;
  state.finishedAt = new Date().toISOString();
  state.consumedCredits = state.assets.reduce(
    (sum, asset) => sum + (asset.task?.consumedCredits || 0),
    0,
  );
  delete state.error;
  save();
  atomicWrite(join(output, "manifest.json"), {
    batch: state.batch,
    reviewStatus: "Image-guided candidates; visual review required",
    assets: state.assets,
  });
  const ready = state.assets.filter((asset) => asset.status === "ready").length;
  console.log(
    `Finished: ${ready}/25 models with local review thumbnails. Reported consumption: ${state.consumedCredits} credits.`,
  );
  if (ready !== 25) process.exitCode = 1;
}

main().catch((error) => {
  const message = safeError(error);
  if (state) {
    state.error = message;
    try {
      save();
    } catch {
      console.error(
        "Checkpoint could not be updated; preserve the previous state and reconcile task IDs.",
      );
    }
  }
  console.error(message);
  process.exitCode = 1;
});
