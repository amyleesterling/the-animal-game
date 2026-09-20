import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
// The generator is author-time JavaScript with an injectable offline transport.
// @ts-expect-error Author-time .mjs deliberately stays outside the browser TS project.
import * as generator from "../../scripts/generate-narration.mjs";
const {
  generateNarration,
  planNarration,
  endpoint,
  ssml,
  validateMp3,
  sha256,
  VOICE,
  FORMAT,
  LIMITS,
} = generator;

const fakeKey = "FAKE_NARRATION_TEST_KEY_NEVER_A_SECRET";
const catalog = [
  {
    id: "narrator-sample",
    text: `Welcome, Sophia. A giraffe's "long" neck & <leaves>!`,
  },
  {
    id: "safari-intro",
    text: "Let us explore Tanzania's wonderful animals together.",
  },
];
// Three complete 24 kHz mono MPEG2 Layer III frames; synthetic transport fixture,
// not a recording or a perceptual audio-quality test.
const frame = Buffer.alloc(288);
frame.set([0xff, 0xf3, 0xa4, 0xc0]);
const mp3 = Buffer.concat([frame, frame, frame]);
const directories: string[] = [];
const prefix = join(resolve(tmpdir()), "narration-offline-test-");
function harness() {
  const output = mkdtempSync(prefix);
  directories.push(output);
  const requests: {
    url: string;
    options: RequestInit;
    marker: Record<string, unknown>;
  }[] = [];
  const fetchImpl = vi.fn(async (url: string, options: RequestInit) => {
    const state = JSON.parse(
      readFileSync(join(output, "batch-state.json"), "utf8"),
    );
    const marker = state.clips.find(
      (clip: { status: string }) => clip.status === "SUBMITTING",
    );
    requests.push({ url, options, marker });
    return new Response(mp3, { headers: { "content-type": "audio/mpeg" } });
  });
  const options = {
    catalog,
    outputDir: output,
    key: fakeKey,
    region: "eastus",
    fetchImpl,
    log: vi.fn(),
  };
  return {
    output,
    options,
    requests,
    fetchImpl,
    state: () =>
      JSON.parse(readFileSync(join(output, "batch-state.json"), "utf8")),
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of directories.splice(0)) {
    const absolute = resolve(directory);
    if (
      !absolute.startsWith(prefix) ||
      absolute.slice(prefix.length).includes(sep)
    )
      throw new Error("Refusing to remove an unowned test path");
    rmSync(absolute, { recursive: true, force: true });
  }
});

