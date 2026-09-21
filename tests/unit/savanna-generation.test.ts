import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const project = fileURLToPath(new URL("../../", import.meta.url));
const fakeKey = "FAKE_SAVANNA_OFFLINE_KEY_NOT_A_CREDENTIAL";
const plan = JSON.parse(
  readFileSync(join(project, "scripts/savanna-expansion.json"), "utf8"),
);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHK0AAAAASUVORK5CYII=",
  "base64",
);
const tempPrefix = join(resolve(tmpdir()), "savanna-generation-test-");
const owned: string[] = [];
type Task = { id?: string; status: string; submissionStartedAt?: string };
type Asset = {
  id: string;
  status: string;
  task: Task;
  referenceSha256: string;
  reference?: string;
  model?: { file: string };
  thumbnails?: Record<string, { file: string }>;
};
type Batch = {
  schemaVersion: number;
  assets: Asset[];
  error?: string;
  consumedCredits?: number;
};
type Request = {
  method: string;
  path: string;
  authorization: boolean;
  settings?: Record<string, unknown>;
  imageMatches?: boolean;
  checkpointExists?: boolean;
};

// Real script, actual filesystem checkpoints, fully offline transport. Child env
// contains only a deliberately fake key; neither fetch nor raw sockets can dial out.
const preload = `
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import timers from "node:timers/promises";
import { syncBuiltinESMExports } from "node:module";
const deny = () => { throw new Error("Real network disabled by offline test"); };
http.request = http.get = https.request = https.get = net.connect = net.createConnection = deny;
// Only polling/backoff sleep is shortened. Request handling and saved state are real.
timers.setTimeout = async () => {};
syncBuiltinESMExports();
const fault = process.env.SAVANNA_TEST_FAULT;
const png = Buffer.from("${png.toString("base64")}", "base64");
let submissions = 0, failedReads = 0;
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  const method = options.method || "GET";
  const authorization = new Headers(options.headers).get("authorization");
  const body = options.body ? JSON.parse(options.body) : undefined;
  let checkpointExists;
  let imageMatches;
  let settings;
  if (body) {
    const checkpoint = JSON.parse(fs.readFileSync(process.env.MESHY_OUTPUT_DIR + "/batch-state.json", "utf8"));
    checkpointExists = checkpoint.assets.some(asset => asset.task?.status === "SUBMITTING" && !asset.task.id);
    imageMatches = body.image_url === "data:image/png;base64," + png.toString("base64");
    const { image_url, ...rest } = body;
    settings = rest;
  }
  fs.appendFileSync(process.env.SAVANNA_TEST_REQUESTS, JSON.stringify({method,path:url.pathname,authorization:Boolean(authorization),checkpointExists,imageMatches,settings}) + "\\n");
  if (url.origin === "https://api.meshy.ai") {
    if (authorization !== "Bearer ${fakeKey}") throw new Error("Expected fake key only");
    if (url.pathname === "/openapi/v1/balance" && method === "GET") {
      if (fault === "read-retry" && failedReads++ === 0) return new Response("rate limit", {status:429});
      return Response.json({ balance: 987654321 });
    }
    if (url.pathname === "/openapi/v1/image-to-3d" && method === "POST") {
      if (!checkpointExists) throw new Error("Paid request preceded its checkpoint");
      if (fault === "uncertain-network") throw new Error("Connection lost ${fakeKey} https://assets.meshy.ai/private?signature=PRIVATE_TEST_SIGNATURE data:image/png;base64," + png.toString("base64"));
      if (fault === "uncertain-http") return new Response("do not log this body", {status:503});
      if (fault === "uncertain-id") return Response.json({});
      if (fault === "resume-only") throw new Error("Unexpected replacement paid task");
      return Response.json({result:"offline-image-" + (++submissions)});
    }
    if (url.pathname.startsWith("/openapi/v1/image-to-3d/") && method === "GET") {
      const id = url.pathname.split("/").pop();
      const host = fault === "untrusted-host" ? "untrusted.invalid" : "assets.meshy.ai";
      const thumbnail_urls = Object.fromEntries(["front","right","back","left"].map(view => [view,"https://assets.meshy.ai/"+id+"-"+view+".png?signature=PRIVATE_TEST_SIGNATURE"]));
      if (fault === "missing-thumbnail") delete thumbnail_urls.left;
      return Response.json({status:"SUCCEEDED",progress:100,consumed_credits:30,
        model_urls:{glb:"https://"+host+"/"+id+".glb?signature=PRIVATE_TEST_SIGNATURE"},thumbnail_urls});
    }
  }
  if (url.origin === "https://assets.meshy.ai" && method === "GET") {
    if (authorization) throw new Error("Key leaked to asset download");
    if (url.pathname.endsWith(".png")) return new Response(png);
    if (url.pathname.endsWith(".glb")) {
      if (fault === "invalid-model") return new Response(Buffer.from("not a GLB"));
      if (fault === "oversized-model") return new Response("small body", {headers:{"content-length":String(81*1024*1024)}});
      return new Response(fs.readFileSync(process.env.SAVANNA_TEST_GLB));
    }
  }
  throw new Error("Unexpected offline request");
};
`;

