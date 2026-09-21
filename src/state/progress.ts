import { zebra } from "../content/species";

export const SAVE_SCHEMA_VERSION = 1 as const;

export interface GameSettings {
  narration: boolean;
  volume: number;
  reducedMotion: boolean;
  lowQuality: boolean;
}

export interface AnswerFeedback {
  questionId: string;
  choiceId: string;
  correct: boolean;
  explanation: string;
}

export interface Progress {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  encounterCompleted: boolean;
  quiz: {
    questionIndex: number;
    completedQuestionIds: string[];
    attempts: Record<string, number>;
    lastAnswer: AnswerFeedback | null;
  };
  photo: { dataUrl: string; capturedAt: string } | null;
  discoveredAt: string | null;
  settings: GameSettings;
}

export const defaultSettings: GameSettings = {
  narration: false,
  volume: 0.75,
  reducedMotion: false,
  lowQuality: false,
};

export function newProgress(settings: Partial<GameSettings> = {}): Progress {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    encounterCompleted: false,
    quiz: {
      questionIndex: 0,
      completedQuestionIds: [],
      attempts: {},
      lastAnswer: null,
    },
    photo: null,
    discoveredAt: null,
    settings: { ...defaultSettings, ...settings },
  };
}

export function isQuizComplete(progress: Progress): boolean {
  return progress.quiz.questionIndex === zebra.quizzes.length;
}

/** Answer submission never advances the question: the child first sees/hears its explanation. */
export function submitAnswer(
  progress: Progress,
  questionId: string,
  choiceId: string,
): {
  progress: Progress;
  correct: boolean;
  explanation: string;
} {
  const question = zebra.quizzes[progress.quiz.questionIndex];
  if (!question || question.id !== questionId)
    throw new Error("Please answer the current question.");
  if (progress.quiz.lastAnswer)
    throw new Error("Try again or continue before answering another question.");
  if (!question.choices.some((choice) => choice.id === choiceId))
    throw new Error("That answer is not available.");
  const correct = question.correctChoiceId === choiceId;
  const explanation = `${correct ? "You spotted it!" : "Let’s discover it together."} ${question.explanation}`;
  const lastAnswer = { questionId, choiceId, correct, explanation };
  return {
    progress: {
      ...progress,
      quiz: {
        ...progress.quiz,
        attempts: {
          ...progress.quiz.attempts,
          [question.id]: (progress.quiz.attempts[question.id] ?? 0) + 1,
        },
        lastAnswer,
      },
    },
    correct,
    explanation,
  };
}

/** A wrong answer may be retried, without shame or loss of any earlier progress. */
export function retryAnswer(progress: Progress): Progress {
  if (!progress.quiz.lastAnswer) return progress;
  return { ...progress, quiz: { ...progress.quiz, lastAnswer: null } };
}

/** Continue deliberately acknowledges the explanation, including after a wrong answer. */
export function continueAfterAnswer(progress: Progress): Progress {
  const question = zebra.quizzes[progress.quiz.questionIndex];
  if (!question || progress.quiz.lastAnswer?.questionId !== question.id) {
    throw new Error("Choose an answer before continuing.");
  }
  const questionIndex = progress.quiz.questionIndex + 1;
  return {
    ...progress,
    encounterCompleted:
      progress.encounterCompleted || questionIndex === zebra.quizzes.length,
    quiz: {
      ...progress.quiz,
      questionIndex,
      completedQuestionIds: [
        ...progress.quiz.completedQuestionIds,
        question.id,
      ],
      lastAnswer: null,
    },
  };
}

/** Rejects non-image URLs, empty captures, bad signatures, and oversized saves. */
export function isValidPhotoDataUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4_000_000) return false;
  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  try {
    const bytes = atob(match[2]);
    if (match[1] === "png") {
      if (
        !bytes.startsWith("\x89PNG\r\n\x1a\n") ||
        bytes.length < 57 ||
        bytes.slice(12, 16) !== "IHDR"
      )
        return false;
      const dimension = (offset: number) =>
        [...bytes.slice(offset, offset + 4)].reduce(
          (n, c) => n * 256 + c.charCodeAt(0),
          0,
        );
      const width = dimension(16);
      const height = dimension(20);
      return (
        width > 0 &&
        height > 0 &&
        width <= 4096 &&
        height <= 4096 &&
        bytes.slice(-8, -4) === "IEND"
      );
    }
    if (match[1] === "jpeg")
      return (
        bytes.length > 32 &&
        bytes.startsWith("\xff\xd8\xff") &&
        bytes.endsWith("\xff\xd9")
      );
    return (
      bytes.length > 32 &&
      bytes.startsWith("RIFF") &&
      bytes.slice(8, 12) === "WEBP"
    );
  } catch {
    return false;
  }
}

