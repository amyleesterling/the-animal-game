import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { assets, roster, zebra } from "../../src/content/species";
import { validateContent } from "../../src/content/validate";

describe("reviewable species content", () => {
  it("ships one valid, cited three-question encounter and nine explicitly upcoming animals", () => {
    expect(validateContent()).toEqual([]);
    expect(
      roster.filter((animal) => animal.available).map((animal) => animal.id),
    ).toEqual([zebra.id]);
    expect(roster.filter((animal) => !animal.available)).toHaveLength(9);
    expect(zebra.quizzes.map((question) => question.kind)).toEqual([
      "spot",
      "understand",
      "connect",
    ]);
  });

  it("rejects a missing question narration and unnarrated answer", () => {
    const broken = structuredClone(zebra);
    broken.quizzes[0].narration = "";
    broken.quizzes[1].choices[0].narration = "";
    expect(validateContent([broken]).join("\n")).toMatch(
      /zebra-pattern: missing narration/,
    );
    expect(validateContent([broken]).join("\n")).toMatch(
      /food-fish: missing choice text or narration/,
    );
  });

  it("rejects duplicate IDs, impossible correct choices and an incorrect number of questions", () => {
    const broken = structuredClone(zebra);
    broken.quizzes[0].choices[1].id = broken.quizzes[0].choices[0].id;
    broken.quizzes[1].correctChoiceId = "not-a-choice";
    broken.quizzes.pop();
    const errors = validateContent([broken]).join("\n");
    expect(errors).toMatch(/duplicate ID/);
    expect(errors).toMatch(/correct answer is not a defined choice/);
    expect(errors).toMatch(/exactly three questions/);
  });

  it("rejects uncited claims, unknown citations, and missing review dates", () => {
    const broken = structuredClone(zebra);
    broken.summary.sourceIds = [];
    broken.adaptations[0].sourceIds = ["unknown-source"];
    broken.stats[0].lastReviewed = "";
    const errors = validateContent([broken]).join("\n");
    expect(errors).toMatch(/factual content needs a source/);
    expect(errors).toMatch(/unknown source unknown-source/);
    expect(errors).toMatch(/missing review date/);
  });

  it("rejects missing asset definitions or descriptions without pretending a call exists", () => {
    expect(validateContent([zebra], []).join("\n")).toMatch(
      /undefined model asset/,
    );
    const brokenAssets = structuredClone(assets);
    brokenAssets[0].alt = "";
    expect(validateContent([zebra], brokenAssets).join("\n")).toMatch(
      /accessible description/,
    );
    expect(zebra.audio.callAssetId).toBeNull();
  });

  it("defines the attributed Meshy GLB with an explicit procedural fallback", () => {
    expect(zebra.model).toMatchObject({
      assetId: "meshy-zebra-portrait-v1",
      assetPath: "/models/zebra.glb",
      assetForwardAxis: "+z",
      targetHeight: 2.25,
      fallbackAssetId: "procedural-zebra-v1",
    });
    const primary = assets.find((asset) => asset.id === zebra.model.assetId);
    expect(primary).toMatchObject({
      kind: "glb",
      rig: { skeletal: false, embeddedAnimationClips: 0 },
      attribution: {
        title: "Zebra Portrait",
        creator: "amyleerobinson",
        sourceUrl: "https://www.meshy.ai/s/fURUJE",
        license: "CC BY 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      },
    });
    expect(
      assets.find((asset) => asset.id === zebra.model.fallbackAssetId)?.kind,
    ).toBe("procedural");
  });

  it.each([
    "https://example.com/zebra.glb",
    "//example.com/zebra.glb",
    "/models/../zebra.glb",
    "/models/%2e%2e/zebra.glb",
    "/models/zebra.gltf",
    "/models/zebra.glb?remote=true",
  ])("rejects model paths outside the local GLB contract: %s", (path) => {
    const broken = structuredClone(zebra);
    broken.model.assetPath = path;
    expect(validateContent([broken]).join("\n")).toMatch(
      /local \/models\/ GLB path/,
    );
  });

  it("rejects mismatched GLB paths, unsupported orientation, and nonexistent fallback models", () => {
    const broken = structuredClone(zebra);
    broken.model.assetPath = "/models/different.glb";
    broken.model.assetForwardAxis =
      "+y" as typeof broken.model.assetForwardAxis;
    broken.model.fallbackAssetId = "missing-fallback";
    const errors = validateContent([broken]).join("\n");
    expect(errors).toMatch(/match its GLB asset definition/);
    expect(errors).toMatch(/model forward axis/);
    expect(errors).toMatch(/defined procedural asset/);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an unusable model height: %s",
    (height) => {
      const broken = structuredClone(zebra);
      broken.model.targetHeight = height;
      expect(validateContent([broken]).join("\n")).toMatch(
        /target height must be finite and positive/,
      );
    },
  );

  it("requires GLB attribution and source-rig metadata", () => {
    const brokenAssets = structuredClone(assets);
    const primary = brokenAssets.find((asset) => asset.kind === "glb")!;
    if (primary.kind !== "glb") throw new Error("Expected a GLB fixture");
    primary.attribution.creator = "";
    primary.attribution.modifications = "";
    primary.attribution.licenseUrl = "not-a-link";
    primary.rig.embeddedAnimationClips = -1;
    const errors = validateContent([zebra], brokenAssets).join("\n");
    expect(errors).toMatch(
      /missing GLB title, creator, license, or modification attribution/,
    );
    expect(errors).toMatch(/source and license need HTTPS links/);
    expect(errors).toMatch(/source rig metadata/);
  });

  it("resolves model files and checks that source-rig metadata matches the bundled GLB", () => {
    for (const asset of assets) {
      if (asset.kind === "procedural") {
        expect(
          existsSync(new URL(`../../${asset.implementation}`, import.meta.url)),
        ).toBe(true);
      }
      if (asset.kind !== "glb") continue;
      const buffer = readFileSync(
        new URL(`../../public${asset.assetPath}`, import.meta.url),
      );
      expect(buffer.readUInt32LE(0)).toBe(0x46546c67);
      expect(buffer.readUInt32LE(4)).toBe(2);
      expect(buffer.readUInt32LE(8)).toBe(buffer.length);
      expect(buffer.readUInt32LE(16)).toBe(0x4e4f534a);
      const jsonLength = buffer.readUInt32LE(12);
      const model = JSON.parse(
        buffer.subarray(20, 20 + jsonLength).toString("utf8"),
      ) as { skins?: unknown[]; animations?: unknown[] };
      expect(Boolean(model.skins?.length)).toBe(asset.rig.skeletal);
      expect(model.animations?.length ?? 0).toBe(
        asset.rig.embeddedAnimationClips,
      );
    }
  });
});
