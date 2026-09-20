/** Author-time synthesis only. Never import this file into the browser build. */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOICE = "en-TZ-ElimuNeural";
export const LOCALE = "en-TZ";
export const FORMAT = "audio-24khz-96kbitrate-mono-mp3";
export const SAMPLE_ID = "narrator-sample";
export const LIMITS = Object.freeze({
  clips: 128,
  characters: 40000,
  perClip: 3000,
  audioBytes: 8 * 1024 * 1024,
});
const project = fileURLToPath(new URL("../", import.meta.url));
// Public Azure regions from the official REST reference, checked 2026-09-20.
// Sovereign clouds need a separately reviewed endpoint; arbitrary hosts are rejected.
const REGIONS = new Set(
  "australiaeast brazilsouth canadacentral canadaeast centralus eastasia eastus eastus2 francecentral germanywestcentral centralindia italynorth japaneast japanwest koreacentral northcentralus northeurope norwayeast qatarcentral southafricanorth southcentralus southeastasia swedencentral switzerlandnorth switzerlandwest uaenorth uksouth ukwest westcentralus westeurope westus westus2 westus3".split(
    " ",
  ),
);
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

export function ssml(text) {
  const escaped = text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character],
  );
  // Deliberately use the voice's natural delivery: no pitch, rate, role or accent imitation.
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${LOCALE}"><voice name="${VOICE}">${escaped}</voice></speak>`;
}

export function planNarration(catalog, sample = false) {
  if (
    !Array.isArray(catalog) ||
    catalog.length < 1 ||
    catalog.length > LIMITS.clips
  )
    throw new Error(`Catalog must contain 1–${LIMITS.clips} clips.`);
  const ids = new Set();
  let characters = 0;
  const clips = catalog.map((clip) => {
    if (
      !clip ||
      typeof clip.id !== "string" ||
      !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(clip.id) ||
      clip.id.length > 100 ||
      ids.has(clip.id)
    )
      throw new Error(
        "Catalog IDs must be unique, short lowercase words separated by hyphens.",
      );
    ids.add(clip.id);
    if (
      typeof clip.text !== "string" ||
      !clip.text.trim() ||
      clip.text.length > LIMITS.perClip
    )
      throw new Error(
        `${clip.id}: text must contain 1–${LIMITS.perClip} characters.`,
      );
    if (
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(clip.text) ||
      [...clip.text].some(
        (c) => c.codePointAt(0) >= 0xd800 && c.codePointAt(0) <= 0xdfff,
      )
    )
      throw new Error(
        `${clip.id}: text contains characters XML cannot represent.`,
      );
    characters += clip.text.length;
    const body = ssml(clip.text);
    return {
      id: clip.id,
      text: clip.text,
      fingerprint: sha256(
        JSON.stringify({
          voice: VOICE,
          locale: LOCALE,
          format: FORMAT,
          text: clip.text,
          ssml: body,
        }),
      ),
    };
  });
  if (characters > LIMITS.characters)
    throw new Error(`Catalog exceeds ${LIMITS.characters} text characters.`);
  const selected = sample
    ? clips.filter((clip) => clip.id === SAMPLE_ID)
    : clips;
  if (!selected.length) throw new Error(`Catalog is missing ${SAMPLE_ID}.`);
  return {
    mode: sample ? "sample" : "full",
    voice: VOICE,
    locale: LOCALE,
    format: FORMAT,
    clips: selected,
    characters: selected.reduce((sum, clip) => sum + clip.text.length, 0),
    fingerprint: sha256(
      JSON.stringify({
        voice: VOICE,
        locale: LOCALE,
        format: FORMAT,
        mode: sample ? "sample" : "full",
        clips: selected,
      }),
    ),
  };
}

