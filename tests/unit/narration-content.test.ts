import { describe, expect, it } from "vitest";
import {
  classicFeedbackNarration,
  classicFieldBookNarration,
  classicNarration,
  classicQuestionNarration,
  narrationClips,
  narratorSample,
  safariNarration,
  safariStopNarration,
} from "../../src/content/narration";
import { zebra } from "../../src/content/species";
import { safariEnding, safariStops } from "../../src/content/safari";

const clipTexts = new Set(narrationClips.map((clip) => clip.text));
describe("authored narration catalog", () => {
  it("has unique safe IDs and one exact-text recording per runtime line", () => {
    expect(narrationClips.length).toBeGreaterThan(70);
    expect(new Set(narrationClips.map((clip) => clip.id)).size).toBe(
      narrationClips.length,
    );
    expect(clipTexts.size).toBe(narrationClips.length);
    for (const clip of narrationClips) {
      expect(clip.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(clip.text).toBe(clip.text.trim());
      expect(clip.text.length).toBeGreaterThan(10);
      expect(clip.text).not.toMatch(/undefined|\[object Object\]|\.\./);
    }
    expect(
      narrationClips.find((clip) => clip.id === "narrator-sample")?.text,
    ).toBe(narratorSample);
  });

  it("covers welcome, guidance, photo and complete field-book text derived from the species", () => {
    for (const text of Object.values(classicNarration))
      expect(clipTexts.has(text)).toBe(true);
    const text = classicFieldBookNarration();
    expect(clipTexts.has(text)).toBe(true);
    expect(text).toContain(zebra.pronunciation);
    expect(text).toContain(zebra.summary.narration);
    for (const fact of [
      ...zebra.stats,
      ...zebra.adaptations,
      ...zebra.ecologicalRole,
    ])
      expect(text).toContain(fact.narration);
  });

  it("covers all six rendered choice orders for each classic question, including spoken A/B/C labels", () => {
    for (const question of zebra.quizzes) {
      const [a, b, c] = question.choices;
      const orders = [
        [a, b, c],
        [a, c, b],
        [b, a, c],
        [b, c, a],
        [c, a, b],
        [c, b, a],
      ];
      const texts = orders.map((order) =>
        classicQuestionNarration(
          question.id,
          order.map((choice) => choice.id),
        ),
      );
      expect(new Set(texts).size).toBe(6);
      for (const [index, text] of texts.entries()) {
        expect(clipTexts.has(text)).toBe(true);
        expect(text.startsWith(question.narration)).toBe(true);
        const order = orders[index];
        expect(text).toContain(`A. ${order[0].narration}`);
        expect(text).toContain(`B. ${order[1].narration}`);
        expect(text).toContain(`C. ${order[2].narration}`);
      }
      for (const correct of [true, false]) {
        const text = classicFeedbackNarration(question.id, correct);
        expect(clipTexts.has(text)).toBe(true);
        expect(text).toContain(question.narrationExplanation);
      }
    }
  });

  it("refuses an incomplete, duplicated or unknown classic choice order", () => {
    const question = zebra.quizzes[0];
    const ids = question.choices.map((choice) => choice.id);
    expect(() => classicQuestionNarration(question.id, ids.slice(1))).toThrow();
    expect(() =>
      classicQuestionNarration(question.id, [ids[0], ids[0], ids[2]]),
    ).toThrow();
    expect(() =>
      classicQuestionNarration(question.id, [ids[0], ids[1], "unknown"]),
    ).toThrow();
    expect(() => classicQuestionNarration("unknown", ids)).toThrow();
  });

  it("covers every safari stage and derives each fact, choice and next stop from story content", () => {
    expect(clipTexts.has(safariNarration.intro)).toBe(true);
    expect(safariNarration.ending).toBe(safariEnding);
    expect(clipTexts.has(safariEnding)).toBe(true);
    for (const [index, stop] of safariStops.entries()) {
      for (const stage of [
        "explore",
        "question",
        "correct",
        "incorrect",
        "photo",
        "success",
      ] as const) {
        const text = safariStopNarration(stop, stage);
        expect(
          narrationClips.find(
            (clip) => clip.id === `safari-${stop.id}-${stage}`,
          )?.text,
        ).toBe(text);
      }
      const explore = safariStopNarration(stop, "explore");
      expect(explore).toContain(stop.story);
      expect(explore).toContain(stop.mission);
      const question = safariStopNarration(stop, "question");
      expect(question).toContain(stop.question.prompt);
      for (const [index, choice] of stop.question.choices.entries())
        expect(question).toContain(`${index + 1}. ${choice.text}`);
      for (const stage of ["correct", "incorrect"] as const)
        expect(safariStopNarration(stop, stage)).toContain(
          stop.question.explanation,
        );
      const success = safariStopNarration(stop, "success");
      expect(success).toContain(stop.clue);
      expect(success).toContain(stop.facts[0]);
      expect(success).toContain(
        index < 6 ? safariStops[index + 1].name : "All seven clues are ready",
      );
    }
  });
});
