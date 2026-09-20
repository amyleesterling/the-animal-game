/** Run only on explicit request. Secrets stay in the Actions environment.
 * One preview + one texture task per species, elephant first, then three workers.
 * POST is never retried: an uncertain submission requires task reconciliation.
 * Resume with --resume <batch-state.json>; never discard existing task IDs.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const plan = JSON.parse(readFileSync(new URL("./meshy-test-animals.json", import.meta.url), "utf8"));
const output = resolve(process.env.MESHY_OUTPUT_DIR || "generated/meshy-tests");
const stateFile = join(output, "batch-state.json");
const resumeIndex = process.argv.indexOf("--resume");
const dryRun = process.argv.includes("--dry-run");
const key = process.env.MESHY_API_KEY;
const common = "One full-body wildlife game asset. Natural proportions, gently stylized realistic appearance matching a textured zebra. Neutral standing pose, feet on one plane, limbs clearly separated, facing forward. Animal only: no ground, scenery, pedestal, text, collar or accessories.";
const planned = plan.animals.map(animal => ({
  ...animal,
  prompt: `${animal.features} ${common}`,
  texturePrompt: `${animal.features} Natural wildlife colors and detailed skin or fur. No painted lighting, scenery or accessories.`,
  status: "planned",
}));
if (planned.length !== 9 || planned.some(a => a.prompt.length > 800)) throw new Error("Invalid bounded batch plan");
if (dryRun) {
  console.log(JSON.stringify({ batch: plan.batch, animals: planned.map(a => ({id:a.id,prompt:a.prompt})), estimatedCredits: 9 * plan.estimatedCreditsPerAnimal }, null, 2));
  process.exit(0);
}
if (!key) throw new Error("MESHY_API_KEY is missing from the selected GitHub environment");
mkdirSync(output, { recursive: true });
if (existsSync(stateFile) && resumeIndex < 0) throw new Error("Existing state found; explicitly resume it to avoid duplicate charges");
const state = resumeIndex >= 0
  ? JSON.parse(readFileSync(process.argv[resumeIndex + 1], "utf8"))
  : { batch: plan.batch, startedAt: new Date().toISOString(), previewModel: plan.previewModel, textureModel: plan.textureModel, animals: planned };
if (state.batch !== plan.batch || state.animals.length !== 9 || state.animals.some((a,i) => a.id !== planned[i].id)) throw new Error("Resume state does not match batch");
function save() {
  writeFileSync(`${stateFile}.tmp`, JSON.stringify(state, null, 2) + "\n");
  renameSync(`${stateFile}.tmp`, stateFile);
}
function safeError(error) {
  // Never log raw HTTP response bodies, signed download URLs, or authorization.
  return String(error?.message || "Unexpected generation failure").split(key).join("[redacted]").replace(/https?:\/\/\S+/g, "[url]");
}
async function api(path, body) {
  const method = body ? "POST" : "GET";
  const attempts = body ? 1 : 4;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(`https://api.meshy.ai${path}`, {
        method, redirect: "error", signal: AbortSignal.timeout(60000),
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) {
        if (!body && (response.status === 429 || response.status >= 500) && attempt < attempts - 1) {
          await delay((attempt + 1) * 5000); continue;
        }
        throw new Error(`Meshy ${method} returned HTTP ${response.status}; ${body ? "submission was not retried" : "request stopped"}`);
      }
      return await response.json();
    } catch (error) {
      if (!body && attempt < attempts - 1 && !String(error.message).includes("HTTP")) {
        await delay((attempt + 1) * 5000); continue;
      }
      throw error;
    }
  }
}
async function submit(animal, stage, body) {
  if (animal[stage]?.id) return animal[stage].id;
  if (animal[stage]?.submissionStartedAt) throw new Error(`${animal.id} ${stage}: uncertain prior submission; reconcile Meshy task list before resuming`);
  animal[stage] = { submissionStartedAt: new Date().toISOString(), status: "SUBMITTING" };
  save();
  const task = await api("/openapi/v2/text-to-3d", body);
  if (typeof task.result !== "string" || !task.result) throw new Error("Meshy did not return a task ID; reconcile before retrying");
  animal[stage].id = task.result;
  animal[stage].status = "PENDING";
  save();
  console.log(`${animal.id}: ${stage} task ${task.result}`);
  return task.result;
}
async function awaitTask(animal, stage, id) {
  const deadline = Date.now() + 25 * 60 * 1000;
  let lastProgress = "";
  while (Date.now() < deadline) {
    const result = await api(`/openapi/v2/text-to-3d/${encodeURIComponent(id)}`);
    Object.assign(animal[stage], { status: result.status, progress: result.progress, consumedCredits: result.consumed_credits ?? null });
    save();
    const progress = `${result.status} ${result.progress ?? 0}%`;
    if (progress !== lastProgress) { console.log(`${animal.id}: ${stage} ${progress}`); lastProgress = progress; }
    if (result.status === "SUCCEEDED") return result;
    if (["FAILED", "CANCELED"].includes(result.status)) throw new Error(`${animal.id} ${stage} ${result.status}; task retained for inspection`);
    await delay(20000);
  }
  throw new Error(`${animal.id} ${stage} polling timed out; resume the saved task ID`);
}
async function download(urlString, filename, kind) {
  const url = new URL(urlString);
  if (url.protocol !== "https:" || !(url.hostname === "meshy.ai" || url.hostname.endsWith(".meshy.ai"))) throw new Error("Unexpected Meshy asset host; inspect before downloading");
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Asset download returned HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 80 * 1024 * 1024) throw new Error("Asset exceeds the test batch size limit");
  if (kind === "glb" && (buffer.length < 28 || buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length)) throw new Error("Invalid GLB download");
  writeFileSync(join(output, filename), buffer);
  return { bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") };
}
async function generate(animal) {
  const previewId = await submit(animal, "preview", {
    mode: "preview", prompt: animal.prompt, model_type: "smart-topology", ai_model: plan.previewModel,
    topology: "triangle", target_polycount: plan.targetPolycount, target_formats: ["glb"],
  });
  await awaitTask(animal, "preview", previewId);
  const refineId = await submit(animal, "refine", {
    mode: "refine", preview_task_id: previewId, ai_model: plan.textureModel,
    texture_prompt: animal.texturePrompt, texture_resolution: "2k", enable_pbr: false, target_formats: ["glb"],
  });
  const refined = await awaitTask(animal, "refine", refineId);
  if (!refined.model_urls?.glb) throw new Error(`${animal.id}: finished without a GLB`);
  const file = `${animal.id}.glb`;
  const artifact = await download(refined.model_urls.glb, file, "glb");
  Object.assign(animal, artifact, { file, status: "ready", finishedAt: new Date().toISOString() });
  save();
  console.log(`${animal.id}: saved textured GLB (${artifact.bytes} bytes)`);
}
try {
  save();
  const { balance } = await api("/openapi/v1/balance");
  if (!Number.isFinite(balance)) throw new Error("Meshy balance could not be verified");
  const estimatedRemaining = state.animals.reduce((sum,a) => sum + (!a.preview?.id ? 5 : 0) + (!a.refine?.id ? 10 : 0), 0);
  state.estimatedBatchCredits = 9 * plan.estimatedCreditsPerAnimal;
  state.availableCreditsAtStart = balance;
  save();
  console.log(`Authenticated. Estimated remaining batch cost: ${estimatedRemaining} credits. Available API credits: ${balance}.`);
  if (balance < estimatedRemaining) throw new Error(`Insufficient API credits for this batch: need ${estimatedRemaining}, available ${balance}`);
  // Complete the elephant end to end before spending on the remaining species.
  await generate(state.animals[0]);
  let next = 1;
  await Promise.all(Array.from({length: 3}, async () => {
    while (next < state.animals.length) {
      const animal = state.animals[next++];
      try { await generate(animal); }
      catch (error) { animal.status = "failed"; animal.error = safeError(error); save(); console.error(`${animal.id}: ${animal.error}`); }
    }
  }));
  state.finishedAt = new Date().toISOString();
  state.consumedCredits = state.animals.reduce((sum,a) => sum + (a.preview?.consumedCredits || 0) + (a.refine?.consumedCredits || 0), 0);
  save();
  const ready = state.animals.filter(a => a.status === "ready");
  writeFileSync(join(output, "manifest.json"), JSON.stringify({ batch: state.batch, reviewStatus: "AI-generated test assets; anatomy review and animation pending", animals: ready.map(({id,name,scientificName,file,bytes,sha256,preview,refine,status}) => ({id,name,scientificName,file,bytes,sha256,previewTaskId:preview.id,textureTaskId:refine.id,status})) }, null, 2) + "\n");
  console.log(`Batch complete: ${ready.length}/9 textured test animals. Reported consumption: ${state.consumedCredits} credits.`);
  if (ready.length !== 9) process.exitCode = 1;
} catch (error) {
  state.error = safeError(error); save(); console.error(state.error); process.exitCode = 1;
}