describe("bounded author-time Tanzanian narration", () => {
  it("dry-runs without credentials, files or any network request", async () => {
    const h = harness();
    const network = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Real network forbidden"));
    const result = await generateNarration({
      ...h.options,
      key: undefined,
      region: undefined,
      dryRun: true,
    });
    expect(result.plan.clips).toHaveLength(2);
    expect(result.plan.characters).toBe(
      catalog.reduce((n, clip) => n + clip.text.length, 0),
    );
    expect(h.fetchImpl).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
    expect(existsSync(join(h.output, "batch-state.json"))).toBe(false);
    expect(existsSync(join(h.output, "generation.lock"))).toBe(false);
  });
  it("bounds the whole catalog before selecting a sample, and rejects unsafe XML and IDs", () => {
    for (const invalid of [
      [],
      [...catalog, catalog[0]],
      [{ id: "../escape", text: "Hello" }],
      [{ id: "hello", text: "\u0000" }],
      [{ id: "hello", text: "\ud800" }],
      [{ id: "hello", text: "x".repeat(LIMITS.perClip + 1) }],
      Array.from({ length: LIMITS.clips + 1 }, (_, i) => ({
        id: `clip-${i}`,
        text: "Hi",
      })),
      Array.from({ length: 20 }, (_, i) => ({
        id: `clip-${i}`,
        text: "x".repeat(2500),
      })),
    ]) {
      expect(() => planNarration(invalid, true)).toThrow();
    }
    expect(() => planNarration([{ id: "hello", text: "Hi" }], true)).toThrow(
      "narrator-sample",
    );
    const body = ssml(catalog[0].text);
    expect(body).toContain(`xml:lang="en-TZ"`);
    expect(body).toContain(`name="${VOICE}"`);
    expect(body).toContain(
      "giraffe&apos;s &quot;long&quot; neck &amp; &lt;leaves&gt;",
    );
    expect(body).not.toMatch(/prosody|pitch=|rate=|mstts:/);
  });
  it("guards credentials and restricts the endpoint to reviewed Azure region hostnames", async () => {
    const h = harness();
    for (const key of ["", "too-short", "secret\r\nheader-value"])
      await expect(generateNarration({ ...h.options, key })).rejects.toThrow(
        "AZURE_SPEECH_KEY",
      );
    for (const region of [
      undefined,
      "eastus.attacker.test",
      "https://eastus",
      "eastus/path",
      "eastus?key=x",
      "EASTUS",
    ])
      await expect(generateNarration({ ...h.options, region })).rejects.toThrow(
        "AZURE_SPEECH_REGION",
      );
    expect(h.fetchImpl).not.toHaveBeenCalled();
    expect(endpoint("eastus")).toBe(
      "https://eastus.tts.speech.microsoft.com/cognitiveservices/v1",
    );
    expect(existsSync(join(h.output, "manifest.json"))).toBe(false);
  });
  it("checkpoints before each paid request, stages hash-addressed MP3s, and emits only a complete manifest", async () => {
    const h = harness();
    const result = await generateNarration(h.options);
    expect(h.requests).toHaveLength(catalog.length);
    for (const request of h.requests) {
      expect(request.marker).toMatchObject({
        status: "SUBMITTING",
        submissionStartedAt: expect.any(String),
      });
      expect(request.url).toBe(endpoint("eastus"));
      expect(request.options.method).toBe("POST");
      expect(request.options.redirect).toBe("error");
      expect(
        new Headers(request.options.headers).get("Ocp-Apim-Subscription-Key"),
      ).toBe(fakeKey);
      expect(
        new Headers(request.options.headers).get("X-Microsoft-OutputFormat"),
      ).toBe(FORMAT);
    }
    expect(result.manifest).toMatchObject({
      version: 1,
      voice: VOICE,
      locale: "en-TZ",
      generatedAt: expect.any(String),
    });
    expect(result.manifest.clips).toHaveLength(2);
    for (const clip of result.manifest.clips) {
      expect(clip.path).toBe(
        `audio/elimu/${clip.id}-${sha256(mp3).slice(0, 12)}.mp3`,
      );
      expect(readFileSync(join(h.output, clip.path))).toEqual(mp3);
      expect(clip.sha256).toBe(sha256(mp3));
    }
    expect(JSON.stringify(h.state())).not.toContain(fakeKey);
    expect(JSON.stringify(h.options.log.mock.calls)).not.toContain(fakeKey);
    expect(h.state().status).toBe("COMPLETE");
  });
  it.each(["network", "http", "decode", "oversized"])(
    "never retries an uncertain %s response, including on resume",
    async (fault) => {
      const h = harness();
      h.fetchImpl.mockImplementation(async () => {
        if (fault === "network")
          throw new Error(
            `Network leaked ${fakeKey} https://example.invalid/signed?token=PRIVATE`,
          );
        if (fault === "http")
          return new Response("private server response", { status: 429 });
        if (fault === "oversized")
          return new Response(mp3, {
            headers: {
              "content-type": "audio/mpeg",
              "content-length": String(LIMITS.audioBytes + 1),
            },
          });
        return new Response("not an MP3", {
          headers: { "content-type": "audio/mpeg" },
        });
      });
      await expect(generateNarration(h.options)).rejects.toThrow();
      expect(h.fetchImpl).toHaveBeenCalledOnce();
      expect(h.state().clips[0].status).toBe("UNCERTAIN");
      expect(h.state().clips[1].status).toBe("PENDING");
      expect(h.state().error).not.toMatch(
        /FAKE_NARRATION|PRIVATE|private server/,
      );
      expect(existsSync(join(h.output, "manifest.json"))).toBe(false);
      await expect(generateNarration(h.options)).rejects.toThrow(
        "may have been billed",
      );
      expect(h.fetchImpl).toHaveBeenCalledOnce();
    },
  );
  it("resumes verified recordings without credentials or another POST, and rejects tampered files or text", async () => {
    const h = harness();
    const result = await generateNarration(h.options);
    h.fetchImpl.mockClear();
    await generateNarration({ ...h.options, key: "", region: "" });
    expect(h.fetchImpl).not.toHaveBeenCalled();
    await expect(
      generateNarration({
        ...h.options,
        catalog: [catalog[0], { ...catalog[1], text: "Changed story" }],
      }),
    ).rejects.toThrow("does not match");
    writeFileSync(
      join(h.output, result.manifest.clips[1].path),
      Buffer.from("changed"),
    );
    await expect(generateNarration(h.options)).rejects.toThrow(
      "hash/size mismatch",
    );
    expect(h.fetchImpl).not.toHaveBeenCalled();
  });
  it("resumes untouched pending clips only after validating every completed recording", async () => {
    const h = harness();
    await generateNarration(h.options);
    const state = h.state();
    const {
      path,
      sha256: digest,
      bytes,
      finishedAt,
      submissionStartedAt,
      ...pending
    } = state.clips[1];
    state.clips[1] = { ...pending, status: "PENDING" };
    state.status = "IN_PROGRESS";
    writeFileSync(join(h.output, "batch-state.json"), JSON.stringify(state));
    h.fetchImpl.mockClear();
    await generateNarration(h.options);
    expect(h.fetchImpl).toHaveBeenCalledOnce();
    expect(h.fetchImpl.mock.calls[0][1].body).toBe(ssml(catalog[1].text));
  });
  it("isolates a single sample from the full publishable manifest", async () => {
    const h = harness();
    const fetchImpl = vi.fn(
      async () =>
        new Response(mp3, { headers: { "content-type": "audio/mpeg" } }),
    );
    const result = await generateNarration({
      ...h.options,
      sample: true,
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.manifest).toMatchObject({
      kind: "sample",
      completeBatch: false,
      clip: { id: "narrator-sample" },
    });
    expect(existsSync(join(h.output, "manifest.json"))).toBe(false);
    expect(existsSync(join(h.output, "sample", "manifest.json"))).toBe(false);
    expect(existsSync(join(h.output, "sample", "sample-manifest.json"))).toBe(
      true,
    );
  });
  it("refuses a concurrent or interrupted generator without deleting its lock", async () => {
    const h = harness();
    writeFileSync(join(h.output, "generation.lock"), "");
    await expect(generateNarration(h.options)).rejects.toThrow("locked");
    expect(existsSync(join(h.output, "generation.lock"))).toBe(true);
    expect(h.fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects truncated audio and a response that only looks like an ID3 tag", () => {
    expect(() => validateMp3(mp3)).not.toThrow();
    expect(() => validateMp3(mp3.subarray(0, mp3.length - 1))).toThrow(
      "truncated",
    );
    const id3 = Buffer.alloc(200);
    id3.write("ID3");
    expect(() => validateMp3(id3)).toThrow();
  });
});