function harness() {
  const directory = mkdtempSync(tempPrefix);
  owned.push(directory);
  const scripts = join(directory, "scripts");
  mkdirSync(scripts);
  mkdirSync(join(directory, "assets/references/savanna-expansion"), {
    recursive: true,
  });
  copyFileSync(
    join(project, "scripts/generate-savanna-expansion.mjs"),
    join(scripts, "generate-savanna-expansion.mjs"),
  );
  copyFileSync(
    join(project, "scripts/savanna-expansion.json"),
    join(scripts, "savanna-expansion.json"),
  );
  for (const asset of plan.assets)
    writeFileSync(join(directory, asset.reference), png);
  const geometry = Buffer.from(
    JSON.stringify({
      asset: { version: "2.0" },
      meshes: [{ primitives: [] }],
    }).padEnd(128, " "),
  );
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + geometry.length, 8);
  header.writeUInt32LE(geometry.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const glb = join(directory, "synthetic.glb");
  writeFileSync(glb, Buffer.concat([header, geometry]));
  const hook = join(directory, "offline-fetch.mjs");
  writeFileSync(hook, preload);
  const output = join(directory, "output");
  const stateFile = join(output, "batch-state.json");
  let number = 0;
  return {
    directory,
    stateFile,
    output,
    run(fault = "success", args: string[] = []) {
      const log = join(directory, `requests-${++number}.jsonl`);
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          pathToFileURL(hook).href,
          join(scripts, "generate-savanna-expansion.mjs"),
          ...args,
        ],
        {
          cwd: directory,
          encoding: "utf8",
          timeout: 15000,
          env: {
            ...(process.env.SystemRoot
              ? { SystemRoot: process.env.SystemRoot }
              : {}),
            MESHY_API_KEY: fakeKey,
            MESHY_OUTPUT_DIR: output,
            SAVANNA_TEST_FAULT: fault,
            SAVANNA_TEST_REQUESTS: log,
            SAVANNA_TEST_GLB: glb,
          },
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      const text = result.stdout + result.stderr;
      const saved = existsSync(stateFile)
        ? readFileSync(stateFile, "utf8")
        : "";
      for (const sensitive of [
        fakeKey,
        "PRIVATE_TEST_SIGNATURE",
        "987654321",
        "data:image/png;base64,",
      ])
        expect(text + saved).not.toContain(sensitive);
      const requests: Request[] = existsSync(log)
        ? readFileSync(log, "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line))
        : [];
      return {
        status: result.status,
        text,
        requests,
        state: saved ? (JSON.parse(saved) as Batch) : undefined,
      };
    },
  };
}

afterEach(() => {
  for (const directory of owned.splice(0)) {
    const absolute = resolve(directory);
    if (
      !absolute.startsWith(tempPrefix) ||
      !absolute.startsWith(resolve(tmpdir()) + sep)
    )
      throw new Error("Unowned temporary path");
    rmSync(absolute, { recursive: true, force: true });
  }
});

// These cases launch several real Node processes; allow Windows startup time.
describe("offline bounded savanna generation", { timeout: 20000 }, () => {
  it("submits exactly 25 checkpointed tasks, saves 100 views, and never forwards credentials to downloads", () => {
    const batch = harness();
    const run = batch.run();
    expect(run.status, run.text).toBe(0);
    const posts = run.requests.filter((request) => request.method === "POST");
    expect(posts).toHaveLength(25);
    for (const post of posts) {
      expect(post.checkpointExists).toBe(true);
      expect(post.imageMatches).toBe(true);
      expect(post.settings).toEqual({
        ...plan.request,
        target_polycount: 15000,
      });
    }
    expect(run.state!.consumedCredits).toBe(750);
    expect(run.state!.assets.map((asset) => asset.id)).toEqual(
      plan.assets.map((asset: Asset) => asset.id),
    );
    expect(new Set(run.state!.assets.map((asset) => asset.task.id)).size).toBe(
      25,
    );
    for (const asset of run.state!.assets) {
      expect(asset.status).toBe("ready");
      expect(existsSync(join(batch.output, asset.model!.file))).toBe(true);
      expect(Object.keys(asset.thumbnails!).sort()).toEqual([
        "back",
        "front",
        "left",
        "right",
      ]);
    }
    const downloads = run.requests.filter(
      (request) => !request.path.startsWith("/openapi/"),
    );
    expect(downloads).toHaveLength(125);
    expect(downloads.every((request) => !request.authorization)).toBe(true);
  });

  it.each(["network", "http", "id"])(
    "never retries uncertain %s paid requests, even after restart",
    (failure) => {
      const batch = harness();
      const first = batch.run(`uncertain-${failure}`);
      expect(first.status).toBe(1);
      expect(
        first.requests.filter((request) => request.method === "POST"),
      ).toHaveLength(25);
      expect(
        first.state!.assets.every(
          (asset) => asset.task.status === "SUBMITTING" && !asset.task.id,
        ),
      ).toBe(true);
      const resumed = batch.run("resume-only", ["--resume", batch.stateFile]);
      expect(resumed.status).toBe(1);
      expect(resumed.requests).toHaveLength(0);
      expect(resumed.text).toContain("Uncertain prior submission");
    },
  );

  it("recovers missing views with original task IDs and no replacement charge", () => {
    const batch = harness();
    const first = batch.run("missing-thumbnail");
    expect(first.status).toBe(1);
    const resumed = batch.run("resume-only", ["--resume", batch.stateFile]);
    expect(resumed.status, resumed.text).toBe(0);
    expect(
      resumed.requests.filter((request) => request.method === "POST"),
    ).toHaveLength(0);
    expect(
      resumed.requests.filter((request) => request.path.endsWith(".glb")),
    ).toHaveLength(0);
    expect(
      resumed.requests.filter((request) => request.path.endsWith("-left.png")),
    ).toHaveLength(25);
    expect(resumed.state!.assets.map((asset) => asset.task.id)).toEqual(
      first.state!.assets.map((asset) => asset.task.id),
    );
  });

  it("rejects stale external checkpoints without replacing newer receipts", () => {
    const batch = harness();
    const first = batch.run();
    expect(first.status, first.text).toBe(0);
    const latest = readFileSync(batch.stateFile, "utf8");
    const stale = JSON.parse(latest);
    delete stale.assets[0].task;
    delete stale.assets[0].model;
    delete stale.assets[0].thumbnails;
    stale.assets[0].status = "planned";
    const file = join(batch.directory, "older-state.json");
    writeFileSync(file, JSON.stringify(stale));
    const resumed = batch.run("resume-only", ["--resume", file]);
    expect(resumed.status).toBe(1);
    expect(resumed.text).toContain("Resume conflicts");
    expect(resumed.requests).toHaveLength(0);
    expect(readFileSync(batch.stateFile, "utf8")).toBe(latest);
  });

  it("protects malformed, future, and duplicate-ID checkpoints before any network or state write", () => {
    const batch = harness();
    const first = batch.run();
    expect(first.status, first.text).toBe(0);
    const original = JSON.stringify(first.state);
    const mutate: ((state: Batch) => unknown)[] = [
      (state) => {
        state.schemaVersion = 2;
      },
      (state) => {
        delete state.assets[0].task.submissionStartedAt;
      },
      (state) => {
        state.assets[0].task.id = state.assets[1].task.id;
      },
      (state) => {
        state.assets[0].task.status = "SUBMITTING";
      },
      (state) => {
        state.assets[0].task = { status: "SUCCEEDED" };
      },
      (state) => {
        state.assets[0].reference = "../changed.png";
      },
    ];
    for (const change of mutate) {
      const state: Batch = JSON.parse(original);
      change(state);
      const bytes = JSON.stringify(state);
      writeFileSync(batch.stateFile, bytes);
      const result = batch.run("resume-only", ["--resume", batch.stateFile]);
      expect(result.status, result.text).toBe(1);
      expect(result.requests).toHaveLength(0);
      expect(readFileSync(batch.stateFile, "utf8")).toBe(bytes);
    }
    writeFileSync(batch.stateFile, "null");
    const result = batch.run("resume-only", ["--resume", batch.stateFile]);
    expect(result.status).toBe(1);
    expect(result.requests).toHaveLength(0);
    expect(readFileSync(batch.stateFile, "utf8")).toBe("null");
  }, 20000);

  it.each(["untrusted-host", "invalid-model", "oversized-model"])(
    "rejects %s downloads while retaining existing IDs",
    (fault) => {
      const batch = harness();
      const result = batch.run(fault);
      expect(result.status).toBe(1);
      expect(
        result.state!.assets.every(
          (asset) => asset.task.id && asset.status === "failed",
        ),
      ).toBe(true);
      expect(
        result.state!.assets.every(
          (asset) => !existsSync(join(batch.output, asset.id + ".glb")),
        ),
      ).toBe(true);
    },
  );

  it("keeps dry-run offline and rejects a changed count or image before charging", () => {
    const batch = harness();
    const dry = batch.run("success", ["--dry-run"]);
    expect(dry.status, dry.text).toBe(0);
    expect(dry.requests).toHaveLength(0);
    writeFileSync(join(batch.directory, plan.assets[24].reference), "invalid");
    const badImage = batch.run();
    expect(badImage.status).toBe(1);
    expect(badImage.requests).toHaveLength(0);
    const changed = structuredClone(plan);
    changed.assets.pop();
    writeFileSync(
      join(batch.directory, "scripts/savanna-expansion.json"),
      JSON.stringify(changed),
    );
    const badCount = batch.run();
    expect(badCount.status).toBe(1);
    expect(badCount.requests).toHaveLength(0);
    expect(badCount.state).toBeUndefined();
  });
});
