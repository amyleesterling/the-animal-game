/**
 * Adult size ranges for the 32 safari species, and how one individual is drawn.
 *
 * Generated from docs/research/ANIMAL_ADULT_SIZE_TABLE.md, reviewed 21
 * September 2026. Every number is a published measurement of real animals with
 * its source beside it. Nothing is measured off a 3D model or a reference
 * picture: the models are documented presentation objects, and the references
 * are synthetic perspective renders with no calibrated length.
 *
 * Read the shape of this data before using it.
 *
 * Weight is established for 27 of the 32. The five insects have none, because
 * their sources publish dry mass, component mass or caste means rather than a
 * live adult range.
 *
 * Standing height is established for only 6, all birds, and even those sources
 * do not say whether the measurement ends at the crown, the crest or the
 * casque. So the game weighs an animal with an instrument and asks the child to
 * estimate its height, rather than asserting a height it cannot support.
 *
 * null means not established. It never means zero.
 *
 * Why individuals rather than one number per species: every animal a child
 * meets is an individual, and individuals differ. Each specimen is drawn once
 * from the range for its sex, kept in the save, and never redrawn. Two zebras
 * are two weights, and a scale that disagreed with itself between two views
 * would teach the opposite of what measuring is for.
 */

export type Range = { min: number; max: number };

export type MeasurementRange = {
  /** The outer envelope across both sexes, used when a sex range is absent. */
  pooled: Range;
  female?: Range;
  male?: Range;
  /** The source does not confirm every value came from an adult sample. */
  approximate: boolean;
  /** The source's own wording about the interval. */
  note?: string;
};

export type SpeciesMeasurement = {
  id: string;
  name: string;
  heightM: MeasurementRange | null;
  weightKg: MeasurementRange | null;
  /** Kept verbatim so a reader sees exactly what was and was not published. */
  heightSource: string;
  weightSource: string;
  sources: { title: string; url: string }[];
};

