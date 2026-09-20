import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const data = readFileSync("public/models/zebra.glb");
const jsonLength = data.readUInt32LE(12);
const model = JSON.parse(data.subarray(20, 20 + jsonLength).toString("utf8"));
const manifest = JSON.parse(
  readFileSync("public/assets-manifest.json", "utf8"),
);
const entry = manifest.assets.find(
  (asset: { id: string }) => asset.id === "meshy-zebra-portrait-v1",
);

describe("bundled Meshy zebra", () => {
  it("is a self-contained GLB within the 1.5 MB download budget", () => {
    expect(data.toString("utf8", 0, 4)).toBe("glTF");
    expect(data.readUInt32LE(4)).toBe(2);
    expect(data.readUInt32LE(8)).toBe(data.length);
    expect(data.readUInt32LE(16)).toBe(0x4e4f534a);
    expect(data.readUInt32LE(24 + jsonLength)).toBe(0x004e4942);
    expect(data.length).toBeLessThan(1_500_000);
    expect(model.buffers).toHaveLength(1);
    expect(model.buffers[0].uri).toBeUndefined();
    expect(model.images).toHaveLength(3);
    for (const image of model.images) {
      expect(image.uri).toBeUndefined();
      expect(image.mimeType).toBe("image/jpeg");
      expect(model.bufferViews[image.bufferView]).toBeDefined();
    }
    const binaryLength = data.readUInt32LE(20 + jsonLength);
    for (const view of model.bufferViews) {
      expect(view.buffer).toBe(0);
      expect(view.byteOffset % 4).toBe(0);
      expect(view.byteOffset + view.byteLength).toBeLessThanOrEqual(
        binaryLength,
      );
    }
  });

  it("records the actual geometry, unrigged source, and distributed file checksum", () => {
    const mesh = model.meshes[0].primitives[0];
    expect(model.accessors[mesh.attributes.POSITION].count).toBe(
      entry.vertexCount,
    );
    expect(model.accessors[mesh.indices].count / 3).toBe(entry.polygonCount);
    expect(model.skins ?? []).toEqual([]);
    expect(model.animations ?? []).toEqual(entry.embeddedAnimations);
    expect(entry.embeddedSkeleton).toBe(false);
    expect(data.length).toBe(entry.bytes);
    expect(createHash("sha256").update(data).digest("hex")).toBe(entry.sha256);
    expect(model.asset.copyright).toContain(entry.creator);
    expect(model.asset.copyright).toContain(entry.license);
  });
});
