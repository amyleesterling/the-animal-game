import { describe, expect, it } from "vitest";
import { matchesAnimalName } from "../../src/content/animal-names";
import { safariStops } from "../../src/content/safari";

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
    for (const stop of safariStops) {
      expect(matchesAnimalName(stop.id, stop.name)).toBe(true);
      expect(matchesAnimalName(stop.id, stop.scientificName)).toBe(true);
    }
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
    for (const target of safariStops) {
      for (const other of safariStops.filter((stop) => stop.id !== target.id)) {
        expect(matchesAnimalName(target.id, other.name)).toBe(false);
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