export const speciesMeasurements: Record<string, SpeciesMeasurement> = {
  "african-elephant": {
    id: "african-elephant",
    name: "African savanna elephant",
    heightM: null,
    weightKg: {
      pooled: { min: 2000, max: 6100 },
      female: { min: 2000, max: 3500 },
      male: { min: 4500, max: 6100 },
      approximate: false,
      note: "female 2,000–3,500; male 4,500–6,100",
    },
    heightSource: "Not established; shoulder only",
    weightSource: "**2,000–6,100** (female 2,000–3,500; male 4,500–6,100)",
    sources: [
      {
        title: "Animal Diversity Web",
        url: "https://animaldiversity.org/accounts/Loxodonta_africana/",
      },
    ],
  },
  cheetah: {
    id: "cheetah",
    name: "Cheetah",
    heightM: null,
    weightKg: {
      pooled: { min: 30, max: 55 },
      female: { min: 30, max: 45 },
      male: { min: 40, max: 55 },
      approximate: false,
      note: "Namibia: female 30–45; male 40–55",
    },
    heightSource: "Not established; shoulder only",
    weightSource: "**30–55** (Namibia: female 30–45; male 40–55)",
    sources: [
      {
        title: "Leibniz IZW",
        url: "https://www.cheetah-research.org/morphology-and-physiology",
      },
    ],
  },
  "common-warthog": {
    id: "common-warthog",
    name: "Common warthog",
    heightM: null,
    weightKg: {
      pooled: { min: 50, max: 150 },
      female: { min: 50, max: 75 },
      male: { min: 60, max: 150 },
      approximate: false,
      note: "female 50–75; male 60–150",
    },
    heightSource: "Not established; shoulder only",
    weightSource: "**50–150** (female 50–75; male 60–150)",
    sources: [
      {
        title: "San Diego Zoo",
        url: "https://animals.sandiegozoo.org/animals/warthog",
      },
      {
        title: "IUCN Wild Pig Specialist Group",
        url: "https://www.iucn-wpsg.org/copy-of-common-warthog",
      },
    ],
  },
  giraffe: {
    id: "giraffe",
    name: "Northern giraffe",
    heightM: null,
    weightKg: {
      pooled: { min: 550, max: 1930 },
      female: { min: 550, max: 1180 },
      male: { min: 800, max: 1930 },
      approximate: false,
      note: "Rothschild/Nubian form: female 550–1,180; male 800–1,930",
    },
    heightSource:
      "Not established; source does not separate head from ossicones",
    weightSource:
      "**550–1,930** (Rothschild/Nubian form: female 550–1,180; male 800–1,930)",
    sources: [
      {
        title: "Aalborg Zoo",
        url: "https://aalborgzoo.dk/en/our-animals-2/rothschild-giraffe/",
      },
      {
        title: "Giraffe Conservation Foundation",
        url: "https://giraffeconservation.org/wp-content/uploads/2024/11/National-Giraffe-Conservation-Strategy-and-Action-Plan-for-Uganda-2020-2030.pdf",
      },
    ],
  },
  "plains-zebra": {
    id: "plains-zebra",
    name: "Plains zebra",
    heightM: null,
    weightKg: {
      pooled: { min: 175, max: 320 },
      female: { min: 175, max: 250 },
      male: { min: 220, max: 320 },
      approximate: false,
      note: "female 175–250; male 220–320",
    },
    heightSource: "Not established; shoulder only",
    weightSource: "**175–320** (female 175–250; male 220–320)",
    sources: [
      {
        title: "Tanzanian field study",
        url: "https://doi.org/10.1093/jmammal/gyag044",
      },
      {
        title: "Saskatoon Zoo",
        url: "https://www.saskatoon.ca/parks-recreation-attractions/events-attractions/saskatoon-forestry-farm-park-zoo/zoo-animals/plains-zebra",
      },
    ],
  },
  "spotted-hyena": {
    id: "spotted-hyena",
    name: "Spotted hyena",
    heightM: null,
    weightKg: {
      pooled: { min: 45, max: 84 },
      female: { min: 54, max: 84 },
      male: { min: 45, max: 64 },
      approximate: true,
      note: "male ≈45–64; female ≈54–84; rounded from pounds",
    },
    heightSource: "Not established; shoulder only",
    weightSource:
      "**≈45–84** (male ≈45–64; female ≈54–84; rounded from pounds)",
    sources: [
      {
        title: "San Diego Zoo",
        url: "https://animals.sandiegozoo.org/animals/spotted-hyena",
      },
      {
        title: "Milwaukee County Zoo",
        url: "https://milwaukeezoo.org/visit/meet-our-animals/spotted-hyena/",
      },
    ],
  },
  "thomsons-gazelle": {
    id: "thomsons-gazelle",
    name: "Thomson's gazelle",
    heightM: null,
    weightKg: {
      pooled: { min: 15, max: 35 },
      female: { min: 15, max: 25 },
      male: { min: 20, max: 35 },
      approximate: false,
      note: "female 15–25; male 20–35",
    },
    heightSource: "Not established; shoulder only",
    weightSource: "**15–35** (female 15–25; male 20–35)",
    sources: [
      {
        title: "Animal Diversity Web",
        url: "https://animaldiversity.org/accounts/Eudorcas_thomsonii/",
      },
    ],
  },
  aardvark: {
    id: "aardvark",
    name: "Aardvark",
    heightM: null,
    weightKg: {
      pooled: { min: 40.4, max: 64.5 },
      female: { min: 40.4, max: 57.7 },
      male: { min: 41.3, max: 64.5 },
      approximate: false,
      note: "female 40.4–57.7; male 41.3–64.5",
    },
    heightSource: "Not established; shoulder only",
    weightSource: "**40.4–64.5** (female 40.4–57.7; male 41.3–64.5)",
    sources: [
      {
        title: "Mpala Research Centre",
        url: "https://www.mpalalive.org/field_guide/view/aardvark",
      },
    ],
  },
  "african-buffalo": {
    id: "african-buffalo",
    name: "African buffalo",
    heightM: null,
    weightKg: {
      pooled: { min: 425, max: 849 },
      female: { min: 425, max: 467 },
      male: { min: 660, max: 849 },
      approximate: false,
      note: "female 425–467; male 660–849",
    },
    heightSource: "Not established; shoulder only",
    weightSource: "**425–849** (female 425–467; male 660–849)",
    sources: [
      {
        title: "Mpala Research Centre",
        url: "https://mpala.org/field_guide/view/african_buffalo/",
      },
    ],
  },
  "african-monarch": {
    id: "african-monarch",
    name: "African monarch",
    heightM: null,
    weightKg: null,
    heightSource: "Not established; no fixed upright adult pose",
    weightSource: "Not established; no whole-live-mass range found",
    sources: [
      {
        title: "wingspan study",
        url: "https://www.mdpi.com/2075-4450/15/2/121",
      },
      {
        title: "component-mass data",
        url: "https://www.oikosjournal.org/sites/oikosjournal.org/files/appendix/oik-04593.pdf",
      },
    ],
  },
  "banded-mongoose": {
    id: "banded-mongoose",
    name: "Banded mongoose",
    heightM: null,
    weightKg: {
      pooled: { min: 1.5, max: 2.5 },
      approximate: true,
    },
    heightSource: "Not established; head–body length only",
    weightSource: "**1.5–2.5**†",
    sources: [
      {
        title: "Smithsonian National Zoo",
        url: "https://nationalzoo.si.edu/animals/banded-mongoose",
      },
    ],
  },
  "bat-eared-fox": {
    id: "bat-eared-fox",
    name: "Bat-eared fox",
    heightM: null,
    weightKg: {
      pooled: { min: 3.2, max: 5.4 },
      approximate: true,
    },
    heightSource: "Not established; shoulder only",
    weightSource: "**3.2–5.4**†",
    sources: [
      {
        title: "San Diego Zoo",
        url: "https://animals.sandiegozoo.org/animals/bat-eared-fox",
      },
    ],
  },
  "cape-porcupine": {
    id: "cape-porcupine",
    name: "Cape porcupine",
    heightM: null,
    weightKg: {
      pooled: { min: 10, max: 24.1 },
      female: { min: 13.6, max: 24.1 },
      male: { min: 14.5, max: 19.1 },
      approximate: false,
      note: "adult interval; Zimbabwe females 13.6–24.1, males 14.5–19.1",
    },
    heightSource: "Not established; quills excluded",
    weightSource:
      "**10.0–24.1** (adult interval; Zimbabwe females 13.6–24.1, males 14.5–19.1)",
    sources: [
      {
        title: "*Mammalian Species*",
        url: "https://academic.oup.com/mspecies/article/doi/10.1644/788.1/2600845",
      },
    ],
  },
  "desert-locust": {
    id: "desert-locust",
    name: "Desert locust",
    heightM: null,
    weightKg: null,
    heightSource: "Not established; stance and phase vary",
    weightSource: "Not established; only adult means, not ranges",
    sources: [
      {
        title: "adult field study",
        url: "https://doi.org/10.1371/journal.pone.0244733",
      },
    ],
  },
  "grey-crowned-crane": {
    id: "grey-crowned-crane",
    name: "Grey crowned crane",
    heightM: {
      pooled: { min: 1, max: 1.1 },
      approximate: false,
      note: "existing profile says “about 1 m”; crown endpoint unspecified",
    },
    weightKg: {
      pooled: { min: 3, max: 4 },
      approximate: true,
    },
    heightSource:
      "**1.00–1.10** (existing profile says “about 1 m”; crown endpoint unspecified)",
    weightSource: "**3.0–4.0**†",
    sources: [
      {
        title: "National Zoo Bojnice",
        url: "https://zoobojnice.sk/zviera/zeriav-kralovsky/",
      },
    ],
  },
  "helmeted-guineafowl": {
    id: "helmeted-guineafowl",
    name: "Helmeted guineafowl",
    heightM: {
      pooled: { min: 0.42, max: 0.47 },
      approximate: false,
      note: "casque endpoint unspecified",
    },
    weightKg: {
      pooled: { min: 1.3, max: 1.6 },
      approximate: true,
    },
    heightSource: "**0.42–0.47** (casque endpoint unspecified)",
    weightSource: "**1.3–1.6**†",
    sources: [
      {
        title: "Australia Zoo",
        url: "https://australiazoo.com.au/wildlife/our-animals/helmeted-guineafowl/",
      },
      {
        title: "Sydney Zoo",
        url: "https://sydneyzoo.com/animal/helmeted-guineafowl",
      },
    ],
  },
  "lamarcks-dung-beetle": {
    id: "lamarcks-dung-beetle",
    name: "Lamarck's dung beetle",
    heightM: null,
    weightKg: null,
    heightSource: "Not established; body length excludes head",
    weightSource: "Not established; dry-mass mean is not live range",
    sources: [
      {
        title: "Royal Society study",
        url: "https://doi.org/10.1098/rsif.2019.0181",
      },
      {
        title: "Pretoria data",
        url: "https://repository.up.ac.za/bitstreams/7ca49204-0c83-4422-a2a2-f6031a176837/download",
      },
    ],
  },
  "lilac-breasted-roller": {
    id: "lilac-breasted-roller",
    name: "Lilac-breasted roller",
    heightM: null,
    weightKg: {
      pooled: { min: 0.085, max: 0.135 },
      approximate: true,
    },
    heightSource: "Not established; total length only",
    weightSource: "**0.085–0.135**†",
    sources: [
      {
        title: "ZooParc Overloon",
        url: "https://www.zooparc.nl/en/animals/lilac-breasted-roller",
      },
    ],
  },
  "marabou-stork": {
    id: "marabou-stork",
    name: "Marabou stork",
    heightM: {
      pooled: { min: 1.2, max: 1.5 },
      approximate: false,
      note: "source says standing; head endpoint not detailed",
    },
    weightKg: {
      pooled: { min: 4.5, max: 9 },
      approximate: true,
    },
    heightSource:
      "**1.2–1.5** (source says standing; head endpoint not detailed)",
    weightSource: "**4.5–9.0**†",
    sources: [
      {
        title: "EBSCO zoology account",
        url: "https://www.ebsco.com/research-starters/zoology/marabou-stork/",
      },
      {
        title: "Toronto Zoo",
        url: "https://www.torontozoo.com/animals/Marabou%20stork",
      },
    ],
  },
  meerkat: {
    id: "meerkat",
    name: "Meerkat",
    heightM: null,
    weightKg: {
      pooled: { min: 0.62, max: 0.797 },
      female: { min: 0.62, max: 0.797 },
      male: { min: 0.626, max: 0.797 },
      approximate: false,
      note: "female 0.620–0.797; male 0.626–0.797",
    },
    heightSource: "Not established; four-foot and sentinel poses differ",
    weightSource: "**0.620–0.797** (female 0.620–0.797; male 0.626–0.797)",
    sources: [
      {
        title: "Marwell Zoo",
        url: "https://www.marwell.org.uk/animals/meerkat/",
      },
    ],
  },
  "mopane-emperor-moth": {
    id: "mopane-emperor-moth",
    name: "Mopane emperor moth",
    heightM: null,
    weightKg: null,
    heightSource: "Not established; no fixed upright adult pose",
    weightSource: "Not established; no adult live range found",
    sources: [
      {
        title: "species card",
        url: "https://www.1ksa.org.za/species-cards/gonimbrasia-belina",
      },
    ],
  },
  "mound-building-termite": {
    id: "mound-building-termite",
    name: "Mound-building termite",
    heightM: null,
    weightKg: null,
    heightSource: "Not established; caste and stance vary",
    weightSource: "Not established; caste means, not ranges",
    sources: [
      {
        title: "field study",
        url: "https://doi.org/10.1371/journal.pone.0028571",
      },
    ],
  },
  "naked-mole-rat": {
    id: "naked-mole-rat",
    name: "Naked mole-rat",
    heightM: null,
    weightKg: {
      pooled: { min: 0.009, max: 0.069 },
      approximate: false,
      note: "651 wild-caught adults; castes pooled",
    },
    heightSource: "Not established; tunnel posture varies",
    weightSource: "**0.009–0.069** (651 wild-caught adults; castes pooled)",
    sources: [
      {
        title: "*Mammalian Species*",
        url: "https://www.science.smith.edu/departments/Biology/VHAYSSEN/msi/pdf/706_Heterocephalus_glaber.pdf",
      },
    ],
  },
  "nile-monitor": {
    id: "nile-monitor",
    name: "Nile monitor",
    heightM: null,
    weightKg: {
      pooled: { min: 5, max: 15 },
      approximate: true,
    },
    heightSource: "Not established; nose-to-tail length only",
    weightSource: "**5–15**†",
    sources: [
      {
        title: "Animal Diversity Web",
        url: "https://animaldiversity.org/accounts/Varanus_niloticus/",
      },
      {
        title: "Réserve Africaine de Sigean",
        url: "https://www.reserveafricainesigean.fr/en/animals/nile-monitor/",
      },
    ],
  },
  "olive-baboon": {
    id: "olive-baboon",
    name: "Olive baboon",
    heightM: null,
    weightKg: {
      pooled: { min: 14, max: 30 },
      approximate: true,
      note: "males heavier on average",
    },
    heightSource: "Not established; 0.6–0.7 m is shoulder height",
    weightSource: "**14–30**† (males heavier on average)",
    sources: [
      {
        title: "Mpala Research Centre",
        url: "https://www.mpalalive.org/field_guide/view/olive_baboon",
      },
      {
        title: "Zootierliste",
        url: "https://www.zootierliste.de/en/index.php?art=1070701&familie=10815&klasse=1&ordnung=108",
      },
      {
        title: "Wisconsin Primate Center",
        url: "https://primate.wisc.edu/primate-info-net/pin-factsheets/pin-factsheet-olive-baboon/",
      },
    ],
  },
  "red-billed-oxpecker": {
    id: "red-billed-oxpecker",
    name: "Red-billed oxpecker",
    heightM: null,
    weightKg: {
      pooled: { min: 0.042, max: 0.059 },
      approximate: true,
      note: "adult study found little sex difference in mean",
    },
    heightSource: "Not established; clinging and perching differ",
    weightSource:
      "**0.042–0.059**† (adult study found little sex difference in mean)",
    sources: [
      {
        title: "Pretoria field study",
        url: "https://repository.up.ac.za/bitstream/handle/2263/94701/Stutterheim_Biology_1976.pdf?sequence=1",
      },
      {
        title: "Oiseaux.net",
        url: "https://www.oiseaux.net/oiseaux/piqueboeuf.a.bec.rouge.html",
      },
      {
        title: "adult field study",
        url: "https://repository.up.ac.za/bitstream/handle/2263/94701/Stutterheim_Biology_1976.pdf?sequence=1",
      },
    ],
  },
  secretarybird: {
    id: "secretarybird",
    name: "Secretarybird",
    heightM: {
      pooled: { min: 1.2, max: 1.5 },
      approximate: false,
      note: "existing profile; crest endpoint unspecified",
    },
    weightKg: {
      pooled: { min: 2.3, max: 4.3 },
      approximate: true,
    },
    heightSource: "**1.2–1.5** (existing profile; crest endpoint unspecified)",
    weightSource: "**2.3–4.3**†",
    sources: [
      {
        title: "San Diego Zoo",
        url: "https://animals.sandiegozoo.org/animals/secretary-bird",
      },
    ],
  },
  "south-african-springhare": {
    id: "south-african-springhare",
    name: "South African springhare",
    heightM: null,
    weightKg: {
      pooled: { min: 3, max: 4 },
      approximate: false,
      note: "typical mature animals",
    },
    heightSource: "Not established; resting and hopping poses differ",
    weightSource: "**3.0–4.0** (typical mature animals)",
    sources: [
      {
        title: "primary study",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7466257/",
      },
    ],
  },
  "southern-ground-hornbill": {
    id: "southern-ground-hornbill",
    name: "Southern ground hornbill",
    heightM: {
      pooled: { min: 0.9, max: 1 },
      approximate: false,
      note: "existing profile; casque endpoint unspecified",
    },
    weightKg: {
      pooled: { min: 2.23, max: 6.18 },
      female: { min: 2.23, max: 4.58 },
      male: { min: 3.459, max: 6.18 },
      approximate: false,
      note: "female 2.230–4.580; male 3.459–6.180",
    },
    heightSource:
      "**0.90–1.00** (existing profile; casque endpoint unspecified)",
    weightSource: "**2.230–6.180** (female 2.230–4.580; male 3.459–6.180)",
    sources: [
      {
        title: "San Diego Zoo",
        url: "https://animals.sandiegozoo.org/animals/hornbill",
      },
      {
        title: "IUCN Hornbill Specialist Group",
        url: "https://iucnhornbills.org/southern-ground-hornbill/",
      },
    ],
  },
  "striped-grass-mouse": {
    id: "striped-grass-mouse",
    name: "Striped grass mouse",
    heightM: null,
    weightKg: {
      pooled: { min: 0.04, max: 0.063 },
      approximate: true,
    },
    heightSource: "Not established; head–body length only",
    weightSource: "**0.040–0.063**†",
    sources: [
      {
        title: "Prague Zoo",
        url: "https://www.zoopraha.cz/zvirata-a-expozice/lexikon-zvirat/44-tiskoviny?d=418-mys-paskovana&start=",
      },
    ],
  },
  "vervet-monkey": {
    id: "vervet-monkey",
    name: "Vervet monkey",
    heightM: null,
    weightKg: {
      pooled: { min: 3.4, max: 8 },
      female: { min: 3.4, max: 5.3 },
      male: { min: 3.9, max: 8 },
      approximate: false,
      note: "female 3.4–5.3; male 3.9–8.0",
    },
    heightSource: "Not established; published 30–60 cm is body length",
    weightSource: "**3.4–8.0** (female 3.4–5.3; male 3.9–8.0)",
    sources: [
      {
        title: "Mpala Research Centre",
        url: "https://www.mpalalive.org/field_guide/view/vervet_monkey/1000",
      },
      {
        title: "SANBI",
        url: "https://www.sanbi.org/gardens/lowveld/wildlife-biodiversity-4/vervet-monkey/",
      },
    ],
  },
  "white-backed-vulture": {
    id: "white-backed-vulture",
    name: "White-backed vulture",
    heightM: {
      pooled: { min: 0.9, max: 1 },
      approximate: false,
      note: "head endpoint unspecified",
    },
    weightKg: {
      pooled: { min: 4, max: 7 },
      approximate: true,
    },
    heightSource: "**0.90–1.00** (head endpoint unspecified)",
    weightSource: "**4.0–7.0**†",
    sources: [
      {
        title: "Endangered Wildlife Trust guide",
        url: "https://ewt.org/wp-content/uploads/2022/09/2021_SAEP_-manual-mammal.pdf",
      },
      {
        title: "Mpala Research Centre",
        url: "https://mpala.org/field_guide/view/white-backed-vulture/",
      },
    ],
  },
};

