import { safariEnding, safariStops } from "./safari";
import { zebra } from "./species";
import type { SafariStop } from "../safari-contracts";

export interface NarrationClip {
  readonly id: string;
  readonly text: string;
}

/** Shared by the settings preview and the sample-only recording command. */
export const narratorSample =
  "Hello, explorer. Welcome to Sophia’s Wild World. Let’s take a gentle walk through the savanna. Look closely, leave the animals plenty of room, and see what you discover.";

export const classicNarration = {
  welcome:
    "Welcome, explorer. Follow the path to your striped neighbor, or choose Guide me to the zebra.",
  welcomeBack: "Welcome back to the savanna. Your field book is waiting.",
  guideToZebra: "Let’s take a gentle walk to the zebra.",
  guideToView: "Let’s find a comfortable spot to watch.",
  mission:
    "Follow the path to your striped neighbor. Move with the arrow keys, or choose Guide me to the zebra. When you’re close enough, choose Meet the zebra.",
  photoReady:
    "You’re ready to take a photograph. Open your camera and give your zebra a little space.",
  photo: "Frame your zebra. When the view is ready, choose Take photo.",
} as const;

const sentence = (text: string): string =>
  /[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;

/** Choice IDs must be the order actually rendered, including shuffled classic choices. */
export function classicQuestionNarration(
  questionId: string,
  orderedChoiceIds: readonly string[],
): string {
  const question = zebra.quizzes.find((q) => q.id === questionId);
  if (
    !question ||
    orderedChoiceIds.length !== question.choices.length ||
    new Set(orderedChoiceIds).size !== orderedChoiceIds.length ||
    orderedChoiceIds.some((id) => !question.choices.some((c) => c.id === id))
  )
    throw new Error(
      "Narration needs the current question’s complete rendered choice order.",
    );
  return `${question.narration} ${orderedChoiceIds
    .map(
      (id, i) =>
        `${String.fromCharCode(65 + i)}. ${sentence(question.choices.find((c) => c.id === id)!.narration)}`,
    )
    .join(" ")}`;
}

export function classicFeedbackNarration(
  questionId: string,
  correct: boolean,
): string {
  const question = zebra.quizzes.find((q) => q.id === questionId);
  if (!question) throw new Error("Narration needs a known zebra question.");
  return `${correct ? "You spotted it!" : "Let’s discover it together."} ${question.narrationExplanation}`;
}

export function classicFieldBookNarration(): string {
  return `${sentence(zebra.pronunciation)} ${zebra.summary.narration} ${zebra.stats.map((f) => `${sentence(f.label)} ${sentence(f.narration)}`).join(" ")} ${zebra.adaptations.map((f) => f.narration).join(" ")} ${zebra.ecologicalRole.map((f) => f.narration).join(" ")}`;
}

export const safariNarration = {
  intro:
    "Help Sophia find seven clues about a healthy savanna before sunset. Travel by jeep, meet seven animals, and photograph your discoveries. Take your time. The sunset will wait for you.",
  ending: safariEnding,
} as const;

export type SafariNarrationStage =
  "explore" | "question" | "correct" | "incorrect" | "photo" | "success";
export function safariStopNarration(
  stop: SafariStop,
  stage: SafariNarrationStage,
): string {
  switch (stage) {
    case "explore":
      return `${stop.story} ${stop.mission} Use Guide Sophia closer, or walk with the arrow buttons. Then choose Discover the clue.`;
    case "question":
      return `${stop.question.prompt} ${stop.question.choices.map((choice, i) => `${i + 1}. ${sentence(choice.text)}`).join(" ")}`;
    case "correct":
    case "incorrect":
      return `${stage === "correct" ? "You spotted it!" : "Let’s discover it together."} ${stop.question.explanation} When you’re ready, choose I’ve got it to take a photo.`;
    case "photo":
      return `Photograph the ${stop.name.toLowerCase()}. Choose Help me frame it, then Take photo when your view is ready.`;
    case "success": {
      const index = safariStops.findIndex((s) => s.id === stop.id);
      if (index < 0) throw new Error("Narration needs a known safari stop.");
      const next = safariStops[index + 1];
      return `Clue ${index + 1} collected. ${sentence(stop.clue)} ${stop.facts[0]} ${next ? `Back to the jeep. Jump to our next stop: ${next.name}.` : "All seven clues are ready. Let’s bring them together."}`;
    }
  }
}

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, i) =>
    permutations(values.filter((_, index) => index !== i)).map((tail) => [
      value,
      ...tail,
    ]),
  );
}
const clip = (id: string, text: string): NarrationClip =>
  Object.freeze({ id, text });

/** Exact runtime strings. The generator and the player both consume this catalog. */
export const narrationClips: readonly NarrationClip[] = Object.freeze([
  clip("narrator-sample", narratorSample),
  clip("classic-welcome", classicNarration.welcome),
  clip("classic-welcome-back", classicNarration.welcomeBack),
  clip("classic-guide-to-zebra", classicNarration.guideToZebra),
  clip("classic-guide-to-view", classicNarration.guideToView),
  clip("classic-mission", classicNarration.mission),
  clip("classic-photo-ready", classicNarration.photoReady),
  clip("classic-photo", classicNarration.photo),
  clip("classic-field-book", classicFieldBookNarration()),
  ...zebra.quizzes.flatMap((q) => [
    ...permutations(q.choices.map((c) => c.id)).map((order) =>
      clip(
        `classic-question-${q.id}-${order.join("-")}`,
        classicQuestionNarration(q.id, order),
      ),
    ),
    clip(
      `classic-feedback-${q.id}-correct`,
      classicFeedbackNarration(q.id, true),
    ),
    clip(
      `classic-feedback-${q.id}-incorrect`,
      classicFeedbackNarration(q.id, false),
    ),
  ]),
  clip("safari-intro", safariNarration.intro),
  ...safariStops.flatMap((stop) =>
    (
      [
        "explore",
        "question",
        "correct",
        "incorrect",
        "photo",
        "success",
      ] as const
    ).map((stage) =>
      clip(`safari-${stop.id}-${stage}`, safariStopNarration(stop, stage)),
    ),
  ),
  clip("safari-ending", safariNarration.ending),
]);
