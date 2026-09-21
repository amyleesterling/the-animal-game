import type { SavannaProfile, SavannaQuestion } from "./savanna-profile";

function quiz(
  prompt: string,
  choices: [string, string, string],
  correctId: "a" | "b" | "c",
  explanation: string,
  sourceIds: string[],
): SavannaQuestion {
  return {
    prompt,
    choices: choices.map((text, index) => ({
      id: ["a", "b", "c"][index],
      text,
    })),
    correctId,
    explanation,
    sourceIds,
  };
}

// Regions and life stages are intentionally explicit: these species do not all
// share one locality, and a moth's adult life is not its complete lifespan.
export const smallLifeProfiles: SavannaProfile[] = [
  {
    id: "lamarcks-dung-beetle",
    name: "Lamarck’s dung beetle",
    scientificName: "Scarabaeus lamarcki",
    group: "Insect",
    aliases: ["dung beetle", "Lamarck's dung beetle", "Kheper lamarcki"],
    summary:
      "This ball-rolling beetle uses the sun and wind to help carry dung away from a busy dung pile.",
    description:
      "A ball of dung is valuable to this beetle: it provides food and a place for its young to grow. An adult shapes a ball, then pushes it away backwards. Moving along a straight path helps it leave other competing beetles behind. Scientists studying this South African savanna beetle found that it combines clues from the sun and the wind to keep its direction. A breeding pair can bury a ball, and the female stays with the developing young.",
    descriptionSourceIds: [
      "lamarcki-compass",
      "lamarcki-rolling",
      "lamarcki-breeding",
    ],
    wikipediaUrl: "https://es.wikipedia.org/wiki/Scarabaeus_lamarcki",
    wikipediaLanguage: "Spanish",
    habitat:
      "Open African savanna with dung from plant-eating mammals; studied in South Africa.",
    stats: [
      {
        label: "Body size",
        value: "About 2.9 cm excluding the head, in one study",
        sourceIds: ["lamarcki-size"],
      },
      {
        label: "Lifespan",
        value: "Wild and care lifespan not established in reviewed sources",
        sourceIds: ["lamarcki-breeding"],
      },
      {
        label: "Lives",
        value: "Individuals gather at dung; adults can form breeding pairs",
        sourceIds: ["lamarcki-breeding"],
      },
      {
        label: "Diet",
        value: "Dung from plant-eating mammals",
        sourceIds: ["lamarcki-compass", "lamarcki-breeding"],
      },
      {
        label: "Range",
        value: "Parts of sub-Saharan Africa, including southern Africa",
        sourceIds: ["lamarcki-taxonomy"],
      },
      {
        label: "Ball rolling",
        value: "Backwards, using coordinated leg movements",
        sourceIds: ["lamarcki-rolling"],
      },
    ],
    questions: [
      quiz(
        "What does this beetle shape into a ball?",
        ["Dung", "Flower petals", "Tree bark"],
        "a",
        "Dung is useful food for this beetle and its young, so a dung ball is worth carrying away.",
        ["lamarcki-compass"],
      ),
      quiz(
        "How does this beetle move when rolling its ball?",
        [
          "It flies while holding the ball",
          "It pushes the ball while moving backwards",
          "It swims with the ball",
        ],
        "b",
        "It moves backwards while its legs work together to push and control the dung ball.",
        ["lamarcki-rolling"],
      ),
      quiz(
        "Which clues help this beetle keep a straight path?",
        [
          "Bird songs and flower smells",
          "The colors of nearby leaves",
          "The sun and the wind",
        ],
        "c",
        "Experiments showed that this species uses both the sun’s position and wind direction as navigation clues.",
        ["lamarcki-compass"],
      ),
    ],
    sources: [
      {
        id: "lamarcki-compass",
        title: "University of Würzburg: (Not only) the wind shows the way",
        url: "https://www.biologie.uni-wuerzburg.de/en/aktuelles/detail/news/not-only-the-wind-shows-the-way-1/",
      },
      {
        id: "lamarcki-rolling",
        title:
          "Scientific Reports: Rules for the leg coordination of dung beetle ball rolling behaviour",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7283283/",
      },
      {
        id: "lamarcki-breeding",
        title:
          "NCBI Bookshelf: First investigation of the semiochemistry of South African dung beetle species",
        url: "https://www.ncbi.nlm.nih.gov/books/NBK200987/",
      },
      {
        id: "lamarcki-size",
        title:
          "Journal of the Royal Society Interface: The effect of step size on straight-line orientation",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6731515/",
      },
      {
        id: "lamarcki-taxonomy",
        title:
          "Wikipedia: Scarabaeus lamarcki (Spanish; supplementary range reference)",
        url: "https://es.wikipedia.org/wiki/Scarabaeus_lamarcki",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "mound-building-termite",
    name: "Mound-building termite",
    scientificName: "Macrotermes bellicosus",
    group: "Insect",
    aliases: ["termite", "African mound termite", "fungus-growing termite"],
    summary:
      "These termites share jobs in a large colony and grow a fungus that helps them use plant food.",
    description:
      "A termite mound is the work of a whole colony. In this species, workers gather plant material, tend young termites and maintain the nest. Soldiers have a different job, defending their home, while a queen and king produce young. Inside the nest, termites grow a fungus on collected plant material. The fungus helps turn that material into food. Researchers study these mounds in West African habitats, including savanna; a mound elsewhere in Africa may belong to a different termite species.",
    descriptionSourceIds: [
      "bellicosus-fungus",
      "bellicosus-longevity",
      "bellicosus-savanna",
    ],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Macrotermes_bellicosus",
    habitat:
      "Savanna and other wooded habitats; the featured research sites are in West Africa.",
    stats: [
      {
        label: "Body size",
        value: "Large soldiers: 17–18 mm in one study; castes differ",
        sourceIds: ["bellicosus-size"],
      },
      {
        label: "Lifespan",
        value:
          "Workers: months; queens and kings: up to 20 years in laboratory care",
        sourceIds: ["bellicosus-longevity"],
      },
      {
        label: "Lives",
        value: "Colonies with a queen, king, workers and soldiers",
        sourceIds: ["bellicosus-fungus"],
      },
      {
        label: "Diet",
        value: "Plant material processed with a cultivated fungus",
        sourceIds: ["bellicosus-fungus"],
      },
      {
        label: "Range",
        value: "African populations, including Côte d’Ivoire and Nigeria",
        sourceIds: ["bellicosus-fungus", "bellicosus-savanna"],
      },
      {
        label: "Home",
        value: "A mound with underground foraging passages",
        sourceIds: ["bellicosus-fungus"],
      },
    ],
    questions: [
      quiz(
        "How do these termites get the colony’s work done?",
        [
          "Every termite does exactly the same job",
          "Different termites have different jobs",
          "Only the queen does any work",
        ],
        "b",
        "Workers, soldiers and the royal pair have different roles in the colony.",
        ["bellicosus-longevity", "bellicosus-fungus"],
      ),
      quiz(
        "What do these termites grow inside their nest?",
        [
          "A fungus that helps process plant food",
          "A patch of sunflowers",
          "A pool of seaweed",
        ],
        "a",
        "They tend a fungus garden. Termites and the fungus work together to use collected plant material.",
        ["bellicosus-fungus"],
      ),
      quiz(
        "Which termites help care for young and build the mound?",
        ["Only the king", "Only visiting butterflies", "Workers"],
        "c",
        "Workers share tasks, including caring for the young and helping construct the colony’s mound.",
        ["bellicosus-longevity"],
      ),
    ],
    sources: [
      {
        id: "bellicosus-fungus",
        title:
          "BMC Ecology and Evolution: Fungi surviving passage through Macrotermes bellicosus guts",
        url: "https://link.springer.com/article/10.1186/s12862-020-01727-z",
      },
      {
        id: "bellicosus-longevity",
        title:
          "PNAS: Longevity and transposon defense, the case of termite reproductives",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6003524/",
      },
      {
        id: "bellicosus-size",
        title:
          "Acta Oecologica: Selection and capture of prey in the African ponerine ant Plectroctena minor",
        url: "https://www.antwiki.org/wiki/images/4/4f/Schatz,_B.,_Suzzoni_et_al._2001._Selection_and_capture_of_prey_in_the_African_ponerine_ant_Plectroctena_minor.pdf",
      },
      {
        id: "bellicosus-savanna",
        title:
          "Soil Science and Plant Nutrition: Nutrient storage in Macrotermes bellicosus mounds in Nigerian savanna",
        url: "https://www.tandfonline.com/doi/pdf/10.1080/00380768.2011.640922",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "mopane-emperor-moth",
    name: "Mopane emperor moth",
    scientificName: "Gonimbrasia belina",
    group: "Insect",
    aliases: ["mopane moth", "emperor moth", "mopane worm", "Imbrasia belina"],
    summary:
      "The leaf-eating mopane caterpillar grows into a large moth with striking eyespots on its wings.",
    description:
      "The animal often called a mopane worm is actually this moth’s caterpillar. It feeds on leaves, including those of mopane trees in southern African woodlands. Young caterpillars feed together, while older ones spread out and feed alone. Later, a caterpillar becomes a pupa before emerging as a winged adult. The large adult moth has patterned wings with eyespots. Its flying adult stage lasts only a few days, but the earlier stages make the animal’s whole life much longer.",
    descriptionSourceIds: [
      "belina-distribution",
      "belina-groups",
      "belina-wikipedia",
    ],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Gonimbrasia_belina",
    habitat:
      "Warm southern African woodland and bushveld, especially areas with mopane and other host trees.",
    stats: [
      {
        label: "Wingspan",
        value: "About 12 cm for an adult moth",
        sourceIds: ["belina-wikipedia"],
      },
      {
        label: "Lifespan",
        value: "Adult stage: a few days; total wild or care lifespan varies",
        sourceIds: ["belina-distribution"],
      },
      {
        label: "Lives",
        value: "Young caterpillars feed in groups; older ones feed alone",
        sourceIds: ["belina-groups"],
      },
      {
        label: "Diet",
        value: "Caterpillars eat leaves of mopane and other host plants",
        sourceIds: ["belina-groups", "belina-distribution"],
      },
      {
        label: "Range",
        value:
          "Southern Africa; this profile focuses on the mopane woodland region",
        sourceIds: ["belina-distribution"],
      },
      {
        label: "Growing up",
        value: "Egg, caterpillar, pupa, adult moth",
        sourceIds: ["belina-wikipedia"],
      },
    ],
    questions: [
      quiz(
        "What is a mopane worm?",
        ["An earthworm", "A young snake", "The caterpillar of this moth"],
        "c",
        "Mopane worm is a familiar name for the caterpillar. It later changes into a moth.",
        ["belina-distribution"],
      ),
      quiz(
        "What does the caterpillar eat?",
        ["Leaves", "Fish", "Rocks"],
        "a",
        "The caterpillar eats leaves from mopane and several other kinds of plant.",
        ["belina-groups"],
      ),
      quiz(
        "How do the youngest caterpillars usually feed?",
        ["Each one stays alone", "Together in groups", "They do not eat"],
        "b",
        "Young caterpillars gather together to feed. Older caterpillars of this species feed alone.",
        ["belina-groups"],
      ),
    ],
    sources: [
      {
        id: "belina-distribution",
        title:
          "Potential decline in the distribution and food provisioning services of the mopane worm in southern Africa",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7615040/",
      },
      {
        id: "belina-groups",
        title:
          "Functional Ecology: Assessing the benefits of aggregation in emperor moth caterpillars",
        url: "https://besjournals.onlinelibrary.wiley.com/doi/10.1046/j.1365-2435.1999.00324.x",
      },
      {
        id: "belina-wikipedia",
        title:
          "Wikipedia: Gonimbrasia belina (supplementary appearance and life-cycle reference)",
        url: "https://en.wikipedia.org/wiki/Gonimbrasia_belina",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "african-monarch",
    name: "African monarch",
    scientificName: "Danaus chrysippus",
    group: "Insect",
    aliases: [
      "plain tiger",
      "African queen",
      "African monarch butterfly",
      "butterfly",
    ],
    summary:
      "This orange, black and white butterfly drinks flower nectar and also goes by the name plain tiger.",
    description:
      "Look for orange wings with dark edges and white marks near the forewing tips. African monarchs have several color forms, so individuals need not look exactly alike. Adults visit flowers for nectar, while caterpillars eat leaves. A caterpillar changes into a pupa before the butterfly emerges. This species occurs across much of Africa and beyond, using open habitats as well as gardens. It is a different species from the monarch butterfly famous for migrating across North America.",
    descriptionSourceIds: [
      "chrysippus-zoo",
      "chrysippus-museum",
      "chrysippus-wikipedia",
    ],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Danaus_chrysippus",
    habitat:
      "Open country, including savanna and dry habitats, and gardens within its broad range.",
    stats: [
      {
        label: "Wingspan",
        value: "About 5–7 cm in the Florida Museum’s account",
        sourceIds: ["chrysippus-museum"],
      },
      {
        label: "Lifespan",
        value:
          "Wild average not established here; adult and total-life estimates differ",
        sourceIds: ["chrysippus-zoo", "chrysippus-genetics"],
      },
      {
        label: "Lives",
        value: "Adults can gather to rest, as observed in India",
        sourceIds: ["chrysippus-roosting"],
      },
      {
        label: "Diet",
        value: "Adults: nectar; caterpillars: host-plant leaves",
        sourceIds: ["chrysippus-zoo"],
      },
      {
        label: "Range",
        value: "Much of Africa, with populations farther east into Asia",
        sourceIds: ["chrysippus-museum"],
      },
      {
        label: "Active",
        value: "During the day",
        sourceIds: ["chrysippus-zoo"],
      },
    ],
    questions: [
      quiz(
        "What does an adult African monarch drink from flowers?",
        ["Mud", "Nectar", "Tree bark"],
        "b",
        "Nectar is the sweet liquid that adult African monarchs obtain from flowers.",
        ["chrysippus-zoo"],
      ),
      quiz(
        "Which young animal grows into this butterfly?",
        ["A caterpillar", "A tadpole", "A chick"],
        "a",
        "Its young stage is a caterpillar. A pupa comes between the caterpillar and the winged adult.",
        ["chrysippus-zoo", "chrysippus-wikipedia"],
      ),
      quiz(
        "When is this butterfly normally active?",
        ["Only during snowstorms", "Only at midnight", "During the day"],
        "c",
        "African monarchs are daytime butterflies. That is when they can visit flowers for nectar.",
        ["chrysippus-zoo"],
      ),
    ],
    sources: [
      {
        id: "chrysippus-zoo",
        title: "Welsh Mountain Zoo: African monarch",
        url: "https://www.welshmountainzoo.org/zoo-features/african-monarch-danaus-chrysippus/",
      },
      {
        id: "chrysippus-museum",
        title: "Florida Museum: Plain tiger",
        url: "https://www.floridamuseum.ufl.edu/exhibits/butterflies/plain-tiger/",
      },
      {
        id: "chrysippus-roosting",
        title:
          "Kerala Forest Research Institute report 220: Butterfly gardening and danaine aggregations",
        url: "https://docs.kfri.res.in/xxxxKFRI-RR/KFRI-RR220.pdf",
      },
      {
        id: "chrysippus-genetics",
        title:
          "A neo-W chromosome in a tropical butterfly links colour pattern, male-killing, and speciation",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4971206/",
      },
      {
        id: "chrysippus-wikipedia",
        title:
          "Wikipedia: Danaus chrysippus (supplementary appearance and habitat reference)",
        url: "https://en.wikipedia.org/wiki/Danaus_chrysippus",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "desert-locust",
    name: "Desert locust",
    scientificName: "Schistocerca gregaria",
    group: "Insect",
    aliases: ["locust", "desert grasshopper"],
    summary:
      "A desert locust is a grasshopper that can change from a solitary way of life to joining a swarm.",
    description:
      "Desert locusts have strong back legs for jumping. Their young, called hoppers, do not yet have wings for flight. Adults do. At low numbers these insects can live separately, but crowded conditions can lead to groups of hoppers and flying swarms. They feed on plants, and rain helps provide both new greenery and moist ground for eggs. Their usual home is dry country around deserts; they may reach grasslands and farms during outbreaks, rather than living in every savanna.",
    descriptionSourceIds: ["gregaria-faq", "gregaria-fao", "gregaria-chester"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Desert_locust",
    habitat:
      "Arid and semi-arid country and its grassy margins; swarms can travel beyond the usual range.",
    stats: [
      {
        label: "Adult length",
        value: "About 5–9 cm, from head to wing tip; females are larger",
        sourceIds: ["gregaria-chester"],
      },
      {
        label: "Lifespan",
        value: "About 3–5 months in nature, strongly affected by conditions",
        sourceIds: ["gregaria-faq"],
      },
      {
        label: "Lives",
        value: "Separately at low density, or in groups and swarms",
        sourceIds: ["gregaria-faq"],
      },
      {
        label: "Diet",
        value: "Green plant material",
        sourceIds: ["gregaria-fao"],
      },
      {
        label: "Range",
        value:
          "Dry Africa, the Near East and southwestern Asia; broader during plagues",
        sourceIds: ["gregaria-fao"],
      },
      {
        label: "Growing up",
        value: "Egg, wingless hopper, winged adult",
        sourceIds: ["gregaria-faq"],
      },
    ],
    questions: [
      quiz(
        "Which legs are especially strong for jumping?",
        ["The back legs", "The antennae", "The wings"],
        "a",
        "A locust’s large back legs help it jump. Adult wings also allow it to fly.",
        ["gregaria-faq"],
      ),
      quiz(
        "What is a young locust without flying wings called?",
        ["A chick", "A pupa", "A hopper"],
        "c",
        "A hopper is a young locust. It grows through several stages before becoming a winged adult.",
        ["gregaria-faq"],
      ),
      quiz(
        "What can happen when desert locusts become crowded together?",
        [
          "They turn into butterflies",
          "They can form groups and swarms",
          "They grow fur",
        ],
        "b",
        "Crowding can lead to the group-living phase: young locusts form bands and adults can form flying swarms.",
        ["gregaria-chester"],
      ),
    ],
    sources: [
      {
        id: "gregaria-faq",
        title: "FAO Locust Watch: Frequently asked questions about locusts",
        url: "https://www.fao.org/locust-watch/resources/frequently-asked-questions-%28faqs%29-about-locusts/",
      },
      {
        id: "gregaria-fao",
        title: "FAO: Desert locust biology and range",
        url: "https://www.fao.org/locusts/en/",
      },
      {
        id: "gregaria-chester",
        title: "Chester Zoo: Desert locust",
        url: "https://www.chesterzoo.org/animals/desert-locust",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "cape-porcupine",
    name: "Cape porcupine",
    scientificName: "Hystrix africaeaustralis",
    group: "Rodent",
    aliases: ["porcupine", "Cape crested porcupine", "South African porcupine"],
    summary:
      "This large ground-dwelling rodent searches for plant food at night and wears a coat of long quills.",
    description:
      "A Cape porcupine’s long black-and-white quills are modified hairs. When threatened, it raises them and may rattle its tail, but it cannot shoot quills at an attacker. Mostly active at night, it digs for roots, bulbs and tubers, and also eats other plant parts. During the day it rests in a den or another sheltered place. Adults may live as a pair with their young. Savanna is one of several habitats it uses in central and southern Africa.",
    descriptionSourceIds: ["porcupine-adw", "porcupine-la", "porcupine-perth"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Cape_porcupine",
    habitat:
      "Savanna, scrub and other vegetated habitats with burrows, rocks or similar daytime shelter.",
    stats: [
      {
        label: "Body length",
        value: "About 63–81 cm",
        sourceIds: ["porcupine-perth"],
      },
      {
        label: "Lifespan",
        value: "Reported 12–15 years in the wild; up to 21 in human care",
        sourceIds: ["porcupine-la"],
      },
      {
        label: "Lives",
        value: "Alone, in pairs or in small family groups",
        sourceIds: ["porcupine-adw", "porcupine-la"],
      },
      {
        label: "Diet",
        value: "Mostly roots, tubers, bulbs, fruit and bark",
        sourceIds: ["porcupine-adw"],
      },
      {
        label: "Range",
        value: "Central and southern Africa",
        sourceIds: ["porcupine-la"],
      },
      {
        label: "Active",
        value: "Mostly at night",
        sourceIds: ["porcupine-adw"],
      },
    ],
    questions: [
      quiz(
        "What are a porcupine’s quills made from?",
        ["Little branches", "Modified hairs", "Feathers"],
        "b",
        "Quills are stiff, modified hairs. They form part of the porcupine’s protective coat.",
        ["porcupine-la"],
      ),
      quiz(
        "When does a Cape porcupine usually search for food?",
        ["Only at midday", "Only when it snows", "At night"],
        "c",
        "Cape porcupines are mostly nocturnal: they feed at night and rest in shelter during the day.",
        ["porcupine-adw"],
      ),
      quiz(
        "Which food might a Cape porcupine dig up?",
        ["Roots and tubers", "Flying moths", "River fish"],
        "a",
        "Strong digging claws help it find roots, bulbs and tubers below the ground.",
        ["porcupine-adw"],
      ),
    ],
    sources: [
      {
        id: "porcupine-adw",
        title:
          "University of Michigan Animal Diversity Web: Hystrix africaeaustralis",
        url: "https://animaldiversity.org/accounts/Hystrix_africaeaustralis/",
      },
      {
        id: "porcupine-la",
        title: "Los Angeles Zoo: Cape porcupine",
        url: "https://lazoo.org/explore-your-zoo/our-animals/mammals/cape-porcupine/",
      },
      {
        id: "porcupine-perth",
        title: "Perth Zoo: Cape porcupine",
        url: "https://perthzoo.wa.gov.au/animal/cape-porcupine",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "south-african-springhare",
    name: "South African springhare",
    scientificName: "Pedetes capensis",
    group: "Rodent",
    aliases: ["springhare", "spring hare", "South African spring hare"],
    summary:
      "This nocturnal rodent hops on long hind legs and shelters in burrows beneath open southern African grassland.",
    description:
      "A springhare has long back legs, short front legs and a long, furry tail with a dark tip. It may remind you of a tiny kangaroo, but it is a rodent. At night it leaves its burrow to eat grasses and other plant food. Deep sandy soil lets it dig shelter, while short grass provides feeding space. It can forage near other springhares without staying in a permanent group. This southern African species is distinct from the East African springhare.",
    descriptionSourceIds: ["springhare-assessment", "springhare-adw"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/South_African_springhare",
    habitat:
      "Open, short grassland in dry southern Africa, where sandy soil allows burrowing.",
    stats: [
      {
        label: "Body length",
        value: "About 35–45 cm, plus a long tail",
        sourceIds: ["springhare-adw"],
      },
      {
        label: "Lifespan",
        value: "Care record: 20 years; wild average unknown here",
        sourceIds: ["springhare-anage"],
      },
      {
        label: "Lives",
        value: "Burrows alone or with a young one; may forage in loose groups",
        sourceIds: ["springhare-assessment"],
      },
      {
        label: "Diet",
        value: "Grasses, seeds and other plant parts",
        sourceIds: ["springhare-assessment"],
      },
      {
        label: "Range",
        value: "Southern Africa, including Namibia, Botswana and South Africa",
        sourceIds: ["springhare-assessment"],
      },
      {
        label: "Active",
        value: "Mostly at night",
        sourceIds: ["springhare-adw"],
      },
    ],
    questions: [
      quiz(
        "Which animal group does a springhare belong to?",
        ["Rodents", "Birds", "Lizards"],
        "a",
        "A springhare is a rodent, even though its name sounds like hare and its hopping can look kangaroo-like.",
        ["springhare-assessment"],
      ),
      quiz(
        "Where does it usually shelter during the day?",
        ["In a bird’s nest", "In an underground burrow", "Underwater"],
        "b",
        "It digs tunnels and shelters underground during the day, then comes out mostly at night.",
        ["springhare-adw"],
      ),
      quiz(
        "Which body parts power a springhare’s hops?",
        ["Its ears", "Its front paws alone", "Its long back legs"],
        "c",
        "Its long, strong hind legs are suited to hopping across the ground.",
        ["springhare-adw"],
      ),
    ],
    sources: [
      {
        id: "springhare-assessment",
        title:
          "SANBI and Endangered Wildlife Trust: A conservation assessment of Pedetes capensis (2016)",
        url: "https://ewt.org/wp-content/uploads/2022/11/51.-Springhare-Pedetes-capensis_LC.pdf",
      },
      {
        id: "springhare-adw",
        title:
          "University of Michigan Animal Diversity Web: Pedetes capensis (anatomy and behavior)",
        url: "https://animaldiversity.org/accounts/Pedetes_capensis/",
      },
      {
        id: "springhare-anage",
        title: "AnAge: Pedetes capensis longevity record",
        url: "https://genomics.senescence.info/species/entry.php?species=Pedetes_capensis",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "striped-grass-mouse",
    name: "Striped grass mouse",
    scientificName: "Lemniscomys striatus",
    group: "Rodent",
    aliases: ["typical striped grass mouse", "striped mouse", "grass mouse"],
    summary:
      "Pale lines and rows of spots run along this small mouse’s brown back as it moves among grasses.",
    description:
      "Look closely at this mouse’s back: light stripes and rows of pale spots run along its dark brown coat. It lives in grassy and bushy habitats, including savanna, across parts of Africa. Seeds and other plant food make up its meals, with insects also on the menu. It builds a nest for its young on the ground or among shrubs. Several related striped mice look similar, so this profile refers specifically to Lemniscomys striatus, the typical striped grass mouse.",
    descriptionSourceIds: [
      "grass-mouse-prague",
      "grass-mouse-wikipedia",
      "grass-mouse-diet",
    ],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Typical_striped_grass_mouse",
    habitat:
      "Savanna, grassland and bushy vegetation, rather than every type of African grassland.",
    stats: [
      {
        label: "Body length",
        value: "About 9–14 cm; the tail adds roughly another body length",
        sourceIds: ["grass-mouse-prague"],
      },
      {
        label: "Lifespan",
        value: "Care record: 4.8 years; wild lives are usually much shorter",
        sourceIds: ["grass-mouse-anage", "grass-mouse-prague"],
      },
      {
        label: "Lives",
        value:
          "Ground or shrub nests; wild social grouping uncertain in reviewed sources",
        sourceIds: ["grass-mouse-prague"],
      },
      {
        label: "Diet",
        value: "Seeds and other plant parts, plus some insects",
        sourceIds: ["grass-mouse-diet"],
      },
      {
        label: "Range",
        value: "Parts of western, central and eastern Africa",
        sourceIds: ["grass-mouse-wikipedia"],
      },
      {
        label: "Coat",
        value: "Brown with pale stripes and rows of spots",
        sourceIds: ["grass-mouse-prague"],
      },
    ],
    questions: [
      quiz(
        "Which pattern can you find on this mouse’s back?",
        [
          "Large zebra-like black bands only",
          "Pale stripes and rows of spots",
          "A solid bright blue coat",
        ],
        "b",
        "Its brown back has light lengthwise stripes and rows of pale spots.",
        ["grass-mouse-prague"],
      ),
      quiz(
        "Which meal suits a striped grass mouse?",
        ["Only fish", "Only tree bark", "Seeds, plant parts and some insects"],
        "c",
        "It eats plant foods such as seeds, and insects can be part of its diet too.",
        ["grass-mouse-diet"],
      ),
      quiz(
        "Which habitat can this species use?",
        ["Savanna with grasses and bushes", "The open ocean", "An ice sheet"],
        "a",
        "This species uses grassy and bushy places, including savanna, within its African range.",
        ["grass-mouse-wikipedia"],
      ),
    ],
    sources: [
      {
        id: "grass-mouse-prague",
        title:
          "Prague Zoo: Myš páskovaná — Lemniscomys striatus (Czech species account)",
        url: "https://www.zoopraha.cz/zvirata-a-expozice/lexikon-zvirat/44-tiskoviny?d=418-mys-paskovana&start=",
      },
      {
        id: "grass-mouse-anage",
        title: "AnAge: Lemniscomys striatus longevity record",
        url: "https://genomics.senescence.info/species/entry.php?species=Lemniscomys_striatus",
      },
      {
        id: "grass-mouse-diet",
        title:
          "African Journal of Ecology: Seasonal changes in reproduction, diet and body composition of two equatorial rodents",
        url: "https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1365-2028.1975.tb00136.x",
      },
      {
        id: "grass-mouse-wikipedia",
        title:
          "Wikipedia: Typical striped grass mouse (supplementary range and identification reference)",
        url: "https://en.wikipedia.org/wiki/Typical_striped_grass_mouse",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "naked-mole-rat",
    name: "Naked mole-rat",
    scientificName: "Heterocephalus glaber",
    group: "Rodent",
    aliases: ["naked mole rat", "mole rat", "mole-rat"],
    summary:
      "This nearly hairless rodent lives with a colony beneath dry eastern African grasslands and digs with its front teeth.",
    description:
      "The grassland has a hidden neighborhood below it. Naked mole-rats live in branching tunnels, where they find underground plant food such as tubers. Their large front teeth do the digging, and their lips can close behind those teeth to keep soil out. They have wrinkled skin, tiny eyes and a few useful sensory hairs. A colony shares work such as finding food and caring for young, while one breeding female, called the queen, is the mother of the colony’s pups.",
    descriptionSourceIds: [
      "mole-rat-smithsonian",
      "mole-rat-biology",
      "mole-rat-queen",
    ],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Naked_mole-rat",
    habitat:
      "Underground tunnels beneath semi-arid grassy regions of eastern Africa; not an open-surface forager.",
    stats: [
      {
        label: "Body length",
        value: "Usually about 7.5 cm",
        sourceIds: ["mole-rat-smithsonian"],
      },
      {
        label: "Lifespan",
        value:
          "Over 30 years recorded in human care; wild average uncertain here",
        sourceIds: ["mole-rat-care"],
      },
      {
        label: "Lives",
        value: "Colonies with a breeding queen and many helpers",
        sourceIds: ["mole-rat-queen"],
      },
      {
        label: "Diet",
        value: "Underground plant parts, especially tubers",
        sourceIds: ["mole-rat-smithsonian"],
      },
      {
        label: "Range",
        value: "Ethiopia, Kenya, Djibouti and Somalia",
        sourceIds: ["mole-rat-smithsonian"],
      },
      {
        label: "Digging tool",
        value: "Large front teeth",
        sourceIds: ["mole-rat-smithsonian"],
      },
    ],
    questions: [
      quiz(
        "Where do naked mole-rats find their food?",
        [
          "High in tree branches",
          "On the ocean floor",
          "In underground tunnels",
        ],
        "c",
        "They search underground for plant parts such as tubers, rather than going above ground to forage.",
        ["mole-rat-biology"],
      ),
      quiz(
        "What do they use to dig through the soil?",
        ["Their large front teeth", "A pair of horns", "Their ears"],
        "a",
        "Their strong front teeth break through soil. Lips close behind the teeth to help keep dirt out.",
        ["mole-rat-smithsonian"],
      ),
      quiz(
        "How does a naked mole-rat colony care for its young?",
        [
          "Each pup lives alone",
          "A queen has the pups and other colony members help",
          "Birds raise the pups",
        ],
        "b",
        "One female, the queen, produces the pups. Other members of the colony help with food and care.",
        ["mole-rat-queen"],
      ),
    ],
    sources: [
      {
        id: "mole-rat-smithsonian",
        title: "Smithsonian’s National Zoo: Naked mole-rat",
        url: "https://nationalzoo.si.edu/animals/naked-mole-rat",
      },
      {
        id: "mole-rat-biology",
        title: "Naked Mole Rat: Biology and underground feeding",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7149588/",
      },
      {
        id: "mole-rat-care",
        title: "Smithsonian: Building a naked mole-rat dream home",
        url: "https://www.si.edu/stories/naked-mole-rat-dream-home",
      },
      {
        id: "mole-rat-queen",
        title:
          "Smithsonian: Scientists uncover milk composition of naked mole-rat queens",
        url: "https://insider.si.edu/2014/03/secret-formula-feeding-900-babies-scientists-uncover-milk-composition-naked-mole-rat-queens/",
      },
    ],
    reviewedAt: "2026-09-20",
  },
];