export type Sex = "female" | "male";

/** One individual animal, drawn once and then kept in the save. */
export type Specimen = {
  sex: Sex;
  /** Kilograms. Present whenever a specimen exists at all. */
  weightKg: number;
  /** Metres, or null where no source publishes a standing height. */
  heightM: number | null;
};

const pick = (range: Range, random: () => number) =>
  range.min + random() * (range.max - range.min);

const toPlaces = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** A precision a child would actually read off an instrument. */
export function weighTo(value: number) {
  if (value < 0.1) return toPlaces(value, 3);
  if (value < 10) return toPlaces(value, 2);
  if (value < 100) return toPlaces(value, 1);
  return Math.round(value);
}

export function canWeigh(id: string) {
  return Boolean(speciesMeasurements[id]?.weightKg);
}

/**
 * Draw one individual. Call once per animal per save and store the result.
 * Returns null where the species has no published adult weight range, so the
 * scale is simply not offered rather than showing an invented number.
 */
export function drawSpecimen(
  id: string,
  random: () => number = Math.random,
): Specimen | null {
  const record = speciesMeasurements[id];
  if (!record?.weightKg) return null;
  const weight = record.weightKg;
  const sex: Sex = random() < 0.5 ? "female" : "male";
  // Use the sex range where the source separates them, the envelope otherwise.
  const weightRange = weight[sex] ?? weight.pooled;
  const height = record.heightM;
  const heightRange = height ? (height[sex] ?? height.pooled) : null;
  return {
    sex,
    weightKg: weighTo(pick(weightRange, random)),
    heightM: heightRange ? toPlaces(pick(heightRange, random), 2) : null,
  };
}
