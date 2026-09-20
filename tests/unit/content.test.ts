import { describe, expect, it } from "vitest";
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
});
