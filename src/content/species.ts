import type {
  AssetDefinition,
  NarratedFact,
  RosterEntry,
  Species,
} from "./types";

export const contentReviewedAt = "2026-09-19";

function fact(id: string, text: string, sourceIds: string[]): NarratedFact {
  return {
    id,
    text,
    narration: text,
    sourceIds,
    lastReviewed: contentReviewedAt,
  };
}

export const assets: AssetDefinition[] = [
  {
    id: "procedural-zebra-v1",
    kind: "procedural",
    implementation: "src/game/zebra.ts",
    status: "prototype",
    alt: "A stylized plains zebra with a striped body, upright mane, four legs, and a tufted tail.",
  },
];

/** Facts are tied to sources below. Rig dimensions and behavior timings are game design values. */
export const zebra: Species = {
  id: "plains-zebra",
  commonName: "Plains zebra",
  scientificName: "Equus quagga",
  pronunciation: "Plains zee-bruh. Ee-kwus kwag-uh.",
  lastReviewed: contentReviewedAt,
  taxonomySourceIds: ["mdd-zebra"],
  introduction: fact(
    "zebra-introduction",
    "You found a plains zebra! Look at its stripes, then watch it nibble the grass.",
    ["awf-stripes", "adw-zebra"],
  ),
  summary: fact(
    "zebra-summary",
    "Plains zebras are striped grass eaters. They live in family groups that can gather into larger herds.",
    ["adw-zebra"],
  ),
  stats: [
    {
      ...fact("zebra-diet", "Mostly grass", ["adw-zebra"]),
      label: "On the menu",
      value: "Mostly grass",
      note: "A grazing herbivore; it also eats some other plant parts.",
    },
    {
      ...fact("zebra-height", "About 1.1–1.45 m at the shoulder", [
        "adw-zebra",
      ]),
      label: "Shoulder height",
      value: "About 1.1–1.45 m",
      min: 1.1,
      max: 1.45,
      unit: "m",
      note: "Adult size varies; this is shoulder height, not the top of the head.",
    },
    {
      ...fact("zebra-habitat", "Grasslands and open woodlands", ["adw-zebra"]),
      label: "Home habitat",
      value: "Grasslands and open woodlands",
    },
    {
      ...fact("zebra-group", "Family groups and herds", ["adw-zebra"]),
      label: "Life together",
      value: "Family groups and herds",
    },
  ],
  adaptations: [
    fact("zebra-stripes", "Each zebra has its own stripe pattern.", [
      "awf-stripes",
    ]),
    fact("zebra-teeth", "Broad back teeth grind tough grass.", ["adw-zebra"]),
    fact("zebra-watch", "Zebras can warn their companions with alarm calls.", [
      "adw-zebra",
    ]),
  ],
  ecologicalRole: [
    fact(
      "zebra-grazing-role",
      "By eating tougher grass stems, zebras can open up grazing for animals that prefer softer growth.",
      ["adw-zebra"],
    ),
  ],
  quizzes: [
    {
      id: "zebra-pattern",
      kind: "spot",
      prompt: "What pattern can you see on this zebra?",
      narration: "What pattern can you see on this zebra?",
      choices: [
        {
          id: "pattern-spots",
          text: "Spots",
          narration: "Spots.",
          symbol: "●",
        },
        {
          id: "pattern-stripes",
          text: "Stripes",
          narration: "Stripes.",
          symbol: "▥",
        },
        {
          id: "pattern-zigzags",
          text: "Zigzags",
          narration: "Zigzags.",
          symbol: "ϟ",
        },
      ],
      correctChoiceId: "pattern-stripes",
      explanation:
        "This zebra has stripes, and each zebra has its own pattern.",
      narrationExplanation:
        "This zebra has stripes, and each zebra has its own pattern.",
      sourceIds: ["awf-stripes"],
      lastReviewed: contentReviewedAt,
      reviewerNote:
        "Ask about this rendered zebra; rare abnormal coat patterns occur in the species. Expert review still pending.",
    },
    {
      id: "zebra-food",
      kind: "understand",
      prompt: "What does a plains zebra mostly eat?",
      narration: "What does a plains zebra mostly eat?",
      choices: [
        { id: "food-fish", text: "Fish", narration: "Fish.", symbol: "🐟" },
        { id: "food-grass", text: "Grass", narration: "Grass.", symbol: "🌾" },
        { id: "food-fruit", text: "Fruit", narration: "Fruit.", symbol: "🍎" },
      ],
      correctChoiceId: "food-grass",
      explanation: "Grass is the main food for this grazing plant eater.",
      narrationExplanation:
        "Grass is the main food for this grazing plant eater.",
      sourceIds: ["adw-zebra"],
      lastReviewed: contentReviewedAt,
      reviewerNote:
        "Mostly avoids an absolute claim: plains zebras sometimes browse other plant material. Expert review pending.",
    },
    {
      id: "zebra-herd",
      kind: "connect",
      prompt: "How can living in a herd help zebras?",
      narration: "How can living in a herd help zebras?",
      choices: [
        {
          id: "herd-nests",
          text: "Build nests",
          narration: "Build nests.",
          symbol: "🪺",
        },
        {
          id: "herd-watch",
          text: "Watch for danger",
          narration: "Watch for danger.",
          symbol: "👀",
        },
        {
          id: "herd-tunnels",
          text: "Dig tunnels",
          narration: "Dig tunnels.",
          symbol: "⛰",
        },
      ],
      correctChoiceId: "herd-watch",
      explanation: "A watchful zebra can notice danger and warn the group.",
      narrationExplanation:
        "A watchful zebra can notice danger and warn the group.",
      sourceIds: ["adw-zebra"],
      lastReviewed: contentReviewedAt,
      reviewerNote:
        "Group vigilance and alarm calls, without promising that groups eliminate predation. Expert review pending.",
    },
  ],
  sources: [
    {
      id: "mdd-zebra",
      title: "Equus quagga — Plains Zebra",
      publisher: "American Society of Mammalogists, Mammal Diversity Database",
      url: "https://www.mammaldiversity.org/taxon/1006127/",
      lastReviewed: contentReviewedAt,
    },
    {
      id: "awf-stripes",
      title: "Zebra stripes are on the line",
      publisher: "African Wildlife Foundation",
      url: "https://www.awf.org/news/zebra-stripes-are-line",
      lastReviewed: contentReviewedAt,
      reviewerNote:
        "Published January 31, 2022. Used for individual stripe patterns, not for an asserted cause of stripes.",
    },
    {
      id: "adw-zebra",
      title: "Equus burchellii (Burchell’s zebra)",
      publisher: "University of Michigan, Animal Diversity Web",
      url: "https://animaldiversity.org/accounts/Equus_burchellii/",
      lastReviewed: contentReviewedAt,
      reviewerNote:
        "Older account uses the synonym Equus burchellii; taxonomy checked against Mammal Diversity Database. No conservation status or speed claim copied from this older page.",
    },
  ],
  model: {
    assetId: "procedural-zebra-v1",
    bodyColor: 0xf3eee0,
    stripeColor: 0x24282b,
    scale: 1,
    bodyLength: 1.9,
    bodyHeight: 0.86,
    bodyWidth: 0.7,
  },
  audio: { narration: "browser-speech", callAssetId: null },
  spawn: {
    position: [0, 0, -18],
    herdOffsets: [
      [-3, 0, -2],
      [3, 0, 2],
    ],
    roamRadius: 8,
  },
  behaviors: {
    grazeSeconds: 5,
    walkSeconds: 4,
    walkSpeed: 0.6,
    alertRadius: 9,
    comfortRadius: 4,
    retreatSpeed: 1.7,
    encounterRadius: 13,
    photoMaxDistance: 18,
  },
};

