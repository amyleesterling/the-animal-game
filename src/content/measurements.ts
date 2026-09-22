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
 * Of the 32 species: weight is established for 26, full length for 22, and
 * standing height for only 6, all of them birds, whose sources do not even say
 * whether the measurement ends at the crown, the crest or the casque.
 *
 * That shapes the measuring plate. A bird stands upright, so its bar is a
 * height. A quadruped or a reptile stands side on, so its bar is a full length
 * nose to tail, which is also the dimension a side on picture actually spans.
 * Where neither is established the animal is weighed but not measured, and
 * where the weight is missing too it gets no plate at all.
 *
 * Full length includes the tail. Where a source reports head and body and tail
 * separately, the table deliberately does not add them, so those species have
 * no length here rather than a number nobody published.
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
  /** Nose to tail tip, including the tail. */
  lengthM: MeasurementRange | null;
  weightKg: MeasurementRange | null;
  /** Kept verbatim so a reader sees exactly what was and was not published. */
  heightSource: string;
  lengthSource: string;
  weightSource: string;
  sources: { title: string; url: string }[];
};

export const speciesMeasurements: Record<string, SpeciesMeasurement> = {
  "african-elephant": {
    id: "african-elephant",
    name: "African savanna elephant",
    heightM: null,
    lengthM: null,
    weightKg: {
      pooled: { min: 2000, max: 6100 },
      female: { min: 2000, max: 3500 },
      male: { min: 4500, max: 6100 },
      approximate: false,
      note: "female 2,000–3,500; male 4,500–6,100",
    },
    heightSource: "Not established; shoulder only",
    lengthSource:
      "Not established as a comparable nose-to-tail range; handbook: head–body **6.00–7.50** (includes mobile trunk), tail **1.00–1.50** separately",
    weightSource: "**2,000–6,100** (female 2,000–3,500; male 4,500–6,100)",
    sources: [
      {
        title: "handbook",
        url: "https://tb.plazi.org/GgServer/html/29264D66FFCA981FF37028D9F866F4D6",
      },
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
    lengthM: {
      pooled: { min: 1.62, max: 2.26 },
      female: { min: 1.62, max: 2.14 },
      male: { min: 1.67, max: 2.26 },
      approximate: false,
      note: "[Namibian wild-adult study, Table 4.2](https://www.researchgate.net/publication/266454287_Aspects_of_Cheetah_Acinonyx_jubatus_Biology_Ecology_and_Conservation_Strategies_on_Namibian_Farmlands",
    },
    weightKg: {
      pooled: { min: 30, max: 55 },
      female: { min: 30, max: 45 },
      male: { min: 40, max: 55 },
      approximate: false,
      note: "Namibia: female 30–45; male 40–55",
    },
    heightSource: "Not established; shoulder only",
    lengthSource:
      "**1.62–2.26** (Namibian wild-adult study, Table 4.2; female 1.62–2.14, male 1.67–2.26)",
    weightSource: "**30–55** (Namibia: female 30–45; male 40–55)",
    sources: [
      {
        title: "Namibian wild-adult study, Table 4.2",
        url: "https://www.researchgate.net/publication/266454287_Aspects_of_Cheetah_Acinonyx_jubatus_Biology_Ecology_and_Conservation_Strategies_on_Namibian_Farmlands",
      },
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
    lengthM: null,
    weightKg: {
      pooled: { min: 50, max: 150 },
      female: { min: 50, max: 75 },
      male: { min: 60, max: 150 },
      approximate: false,
      note: "female 50–75; male 60–150",
    },
    heightSource: "Not established; shoulder only",
    lengthSource:
      "Not established as a measured total; IUCN: head–body **1.05–1.50**, tail **0.35–0.50** separately",
    weightSource: "**50–150** (female 50–75; male 60–150)",
    sources: [
      {
        title: "IUCN",
        url: "https://www.iucn-wpsg.org/copy-of-common-warthog",
      },
      {
        title: "San Diego Zoo",
        url: "https://animals.sandiegozoo.org/animals/warthog",
      },
    ],
  },
  giraffe: {
    id: "giraffe",
    name: "Northern giraffe",
    heightM: null,
    lengthM: null,
    weightKg: {
      pooled: { min: 550, max: 1930 },
      female: { min: 550, max: 1180 },
      male: { min: 800, max: 1930 },
      approximate: false,
      note: "Rothschild/Nubian form: female 550–1,180; male 800–1,930",
    },
    heightSource:
      "Not established for this species; broader giraffe head-top **4.25–5.50**, *not a northern-specific range*",
    lengthSource:
      "Not established as a measured total for northern giraffe; Prague Zoo, Nubian form: body **3.50–4.80**, tail **0.80–1.10** separately",
    weightSource:
      "**550–1,930** (Rothschild/Nubian form: female 550–1,180; male 800–1,930)",
    sources: [
      {
        title: "broader giraffe",
        url: "https://seaworld.org/animals/facts/mammals/giraffe/",
      },
      {
        title: "Prague Zoo, Nubian form",
        url: "https://www.zoopraha.cz/index.php/zvirata-a-expozice/lexikon-zvirat?d=323-zirafa-severni-nubijska&start=323",
      },
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
    lengthM: {
      pooled: { min: 2.3, max: 3 },
      approximate: false,
      note: "[southern-African mammal field guide](https://api.pageplace.de/preview/DT0400.9781431701315_A20986959/preview-9781431701315_A20986959.pdf",
    },
    weightKg: {
      pooled: { min: 175, max: 320 },
      female: { min: 175, max: 250 },
      male: { min: 220, max: 320 },
      approximate: false,
      note: "female 175–250; male 220–320",
    },
    heightSource: "Not established; shoulder only",
    lengthSource:
      "**2.30–3.00** (southern-African mammal field guide; southern population)",
    weightSource: "**175–320** (female 175–250; male 220–320)",
    sources: [
      {
        title: "southern-African mammal field guide",
        url: "https://api.pageplace.de/preview/DT0400.9781431701315_A20986959/preview-9781431701315_A20986959.pdf",
      },
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
    lengthM: {
      pooled: { min: 1.2, max: 1.8 },
      approximate: false,
      note: "[South African conflict manual](https://pmfsa.co.za/wp-content/uploads/2023/05/Manual_Engels.pdf",
    },
    weightKg: null,
    heightSource: "Not established; shoulder only",
    lengthSource:
      "**1.20–1.80** (South African conflict manual; broad guide, sexes pooled)",
    weightSource:
      "**≈45–84** (male ≈45–64; female ≈54–84; rounded from pounds)",
    sources: [
      {
        title: "South African conflict manual",
        url: "https://pmfsa.co.za/wp-content/uploads/2023/05/Manual_Engels.pdf",
      },
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
    lengthM: null,
    weightKg: {
      pooled: { min: 15, max: 35 },
      female: { min: 15, max: 25 },
      male: { min: 20, max: 35 },
      approximate: false,
      note: "female 15–25; male 20–35",
    },
    heightSource: "Not established; shoulder only",
    lengthSource:
      "Not established as a measured total; ADW: head–body **0.80–1.20**, tail **0.15–0.27** separately",
    weightSource: "**15–35** (female 15–25; male 20–35)",
    sources: [
      {
        title: "ADW",
        url: "https://animaldiversity.org/accounts/Eudorcas_thomsonii/",
      },
    ],
  },
  aardvark: {
    id: "aardvark",
    name: "Aardvark",
    heightM: null,
    lengthM: {
      pooled: { min: 1.7, max: 1.9 },
      approximate: false,
      note: "[aardvark field guide](https://aardwolftotystervark.co.za/wp-content/uploads/2023/12/Look%20Inside.pdf",
    },
    weightKg: {
      pooled: { min: 40.4, max: 64.5 },
      female: { min: 40.4, max: 57.7 },
      male: { min: 41.3, max: 64.5 },
      approximate: false,
      note: "female 40.4–57.7; male 41.3–64.5",
    },
    heightSource: "Not established; shoulder only",
    lengthSource: "**1.70–1.90** (aardvark field guide)",
    weightSource: "**40.4–64.5** (female 40.4–57.7; male 41.3–64.5)",
    sources: [
      {
        title: "aardvark field guide",
        url: "https://aardwolftotystervark.co.za/wp-content/uploads/2023/12/Look%20Inside.pdf",
      },
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
    lengthM: null,
    weightKg: {
      pooled: { min: 425, max: 849 },
      female: { min: 425, max: 467 },
      male: { min: 660, max: 849 },
      approximate: false,
      note: "female 425–467; male 660–849",
    },
    heightSource: "Not established; shoulder only",
    lengthSource:
      "Not established as an adult range; AMNH field measurements record only two adults, **2.593** and **3.304**",
    weightSource: "**425–849** (female 425–467; male 660–849)",
    sources: [
      {
        title: "AMNH field measurements",
        url: "https://www.rhinoresourcecenter.com/pdf_files/147/1471426593.pdf",
      },
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
    lengthM: {
      pooled: { min: 0.02, max: 0.025 },
      approximate: false,
      note: "[80-adult morphometric study](https://pu.edu.pk/images/journal/zology/PDF-FILES/2-2006_Study%20of%20Seasonal%20Variations%20of%20Danaus%20Chrysippus.pdf",
    },
    weightKg: null,
    heightSource: "Not established; no fixed upright adult pose",
    lengthSource:
      "**0.020–0.025** (80-adult morphometric study; head-to-abdomen, no tail; Pakistan sample)",
    weightSource: "Not established; no whole-live-mass range found",
    sources: [
      {
        title: "80-adult morphometric study",
        url: "https://pu.edu.pk/images/journal/zology/PDF-FILES/2-2006_Study%20of%20Seasonal%20Variations%20of%20Danaus%20Chrysippus.pdf",
      },
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
    lengthM: {
      pooled: { min: 0.55, max: 0.6 },
      approximate: false,
      note: "[ADW](https://animaldiversity.org/accounts/Mungos_mungo/",
    },
    weightKg: {
      pooled: { min: 1.5, max: 2.5 },
      approximate: true,
    },
    heightSource: "Not established; head–body length only",
    lengthSource: "**0.55–0.60** (ADW; adult total body length)",
    weightSource: "**1.5–2.5**†",
    sources: [
      {
        title: "ADW",
        url: "https://animaldiversity.org/accounts/Mungos_mungo/",
      },
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
    lengthM: {
      pooled: { min: 0.759, max: 0.873 },
      approximate: false,
      note: "[adult specimen study](https://repository.up.ac.za/server/api/core/bitstreams/da8e1169-7773-4b62-bee5-7711ff270f35/content",
    },
    weightKg: {
      pooled: { min: 3.2, max: 5.4 },
      approximate: true,
    },
    heightSource: "Not established; shoulder only",
    lengthSource:
      "**0.759–0.873** (adult specimen study; nose to tail vertebra, fur tip excluded)",
    weightSource: "**3.2–5.4**†",
    sources: [
      {
        title: "adult specimen study",
        url: "https://repository.up.ac.za/server/api/core/bitstreams/da8e1169-7773-4b62-bee5-7711ff270f35/content",
      },
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
    lengthM: {
      pooled: { min: 0.63, max: 0.805 },
      approximate: false,
      note: "[Australian government species assessment](https://www.dcceew.gov.au/sites/default/files/env/pages/42a5b4f9-a9c0-4555-a450-3502e71f3dde/files/hystrix-africaeaustralis-draft-assessment.pdf",
    },
    weightKg: {
      pooled: { min: 10, max: 24.1 },
      female: { min: 13.6, max: 24.1 },
      male: { min: 14.5, max: 19.1 },
      approximate: false,
      note: "adult interval; Zimbabwe females 13.6–24.1, males 14.5–19.1",
    },
    heightSource: "Not established; quills excluded",
    lengthSource:
      "**0.630–0.805** (Australian government species assessment; tail included)",
    weightSource:
      "**10.0–24.1** (adult interval; Zimbabwe females 13.6–24.1, males 14.5–19.1)",
    sources: [
      {
        title: "Australian government species assessment",
        url: "https://www.dcceew.gov.au/sites/default/files/env/pages/42a5b4f9-a9c0-4555-a450-3502e71f3dde/files/hystrix-africaeaustralis-draft-assessment.pdf",
      },
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
    lengthM: {
      pooled: { min: 0.042, max: 0.058 },
      female: { min: 0.048, max: 0.058 },
      male: { min: 0.042, max: 0.05 },
      approximate: false,
      note: "[entomology synthesis](https://bpb-us-w2.wpmucdn.com/about.illinoisstate.edu/dist/b/327/files/2020/12/2008-large-size-defense-2.pdf",
    },
    weightKg: null,
    heightSource: "Not established; stance and phase vary",
    lengthSource:
      "**0.042–0.058** (entomology synthesis; adult body, male 0.042–0.050, female 0.048–0.058; no tail)",
    weightSource: "Not established; only adult means, not ranges",
    sources: [
      {
        title: "entomology synthesis",
        url: "https://bpb-us-w2.wpmucdn.com/about.illinoisstate.edu/dist/b/327/files/2020/12/2008-large-size-defense-2.pdf",
      },
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
    lengthM: {
      pooled: { min: 1, max: 1.1 },
      approximate: false,
      note: "[Chiba Zoo](https://www.city.chiba.jp/zoo/zone/data-grey_crowned-crane.html",
    },
    weightKg: {
      pooled: { min: 3, max: 4 },
      approximate: true,
    },
    heightSource:
      "**1.00–1.10** (existing profile says “about 1 m”; crown endpoint unspecified)",
    lengthSource: "**1.00–1.10** (Chiba Zoo; stated total length)",
    weightSource: "**3.0–4.0**†",
    sources: [
      {
        title: "Chiba Zoo",
        url: "https://www.city.chiba.jp/zoo/zone/data-grey_crowned-crane.html",
      },
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
    lengthM: {
      pooled: { min: 0.53, max: 0.63 },
      approximate: false,
      note: "[University of Ghana review](https://ugspace.ug.edu.gh/bitstreams/486b0145-a52a-49d7-bbb4-f4e42ca9608b/download",
    },
    weightKg: {
      pooled: { min: 1.3, max: 1.6 },
      approximate: true,
    },
    heightSource: "**0.42–0.47** (casque endpoint unspecified)",
    lengthSource: "**0.53–0.63** (University of Ghana review; stated length)",
    weightSource: "**1.3–1.6**†",
    sources: [
      {
        title: "University of Ghana review",
        url: "https://ugspace.ug.edu.gh/bitstreams/486b0145-a52a-49d7-bbb4-f4e42ca9608b/download",
      },
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
    lengthM: null,
    weightKg: null,
    heightSource: "Not established; body length excludes head",
    lengthSource:
      "Not established; locomotion study gives **0.0286 mean** from pronotum to abdomen, *head excluded*; no tail",
    weightSource: "Not established; dry-mass mean is not live range",
    sources: [
      {
        title: "locomotion study",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6731515/",
      },
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
    lengthM: {
      pooled: { min: 0.36, max: 0.38 },
      approximate: false,
      note: "[Mpala field guide](https://www.mpalalive.org/field_guide/view/lilac-breasted-roller",
    },
    weightKg: {
      pooled: { min: 0.085, max: 0.135 },
      approximate: true,
    },
    heightSource: "Not established; total length only",
    lengthSource:
      "**0.36–0.38** (Mpala field guide; tail included in bird length)",
    weightSource: "**0.085–0.135**†",
    sources: [
      {
        title: "Mpala field guide",
        url: "https://www.mpalalive.org/field_guide/view/lilac-breasted-roller",
      },
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
    lengthM: {
      pooled: { min: 1.2, max: 1.5 },
      approximate: false,
      note: "[Toronto Zoo](https://www.torontozoo.com/animals/Marabou%20stork",
    },
    weightKg: {
      pooled: { min: 4.5, max: 9 },
      approximate: true,
    },
    heightSource:
      "**1.2–1.5** (source says standing; head endpoint not detailed)",
    lengthSource: "**1.20–1.50** (Toronto Zoo; stated length)",
    weightSource: "**4.5–9.0**†",
    sources: [
      {
        title: "Toronto Zoo",
        url: "https://www.torontozoo.com/animals/Marabou%20stork",
      },
      {
        title: "EBSCO zoology account",
        url: "https://www.ebsco.com/research-starters/zoology/marabou-stork/",
      },
    ],
  },
  meerkat: {
    id: "meerkat",
    name: "Meerkat",
    heightM: null,
    lengthM: {
      pooled: { min: 0.42, max: 0.6 },
      approximate: false,
      note: "[ZooParc Overloon](https://www.zooparc.nl/en/animals/meerkat",
    },
    weightKg: {
      pooled: { min: 0.62, max: 0.797 },
      female: { min: 0.62, max: 0.797 },
      male: { min: 0.626, max: 0.797 },
      approximate: false,
      note: "female 0.620–0.797; male 0.626–0.797",
    },
    heightSource: "Not established; four-foot and sentinel poses differ",
    lengthSource: "**0.42–0.60** (ZooParc Overloon; stated length)",
    weightSource: "**0.620–0.797** (female 0.620–0.797; male 0.626–0.797)",
    sources: [
      {
        title: "ZooParc Overloon",
        url: "https://www.zooparc.nl/en/animals/meerkat",
      },
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
    lengthM: null,
    weightKg: null,
    heightSource: "Not established; no fixed upright adult pose",
    lengthSource:
      "Not established for adult body; 1KSA gives **0.10–0.12 wingspan**, a different measure",
    weightSource: "Not established; no adult live range found",
    sources: [
      {
        title: "1KSA",
        url: "https://www.1ksa.org.za/species-cards/gonimbrasia-belina",
      },
    ],
  },
  "mound-building-termite": {
    id: "mound-building-termite",
    name: "Mound-building termite",
    heightM: null,
    lengthM: {
      pooled: { min: 0.02, max: 0.025 },
      approximate: false,
      note: "[primary field study](https://comptes-rendus.academie-sciences.fr/biologies/item/10.1016/S1631-0691%2802%2901484-1.pdf",
    },
    weightKg: null,
    heightSource: "Not established; caste and stance vary",
    lengthSource:
      "**0.020–0.025** large soldiers (primary field study); **0.006–0.008** small soldiers (field experiment); caste-specific, mandible endpoint uncertain",
    weightSource: "Not established; caste means, not ranges",
    sources: [
      {
        title: "primary field study",
        url: "https://comptes-rendus.academie-sciences.fr/biologies/item/10.1016/S1631-0691%2802%2901484-1.pdf",
      },
      {
        title: "field experiment",
        url: "https://repository.embuni.ac.ke/server/api/core/bitstreams/3fb7d86f-a80b-414f-95b1-8043a0233e6d/content",
      },
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
    lengthM: {
      pooled: { min: 0.137, max: 0.18 },
      approximate: false,
      note: "[42 wild adults, *Mammalian Species*](https://www.science.smith.edu/departments/Biology/VHAYSSEN/msi/pdf/706_Heterocephalus_glaber.pdf",
    },
    weightKg: {
      pooled: { min: 0.009, max: 0.069 },
      approximate: false,
      note: "651 wild-caught adults; castes pooled",
    },
    heightSource: "Not established; tunnel posture varies",
    lengthSource:
      "**0.137–0.180** (42 wild adults, *Mammalian Species*; tail included)",
    weightSource: "**0.009–0.069** (651 wild-caught adults; castes pooled)",
    sources: [
      {
        title: "42 wild adults, *Mammalian Species*",
        url: "https://www.science.smith.edu/departments/Biology/VHAYSSEN/msi/pdf/706_Heterocephalus_glaber.pdf",
      },
    ],
  },
  "nile-monitor": {
    id: "nile-monitor",
    name: "Nile monitor",
    heightM: null,
    lengthM: null,
    weightKg: {
      pooled: { min: 5, max: 15 },
      approximate: true,
    },
    heightSource: "Not established; nose-to-tail length only",
    lengthSource:
      "Not established as adult range; USGS reports adults may exceed **2.42** total; no lower bound",
    weightSource: "**5–15**†",
    sources: [
      {
        title: "USGS",
        url: "https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=1085",
      },
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
    lengthM: null,
    weightKg: {
      pooled: { min: 14, max: 30 },
      approximate: true,
      note: "males heavier on average",
    },
    heightSource: "Not established; 0.6–0.7 m is shoulder height",
    lengthSource:
      "Not established as species-specific range; ADW gives *average* female head–body **0.600** + tail **0.480**, male **0.760** + **0.560**",
    weightSource: "**14–30**† (males heavier on average)",
    sources: [
      {
        title: "ADW",
        url: "https://animaldiversity.org/accounts/Papio_anubis/",
      },
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
    lengthM: null,
    weightKg: {
      pooled: { min: 0.042, max: 0.059 },
      approximate: true,
      note: "adult study found little sex difference in mean",
    },
    heightSource: "Not established; clinging and perching differ",
    lengthSource:
      "About **0.20** (Mpala field guide; single guide length, no range)",
    weightSource:
      "**0.042–0.059**† (adult study found little sex difference in mean)",
    sources: [
      {
        title: "Mpala field guide",
        url: "https://www.mpalalive.org/field_guide/view/redbilled_oxpecker",
      },
      {
        title: "Pretoria field study",
        url: "https://repository.up.ac.za/bitstream/handle/2263/94701/Stutterheim_Biology_1976.pdf?sequence=1",
      },
      {
        title: "Oiseaux.net",
        url: "https://www.oiseaux.net/oiseaux/piqueboeuf.a.bec.rouge.html",
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
    lengthM: {
      pooled: { min: 1.25, max: 1.5 },
      approximate: false,
      note: "[Tokyo Zoo](https://www.tokyo-zoo.net/en/ueno/encyclopedia/secretarybird/index.html",
    },
    weightKg: {
      pooled: { min: 2.3, max: 4.3 },
      approximate: true,
    },
    heightSource: "**1.2–1.5** (existing profile; crest endpoint unspecified)",
    lengthSource: "**1.25–1.50** (Tokyo Zoo; stated total length)",
    weightSource: "**2.3–4.3**†",
    sources: [
      {
        title: "Tokyo Zoo",
        url: "https://www.tokyo-zoo.net/en/ueno/encyclopedia/secretarybird/index.html",
      },
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
    lengthM: {
      pooled: { min: 0.75, max: 0.85 },
      approximate: false,
      note: "[Iziko Museums account](https://www.biodiversityexplorer.info/mammals/rodentia/pedetes_capensis.htm",
    },
    weightKg: {
      pooled: { min: 3, max: 4 },
      approximate: false,
      note: "typical mature animals",
    },
    heightSource: "Not established; resting and hopping poses differ",
    lengthSource: "**0.75–0.85** (Iziko Museums account; tail included)",
    weightSource: "**3.0–4.0** (typical mature animals)",
    sources: [
      {
        title: "Iziko Museums account",
        url: "https://www.biodiversityexplorer.info/mammals/rodentia/pedetes_capensis.htm",
      },
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
    lengthM: {
      pooled: { min: 0.9, max: 1.3 },
      approximate: false,
      note: "[Toronto Zoo](https://www.torontozoo.com/animals/Southern%20ground%20hornbill",
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
    lengthSource: "**0.90–1.30** (Toronto Zoo; stated length)",
    weightSource: "**2.230–6.180** (female 2.230–4.580; male 3.459–6.180)",
    sources: [
      {
        title: "Toronto Zoo",
        url: "https://www.torontozoo.com/animals/Southern%20ground%20hornbill",
      },
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
    lengthM: {
      pooled: { min: 0.224, max: 0.299 },
      approximate: false,
      note: "[Ugandan field study](https://nsojournals.onlinelibrary.wiley.com/doi/full/10.1002/wlb3.01135",
    },
    weightKg: {
      pooled: { min: 0.04, max: 0.063 },
      approximate: true,
    },
    heightSource: "Not established; head–body length only",
    lengthSource:
      "**0.224–0.299** (Ugandan field study; sampled ages **not adult-filtered**, tail vertebra included)",
    weightSource: "**0.040–0.063**†",
    sources: [
      {
        title: "Ugandan field study",
        url: "https://nsojournals.onlinelibrary.wiley.com/doi/full/10.1002/wlb3.01135",
      },
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
    lengthM: {
      pooled: { min: 0.95, max: 1.3 },
      female: { min: 0.95, max: 1.1 },
      male: { min: 1, max: 1.3 },
      approximate: false,
      note: "[East African mammal field guide](https://api.pageplace.de/preview/DT0400.9781775840947_A21682936/preview-9781775840947_A21682936.pdf",
    },
    weightKg: {
      pooled: { min: 3.4, max: 8 },
      female: { min: 3.4, max: 5.3 },
      male: { min: 3.9, max: 8 },
      approximate: false,
      note: "female 3.4–5.3; male 3.9–8.0",
    },
    heightSource: "Not established; published 30–60 cm is body length",
    lengthSource:
      "**0.95–1.30** (East African mammal field guide; female 0.95–1.10, male 1.00–1.30; tail included)",
    weightSource: "**3.4–8.0** (female 3.4–5.3; male 3.9–8.0)",
    sources: [
      {
        title: "East African mammal field guide",
        url: "https://api.pageplace.de/preview/DT0400.9781775840947_A21682936/preview-9781775840947_A21682936.pdf",
      },
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
    lengthM: {
      pooled: { min: 0.78, max: 0.9 },
      approximate: false,
      note: "[Tokyo Zoo](https://www.tokyo-zoo.net/en/ueno/encyclopedia/african-white-backed-vulture/index.html",
    },
    weightKg: {
      pooled: { min: 4, max: 7 },
      approximate: true,
    },
    heightSource: "**0.90–1.00** (head endpoint unspecified)",
    lengthSource: "**0.78–0.90** (Tokyo Zoo; stated total length)",
    weightSource: "**4.0–7.0**†",
    sources: [
      {
        title: "Tokyo Zoo",
        url: "https://www.tokyo-zoo.net/en/ueno/encyclopedia/african-white-backed-vulture/index.html",
      },
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
  /** Kilograms, or null where no source publishes an adult mass range. */
  weightKg: number | null;
  /** Metres, or null where no source publishes a standing height. */
  heightM: number | null;
  /** Metres nose to tail, or null where no source publishes a full length. */
  lengthM: number | null;
};

/** Which dimension this animal's measuring bar shows, if any. */
export type BarDimension = "height" | "length" | null;

export function barDimension(id: string): BarDimension {
  const record = speciesMeasurements[id];
  if (record?.heightM) return "height";
  if (record?.lengthM) return "length";
  return null;
}

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

/** True when there is anything at all to record for this animal. */
export function canMeasure(id: string) {
  const record = speciesMeasurements[id];
  return Boolean(record?.weightKg || record?.heightM || record?.lengthM);
}

/**
 * Draw one individual. Call once per animal per save and store the result.
 * Any dimension the sources do not establish comes back null, so the plate
 * shows only what is real rather than filling a gap with an invented number.
 * Returns null entirely where nothing at all is published.
 */
export function drawSpecimen(
  id: string,
  random: () => number = Math.random,
): Specimen | null {
  const record = speciesMeasurements[id];
  if (!record) return null;
  if (!record.weightKg && !record.heightM && !record.lengthM) return null;
  const sex: Sex = random() < 0.5 ? "female" : "male";
  // Use the sex range where the source separates them, the envelope otherwise.
  const forSex = (m: MeasurementRange | null) =>
    m ? (m[sex] ?? m.pooled) : null;
  const weight = forSex(record.weightKg);
  const height = forSex(record.heightM);
  const length = forSex(record.lengthM);
  return {
    sex,
    weightKg: weight ? weighTo(pick(weight, random)) : null,
    heightM: height ? toPlaces(pick(height, random), 2) : null,
    lengthM: length ? toPlaces(pick(length, random), 2) : null,
  };
}
