import { safariStops } from "./safari";
import { birdProfiles } from "./savanna-birds";
import { mammalProfiles } from "./savanna-mammals";
import { smallLifeProfiles } from "./savanna-small-life";

const commonAliases: Readonly<Record<string, readonly string[]>> = {
  "plains-zebra": ["zebra", "plains zebra", "plain zebra"],
  "african-elephant": [
    "elephant",
    "african elephant",
    "savanna elephant",
    "savannah elephant",
    "african savanna elephant",
    "african savannah elephant",
    "bush elephant",
    "african bush elephant",
  ],
  giraffe: ["giraffe", "northern giraffe"],
  "common-warthog": ["warthog", "common warthog", "wart hog"],
  "thomsons-gazelle": ["gazelle", "thomsons gazelle", "thomson gazelle"],
  cheetah: ["cheetah"],
  "spotted-hyena": ["hyena", "hyaena", "spotted hyena", "spotted hyaena"],
};

/** Limit free text and ignore ordinary spelling presentation, not arbitrary sentences. */
function normalizeName(text: string): string {
  if (typeof text !== "string" || text.length > 80) return "";
  const letters = text.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "");
  if (/[^a-z\s"'’‘“”.,!?\-\u2010-\u2015]/.test(letters)) return "";
  const normalized = letters
    .replace(/["'’‘“”]/g, "")
    .replace(/[.,!?\-\u2010-\u2015]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:a|an|the) /, "");
  // Only the final word is the animal noun: keep the “s” in “plains” and “Thomsons”.
  const singular = normalized
    .replace(/\bmice$/, "mouse")
    .replace(/\b(fox|buffalo)es$/, "$1");
  return singular.endsWith("s") ? singular.slice(0, -1) : singular;
}

/** One insertion, deletion, replacement or adjacent transposition is a gentle typo. */
function oneEditApart(left: string, right: string): boolean {
  if (
    left.length < 4 ||
    right.length < 5 ||
    Math.abs(left.length - right.length) > 1
  )
    return false;
  let at = 0;
  while (at < left.length && at < right.length && left[at] === right[at]) at++;
  if (left.length === right.length) {
    return (
      left.slice(at + 1) === right.slice(at + 1) ||
      (left[at] === right[at + 1] &&
        left[at + 1] === right[at] &&
        left.slice(at + 2) === right.slice(at + 2))
    );
  }
  return left.length < right.length
    ? left.slice(at) === right.slice(at + 1)
    : left.slice(at + 1) === right.slice(at);
}

const expansionProfiles = [
  ...birdProfiles,
  ...mammalProfiles,
  ...smallLifeProfiles,
];
const animalNames = new Map(
  [...safariStops, ...expansionProfiles].map((animal) => {
    const profile = expansionProfiles.find(
      (profile) => profile.id === animal.id,
    );
    return [
      animal.id,
      {
        scientificName: normalizeName(animal.scientificName),
        commonNames: Array.from(
          new Set(
            [
              animal.name,
              ...(commonAliases[animal.id] ?? []),
              ...(profile?.aliases ?? []),
            ].map(normalizeName),
          ),
        ),
      },
    ];
  }),
);

/** Broad animal words ("cat", "pig", "antelope") and other species are not guesses of this animal. */
export function matchesAnimalName(id: string, text: string): boolean {
  const answer = normalizeName(text);
  if (!animalNames.has(id) || !answer) return false;

  // An exact name for another species must never be accepted as a typo here.
  // Shared aliases are ambiguous and therefore do not identify either species.
  const exactMatches = [...animalNames].filter(
    ([, names]) =>
      names.scientificName === answer || names.commonNames.includes(answer),
  );
  if (exactMatches.length)
    return exactMatches.length === 1 && exactMatches[0][0] === id;

  // Apply gentle spelling help to common names only, and only when the result
  // identifies one catalog animal. Do not fuzzy-match arbitrary scientific names.
  const typoMatches = [...animalNames].filter(([, names]) =>
    names.commonNames.some((alias) => oneEditApart(answer, alias)),
  );
  return typoMatches.length === 1 && typoMatches[0][0] === id;
}
