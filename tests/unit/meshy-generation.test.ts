import { spawnSync } from "node:child_process";
import {
  existsSync,
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
const script = join(project, "scripts/generate-test-animals.mjs");
const plan = JSON.parse(
  readFileSync(join(project, "scripts/meshy-test-animals.json"), "utf8"),
);
const fakeKey = "FAKE_OFFLINE_TEST_KEY_NOT_A_CREDENTIAL";
const tempPrefix = join(resolve(tmpdir()), "animal-game-meshy-test-");
const directories: string[] = [];

type Stage = { id?: string; status: string; submissionStartedAt?: string };
type Animal = {
  id: string;
  status: string;
  preview?: Stage;
  refine?: Stage;
};
type Batch = { animals: Animal[]; error?: string };
type Request = {
  method: string;
  path: string;
  mode?: string;
  hasAuthorization: boolean;
};

// Imported before the real script. No original fetch is retained or called;
// every request receives an offline response or fails closed as unexpected.
const preload = `
import { appendFileSync } from "node:fs";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import http from "node:http";
import https from "node:https";
import net from "node:net";
const denyNetwork = () => { throw new Error("Real network disabled by offline test"); };
http.request = http.get = https.request = https.get = denyNetwork;
net.connect = net.createConnection = denyNetwork;
const scenario = process.env.MESHY_TEST_SCENARIO;
if (scenario.startsWith("rename-")) {
  const rename = fs.renameSync;
  let failures = 0;
  fs.renameSync = (...args) => {
    if (failures < 2 || scenario === "rename-permanent") {
      const code = failures++ === 0 ? "EPERM" : "EBUSY";
      appendFileSync(process.env.MESHY_TEST_REQUESTS, JSON.stringify({ method: "FILE", path: code, hasAuthorization: false }) + "\\n");
      throw Object.assign(new Error("Simulated temporary Windows file lock"), { code });
    }
    return rename(...args);
  };
  syncBuiltinESMExports();
}
let submission = 0;
const modes = new Map();
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : undefined;
  const authorization = new Headers(options.headers).get("Authorization");
  appendFileSync(process.env.MESHY_TEST_REQUESTS, JSON.stringify({
    method, path: url.pathname, mode: body?.mode,
    hasAuthorization: Boolean(authorization),
  }) + "\\n");
  if (url.origin === "https://api.meshy.ai") {
    if (authorization !== "Bearer ${fakeKey}") throw new Error("Expected fake credential only");
    if (url.pathname === "/openapi/v1/balance" && method === "GET")
      return Response.json({ balance: scenario === "resume-existing" ? 0 : 135 });
    if (url.pathname === "/openapi/v2/text-to-3d" && method === "POST") {
      if (scenario.startsWith("resume-")) throw new Error("Unexpected paid replacement task");
      if (scenario === "uncertain-network")
        throw new Error("Connection lost ${fakeKey} https://assets.meshy.ai/private?signature=PRIVATE_TEST_SIGNATURE");
      if (scenario === "uncertain-http") return new Response("not logged", { status: 503 });
      const id = "offline-" + body.mode + "-" + (++submission);
      modes.set(id, body.mode);
      return Response.json({ result: id });
    }
    if (url.pathname.startsWith("/openapi/v2/text-to-3d/") && method === "GET") {
      const id = decodeURIComponent(url.pathname.split("/").pop());
      const mode = modes.get(id) || (id.includes("refine") ? "refine" : "preview");
      const failed = scenario === "pilot-" + mode + "-failed";
      return Response.json({
        status: failed ? "FAILED" : "SUCCEEDED", progress: 100,
        consumed_credits: failed ? 0 : mode === "preview" ? 5 : 10,
        model_urls: { glb: "https://assets.meshy.ai/" + id + ".glb?signature=PRIVATE_TEST_SIGNATURE" },
      });
    }
  }
  if (url.origin === "https://assets.meshy.ai" && method === "GET") {
    if (authorization) throw new Error("Credential was forwarded to asset host");
    const glb = Buffer.alloc(28);
    glb.writeUInt32LE(0x46546c67, 0);
    glb.writeUInt32LE(2, 4);
    glb.writeUInt32LE(glb.length, 8);
    return new Response(glb);
  }
  throw new Error("Unexpected offline request");
};
`;

function harness() {
  const directory = mkdtempSync(tempPrefix);
  directories.push(directory);
  const hook = join(directory, "offline-fetch.mjs");
  const stateFile = join(directory, "batch-state.json");
  writeFileSync(hook, preload);
  let runNumber = 0;
  return {
    stateFile,
    directory,
    run(scenario: string, resume = false) {
      const requestFile = join(directory, `requests-${++runNumber}.jsonl`);
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          pathToFileURL(hook).href,
          script,
          ...(resume ? ["--resume", stateFile] : []),
        ],
        {
          cwd: project,
          // Do not inherit credentials, NODE_OPTIONS, or proxy settings.
          env: {
            ...(process.env.SystemRoot
              ? { SystemRoot: process.env.SystemRoot }
              : {}),
            MESHY_API_KEY: fakeKey,
            MESHY_OUTPUT_DIR: directory,
            MESHY_TEST_SCENARIO: scenario,
            MESHY_TEST_REQUESTS: requestFile,
          },
          encoding: "utf8",
          timeout: 10_000,
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      const requests: Request[] = existsSync(requestFile)
        ? readFileSync(requestFile, "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line))
        : [];
      const output = result.stdout + result.stderr;
      expect(existsSync(stateFile), output).toBe(true);
      const text = readFileSync(stateFile, "utf8");
      expect(text + output).not.toContain(fakeKey);
      expect(text + output).not.toContain("PRIVATE_TEST_SIGNATURE");
      return {
        status: result.status,
        requests,
        state: JSON.parse(text) as Batch,
        output,
      };
    },
  };
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    const absolute = resolve(directory);
    // Remove only the uniquely created test directory, never a shared temp root.
    if (
      !absolute.startsWith(tempPrefix) ||
      !absolute.startsWith(resolve(tmpdir()) + sep)
    )
      throw new Error("Refusing to remove an unowned temporary path");
    rmSync(absolute, { recursive: true, force: true });
  }
});