/** Bundle the authored TypeScript catalog in memory using the existing Vite dependency. */
export async function loadCatalog() {
  const { build } = await import("vite");
  const result = await build({
    configFile: false,
    envDir: false,
    root: project,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      target: "es2022",
      lib: {
        entry: join(project, "src/content/narration.ts"),
        formats: ["es"],
      },
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (bundle) => bundle.output ?? [],
  );
  const chunks = outputs.filter((output) => output.type === "chunk");
  if (
    chunks.length !== 1 ||
    chunks[0].imports.length ||
    chunks[0].dynamicImports.length
  )
    throw new Error(
      "Narration catalog must bundle as one self-contained module.",
    );
  const module = await import(
    `data:text/javascript;base64,${Buffer.from(chunks[0].code).toString("base64")}`
  );
  return module.narrationClips;
}

export function endpoint(region) {
  if (typeof region !== "string" || !REGIONS.has(region))
    throw new Error(
      "AZURE_SPEECH_REGION must be a supported public Azure region ID, such as eastus (not a URL).",
    );
  return `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
}

function atomicWrite(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, value);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      renameSync(`${file}.tmp`, file);
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
const writeJson = (file, value) =>
  atomicWrite(file, JSON.stringify(value, null, 2) + "\n");

/** Check complete consecutive MPEG Layer III frames; reject JSON, HTML and truncated audio. */
export function validateMp3(bytes) {
  if (bytes.length < 100 || bytes.length > LIMITS.audioBytes)
    throw new Error("Audio response has an invalid size.");
  let offset = 0,
    frames = 0;
  if (bytes.toString("ascii", 0, 3) === "ID3") {
    if (bytes.length < 10 || bytes.subarray(6, 10).some((b) => b & 128))
      throw new Error("Audio metadata is invalid.");
    offset =
      10 +
      ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9]) +
      (bytes[5] & 16 ? 10 : 0);
  }
  while (offset < bytes.length) {
    if (
      bytes.length - offset === 128 &&
      bytes.toString("ascii", offset, offset + 3) === "TAG"
    ) {
      offset += 128;
      break;
    }
    if (offset + 4 > bytes.length) throw new Error("Audio frame is truncated.");
    const a = bytes[offset],
      b = bytes[offset + 1],
      c = bytes[offset + 2],
      d = bytes[offset + 3];
    const version = (b >> 3) & 3,
      layer = (b >> 1) & 3;
    const bitrate = [
      0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0,
    ][c >> 4];
    const sampleRate = [22050, 24000, 16000, 0][(c >> 2) & 3];
    if (
      a !== 255 ||
      (b & 224) !== 224 ||
      version !== 2 ||
      layer !== 1 ||
      !bitrate ||
      sampleRate !== 24000 ||
      d >> 6 !== 3
    )
      throw new Error("Response is not the requested 24 kHz mono MP3.");
    const length = Math.floor((72000 * bitrate) / sampleRate) + ((c >> 1) & 1);
    if (offset + length > bytes.length)
      throw new Error("Audio frame is truncated.");
    offset += length;
    frames++;
  }
  if (frames < 3 || offset !== bytes.length)
    throw new Error("Audio response contains too few complete MP3 frames.");
}

async function readAudio(response) {
  if (
    !/^audio\/(mpeg|mp3|x-mpeg)(?:;|$)/i.test(
      response.headers.get("content-type") || "",
    )
  )
    throw new Error("Azure returned an unexpected audio content type.");
  if (Number(response.headers.get("content-length")) > LIMITS.audioBytes) {
    await response.body?.cancel();
    throw new Error("Audio response exceeds the size limit.");
  }
  if (!response.body) throw new Error("Azure returned no audio body.");
  const reader = response.body.getReader();
  let length = 0;
  const parts = [];
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.length;
      if (length > LIMITS.audioBytes)
        throw new Error("Audio response exceeds the size limit.");
      parts.push(Buffer.from(next.value));
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  const bytes = Buffer.concat(parts);
  validateMp3(bytes);
  return bytes;
}

function verifyReceipt(output, record) {
  if (
    !/^[a-f0-9]{64}$/.test(record.sha256 || "") ||
    record.path !== `audio/elimu/${record.id}-${record.sha256.slice(0, 12)}.mp3`
  )
    throw new Error(
      `${record.id}: invalid saved audio receipt; no synthesis attempted.`,
    );
  const bytes = readFileSync(join(output, record.path));
  if (sha256(bytes) !== record.sha256 || bytes.length !== record.bytes)
    throw new Error(
      `${record.id}: saved audio hash/size mismatch; restore the original artifact, do not regenerate automatically.`,
    );
  validateMp3(bytes);
}

/** Injectable transport is for offline tests; the CLI always uses the fixed Azure endpoint. */
export async function generateNarration({
  catalog,
  outputDir = join(project, "generated/narration"),
  sample = false,
  dryRun = false,
  key,
  region,
  fetchImpl = globalThis.fetch,
  log = console.log,
}) {
  const plan = planNarration(catalog, sample);
  log(
    `${plan.mode}: ${plan.clips.length} unique clips, ${plan.characters} text characters, ${VOICE}, natural delivery.`,
  );
  if (dryRun) {
    log(
      "Dry run: no credentials required, no files written, no network requests.",
    );
    return { plan };
  }
  const output = resolve(outputDir, ...(sample ? ["sample"] : []));
  mkdirSync(output, { recursive: true });
  const lockPath = join(output, "generation.lock");
  let lock;
  try {
    lock = openSync(lockPath, "wx");
  } catch {
    throw new Error(
      "Narration generation is locked. Confirm no generator is running before recovering the lock and receipts.",
    );
  }
  const stateFile = join(output, "batch-state.json");
  let state;
  try {
    if (existsSync(stateFile)) {
      state = JSON.parse(readFileSync(stateFile, "utf8"));
      if (
        state.version !== 1 ||
        state.fingerprint !== plan.fingerprint ||
        state.voice !== VOICE ||
        state.locale !== LOCALE ||
        state.format !== FORMAT ||
        state.mode !== plan.mode ||
        !Array.isArray(state.clips) ||
        state.clips.length !== plan.clips.length
      )
        throw new Error(
          "Saved batch does not match this exact voice, catalog and SSML plan. Preserve it and review before starting a different batch.",
        );
      for (const [index, record] of state.clips.entries()) {
        const expected = plan.clips[index];
        if (
          record.id !== expected.id ||
          record.text !== expected.text ||
          record.fingerprint !== expected.fingerprint
        )
          throw new Error(
            "Saved clip fingerprint does not match the authored catalog.",
          );
        if (record.status === "SUCCEEDED") verifyReceipt(output, record);
        else if (record.status !== "PENDING" || record.submissionStartedAt)
          throw new Error(
            `${record.id}: a prior synthesis may have been billed. Submission is not retried; recover/reconcile the saved request before continuing.`,
          );
      }
    } else {
      if (
        existsSync(
          join(output, sample ? "sample-manifest.json" : "manifest.json"),
        )
      )
        throw new Error(
          "A manifest exists without its batch receipt. Restore its receipts before continuing.",
        );
      state = {
        version: 1,
        fingerprint: plan.fingerprint,
        mode: plan.mode,
        voice: VOICE,
        locale: LOCALE,
        format: FORMAT,
        startedAt: new Date().toISOString(),
        status: "PENDING",
        clips: plan.clips.map((clip) => ({ ...clip, status: "PENDING" })),
      };
    }
    const pending = state.clips.filter((clip) => clip.status !== "SUCCEEDED");
    let url;
    if (pending.length) {
      if (
        typeof key !== "string" ||
        key.trim().length < 16 ||
        /[\r\n]/.test(key)
      )
        throw new Error(
          "AZURE_SPEECH_KEY is missing or invalid. No synthesis requests were sent.",
        );
      url = endpoint(region);
    }
    writeJson(stateFile, state);
    const deadline = Date.now() + 60 * 60_000;
    for (const clip of pending) {
      if (Date.now() > deadline)
        throw new Error(
          "Generation time budget reached. Completed receipts are saved; resume to continue untouched pending clips.",
        );
      clip.status = "SUBMITTING";
      clip.submissionStartedAt = new Date().toISOString();
      state.status = "IN_PROGRESS";
      writeJson(stateFile, state); // Intent must be durable before any potentially billable request.
      try {
        let response;
        try {
          response = await fetchImpl(url, {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(45_000),
            headers: {
              "Ocp-Apim-Subscription-Key": key,
              "Content-Type": "application/ssml+xml",
              "X-Microsoft-OutputFormat": FORMAT,
              "User-Agent": "SophiasWildWorld-AuthorTimeNarration",
            },
            body: ssml(clip.text),
          });
        } catch {
          throw new Error(
            "Azure request did not complete; it may have been billed. No retry was made.",
          );
        }
        if (response.status !== 200) {
          await response.body?.cancel();
          throw new Error(
            `Azure HTTP ${response.status}; no retry was made. Response body is not logged.`,
          );
        }
        const bytes = await readAudio(response);
        const digest = sha256(bytes);
        const path = `audio/elimu/${clip.id}-${digest.slice(0, 12)}.mp3`;
        atomicWrite(join(output, path), bytes);
        Object.assign(clip, {
          status: "SUCCEEDED",
          path,
          sha256: digest,
          bytes: bytes.length,
          finishedAt: new Date().toISOString(),
        });
        writeJson(stateFile, state);
        log(`${clip.id}: staged and verified.`);
      } catch (error) {
        clip.status = "UNCERTAIN";
        state.status = "STOPPED";
        // Local file/decoder errors could also follow a paid response. No new POST is safe.
        state.error = `${clip.id}: ${safeError(error, key)}`;
        writeJson(stateFile, state);
        throw new Error(state.error);
      }
    }
    state.clips.forEach((clip) => verifyReceipt(output, clip));
    state.status = "COMPLETE";
    state.completedAt ??= new Date().toISOString();
    delete state.error;
    writeJson(stateFile, state);
    const clips = state.clips.map(({ id, text, path, sha256 }) => ({
      id,
      text,
      path,
      sha256,
    }));
    const manifest = sample
      ? {
          kind: "sample",
          completeBatch: false,
          voice: VOICE,
          locale: LOCALE,
          generatedAt: state.completedAt,
          clip: clips[0],
        }
      : {
          version: 1,
          voice: VOICE,
          locale: LOCALE,
          clips,
          generatedAt: state.completedAt,
        };
    writeJson(
      join(output, sample ? "sample-manifest.json" : "manifest.json"),
      manifest,
    );
    log(
      sample
        ? "Sample staged separately; this is not a publishable batch manifest."
        : "Complete batch staged. Nothing was published to the game.",
    );
    return { plan, state, manifest, output };
  } finally {
    closeSync(lock);
    unlinkSync(lockPath);
  }
}

function safeError(error, key) {
  return String(error?.message || "Generation stopped.")
    .split(key || "ABSENT_NARRATION_KEY")
    .join("[redacted]")
    .replace(/https?:\/\/\S+/g, "[url]");
}

async function main() {
  const flags = process.argv.slice(2);
  if (
    flags.some((flag) => !["--dry-run", "--sample"].includes(flag)) ||
    new Set(flags).size !== flags.length
  )
    throw new Error(
      "Usage: node scripts/generate-narration.mjs [--dry-run] [--sample]",
    );
  const catalog = await loadCatalog();
  const dryRun = flags.includes("--dry-run");
  await generateNarration({
    catalog,
    sample: flags.includes("--sample"),
    dryRun,
    ...(dryRun
      ? {}
      : {
          key: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION,
        }),
  });
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    console.error(safeError(error, process.env.AZURE_SPEECH_KEY));
    process.exitCode = 1;
  });
}