/** Upcoming entries are a plan, not playable or fact-reviewed species content. */
export const roster: RosterEntry[] = [
  {
    id: zebra.id,
    commonName: zebra.commonName,
    scientificName: zebra.scientificName,
    available: true,
    clue: "Follow the stripes in the grassland.",
    symbol: "🦓",
  },
  {
    id: "african-elephant",
    commonName: "African savanna elephant",
    scientificName: "Loxodonta africana",
    available: false,
    clue: "A future expedition",
    symbol: "🐘",
  },
  {
    id: "giraffe",
    commonName: "Northern giraffe",
    scientificName: "Giraffa camelopardalis",
    available: false,
    clue: "A future expedition",
    symbol: "🦒",
  },
  {
    id: "lion",
    commonName: "Lion",
    scientificName: "Panthera leo",
    available: false,
    clue: "A future expedition",
    symbol: "🦁",
  },
  {
    id: "cheetah",
    commonName: "Cheetah",
    scientificName: "Acinonyx jubatus",
    available: false,
    clue: "A future expedition",
    symbol: "🐆",
  },
  {
    id: "spotted-hyena",
    commonName: "Spotted hyena",
    scientificName: "Crocuta crocuta",
    available: false,
    clue: "A future expedition",
    symbol: "🐾",
  },
  {
    id: "common-ostrich",
    commonName: "Common ostrich",
    scientificName: "Struthio camelus",
    available: false,
    clue: "A future expedition",
    symbol: "🪶",
  },
  {
    id: "common-warthog",
    commonName: "Common warthog",
    scientificName: "Phacochoerus africanus",
    available: false,
    clue: "A future expedition",
    symbol: "🐗",
  },
  {
    id: "thomsons-gazelle",
    commonName: "Thomson’s gazelle",
    scientificName: "Eudorcas thomsonii",
    available: false,
    clue: "A future expedition",
    symbol: "🐾",
  },
  {
    id: "hippopotamus",
    commonName: "Hippopotamus",
    scientificName: "Hippopotamus amphibius",
    available: false,
    clue: "A future expedition",
    symbol: "🦛",
  },
];

export type {
  Species,
  RosterEntry,
  QuizQuestion,
  QuizChoice,
  NarratedFact,
  SpeciesStat,
  SourceRecord,
} from "./types";
