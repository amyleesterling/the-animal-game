import { describe, expect, it } from "vitest";
import { matchesAnimalName } from "../../src/content/animal-names";
import { safariStops } from "../../src/content/safari";
import { birdProfiles } from "../../src/content/savanna-birds";
import { mammalProfiles } from "../../src/content/savanna-mammals";
import { smallLifeProfiles } from "../../src/content/savanna-small-life";

const expansionProfiles = [
  ...smallLifeProfiles,
  ...birdProfiles,
  ...mammalProfiles,
];
const allAnimals = Array.from(
  new Map(
    [...safariStops, ...expansionProfiles].map((animal) => [animal.id, animal]),
  ).values(),
);

describe("friendly animal name matching", () => {
  it.each([
    [
      "plains-zebra",
      ["zebra", "ZEBRAS!", "  Plains   Zebra  ", "a zebra", "“plains-zebras”"],
    ],
    [
      "african-elephant",
      [
        "elephant",
        "African elephants",
        "savanna elephant",
        "African savannah elephant",
        "bush elephant",
        "African—bush elephant",
      ],
    ],
    ["giraffe", ["giraffe", "Northern giraffes", "THE GIRAFFE."]],
    ["common-warthog", ["warthog", "common warthogs", "wart hog"]],
    [
      "thomsons-gazelle",
      ["gazelle", "Thomson’s gazelles", "thomson's gazelle", "Thomson gazelle"],
    ],
    ["cheetah", ["cheetah", "Cheetahs?", "a cheetah!"]],
    ["spotted-hyena", ["hyena", "hyaena", "Spotted hyenas", "spotted hyaenas"]],
  ])("accepts common names and ordinary formatting for %s", (id, names) => {
    for (const name of names)
      expect(matchesAnimalName(id as string, name)).toBe(true);
  });

  it("accepts the canonical and scientific names for each playable species", () => {
    for (const stop of allAnimals) {
      expect(matchesAnimalName(stop.id, stop.name)).toBe(true);
      expect(matchesAnimalName(stop.id, stop.scientificName)).toBe(true);
    }
  });

  it("uses every authored expansion alias, including taxonomic synonyms", () => {
    for (const profile of expansionProfiles) {
      for (const alias of profile.aliases)
        expect(
          matchesAnimalName(profile.id, alias),
          `${profile.id}: ${alias}`,
        ).toBe(true);
    }
  });

  it.each([
    ["lamarcks-dung-beetle", "LAMARCK'S DUNG BEETLES!"],
    ["south-african-springhare", "South African springhares"],
    ["mopane-emperor-moth", "Imbrasia belina"],
    ["southern-ground-hornbill", "Southern ground—hornbills"],
    ["helmeted-guineafowl", "guinea fowl"],
    ["grey-crowned-crane", "Gray crowned cranes"],
    ["banded-mongoose", "Banded mongooses"],
    ["striped-grass-mouse", "Striped grass mice"],
    ["bat-eared-fox", "Bat-eared foxes"],
    ["african-buffalo", "Cape buffalos"],
    ["african-buffalo", "Cape buffaloes"],
    ["meerkat", "meekat"],
    ["secretarybird", "secretarybrid"],
  ])("accepts a useful expansion name for %s: %s", (id, name) => {
    expect(matchesAnimalName(id, name)).toBe(true);
  });

  it.each([
    ["plains-zebra", "zbra"],
    ["plains-zebra", "zeebra"],
    ["plains-zebra", "zebar"],
    ["african-elephant", "elephnt"],
    ["giraffe", "girafe"],
    ["giraffe", "giraff"],
    ["common-warthog", "warthg"],
    ["thomsons-gazelle", "Thompson’s gazelle"],
    ["cheetah", "cheeta"],
    ["spotted-hyena", "heyna"],
  ])("allows one mild typo in %s: %s", (id, name) => {
    expect(matchesAnimalName(id, name)).toBe(true);
  });

  it("does not confuse animals, broad categories, or unsupported species", () => {
    for (const target of allAnimals) {
      for (const other of allAnimals.filter((stop) => stop.id !== target.id)) {
        expect(matchesAnimalName(target.id, other.name)).toBe(false);
        expect(matchesAnimalName(target.id, other.scientificName)).toBe(false);
      }
    }
    for (const [id, name] of [
      ["cheetah", "lion"],
      ["cheetah", "leopard"],
      ["cheetah", "cat"],
      ["common-warthog", "pig"],
      ["thomsons-gazelle", "antelope"],
      ["plains-zebra", "horse"],
      ["spotted-hyena", "dog"],
      ["african-elephant", "Asian elephant"],
      ["giraffe", "reticulated giraffe"],
      ["thomsons-gazelle", "Grant’s gazelle"],
      ["spotted-hyena", "striped hyena"],
      ["african-buffalo", "water buffalo"],
      ["cape-porcupine", "North American porcupine"],
      ["cape-porcupine", "hedgehog"],
      ["south-african-springhare", "East African springhare"],
      ["south-african-springhare", "rabbit"],
      ["striped-grass-mouse", "Lemniscomys barbarus"],
      ["african-monarch", "Danaus plexippus"],
      ["desert-locust", "Locusta migratoria"],
      ["mound-building-termite", "ant"],
      ["mopane-emperor-moth", "butterfly"],
      ["southern-ground-hornbill", "northern ground hornbill"],
      ["grey-crowned-crane", "black crowned crane"],
      ["white-backed-vulture", "white headed vulture"],
      ["red-billed-oxpecker", "yellow billed oxpecker"],
      ["olive-baboon", "yellow baboon"],
      ["vervet-monkey", "monkey"],
      ["nile-monitor", "lizard"],
      ["banded-mongoose", "mongoose"],
      ["plains-zebra", "I think this is a giraffe or zebra"],
      ["lion", "lion"],
      ["unknown", "zebra"],
    ])
      expect(matchesAnimalName(id, name)).toBe(false);
  });

  it("rejects empty, tiny, malformed and excessive guesses", () => {
    for (const value of [
      "",
      "   ",
      "!?",
      "ze",
      "zrba",
      "zebra123",
      "<zebra>",
      "zebra\u0000",
      "z".repeat(81),
    ])
      expect(matchesAnimalName("plains-zebra", value)).toBe(false);
    expect(matchesAnimalName("plains-zebra", null as unknown as string)).toBe(
      false,
    );
  });
});
