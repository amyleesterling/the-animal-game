import type { SafariStop } from "../safari-contracts";

/** Facts checked against the linked zoo/conservation sources; not a scientific review. */
export const safariContentReviewedAt = "2026-09-20";
const zoo = (animal: string, title: string) => ({
  title: `San Diego Zoo Wildlife Alliance: ${title}`,
  url: `https://animals.sandiegozoo.org/animals/${animal}`,
});

export const safariStops: SafariStop[] = [
  {
    id: "plains-zebra",
    name: "Plains zebra",
    scientificName: "Equus quagga",
    chapter: "The grassland clue",
    story:
      "Sophia opens her empty field book beside the jeep. A striped neighbor is our first clue. What does this patch of grass offer a zebra?",
    mission: "Find the zebra and discover its favorite kind of food.",
    clue: "Grass feeds grazers",
    facts: [
      "Plains zebras mostly eat grass. Their strong front teeth clip off the tips.",
    ],
    sources: [zoo("zebra", "Zebra")],
    question: {
      prompt: "What does a plains zebra mostly eat?",
      choices: [
        { id: "grass", text: "Grass" },
        { id: "fish", text: "Fish" },
        { id: "insects", text: "Insects" },
      ],
      correctId: "grass",
      explanation:
        "Zebras are grazers: most of their food is grass. Our first clue is a place to feed.",
    },
    modelPath: "/models/zebra.glb",
    height: 2.25,
    forwardAxis: "+z",
    position: [0, 0, 0],
  },
  {
    id: "african-elephant",
    name: "African savanna elephant",
    scientificName: "Loxodonta africana",
    chapter: "A water stop",
    story:
      "The jeep carries us toward the water. Sophia spots a long trunk and wonders how it helps an elephant drink.",
    mission: "Meet the elephant and follow a sip of water.",
    clue: "Water is part of the habitat",
    facts: [
      "An elephant draws water into its trunk, then pours it into its mouth to drink.",
    ],
    sources: [zoo("elephant", "Elephant")],
    question: {
      prompt: "After drawing water into its trunk, what does an elephant do?",
      choices: [
        { id: "ears", text: "Pours it into its ears" },
        { id: "mouth", text: "Pours it into its mouth" },
        { id: "straw", text: "Swallows through its trunk" },
      ],
      correctId: "mouth",
      explanation:
        "The trunk carries the water to the mouth. It does not work like a drinking straw all the way to the stomach.",
    },
    modelPath: "/models/test-animals/african-elephant.glb",
    height: 3.8,
    forwardAxis: "+z",
    position: [44, 0, -24],
  },
  {
    id: "giraffe",
    name: "Northern giraffe",
    scientificName: "Giraffa camelopardalis",
    chapter: "Look up into the leaves",
    story:
      "There is more to this home than grass. Sophia follows the next clue upward, toward the leafy branches.",
    mission: "Find out where the giraffe looks for a meal.",
    clue: "Trees feed browsers",
    facts: [
      "Giraffes browse leaves and shoots from trees and shrubs. Their long tongues help them gather leaves.",
    ],
    sources: [
      {
        title: "Giraffe Conservation Foundation: What do giraffe eat?",
        url: "https://giraffeconservation.org/facts-about-giraffe/what-do-giraffe-eat/",
      },
    ],
    question: {
      prompt: "Where does a giraffe find most of its food?",
      choices: [
        { id: "pond", text: "Under the water" },
        { id: "ground", text: "Deep under the soil" },
        { id: "trees", text: "On trees and shrubs" },
      ],
      correctId: "trees",
      explanation:
        "Giraffes browse leaves and shoots. Trees and shrubs offer a different kind of meal from the grass below.",
    },
    modelPath: "/models/test-animals/giraffe.glb",
    height: 5.2,
    forwardAxis: "+z",
    position: [14, 0, -62],
  },
  {
    id: "common-warthog",
    name: "Common warthog",
    scientificName: "Phacochoerus africanus",
    chapter: "A place to shelter",
    story:
      "Sophia has found food and water clues. Now she wonders where a smaller animal can rest away from the heat.",
    mission: "Discover a warthog’s cozy hideaway.",
    clue: "Shelter matters too",
    facts: [
      "Warthogs use burrows, including abandoned aardvark holes, to rest and shelter from heat, cold, and predators.",
    ],
    sources: [zoo("warthog", "Warthog")],
    question: {
      prompt: "Where might a warthog find shelter?",
      choices: [
        { id: "burrow", text: "In a burrow" },
        { id: "nest", text: "In a treetop nest" },
        { id: "reef", text: "In a coral reef" },
      ],
      correctId: "burrow",
      explanation:
        "A burrow is a sheltered space underground. Warthogs often use holes left by other animals, such as aardvarks.",
    },
    modelPath: "/models/test-animals/common-warthog.glb",
    height: 1.2,
    forwardAxis: "+z",
    position: [-32, 0, -52],
  },
  {
    id: "thomsons-gazelle",
    name: "Thomson’s gazelle",
    scientificName: "Eudorcas thomsonii",
    chapter: "A shared grassland",
    story:
      "Our first grass clue has a new chapter. This small gazelle can feed where bigger grazers have already passed.",
    mission: "Connect the gazelle’s meal to the zebra’s meal.",
    clue: "Grazers share the grassland",
    facts: [
      "Thomson’s gazelles feed on short grass. Larger grazers such as zebras can make that grass easier to reach by eating and trampling taller growth.",
    ],
    sources: [
      {
        title: "African Wildlife Foundation: Thomson’s Gazelle",
        url: "https://www.awf.org/wildlife-conservation/thomsons-gazelle",
      },
    ],
    question: {
      prompt: "How can zebras help gazelles reach short grass?",
      choices: [
        { id: "plant", text: "By planting little gardens" },
        { id: "graze", text: "By eating and trampling tall grass" },
        { id: "carry", text: "By carrying gazelles on their backs" },
      ],
      correctId: "graze",
      explanation:
        "When bigger grazers eat and trample tall grass, short grass becomes easier for gazelles to reach. Different grazers can use the same place in different ways.",
    },
    modelPath: "/models/test-animals/thomsons-gazelle.glb",
    height: 1.4,
    forwardAxis: "+z",
    position: [-58, 0, -12],
  },
  {
    id: "cheetah",
    name: "Cheetah",
    scientificName: "Acinonyx jubatus",
    chapter: "The hunter’s clue",
    story:
      "Sophia watches from a distance. Some animals eat plants; others hunt animals. Both belong in the savanna’s food web.",
    mission: "Learn what a cheetah’s short burst of speed is for.",
    clue: "Hunters belong in the food web",
    facts: [
      "Cheetahs are built for fast, short chases that help them catch prey.",
    ],
    sources: [zoo("cheetah", "Cheetah")],
    question: {
      prompt: "What does a cheetah use a fast, short chase for?",
      choices: [
        { id: "dig", text: "Digging a burrow" },
        { id: "leaves", text: "Collecting leaves" },
        { id: "hunt", text: "Catching prey" },
      ],
      correctId: "hunt",
      explanation:
        "A cheetah is a hunter. Its body is built for a burst of speed to catch prey, rather than running at top speed all day.",
    },
    modelPath: "/models/test-animals/cheetah.glb",
    height: 1.1,
    forwardAxis: "+z",
    position: [-22, 0, 34],
  },
  {
    id: "spotted-hyena",
    name: "Spotted hyena",
    scientificName: "Crocuta crocuta",
    chapter: "The last light",
    story:
      "One page remains as the light turns golden. Sophia meets a misunderstood neighbor with more than one way to find a meal.",
    mission: "Discover the hyena’s two ways of finding food.",
    clue: "Hunters can be scavengers too",
    facts: [
      "Spotted hyenas hunt prey and also scavenge animals that are already dead. Their strong jaws can crush bones.",
    ],
    sources: [zoo("spotted-hyena", "Spotted Hyena")],
    question: {
      prompt: "How do spotted hyenas find food?",
      choices: [
        { id: "both", text: "They hunt and scavenge" },
        { id: "grass", text: "They eat only grass" },
        { id: "fruit", text: "They eat only fruit" },
      ],
      correctId: "both",
      explanation:
        "Spotted hyenas are skilled hunters and also scavengers. Scavenging means eating an animal that is already dead. They are another part of this food web.",
    },
    modelPath: "/models/test-animals/spotted-hyena.glb",
    height: 1.5,
    forwardAxis: "+z",
    position: [28, 0, 30],
  },
];

export const safariEnding =
  "Seven clues, one connected home. Grass and leaves feed plant-eaters. Hunters eat other animals, and scavengers use food left behind. Water and shelter are part of the habitat too. Your field book shows connections worth protecting. Real scientists return again and again to learn how a habitat is doing.";