export function recordPhoto(
  progress: Progress,
  dataUrl: string,
  capturedAt = new Date().toISOString(),
): Progress {
  if (!progress.encounterCompleted)
    throw new Error(
      "Discover the three zebra facts before taking your field-book photo.",
    );
  if (!isValidPhotoDataUrl(dataUrl))
    throw new Error("The photograph could not be captured. Please try again.");
  if (!isIsoDate(capturedAt))
    throw new Error("The photograph date is invalid.");
  return {
    ...progress,
    photo: { dataUrl, capturedAt },
    discoveredAt: progress.discoveredAt ?? capturedAt,
  };
}

/** A replay keeps the existing photograph and discovery date. */
export function replayQuiz(progress: Progress): Progress {
  return { ...progress, quiz: newProgress().quiz };
}

/** Reset is intentionally explicit and keeps the child's accessibility preferences. */
export function resetProgress(progress?: Progress): Progress {
  return newProgress(progress?.settings);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

/** Validate all trusted invariants before data from browser storage enters the UI. */
export function isProgress(value: unknown): value is Progress {
  if (
    !isObject(value) ||
    value.schemaVersion !== SAVE_SCHEMA_VERSION ||
    typeof value.encounterCompleted !== "boolean"
  )
    return false;
  const quiz = value.quiz;
  const settings = value.settings;
  if (!isObject(quiz) || !isObject(settings)) return false;
  if (
    typeof settings.narration !== "boolean" ||
    typeof settings.reducedMotion !== "boolean" ||
    typeof settings.lowQuality !== "boolean"
  )
    return false;
  if (
    typeof settings.volume !== "number" ||
    !Number.isFinite(settings.volume) ||
    settings.volume < 0 ||
    settings.volume > 1
  )
    return false;
  if (
    !Number.isInteger(quiz.questionIndex) ||
    (quiz.questionIndex as number) < 0 ||
    (quiz.questionIndex as number) > zebra.quizzes.length
  )
    return false;
  const index = quiz.questionIndex as number;
  if (
    !Array.isArray(quiz.completedQuestionIds) ||
    quiz.completedQuestionIds.length !== index
  )
    return false;
  if (quiz.completedQuestionIds.some((id, i) => id !== zebra.quizzes[i].id))
    return false;
  if (!isObject(quiz.attempts)) return false;
  for (const [id, count] of Object.entries(quiz.attempts)) {
    if (
      !zebra.quizzes.some((question) => question.id === id) ||
      !Number.isInteger(count) ||
      (count as number) < 1
    )
      return false;
  }
  if (
    quiz.completedQuestionIds.some(
      (id) => !Object.hasOwn(quiz.attempts as object, id),
    )
  )
    return false;
  if (index === zebra.quizzes.length && value.encounterCompleted !== true)
    return false;
  if (quiz.lastAnswer !== null) {
    const answer = quiz.lastAnswer;
    const question = zebra.quizzes[index];
    if (
      !isObject(answer) ||
      !question ||
      answer.questionId !== question.id ||
      typeof answer.correct !== "boolean" ||
      typeof answer.explanation !== "string"
    )
      return false;
    if (
      !question.choices.some((choice) => choice.id === answer.choiceId) ||
      answer.correct !== (answer.choiceId === question.correctChoiceId)
    )
      return false;
    if (!Object.hasOwn(quiz.attempts, question.id)) return false;
    const expectedExplanation = `${answer.correct ? "You spotted it!" : "Let’s discover it together."} ${question.explanation}`;
    if (answer.explanation !== expectedExplanation) return false;
  }
  if (value.photo !== null) {
    if (
      !isObject(value.photo) ||
      !isValidPhotoDataUrl(value.photo.dataUrl) ||
      !isIsoDate(value.photo.capturedAt)
    )
      return false;
    if (!value.encounterCompleted || !isIsoDate(value.discoveredAt))
      return false;
  } else if (value.discoveredAt !== null) return false;
  return true;
}
