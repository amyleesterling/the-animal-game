import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { narrationClips } from "../../src/content/narration";
import manifest from "../../src/content/narration-manifest.json";
import { readVoicePack } from "../../src/accessibility/voice-pack";

it("ships either an explicitly pending voice pack or a complete, verified set of recordings", () => {
  const pack = readVoicePack(manifest, narrationClips);
  expect(pack.status).not.toBe("invalid");
  for (const clip of pack.clips.values()) {
    const audio = readFileSync(resolve("public", clip.path));
    expect(audio.byteLength, clip.id).toBeGreaterThan(1_000);
    expect(createHash("sha256").update(audio).digest("hex"), clip.id).toBe(
      clip.sha256,
    );
    const mp3 =
      audio.subarray(0, 3).toString("ascii") === "ID3" ||
      (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0);
    expect(
      mp3,
      `${clip.id} must contain MP3 audio, not a provider error page`,
    ).toBe(true);
  }
});
