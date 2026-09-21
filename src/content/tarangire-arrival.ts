/** Original child-facing copy; factual context checked against TANAPA below. */
export const tarangireArrivalReviewedAt = "2026-09-21";

export const tarangireArrivalSources = [
  {
    id: "tanapa-tarangire-visitor-guide",
    title: "TANAPA: Visiting Tarangire",
    url: "https://www.tanzaniaparks.go.tz/tarangire/visitor-guide",
  },
  {
    id: "tanapa-tarangire-attractions",
    title: "TANAPA: Tarangire landscapes and wildlife",
    url: "https://www.tanzaniaparks.go.tz/tarangire/attractions",
  },
] as const;

type ArrivalSourceId = (typeof tarangireArrivalSources)[number]["id"];

export type TarangireArrivalStageId =
  "walk-to-jeep" | "board-jeep" | "drive-last-stretch" | "arrive-study-trail";

export interface TarangireArrivalStage {
  id: TarangireArrivalStageId;
  title: string;
  prompt: string;
  narration: string;
  actionLabel: string;
  sourceIds: readonly ArrivalSourceId[];
}

export const tarangireArrival = {
  title: "A journey inspired by Tarangire",
  routeLabel: "Arusha → Makuyuni → Minjingu",
  journeyNote:
    "The real journey takes much longer. Our game shows a short, imagined last stretch of the road.",
  studyTrailNote:
    "Our study trail is imaginary. Its animals come from different African regions, beyond any one park.",
  attribution:
    "Route and landscape facts: Tanzania National Parks (TANAPA). Game journey and study trail imagined for learning.",
} as const;

/** Prompts describe the current action; narration can play once on stage entry. */
export const tarangireArrivalStages: readonly TarangireArrivalStage[] = [
  {
    id: "walk-to-jeep",
    title: "Meet at the jeep",
    prompt: "Walk over to the jeep to begin our journey.",
    narration:
      "Welcome, explorer! Walk over to our jeep. A short ride will take us to the start of our animal adventure.",
    actionLabel: "Walk to the jeep",
    sourceIds: [],
  },
  {
    id: "board-jeep",
    title: "All aboard",
    prompt: "Climb into the jeep when you are ready.",
    narration:
      "Hop aboard! Our journey is inspired by the road from Arusha through Makuyuni and Minjingu. The real trip is much longer than our game ride.",
    actionLabel: "Board the jeep",
    sourceIds: ["tanapa-tarangire-visitor-guide"],
  },
  {
    id: "drive-last-stretch",
    title: "The last stretch",
    prompt: "Follow the road past baobabs, acacia trees, and open grassland.",
    narration:
      "Look for baobabs and acacia trees beside the open grassland. This imagined last stretch takes its landscape ideas from Tarangire National Park.",
    actionLabel: "Drive to the study trail",
    sourceIds: ["tanapa-tarangire-attractions"],
  },
  {
    id: "arrive-study-trail",
    title: "Our study trail",
    prompt: "Park the jeep, step onto our imagined trail, and explore.",
    narration:
      "Elephants and zebras gather near the Tarangire River in the dry season. Our imagined study trail brings together animals from many African regions. Let's find our first clue!",
    actionLabel: "Explore the study trail",
    sourceIds: ["tanapa-tarangire-attractions"],
  },
];