describe("offline Meshy paid-request safeguards", () => {
  it.each(["preview", "refine"])(
    "stops the batch when the elephant %s pilot fails",
    (stage) => {
      const run = harness().run(`pilot-${stage}-failed`);
      expect(run.status).toBe(1);
      expect(
        run.requests
          .filter((request) => request.method === "POST")
          .map((request) => request.mode),
      ).toEqual(stage === "preview" ? ["preview"] : ["preview", "refine"]);
      expect(run.state.animals[0][stage as "preview" | "refine"]).toMatchObject(
        { status: "FAILED", id: expect.any(String) },
      );
      for (const animal of run.state.animals.slice(1)) {
        expect(animal.preview).toBeUndefined();
        expect(animal.refine).toBeUndefined();
      }
    },
  );

  it.each(["network", "http"])(
    "never retries an uncertain %s POST, even after restarting with saved state",
    (failure) => {
      const batch = harness();
      const first = batch.run(`uncertain-${failure}`);
      expect(first.status).toBe(1);
      expect(
        first.requests.filter((request) => request.method === "POST"),
      ).toHaveLength(1);
      expect(first.state.animals[0].preview).toMatchObject({
        status: "SUBMITTING",
        submissionStartedAt: expect.any(String),
      });
      expect(first.state.animals[0].preview?.id).toBeUndefined();

      const resumed = batch.run("resume-uncertain", true);
      expect(resumed.status).toBe(1);
      expect(
        resumed.requests.filter((request) => request.method === "POST"),
      ).toHaveLength(0);
      expect(resumed.state.animals[0].preview).toEqual(
        first.state.animals[0].preview,
      );
      expect(resumed.output).toContain("uncertain prior submission");
      // Resume still needs a balance check, but must stop before paid resubmission.
    },
  );

  it("polls and downloads saved task IDs without creating replacements", () => {
    const batch = harness();
    const animals = plan.animals.map((animal: { id: string }) => ({
      ...animal,
      status: "planned",
      preview: { id: `saved-preview-${animal.id}`, status: "PENDING" },
      refine: { id: `saved-refine-${animal.id}`, status: "PENDING" },
    }));
    writeFileSync(
      batch.stateFile,
      JSON.stringify({ batch: plan.batch, animals }),
    );
    const run = batch.run("resume-existing", true);
    expect(run.status, run.output).toBe(0);
    expect(
      run.requests.filter((request) => request.method === "POST"),
    ).toHaveLength(0);
    const polls = run.requests.filter((request) =>
      request.path.startsWith("/openapi/v2/text-to-3d/"),
    );
    expect(
      polls.map((request) => request.path.split("/").pop()).sort(),
    ).toEqual(
      animals
        .flatMap((animal: Animal) => [animal.preview!.id, animal.refine!.id])
        .sort(),
    );
    expect(run.state.animals.every((animal) => animal.status === "ready")).toBe(
      true,
    );
    expect(
      run.requests.filter((request) => request.path.endsWith(".glb")),
    ).toHaveLength(9);
    expect(
      run.requests
        .filter((request) => request.path.endsWith(".glb"))
        .every((request) => !request.hasAuthorization),
    ).toBe(true);
    const manifest = JSON.parse(
      readFileSync(join(batch.directory, "manifest.json"), "utf8"),
    );
    expect(manifest.animals).toHaveLength(9);
    for (const animal of manifest.animals)
      expect(existsSync(join(batch.directory, animal.file))).toBe(true);
  });

  it("bounds a successful fresh batch to one preview and one texture request per animal", () => {
    const run = harness().run("success");
    expect(run.status, run.output).toBe(0);
    const submissions = run.requests.filter(
      (request) => request.method === "POST",
    );
    expect(
      submissions.filter((request) => request.mode === "preview"),
    ).toHaveLength(9);
    expect(
      submissions.filter((request) => request.mode === "refine"),
    ).toHaveLength(9);
    expect(
      run.state.animals.filter((animal) => animal.status === "ready"),
    ).toHaveLength(9);
  });

  it("retries transient checkpoint locks without repeating any paid request", () => {
    const run = harness().run("rename-transient");
    expect(run.status, run.output).toBe(0);
    expect(
      run.requests
        .filter((request) => request.method === "FILE")
        .map((request) => request.path),
    ).toEqual(["EPERM", "EBUSY"]);
    expect(
      run.requests.filter((request) => request.method === "POST"),
    ).toHaveLength(18);
    expect(run.state.animals.every((animal) => animal.status === "ready")).toBe(
      true,
    );
  });

  it("preserves the previous checkpoint and stops before billing if the file stays locked", () => {
    const batch = harness();
    const checkpoint = { batch: plan.batch, animals: plan.animals };
    writeFileSync(batch.stateFile, JSON.stringify(checkpoint));
    const run = batch.run("rename-permanent", true);
    expect(run.status).toBe(1);
    expect(run.requests.every((request) => request.method === "FILE")).toBe(
      true,
    );
    expect(run.requests.length).toBeGreaterThan(1);
    expect(run.requests.length).toBeLessThanOrEqual(10);
    expect(JSON.parse(readFileSync(batch.stateFile, "utf8"))).toEqual(
      checkpoint,
    );
  });
});
