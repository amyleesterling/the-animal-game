import { describe, expect, it } from "vitest";
import {
  barDimension,
  canMeasure,
  drawSpecimen,
  speciesMeasurements,
  weighTo,
  type MeasurementRange,
} from "../../src/content/measurements";
import { safariStops } from "../../src/content/safari";

/** Deterministic sequence, so a drawn specimen can be asserted exactly. */
const sequence = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length]!;
};

const ranges = (record: (typeof speciesMeasurements)[string]) =>
  [record.heightM, record.lengthM, record.weightKg].filter(
    Boolean,
  ) as MeasurementRange[];

describe("species measurement table", () => {
  it("covers every animal in the game and invents nothing for the rest", () => {
    const ids = new Set(safariStops.map((stop) => stop.id));
    for (const id of Object.keys(speciesMeasurements))
      expect(ids.has(id)).toBe(true);
    expect(Object.keys(speciesMeasurements)).toHaveLength(safariStops.length);
  });

  it("never stores a reversed, zero or negative interval", () => {
    for (const record of Object.values(speciesMeasurements))
      for (const range of ranges(record))
        for (const span of [range.pooled, range.female, range.male]) {
          if (!span) continue;
          expect(span.min).toBeGreaterThan(0);
          expect(span.max).toBeGreaterThanOrEqual(span.min);
        }
  });

  it("keeps each sex inside the pooled envelope it was taken from", () => {
    for (const record of Object.values(speciesMeasurements))
      for (const range of ranges(record))
        for (const span of [range.female, range.male]) {
          if (!span) continue;
          expect(span.min).toBeGreaterThanOrEqual(range.pooled.min);
          expect(span.max).toBeLessThanOrEqual(range.pooled.max);
        }
  });

  /**
   * The first import read every male range as the female one, because the word
   * "female" ends in "male". The numbers looked plausible and were wrong, so
   * this asserts the two are never identical where a source separated them.
   */
  it("does not give a species the same range for both sexes", () => {
    for (const record of Object.values(speciesMeasurements))
      for (const range of ranges(record)) {
        if (!range.female || !range.male) continue;
        expect(range.female).not.toEqual(range.male);
      }
  });
});

describe("drawing one specimen", () => {
  it("draws every dimension inside the range for the sex it chose", () => {
    for (const [id, record] of Object.entries(speciesMeasurements))
      for (let seed = 0; seed < 12; seed++) {
        const specimen = drawSpecimen(id, sequence([seed / 12, 0.1, 0.5, 0.9]));
        if (!specimen) continue;
        const within = (
          value: number | null,
          range: MeasurementRange | null,
        ) => {
          if (value === null || !range) return;
          const span = range[specimen.sex] ?? range.pooled;
          // Rounding for readability can land a hair outside the raw bound.
          expect(value).toBeGreaterThanOrEqual(span.min - 0.51);
          expect(value).toBeLessThanOrEqual(span.max + 0.51);
        };
        within(specimen.weightKg, record.weightKg);
        within(specimen.heightM, record.heightM);
        within(specimen.lengthM, record.lengthM);
      }
  });

  it("returns null for a dimension no source established", () => {
    for (const [id, record] of Object.entries(speciesMeasurements)) {
      const specimen = drawSpecimen(id, sequence([0.5]));
      if (!specimen) {
        expect(canMeasure(id)).toBe(false);
        continue;
      }
      if (!record.heightM) expect(specimen.heightM).toBeNull();
      if (!record.lengthM) expect(specimen.lengthM).toBeNull();
      if (!record.weightKg) expect(specimen.weightKg).toBeNull();
    }
  });

  it("gives no specimen at all for an animal with nothing published", () => {
    expect(drawSpecimen("not-an-animal")).toBeNull();
  });

  it("chooses the bar a picture of that animal can actually show", () => {
    // A bird stands upright, so it gets a height; a quadruped stands side on.
    expect(barDimension("secretarybird")).toBe("height");
    expect(barDimension("cheetah")).toBe("length");
    for (const id of Object.keys(speciesMeasurements)) {
      const record = speciesMeasurements[id]!;
      const bar = barDimension(id);
      if (bar === null) expect(record.heightM ?? record.lengthM).toBeNull();
    }
  });

  it("reads a weight to a precision an instrument would show", () => {
    expect(weighTo(0.0423)).toBe(0.042);
    expect(weighTo(3.14159)).toBe(3.14);
    expect(weighTo(46.55)).toBe(46.6);
    expect(weighTo(4210.4)).toBe(4210);
  });
});
