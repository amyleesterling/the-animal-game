import { safariStops } from "./safari";

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
  return normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
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

/** Broad animal words ("cat", "pig", "antelope") and other species are not guesses of this animal. */
export function matchesAnimalName(id: string, text: string): boolean {
  const stop = safariStops.find((stop) => stop.id === id);
  const answer = normalizeName(text);
  if (!stop || !answer) return false;
  const aliases = (commonAliases[id] ?? []).map(normalizeName);
  if (
    [
      ...aliases,
      normalizeName(stop.name),
      normalizeName(stop.scientificName),
    ].includes(answer)
  )
    return true;
  return aliases.some((alias) => oneEditApart(answer, alias));
}
