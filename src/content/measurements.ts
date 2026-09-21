/**
 * Species measurement ranges, and how one individual is drawn from them.
 *
 * Why a range and not a number. Every animal a child meets in this game is an
 * individual, and individuals differ. Recording "the elephant weighs 4000 kg"
 * teaches that a species is a single number, which is the opposite of what
 * measuring is for. So each specimen is drawn once from the sourced range for
 * its sex, kept in the save, and never redrawn. Two zebras are two weights.
 *
 * Why it must be sourced. The 3D models are presentation objects, not scale
 * models: SafariStop.height is documented as such and the numbers bear it out.
 * Nothing here may be measured off a model or off a reference picture, which
 * are synthetic perspective renders with no calibrated length. Every range
 * below comes from a cited measurement of real animals.
 *
 * Standing height means ground to the top of the head, adult, at rest. That
 * specific dimension, because it is the one a child can read off a chart drawn
 * beside a whole animal. Shoulder height cannot be used: nothing in a picture
 * marks where the shoulder is.
 */

export type Range = { min: number; max: number };

export type SpeciesMeasurement = {
  id: string;
  /** Standing height in metres, by sex. Null where no source states one. */
  heightM: { female: Range; male: Range } | null;
  /** Adult mass in kilograms, by sex. Null where no source states one. */
  weightKg: { female: Range; male: Range } | null;
  /** The source wording, kept so a reader can check how it was read. */
  note: string;
  sources: { title: string; url: string }[];
};

/**
 * Filled from sourced research. An animal absent from this table simply has no
 * measuring plate yet; it never falls back to a guess.
 */
export const speciesMeasurements: Record<string, SpeciesMeasurement> = {};

export type Sex = "female" | "male";

/** One individual animal, drawn once and then kept. */
export type Specimen = {
  sex: Sex;
  heightM: number;
  weightKg: number;
};

const draw = (range: Range, random: () => number) =>
  range.min + random() * (range.max - range.min);

/** Round to a precision a child would actually read off an instrument. */
const toPlaces = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export function hasMeasurements(id: string) {
  const record = speciesMeasurements[id];
  return Boolean(record?.heightM && record?.weightKg);
}

/**
 * Draw one individual. Call once per animal per save and store the result:
 * redrawing on every view would mean the scale disagreed with itself, which is
 * exactly the lesson not to teach.
 */
export function drawSpecimen(
  id: string,
  random: () => number = Math.random,
): Specimen | null {
  const record = speciesMeasurements[id];
  if (!record?.heightM || !record?.weightKg) return null;
  const sex: Sex = random() < 0.5 ? "female" : "male";
  const height = draw(record.heightM[sex], random);
  const weight = draw(record.weightKg[sex], random);
  return {
    sex,
    // Centimetre precision for height, and a weight precision that suits the
    // animal: grams for something under a kilogram, whole kilograms above.
    heightM: toPlaces(height, 2),
    weightKg: weight < 1 ? toPlaces(weight, 3) : toPlaces(weight, 1),
  };
}
