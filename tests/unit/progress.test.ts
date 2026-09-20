import { describe, expect, it } from "vitest";
import { zebra } from "../../src/content/species";
import {
  continueAfterAnswer,
  isProgress,
  isQuizComplete,
  isValidPhotoDataUrl,
  newProgress,
  recordPhoto,
  replayQuiz,
  resetProgress,
  retryAnswer,
  submitAnswer,
  type Progress,
} from "../../src/state/progress";

export const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/ZAAAAABJRU5ErkJggg==";

export function finishEncounter(initial = newProgress()): Progress {
  let progress = initial;
  for (const question of zebra.quizzes) {
    progress = submitAnswer(
      progress,
      question.id,
      question.correctChoiceId,
    ).progress;
    progress = continueAfterAnswer(progress);
  }
  return progress;
}

describe("gentle encounter progression", () => {
  it("requires all three explanations to be acknowledged before unlocking the camera", () => {
    let progress = newProgress();
    expect(() => recordPhoto(progress, PHOTO)).toThrow(/three zebra facts/);
    expect(() => continueAfterAnswer(progress)).toThrow(/Choose an answer/);
    for (const question of zebra.quizzes) {
      const previous = structuredClone(progress);
      const result = submitAnswer(
        progress,
        question.id,
        question.correctChoiceId,
      );
      expect(result.correct).toBe(true);
      expect(progress).toEqual(previous);
      expect(result.progress.quiz.questionIndex).toBe(
        progress.quiz.questionIndex,
      );
      expect(result.progress.encounterCompleted).toBe(false);
      progress = continueAfterAnswer(result.progress);
    }
    expect(isQuizComplete(progress)).toBe(true);
    expect(progress.encounterCompleted).toBe(true);
    expect(progress.photo).toBeNull();
    expect(progress.discoveredAt).toBeNull();
    expect(isProgress(progress)).toBe(true);
  });

  it("offers warm feedback and supports retry or continue after a wrong answer", () => {
    const question = zebra.quizzes[0];
    const wrongId = question.choices.find(
      (choice) => choice.id !== question.correctChoiceId,
    )!.id;
    const first = submitAnswer(newProgress(), question.id, wrongId);
    expect(first.correct).toBe(false);
    expect(first.explanation).toContain("Let’s discover it together.");
    expect(first.explanation).toContain(question.explanation);
    expect(first.progress.quiz.questionIndex).toBe(0);
    const retry = retryAnswer(first.progress);
    expect(retry.quiz.lastAnswer).toBeNull();
    expect(retry.quiz.attempts[question.id]).toBe(1);
    expect(
      submitAnswer(retry, question.id, question.correctChoiceId).progress.quiz
        .attempts[question.id],
    ).toBe(2);
    expect(continueAfterAnswer(first.progress).quiz.questionIndex).toBe(1);
  });

  it("cannot skip ahead, submit unknown answers, or apply the same answer twice", () => {
    const progress = newProgress();
    expect(() =>
      submitAnswer(
        progress,
        zebra.quizzes[1].id,
        zebra.quizzes[1].correctChoiceId,
      ),
    ).toThrow(/current question/);
    expect(() =>
      submitAnswer(progress, zebra.quizzes[0].id, "imaginary-choice"),
    ).toThrow(/not available/);
    const answered = submitAnswer(
      progress,
      zebra.quizzes[0].id,
      zebra.quizzes[0].correctChoiceId,
    ).progress;
    expect(() =>
      submitAnswer(
        answered,
        zebra.quizzes[0].id,
        zebra.quizzes[0].correctChoiceId,
      ),
    ).toThrow(/Try again or continue/);
  });

  it("lets curiosity finish the encounter even when every answer is initially wrong", () => {
    let progress = newProgress();
    for (const question of zebra.quizzes) {
      const wrong = question.choices.find(
        (choice) => choice.id !== question.correctChoiceId,
      )!;
      progress = continueAfterAnswer(
        submitAnswer(progress, question.id, wrong.id).progress,
      );
    }
    expect(progress.encounterCompleted).toBe(true);
    expect(isProgress(progress)).toBe(true);
  });
});

describe("field-book photograph and saved-state invariants", () => {
  it("unlocks the book only with a captured image and keeps the first discovery date", () => {
    const completed = finishEncounter();
    const captured = recordPhoto(completed, PHOTO, "2026-09-19T14:00:00.000Z");
    expect(captured.discoveredAt).toBe("2026-09-19T14:00:00.000Z");
    expect(captured.photo?.dataUrl).toBe(PHOTO);
    const second = recordPhoto(captured, PHOTO, "2026-09-20T14:00:00.000Z");
    expect(second.discoveredAt).toBe(captured.discoveredAt);
    expect(second.photo?.capturedAt).toBe("2026-09-20T14:00:00.000Z");
    expect(isProgress(second)).toBe(true);
  });

  it.each([
    "",
    "data:image/png;base64,",
    "data:image/png;base64,bm90LWFuLWltYWdl",
    "https://example.com/zebra.jpg",
    "data:text/html;base64,PGgxPmhpPC9oMT4=",
    "data:image/png;base64," + "A".repeat(4_000_000),
  ])("rejects an invalid or oversized photograph", (value) => {
    expect(isValidPhotoDataUrl(value)).toBe(false);
    expect(() => recordPhoto(finishEncounter(), value)).toThrow(
      /could not be captured/,
    );
  });

  it("replays preserve discoveries; an explicit reset clears them but keeps preferences", () => {
    const saved = recordPhoto(
      finishEncounter(newProgress({ reducedMotion: true, narration: false })),
      PHOTO,
    );
    const replay = replayQuiz(saved);
    expect(replay.quiz.questionIndex).toBe(0);
    expect(replay.photo).toEqual(saved.photo);
    expect(replay.encounterCompleted).toBe(true);
    expect(isProgress(replay)).toBe(true);
    const reset = resetProgress(replay);
    expect(reset.photo).toBeNull();
    expect(reset.encounterCompleted).toBe(false);
    expect(reset.settings).toEqual(saved.settings);
  });

  it("rejects corrupted progress, invented answers and unearned photos", () => {
    expect(isProgress({})).toBe(false);
    expect(isProgress({ ...newProgress(), schemaVersion: 2 })).toBe(false);
    expect(
      isProgress({
        ...newProgress(),
        settings: { ...newProgress().settings, volume: 2 },
      }),
    ).toBe(false);
    expect(
      isProgress({
        ...newProgress(),
        photo: { dataUrl: PHOTO, capturedAt: new Date().toISOString() },
        discoveredAt: new Date().toISOString(),
      }),
    ).toBe(false);
    const badAnswer = submitAnswer(
      newProgress(),
      zebra.quizzes[0].id,
      zebra.quizzes[0].correctChoiceId,
    ).progress;
    badAnswer.quiz.lastAnswer!.correct = false;
    expect(isProgress(badAnswer)).toBe(false);
    const badOrder = finishEncounter();
    badOrder.quiz.completedQuestionIds.reverse();
    expect(isProgress(badOrder)).toBe(false);
  });
});
