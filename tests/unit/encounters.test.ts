import { describe, expect, it } from "vitest";
import { safariStops } from "../../src/content/safari";
import {
  collectSafariEncounters,
  safariEncounterRange,
} from "../../src/game/encounters";
import { safariViewpoints } from "../../src/game/safari-world";

const allLoaded = new Set(safariStops.map((animal) => animal.id));

describe("safari animal proximity", () => {
  it("finds an off-route animal without a selected-stop input and keeps distant animals", () => {
    const elephant = safariStops.find(
      (animal) => animal.id === "african-elephant",
    )!;
    const encounters = collectSafariEncounters(
      safariStops,
      { x: elephant.position[0], z: elephant.position[2] + 8 },
      allLoaded,
    );
    expect(safariStops[0].id).toBe("plains-zebra");
    expect(encounters[0]).toEqual({
      id: elephant.id,
      distance: 8,
      range: 10.5,
    });
    expect(encounters).toHaveLength(safariStops.length);
    const zebra = encounters.find((animal) => animal.id === "plains-zebra")!;
    expect(zebra.distance).toBeGreaterThan(zebra.range + 4);
    expect(encounters.map((animal) => animal.distance)).toEqual(
      encounters.map((animal) => animal.distance).sort((a, b) => a - b),
    );
  });

  it("excludes animals that have not loaded or failed, even when they are closest", () => {
    const loaded = new Map([
      ["plains-zebra", {}],
      ["giraffe", {}],
    ]);
    const encounters = collectSafariEncounters(
      safariStops,
      { x: 44, z: -24 },
      loaded,
    );
    expect(encounters.map((animal) => animal.id).sort()).toEqual([
      "giraffe",
      "plains-zebra",
    ]);
    expect(
      collectSafariEncounters(safariStops, { x: 44, z: -24 }, new Set()),
    ).toEqual([]);
    expect(loaded.size).toBe(2);
  });

  it("uses ground distance even if the model or explorer is elevated", () => {
    const animal = {
      id: "test",
      position: [3, 90, 4] as [number, number, number],
      height: 2,
    };
    const explorer = { x: 0, y: 30, z: 0 };
    expect(
      collectSafariEncounters([animal], explorer, new Set(["test"]))[0]
        .distance,
    ).toBe(5);
  });

  it.each(safariStops)(
    "keeps $name's approach threshold consistent with the selected-stop world",
    (animal) => {
      const range = safariEncounterRange(animal.height);
      expect(range).toBe(safariViewpoints(animal).encounterRange);
      expect(range).toBeGreaterThanOrEqual(10.5);
      for (const offset of [-0.01, 0, 0.01]) {
        const [encounter] = collectSafariEncounters(
          [animal],
          { x: animal.position[0] + range + offset, z: animal.position[2] },
          allLoaded,
        );
        expect(encounter.distance).toBeCloseTo(range + offset, 10);
        expect(encounter.range).toBe(range);
      }
    },
  );

  it("breaks equal-distance ties by animal ID regardless of route or load order", () => {
    const animals = [
      {
        id: "zebra",
        position: [3, 0, 4] as [number, number, number],
        height: 2,
      },
      {
        id: "antelope",
        position: [-3, 0, -4] as [number, number, number],
        height: 1,
      },
    ];
    const original = structuredClone(animals);
    const forward = collectSafariEncounters(
      animals,
      { x: 0, z: 0 },
      new Set(["zebra", "antelope"]),
    );
    const reverse = collectSafariEncounters(
      [...animals].reverse(),
      { x: 0, z: 0 },
      new Set(["antelope", "zebra"]),
    );
    expect(forward.map((animal) => animal.id)).toEqual(["antelope", "zebra"]);
    expect(reverse).toEqual(forward);
    expect(animals).toEqual(original);
  });

  it("leaves the default arrival outside every loaded animal's encounter range", () => {
    const encounters = collectSafariEncounters(
      safariStops,
      safariViewpoints(safariStops[0]).arrival,
      allLoaded,
    );
    expect(encounters.every((animal) => animal.distance > animal.range)).toBe(
      true,
    );
  });
});
