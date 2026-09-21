import type { SavannaProfile } from "./savanna-profile";

// Questions progress from spotting a feature, to understanding, to making a connection.
export const birdProfiles: SavannaProfile[] = [
  {
    id: "secretarybird",
    name: "Secretarybird",
    scientificName: "Sagittarius serpentarius",
    group: "Bird",
    aliases: ["secretary bird"],
    summary:
      "A long-legged bird of prey that searches the grass for food on foot.",
    description:
      "A secretarybird looks like a bird of prey wearing very long stilts. Its grey body, black thigh feathers and loose crest make a striking outline above the grass. It walks across open savanna looking for insects, small mammals and reptiles, and can strike prey with powerful feet. Walking does not mean it cannot fly: it returns to trees to rest and nest. Adults often travel as a pair or a small family, keeping an eye on their shared territory.",
    descriptionSourceIds: ["secretary-wiki", "secretary-sdz"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Secretarybird",
    habitat: "Open grassland and savanna with scattered trees",
    stats: [
      {
        label: "Height",
        value: "About 1.2–1.5 m",
        sourceIds: ["secretary-sdz"],
      },
      {
        label: "Wingspan",
        value: "About 2.1 m",
        sourceIds: ["secretary-sdz"],
      },
      {
        label: "Life span",
        value: "Estimated 10–15 years in the wild; up to 19 in zoos",
        sourceIds: ["secretary-wiki", "secretary-sdz"],
      },
      {
        label: "Lives",
        value: "Usually in pairs or small family groups",
        sourceIds: ["secretary-sdz"],
      },
      {
        label: "Diet",
        value: "Insects, small mammals, reptiles and other small animals",
        sourceIds: ["secretary-sdz"],
      },
      {
        label: "Range",
        value:
          "Sub-Saharan Africa, from Senegal to Somalia and south to South Africa",
        sourceIds: ["secretary-sdz"],
      },
    ],
    questions: [
      {
        prompt: "Which feature helps you spot a secretarybird?",
        choices: [
          {
            id: "legs",
            text: "Very long legs and a dark crest",
          },
          {
            id: "pouch",
            text: "A huge throat pouch",
          },
          {
            id: "spots",
            text: "White spots all over a round body",
          },
        ],
        correctId: "legs",
        explanation:
          "Its long legs, grey body and dark head feathers make a distinctive outline.",
        sourceIds: ["secretary-wiki"],
      },
      {
        prompt: "How does a secretarybird usually search for food?",
        choices: [
          {
            id: "diving",
            text: "Diving underwater",
          },
          {
            id: "walking",
            text: "Walking through the grass",
          },
          {
            id: "nectar",
            text: "Sipping nectar from flowers",
          },
        ],
        correctId: "walking",
        explanation: "It hunts on foot and can stamp on prey with its feet.",
        sourceIds: ["secretary-sdz"],
      },
      {
        prompt: "Which place offers both hunting space and a night-time roost?",
        choices: [
          {
            id: "cave",
            text: "A deep cave",
          },
          {
            id: "ocean",
            text: "The open ocean",
          },
          {
            id: "savanna",
            text: "Short grass with scattered trees",
          },
        ],
        correctId: "savanna",
        explanation:
          "Open grass suits its ground hunt, while trees provide places to roost.",
        sourceIds: ["secretary-wiki", "secretary-sdz"],
      },
    ],
    sources: [
      {
        id: "secretary-sdz",
        title: "San Diego Zoo Wildlife Alliance — Secretary Bird",
        url: "https://animals.sandiegozoo.org/animals/secretary-bird",
      },
      {
        id: "secretary-wiki",
        title: "Wikipedia — Secretarybird (supplemental)",
        url: "https://en.wikipedia.org/wiki/Secretarybird",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "lilac-breasted-roller",
    name: "Lilac-breasted roller",
    scientificName: "Coracias caudatus",
    group: "Bird",
    aliases: ["lilac breasted roller", "roller"],
    summary:
      "A colourful perch hunter that watches for small prey before swooping down.",
    description:
      "A lilac-breasted roller brings a patch of purple and blue to the savanna. Adults have a lilac chest and long outer tail feathers that trail behind them. A high branch makes a useful lookout: the bird waits, spots a small animal and swoops down to catch it. Insects, lizards and frogs can become a meal. Rollers live alone or in pairs and defend their patch. Their rolling, diving display flights help explain their unusual name.",
    descriptionSourceIds: [
      "roller-wiki",
      "roller-london",
      "roller-cologne",
      "roller-cornell",
    ],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Lilac-breasted_roller",
    habitat: "Savanna and open woodland with lookout perches",
    stats: [
      {
        label: "Length",
        value: "About 36 cm, including the tail",
        sourceIds: ["roller-cologne", "roller-wiki"],
      },
      {
        label: "Wingspan",
        value: "About 50–58 cm",
        sourceIds: ["roller-wiki"],
      },
      {
        label: "Life span",
        value:
          "Nearly 14 years recorded in care; wild lifespan not established here",
        sourceIds: ["roller-anage"],
      },
      {
        label: "Lives",
        value: "Alone or in territorial pairs",
        sourceIds: ["roller-cologne"],
      },
      {
        label: "Diet",
        value: "Insects and small animals, including lizards and frogs",
        sourceIds: ["roller-london"],
      },
      {
        label: "Range",
        value: "Eastern and southern Africa",
        sourceIds: ["roller-wiki"],
      },
    ],
    questions: [
      {
        prompt: "Which colours help name this roller?",
        choices: [
          {
            id: "lilac",
            text: "A lilac-purple chest",
          },
          {
            id: "orange",
            text: "An entirely orange body",
          },
          {
            id: "white",
            text: "A completely white body",
          },
        ],
        correctId: "lilac",
        explanation:
          "Its adult chest is lilac, with blue tones elsewhere in its plumage.",
        sourceIds: ["roller-wiki", "roller-cornell"],
      },
      {
        prompt: "Why does a roller wait on a high branch?",
        choices: [
          {
            id: "sleep",
            text: "It can only sleep above the ground",
          },
          {
            id: "lookout",
            text: "It can watch for prey below",
          },
          {
            id: "leaves",
            text: "It eats only tree leaves",
          },
        ],
        correctId: "lookout",
        explanation: "It watches from a perch, then swoops toward small prey.",
        sourceIds: ["roller-london"],
      },
      {
        prompt:
          "Which meal links a roller to the small animals of the grassland?",
        choices: [
          {
            id: "grass",
            text: "A bundle of grass",
          },
          {
            id: "fruit",
            text: "Only fallen fruit",
          },
          {
            id: "insect",
            text: "An insect or a small lizard",
          },
        ],
        correctId: "insect",
        explanation:
          "Rollers are hunters; insects and small vertebrates are part of their diet.",
        sourceIds: ["roller-london", "roller-cologne"],
      },
    ],
    sources: [
      {
        id: "roller-london",
        title: "ZSL London Zoo — Lilac-breasted roller",
        url: "https://www.londonzoo.org/whats-here/animals/lilac-breasted-roller",
      },
      {
        id: "roller-cornell",
        title:
          "Cornell Lab of Ornithology — Lilac-breasted Roller identification",
        url: "https://ebird.org/species/librol2",
      },
      {
        id: "roller-cologne",
        title: "Cologne Zoo — Gabelracke",
        url: "https://koelnerzoo.de/component/advportfoliopro/project/50-gabelracke?Itemid=368&catid=107%3Atiere",
      },
      {
        id: "roller-anage",
        title: "AnAge — Coracias caudatus longevity record",
        url: "https://genomics.senescence.info/species/entry.php?species=Coracias_caudatus",
      },
      {
        id: "roller-wiki",
        title: "Wikipedia — Lilac-breasted roller (supplemental)",
        url: "https://en.wikipedia.org/wiki/Lilac-breasted_roller",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "southern-ground-hornbill",
    name: "Southern ground hornbill",
    scientificName: "Bucorvus leadbeateri",
    group: "Bird",
    aliases: ["ground hornbill", "southern ground-hornbill"],
    summary:
      "A large ground-hunting bird whose family helpers help raise the next chick.",
    description:
      "A southern ground hornbill strides through short grass on sturdy legs. Its black feathers contrast with bare red skin around the face and throat, while white wing feathers show when it flies. A strong bill helps it catch insects, reptiles and other small animals. Family life is a team effort: a breeding pair has helpers that bring food to the young. Large tree hollows provide nesting places, so this ground hunter still needs trees in its home.",
    descriptionSourceIds: ["hornbill-cornell", "hornbill-mabula"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Southern_ground_hornbill",
    habitat: "Savanna, grassland and open woodland with large nest trees",
    stats: [
      {
        label: "Height",
        value: "About 90–100 cm",
        sourceIds: ["hornbill-sdz"],
      },
      {
        label: "Life span",
        value: "Up to 40 years reported in the wild",
        sourceIds: ["hornbill-mabula"],
      },
      {
        label: "Lives",
        value:
          "Family groups, often 4–5 birds, with a breeding pair and helpers",
        sourceIds: ["hornbill-mabula"],
      },
      {
        label: "Diet",
        value: "Insects, reptiles, frogs and other small animals",
        sourceIds: ["hornbill-mabula"],
      },
      {
        label: "Range",
        value: "Eastern and southern Africa",
        sourceIds: ["hornbill-mabula", "hornbill-wiki"],
      },
    ],
    questions: [
      {
        prompt:
          "Which colour stands out on an adult southern ground hornbill's face?",
        choices: [
          {
            id: "blue",
            text: "Bright blue",
          },
          {
            id: "red",
            text: "Red",
          },
          {
            id: "striped",
            text: "Black-and-white stripes",
          },
        ],
        correctId: "red",
        explanation:
          "Adults have bare red facial skin against mostly black feathers.",
        sourceIds: ["hornbill-cornell"],
      },
      {
        prompt: "Who helps the breeding pair feed a chick?",
        choices: [
          {
            id: "helpers",
            text: "Other birds in its family group",
          },
          {
            id: "zebras",
            text: "Nearby zebras",
          },
          {
            id: "alone",
            text: "No one; the chick always feeds itself",
          },
        ],
        correctId: "helpers",
        explanation: "Non-breeding group members help care for the chick.",
        sourceIds: ["hornbill-mabula"],
      },
      {
        prompt: "Why do old trees matter to this ground-hunting bird?",
        choices: [
          {
            id: "leaves",
            text: "Leaves are its only food",
          },
          {
            id: "shade",
            text: "It never leaves their branches",
          },
          {
            id: "nest",
            text: "Large hollows can hold its nest",
          },
        ],
        correctId: "nest",
        explanation:
          "It feeds mainly on the ground but often nests in a large tree cavity.",
        sourceIds: ["hornbill-mabula"],
      },
    ],
    sources: [
      {
        id: "hornbill-mabula",
        title: "Mabula Ground Hornbill Project — Ground-hornbill 101",
        url: "https://ground-hornbill.org.za/ground-hornbill-101/",
      },
      {
        id: "hornbill-cornell",
        title:
          "Cornell Lab of Ornithology — Southern Ground-Hornbill identification",
        url: "https://ebird.org/species/soghor1",
      },
      {
        id: "hornbill-sdz",
        title:
          "San Diego Zoo Wildlife Alliance — Hornbill (species-specific size)",
        url: "https://animals.sandiegozoo.org/animals/hornbill",
      },
      {
        id: "hornbill-wiki",
        title: "Wikipedia — Southern ground hornbill (supplemental)",
        url: "https://en.wikipedia.org/wiki/Southern_ground_hornbill",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "helmeted-guineafowl",
    name: "Helmeted guineafowl",
    scientificName: "Numida meleagris",
    group: "Bird",
    aliases: ["helmeted guinea fowl", "guineafowl", "guinea fowl"],
    summary:
      "A spotted ground bird that forages in noisy flocks and sleeps above the ground.",
    description:
      "A helmeted guineafowl has a rounded body sprinkled with white spots and a small, mostly bare head. The hard bump on top is called a casque, like a little helmet. During the day, flocks search the ground for seeds, insects and other food, calling to one another as they move. They can fly, even though they spend much of their time walking. At night they roost in trees or shrubs. Their young chicks are called keets.",
    descriptionSourceIds: ["guinea-adw", "guinea-indy"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Helmeted_guineafowl",
    habitat: "Savanna, grassland and other open places near water",
    stats: [
      {
        label: "Length",
        value: "About 60 cm",
        sourceIds: ["guinea-indy"],
      },
      {
        label: "Life span",
        value: "8 years reported in zoos; wild estimates vary",
        sourceIds: ["guinea-mulhouse", "guinea-adw"],
      },
      {
        label: "Lives",
        value: "Flocks that can include up to 100 birds",
        sourceIds: ["guinea-indy"],
      },
      {
        label: "Diet",
        value: "Seeds and other plant food, insects and small animals",
        sourceIds: ["guinea-indy"],
      },
      {
        label: "Native range",
        value: "Sub-Saharan Africa; also introduced elsewhere",
        sourceIds: ["guinea-indy", "guinea-wiki"],
      },
    ],
    questions: [
      {
        prompt: "What gives a helmeted guineafowl its name?",
        choices: [
          {
            id: "bump",
            text: "The hard casque on its head",
          },
          {
            id: "tail",
            text: "A helmet-shaped tail",
          },
          {
            id: "nest",
            text: "A stone helmet it carries",
          },
        ],
        correctId: "bump",
        explanation: "Both males and females have a bony casque on the head.",
        sourceIds: ["guinea-indy"],
      },
      {
        prompt: "What is a guineafowl likely to eat on the ground?",
        choices: [
          {
            id: "nectar",
            text: "Only flower nectar",
          },
          {
            id: "seeds",
            text: "Seeds and insects",
          },
          {
            id: "fish",
            text: "Only deep-sea fish",
          },
        ],
        correctId: "seeds",
        explanation: "Guineafowl eat both plant food and small animals.",
        sourceIds: ["guinea-indy"],
      },
      {
        prompt: "How can a guineafowl's alarm call help its flock?",
        choices: [
          {
            id: "colour",
            text: "It changes the colour of its feathers",
          },
          {
            id: "digging",
            text: "It digs a new nest in the ground",
          },
          {
            id: "warning",
            text: "It warns other birds of danger",
          },
        ],
        correctId: "warning",
        explanation:
          "The birds watch and listen for danger, then call to alert others.",
        sourceIds: ["guinea-adw"],
      },
    ],
    sources: [
      {
        id: "guinea-indy",
        title: "Indianapolis Zoo — Helmeted Guinea Fowl",
        url: "https://www.indianapoliszoo.com/animals/helmeted-guinea-fowl/",
      },
      {
        id: "guinea-adw",
        title: "University of Michigan Animal Diversity Web — Numida meleagris",
        url: "https://animaldiversity.org/accounts/Numida_meleagris/",
      },
      {
        id: "guinea-mulhouse",
        title: "Mulhouse Zoo — Helmeted guineafowl",
        url: "https://www.zoo-mulhouse.com/en/le-parc/animaux/helmeted-guineafowl/",
      },
      {
        id: "guinea-wiki",
        title: "Wikipedia — Helmeted guineafowl (supplemental)",
        url: "https://en.wikipedia.org/wiki/Helmeted_guineafowl",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "grey-crowned-crane",
    name: "Grey crowned crane",
    scientificName: "Balearica regulorum",
    group: "Bird",
    aliases: ["gray crowned crane", "grey-crowned crane", "crowned crane"],
    summary:
      "A tall crane with a golden crown that feeds in grasslands and wetlands.",
    description:
      "A fan of stiff golden feathers makes the grey crowned crane easy to recognise. Its long legs carry a grey body with bright wing panels and a red throat pouch. It searches grassland and wet places for plant food, insects and other small animals. Pairs strengthen their bond with dances and can join larger flocks. Unlike most cranes, it can grip branches with a long back toe and roost in trees. Wetlands and nearby grasslands both belong in its story.",
    descriptionSourceIds: ["crane-chester", "crane-adw"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Grey_crowned_crane",
    habitat: "Wetlands, grasslands and savanna",
    stats: [
      {
        label: "Height",
        value: "About 1 m",
        sourceIds: ["crane-chester"],
      },
      {
        label: "Wingspan",
        value: "About 1.8–2 m",
        sourceIds: ["crane-adw"],
      },
      {
        label: "Life span",
        value: "Up to 22 years in the wild and 25 in care reported",
        sourceIds: ["crane-adw"],
      },
      {
        label: "Lives",
        value: "Bonded pairs, also gathering in flocks",
        sourceIds: ["crane-chester"],
      },
      {
        label: "Diet",
        value: "Plant food, insects, frogs and other small animals",
        sourceIds: ["crane-chester"],
      },
      {
        label: "Range",
        value: "Eastern and southern Africa",
        sourceIds: ["crane-adw", "crane-chester"],
      },
    ],
    questions: [
      {
        prompt: "What forms the crane's golden crown?",
        choices: [
          {
            id: "horn",
            text: "One solid horn",
          },
          {
            id: "feathers",
            text: "A spray of stiff feathers",
          },
          {
            id: "leaves",
            text: "Leaves it collects",
          },
        ],
        correctId: "feathers",
        explanation:
          "The crown is made of golden feathers, not a horn or decoration.",
        sourceIds: ["crane-chester"],
      },
      {
        prompt: "What helps this crane perch in a tree?",
        choices: [
          {
            id: "toe",
            text: "A long back toe that grips a branch",
          },
          {
            id: "bill",
            text: "A sticky bill",
          },
          {
            id: "tail",
            text: "A tail that wraps like a monkey's",
          },
        ],
        correctId: "toe",
        explanation:
          "Its long hind toe lets it grip branches, unlike most cranes.",
        sourceIds: ["crane-adw"],
      },
      {
        prompt:
          "Which pair of habitats gives this crane useful feeding places?",
        choices: [
          {
            id: "ice",
            text: "Ice sheets and deep ocean",
          },
          {
            id: "caves",
            text: "Dark caves and bare rock",
          },
          {
            id: "wetland",
            text: "Wetlands and nearby grasslands",
          },
        ],
        correctId: "wetland",
        explanation:
          "It feeds in wet areas and grasslands, eating plants and small animals.",
        sourceIds: ["crane-chester", "crane-adw"],
      },
    ],
    sources: [
      {
        id: "crane-chester",
        title: "Chester Zoo — Grey crowned crane",
        url: "https://www.chesterzoo.org/animals/grey-crowned-crane",
      },
      {
        id: "crane-adw",
        title:
          "University of Michigan Animal Diversity Web — Balearica regulorum",
        url: "https://animaldiversity.org/accounts/Balearica_regulorum/",
      },
      {
        id: "crane-wiki",
        title: "Wikipedia — Grey crowned crane (supplemental)",
        url: "https://en.wikipedia.org/wiki/Grey_crowned_crane",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "white-backed-vulture",
    name: "White-backed vulture",
    scientificName: "Gyps africanus",
    group: "Bird",
    aliases: ["African white-backed vulture", "white backed vulture"],
    summary:
      "A broad-winged scavenger that finds food by soaring over the savanna.",
    description:
      "A white-backed vulture has a small, sparsely feathered head, a hooked bill and broad wings. The pale patch on its back is easiest to see when those wings open. It searches from the air for carrion, which means animals that have already died. Rising warm air helps it glide over long distances, and other vultures can lead it to a meal. These social birds gather at food and roosts. By eating animal remains, they take part in the savanna's cleanup.",
    descriptionSourceIds: [
      "vulture-ueno",
      "vulture-emerald",
      "vulture-cleveland",
    ],
    wikipediaUrl: "https://en.wikipedia.org/wiki/White-backed_vulture",
    habitat: "Open grasslands, savanna and woodland",
    stats: [
      {
        label: "Length",
        value: "About 78–90 cm",
        sourceIds: ["vulture-ueno"],
      },
      {
        label: "Wingspan",
        value: "Up to about 2.3 m",
        sourceIds: ["vulture-emerald"],
      },
      {
        label: "Life span",
        value:
          "Records of about 19 years wild and 20 years in care; not averages",
        sourceIds: ["vulture-anage"],
      },
      {
        label: "Lives",
        value: "Social groups at feeding and roosting sites",
        sourceIds: ["vulture-emerald"],
      },
      {
        label: "Diet",
        value: "Carrion, especially soft flesh of large dead animals",
        sourceIds: ["vulture-ueno"],
      },
      {
        label: "Range",
        value: "Sub-Saharan Africa",
        sourceIds: ["vulture-wiki"],
      },
    ],
    questions: [
      {
        prompt: "Where is the pale patch that gives this vulture its name?",
        choices: [
          {
            id: "feet",
            text: "On its feet",
          },
          {
            id: "bill",
            text: "On its bill",
          },
          {
            id: "back",
            text: "On its back",
          },
        ],
        correctId: "back",
        explanation:
          "The white back becomes clearer when the wings are spread.",
        sourceIds: ["vulture-ueno"],
      },
      {
        prompt: "How does warm rising air help the vulture?",
        choices: [
          {
            id: "soar",
            text: "It lifts the bird for long glides",
          },
          {
            id: "swim",
            text: "It helps the bird swim",
          },
          {
            id: "bill",
            text: "It helps the bird crack hard seeds",
          },
        ],
        correctId: "soar",
        explanation:
          "The bird rides rising air, called thermals, while looking for food.",
        sourceIds: ["vulture-emerald", "vulture-cleveland"],
      },
      {
        prompt: "What useful job does eating carrion do?",
        choices: [
          {
            id: "plant",
            text: "It pollinates flowers",
          },
          {
            id: "cleanup",
            text: "It helps remove dead animal remains",
          },
          {
            id: "burrow",
            text: "It digs burrows for other animals",
          },
        ],
        correctId: "cleanup",
        explanation:
          "Carrion is a dead animal; feeding on it removes some of those remains.",
        sourceIds: ["vulture-ueno"],
      },
    ],
    sources: [
      {
        id: "vulture-ueno",
        title: "Tokyo Zoological Park Society — African White-backed Vulture",
        url: "https://www.tokyo-zoo.net/en/ueno/encyclopedia/african-white-backed-vulture/index.html",
      },
      {
        id: "vulture-emerald",
        title: "Emerald Park Zoo — African White Backed Vulture",
        url: "https://www.emeraldpark.ie/explore-zoo/african-white-backed-vulture/",
      },
      {
        id: "vulture-cleveland",
        title: "Cleveland Metroparks Zoo — African White-Backed Vulture",
        url: "https://resourcelibrary.clevelandmetroparks.com/animals/9",
      },
      {
        id: "vulture-anage",
        title: "AnAge — Gyps africanus longevity records",
        url: "https://genomics.senescence.info/species/entry.php?species=Gyps_africanus",
      },
      {
        id: "vulture-wiki",
        title: "Wikipedia — White-backed vulture (supplemental)",
        url: "https://en.wikipedia.org/wiki/White-backed_vulture",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "red-billed-oxpecker",
    name: "Red-billed oxpecker",
    scientificName: "Buphagus erythrorynchus",
    group: "Bird",
    aliases: ["red billed oxpecker", "oxpecker"],
    summary:
      "A small red-billed bird that finds much of its food on large mammals.",
    description:
      "Look closely at a grazing mammal and you may spot a red-billed oxpecker riding on its back. This small bird searches its host for ticks and other tiny animals to eat. The relationship is not always helpful to the mammal: oxpeckers also take blood from wounds. They can give warning calls when danger approaches. Away from the breeding season, they form noisy flocks. A tree hole becomes a nesting place, lined with hair collected from mammals.",
    descriptionSourceIds: ["oxpecker-mpala", "oxpecker-wiki", "oxpecker-weeks"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Red-billed_oxpecker",
    habitat: "Savanna and open country with large mammals and nesting trees",
    stats: [
      {
        label: "Length",
        value: "About 20 cm",
        sourceIds: ["oxpecker-mpala"],
      },
      {
        label: "Life span",
        value: "Up to 15 years reported; wild or care setting not specified",
        sourceIds: ["oxpecker-mpala"],
      },
      {
        label: "Lives",
        value: "Flocks outside the breeding season",
        sourceIds: ["oxpecker-wiki"],
      },
      {
        label: "Diet",
        value: "Ticks, other small parasites and blood",
        sourceIds: ["oxpecker-mpala"],
      },
      {
        label: "Range",
        value: "Eastern and southern sub-Saharan Africa",
        sourceIds: ["oxpecker-mpala", "oxpecker-wiki"],
      },
    ],
    questions: [
      {
        prompt: "Where might you spot a red-billed oxpecker feeding?",
        choices: [
          {
            id: "water",
            text: "Deep underwater",
          },
          {
            id: "mammal",
            text: "On the back of a large mammal",
          },
          {
            id: "snow",
            text: "Inside an Antarctic snowbank",
          },
        ],
        correctId: "mammal",
        explanation: "It perches on mammals and searches their skin for food.",
        sourceIds: ["oxpecker-mpala"],
      },
      {
        prompt: "Which food does an oxpecker pick from its host?",
        choices: [
          {
            id: "leaves",
            text: "Tree leaves",
          },
          {
            id: "seeds",
            text: "Only grass seeds",
          },
          {
            id: "ticks",
            text: "Ticks",
          },
        ],
        correctId: "ticks",
        explanation: "Ticks and other parasites are food for oxpeckers.",
        sourceIds: ["oxpecker-mpala"],
      },
      {
        prompt: "Is the oxpecker always helpful to the animal carrying it?",
        choices: [
          {
            id: "mixed",
            text: "No; it removes ticks but can also feed at wounds",
          },
          {
            id: "always",
            text: "Yes; it can never bother its host",
          },
          {
            id: "never",
            text: "No; it never eats ticks",
          },
        ],
        correctId: "mixed",
        explanation:
          "Removing ticks can help, but feeding at wounds can harm the host.",
        sourceIds: ["oxpecker-mpala", "oxpecker-weeks"],
      },
    ],
    sources: [
      {
        id: "oxpecker-mpala",
        title: "Mpala Research Centre — Red-billed Oxpecker field guide",
        url: "https://mpala.org/field_guide/view/redbilled_oxpecker/",
      },
      {
        id: "oxpecker-weeks",
        title: "Weeks (2000) — Red-billed oxpeckers: vampires or tickbirds?",
        url: "https://www.csun.edu/~dgray/BE528/Weeks2000oxpeckers.pdf",
      },
      {
        id: "oxpecker-birdlife",
        title: "BirdLife South Africa — Taxonomy and assessment methods",
        url: "https://www.birdlife.org.za/red-data-book/red-data-book/our-scientific-approach-and-assessment-methods/",
      },
      {
        id: "oxpecker-wiki",
        title: "Wikipedia — Red-billed oxpecker (supplemental)",
        url: "https://en.wikipedia.org/wiki/Red-billed_oxpecker",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "marabou-stork",
    name: "Marabou stork",
    scientificName: "Leptoptilos crumenifer",
    group: "Bird",
    aliases: ["marabou"],
    summary:
      "A huge stork that scavenges and hunts beside grasslands, rivers and lakes.",
    description:
      "A marabou stork stands on long legs beneath a dark feathered cloak and pale belly. Its large bill, mostly bare head and hanging throat pouch make it easy to recognise. It gathers with other birds near useful feeding places and nests in colonies. Carrion is one meal, but it also catches living prey such as fish, frogs and insects. In the air, broad wings ride rising warm air. Its mix of scavenging and hunting links it to both land and water.",
    descriptionSourceIds: ["marabou-mnhn", "marabou-toronto", "marabou-adw"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Marabou_stork",
    habitat: "Savanna and grasslands, often near rivers or lakes",
    stats: [
      {
        label: "Length",
        value: "About 1.2–1.5 m",
        sourceIds: ["marabou-toronto"],
      },
      {
        label: "Wingspan",
        value: "About 2.25–2.85 m",
        sourceIds: ["marabou-toronto"],
      },
      {
        label: "Life span",
        value: "Up to 25 years reported wild; nearly 45 recorded in care",
        sourceIds: ["marabou-anage"],
      },
      {
        label: "Lives",
        value: "Groups, with nesting colonies",
        sourceIds: ["marabou-adw"],
      },
      {
        label: "Diet",
        value: "Carrion, fish, frogs, insects and other small animals",
        sourceIds: ["marabou-mnhn", "marabou-adw"],
      },
      {
        label: "Range",
        value: "Sub-Saharan Africa",
        sourceIds: ["marabou-mnhn"],
      },
    ],
    questions: [
      {
        prompt: "Which feature helps identify a marabou stork?",
        choices: [
          {
            id: "crown",
            text: "A golden crown of feathers",
          },
          {
            id: "pouch",
            text: "A hanging throat pouch and huge bill",
          },
          {
            id: "streamers",
            text: "Two long, thin blue tail streamers",
          },
        ],
        correctId: "pouch",
        explanation:
          "Its large bill and bare throat pouch are distinctive features.",
        sourceIds: ["marabou-toronto", "marabou-adw"],
      },
      {
        prompt: "Does a marabou eat only animals that are already dead?",
        choices: [
          {
            id: "yes",
            text: "Yes, always",
          },
          {
            id: "plants",
            text: "No, it eats only leaves",
          },
          {
            id: "both",
            text: "No, it also catches living prey",
          },
        ],
        correctId: "both",
        explanation:
          "It scavenges, but also takes prey such as fish, frogs and insects.",
        sourceIds: ["marabou-mnhn", "marabou-adw"],
      },
      {
        prompt: "Why can a riverbank be a useful feeding place for a marabou?",
        choices: [
          {
            id: "prey",
            text: "It can find small animals such as fish and frogs",
          },
          {
            id: "swim",
            text: "It spends its whole life underwater",
          },
          {
            id: "flowers",
            text: "It drinks only flower nectar",
          },
        ],
        correctId: "prey",
        explanation:
          "Waterside habitats can provide some of the small animals it eats.",
        sourceIds: ["marabou-mnhn"],
      },
    ],
    sources: [
      {
        id: "marabou-mnhn",
        title: "French National Museum of Natural History — Marabou stork",
        url: "https://www.mnhn.fr/en/marabou-stork",
      },
      {
        id: "marabou-toronto",
        title: "Toronto Zoo — Marabou stork",
        url: "https://www.torontozoo.com/animals/Marabou%20stork",
      },
      {
        id: "marabou-adw",
        title: "University of Michigan Animal Diversity Web — Marabou",
        url: "https://animaldiversity.org/accounts/Leptoptilos_crumeniferus/",
      },
      {
        id: "marabou-anage",
        title: "AnAge — Marabou longevity records",
        url: "https://genomics.senescence.info/species/entry.php?species=Leptoptilos_crumeniferus",
      },
      {
        id: "marabou-wiki",
        title: "Wikipedia — Marabou stork (supplemental)",
        url: "https://en.wikipedia.org/wiki/Marabou_stork",
      },
    ],
    reviewedAt: "2026-09-20",
  },
];
