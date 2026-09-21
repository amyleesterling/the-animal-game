import type { SavannaProfile } from "./savanna-profile";

// Research audit and uncertainty decisions: docs/research/SAVANNA_MAMMALS.md.
// Questions are ordered: spot a feature, understand it, connect it to habitat.
export const mammalProfiles: SavannaProfile[] = [
  {
    id: "aardvark",
    name: "Aardvark",
    scientificName: "Orycteropus afer",
    group: "Mammal",
    aliases: ["African ant bear"],
    summary:
      "An aardvark digs for ants and termites, then gathers them with its sticky tongue.",
    description:
      "Look for a long snout, tall ears and a sturdy body with digging claws. The aardvark usually rests in a burrow during daylight and searches for ants and termites at night. Its keen nose helps locate food, and its sticky tongue gathers the insects. Most adults live alone, although a mother stays with her young. Aardvarks also leave useful homes behind: other animals can shelter in their old burrows. Soft soil makes both hunting and home building easier.",
    descriptionSourceIds: ["aardvark-awf", "aardvark-adw"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Aardvark",
    habitat: "Savanna and woodland with insects and soil soft enough to dig.",
    stats: [
      {
        label: "Size",
        value: "Body about 1–1.5 m long; 39–82 kg.",
        sourceIds: ["aardvark-awf"],
      },
      {
        label: "Lifespan",
        value:
          "Wild: about 18 years reported; human care: a record of nearly 30 years.",
        sourceIds: ["aardvark-adw", "aardvark-anage"],
      },
      {
        label: "Lives",
        value: "Mostly alone; mothers care for their young.",
        sourceIds: ["aardvark-adw"],
      },
      {
        label: "Diet",
        value: "Mainly ants and termites.",
        sourceIds: ["aardvark-adw"],
      },
      {
        label: "Range",
        value: "Much of Africa south of the Sahara.",
        sourceIds: ["aardvark-adw"],
      },
      {
        label: "Habitat",
        value: "Savanna and woodland with diggable soil.",
        sourceIds: ["aardvark-awf"],
      },
    ],
    questions: [
      {
        prompt: "Which feature helps an aardvark dig?",
        choices: [
          { id: "claws", text: "Strong claws" },
          { id: "wings", text: "Wide wings" },
          { id: "horns", text: "Curved horns" },
        ],
        correctId: "claws",
        explanation:
          "Its powerful feet and claws open insect nests and dig burrows.",
        sourceIds: ["aardvark-awf"],
      },
      {
        prompt: "How does an aardvark gather tiny insects?",
        choices: [
          { id: "tail", text: "With a furry tail" },
          { id: "tongue", text: "With a sticky tongue" },
          { id: "beak", text: "With a hard beak" },
        ],
        correctId: "tongue",
        explanation: "Ants and termites stick to its long tongue as it feeds.",
        sourceIds: ["aardvark-adw"],
      },
      {
        prompt: "What can happen to an old aardvark burrow?",
        choices: [
          { id: "tree", text: "It becomes a tree branch" },
          { id: "nest", text: "It turns into a termite" },
          { id: "shelter", text: "Other animals use it for shelter" },
        ],
        correctId: "shelter",
        explanation:
          "An abandoned burrow can give other animals a place to hide or rest.",
        sourceIds: ["aardvark-awf"],
      },
    ],
    sources: [
      {
        id: "aardvark-awf",
        title: "African Wildlife Foundation: Aardvark",
        url: "https://www.awf.org/wildlife-conservation/aardvark",
      },
      {
        id: "aardvark-adw",
        title: "University of Michigan Animal Diversity Web: Orycteropus afer",
        url: "https://animaldiversity.org/accounts/Orycteropus_afer/",
      },
      {
        id: "aardvark-anage",
        title: "AnAge: Aardvark longevity record",
        url: "https://genomics.senescence.info/species/entry.php?species=Orycteropus_afer",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "bat-eared-fox",
    name: "Bat-eared fox",
    scientificName: "Otocyon megalotis",
    group: "Mammal",
    aliases: [],
    summary:
      "A bat-eared fox uses its enormous ears to listen for insects in the grass.",
    description:
      "Those giant ears belong to a fox! Its sandy grey coat, dark feet and bushy tail help you recognise it. The ears detect tiny sounds made by insects and also release body heat. Bat-eared foxes eat mostly insects, especially termites, and rest in underground dens. They live in small family groups, with fathers helping care for the kits. Near grazing animals, a fox may find dung beetles attracted to the droppings left behind.",
    descriptionSourceIds: ["fox-sdz", "fox-adw"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Bat-eared_fox",
    habitat: "Short grass and scrub in eastern and southern African savannas.",
    stats: [
      {
        label: "Size",
        value: "Body 46–66 cm; tail 23–34 cm; 3.2–5.4 kg.",
        sourceIds: ["fox-sdz"],
      },
      {
        label: "Lifespan",
        value: "Wild: unknown; human care: up to 13 years reported.",
        sourceIds: ["fox-sdz"],
      },
      {
        label: "Lives",
        value: "Small family groups, often 2–5 foxes.",
        sourceIds: ["fox-sdz"],
      },
      {
        label: "Diet",
        value: "Mostly insects, especially termites and beetles.",
        sourceIds: ["fox-adw"],
      },
      {
        label: "Range",
        value: "Two main regions: eastern and southern Africa.",
        sourceIds: ["fox-adw"],
      },
      {
        label: "Habitat",
        value: "Savanna with short grass, scrub and underground dens.",
        sourceIds: ["fox-adw"],
      },
    ],
    questions: [
      {
        prompt: "What stands out on a bat-eared fox's head?",
        choices: [
          { id: "horns", text: "Two spiral horns" },
          { id: "ears", text: "Very large ears" },
          { id: "trunk", text: "A long trunk" },
        ],
        correctId: "ears",
        explanation:
          "Its unusually large ears help give this little fox its name.",
        sourceIds: ["fox-sdz"],
      },
      {
        prompt: "What can those ears help the fox find?",
        choices: [
          { id: "insects", text: "Insects moving nearby" },
          { id: "clouds", text: "Rain stored in clouds" },
          { id: "roots", text: "Roots using sunlight" },
        ],
        correctId: "insects",
        explanation:
          "The fox listens for small insect sounds, then digs or pounces.",
        sourceIds: ["fox-sdz"],
      },
      {
        prompt: "Why might this fox search near zebra droppings?",
        choices: [
          { id: "stripes", text: "To grow zebra stripes" },
          { id: "milk", text: "To find zebra milk" },
          { id: "beetles", text: "To find dung beetles to eat" },
        ],
        correctId: "beetles",
        explanation:
          "Dung beetles use animal droppings, and the fox eats these insects.",
        sourceIds: ["fox-adw"],
      },
    ],
    sources: [
      {
        id: "fox-sdz",
        title: "San Diego Zoo Wildlife Alliance: Bat-eared Fox",
        url: "https://animals.sandiegozoo.org/animals/bat-eared-fox",
      },
      {
        id: "fox-adw",
        title: "University of Michigan Animal Diversity Web: Otocyon megalotis",
        url: "https://animaldiversity.org/accounts/Otocyon_megalotis/",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "banded-mongoose",
    name: "Banded mongoose",
    scientificName: "Mungos mungo",
    group: "Mammal",
    aliases: [],
    summary:
      "Banded mongooses are small striped mammals that search for food and raise young in groups.",
    description:
      "Dark bands cross this mongoose's back above its short legs and long tail. Banded mongooses explore during the day, scratching through soil for insects and other small food. A pack shares a den, often using a hole another animal has already dug. Several adults help look after the pups while others search for food. Their menu includes tough foods too: a mongoose can throw an egg or snail against something hard to break it open.",
    descriptionSourceIds: ["mongoose-smithsonian", "mongoose-adw"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Banded_mongoose",
    habitat: "Open grassland, woodland and rocky ground south of the Sahara.",
    stats: [
      {
        label: "Size",
        value: "Body 30–45 cm; tail 15–30 cm; 1.5–2.5 kg.",
        sourceIds: ["mongoose-smithsonian"],
      },
      {
        label: "Lifespan",
        value: "Wild: around 10 years; human care: up to 17 years.",
        sourceIds: ["mongoose-smithsonian"],
      },
      {
        label: "Lives",
        value: "Social packs, commonly 10–20 mongooses.",
        sourceIds: ["mongoose-smithsonian"],
      },
      {
        label: "Diet",
        value: "Mostly insects; also eggs, small animals and fruit.",
        sourceIds: ["mongoose-smithsonian"],
      },
      {
        label: "Range",
        value: "Parts of Africa south of the Sahara.",
        sourceIds: ["mongoose-adw"],
      },
      {
        label: "Habitat",
        value: "Grassland, woodland, rocky areas and river margins.",
        sourceIds: ["mongoose-adw"],
      },
    ],
    questions: [
      {
        prompt: "Which marking helps identify a banded mongoose?",
        choices: [
          { id: "spots", text: "Big round white spots" },
          { id: "mane", text: "A flowing black mane" },
          { id: "bands", text: "Dark bands across its back" },
        ],
        correctId: "bands",
        explanation:
          "The dark stripes across its back are the bands in its name.",
        sourceIds: ["mongoose-adw"],
      },
      {
        prompt: "How do banded mongoose packs care for pups?",
        choices: [
          { id: "helpers", text: "Several adults help" },
          { id: "alone", text: "Pups live alone from birth" },
          { id: "birds", text: "Birds raise the pups" },
        ],
        correctId: "helpers",
        explanation:
          "Some adults stay with the young while other pack members go foraging.",
        sourceIds: ["mongoose-adw"],
      },
      {
        prompt: "How could a mongoose open a tough egg?",
        choices: [
          { id: "plant", text: "Plant it in the soil" },
          { id: "throw", text: "Throw it against a hard surface" },
          { id: "sing", text: "Sing until the shell melts" },
        ],
        correctId: "throw",
        explanation: "Throwing hard food against a stone can crack its shell.",
        sourceIds: ["mongoose-smithsonian"],
      },
    ],
    sources: [
      {
        id: "mongoose-smithsonian",
        title: "Smithsonian's National Zoo: Banded mongoose",
        url: "https://nationalzoo.si.edu/animals/banded-mongoose",
      },
      {
        id: "mongoose-adw",
        title: "University of Michigan Animal Diversity Web: Mungos mungo",
        url: "https://animaldiversity.org/accounts/Mungos_mungo/",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "meerkat",
    name: "Meerkat",
    scientificName: "Suricata suricatta",
    group: "Mammal",
    aliases: ["Suricate"],
    summary:
      "Meerkats are social mongooses whose lookouts watch for danger while the group searches for food.",
    description:
      "A meerkat has a slim body, dark eye patches and strong claws for digging. It belongs to the mongoose family. Groups called mobs share burrows in dry southern African landscapes. While many members search for insects, a lookout may stand tall on a rock or mound. A warning call sends the group toward shelter. Adults also help care for young meerkats. Underground tunnels give the mob a place to rest away from the changing temperature outside.",
    descriptionSourceIds: ["meerkat-smithsonian", "meerkat-sdz"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Meerkat",
    habitat: "Dry, open plains, savanna and grassland in southern Africa.",
    stats: [
      {
        label: "Size",
        value: "Body 25–35 cm; tail 18–25 cm.",
        sourceIds: ["meerkat-smithsonian"],
      },
      {
        label: "Lifespan",
        value:
          "Wild: not established by these sources; human care: about 10 years.",
        sourceIds: ["meerkat-smithsonian", "meerkat-sdz"],
      },
      {
        label: "Lives",
        value: "Groups called mobs; adults share guarding and pup care.",
        sourceIds: ["meerkat-sdz", "meerkat-smithsonian"],
      },
      {
        label: "Diet",
        value: "Mostly insects; also small animals, eggs and some plants.",
        sourceIds: ["meerkat-smithsonian"],
      },
      {
        label: "Range",
        value: "Southern Africa.",
        sourceIds: ["meerkat-smithsonian"],
      },
      {
        label: "Habitat",
        value: "Dry open ground with underground burrows.",
        sourceIds: ["meerkat-smithsonian", "meerkat-sdz"],
      },
    ],
    questions: [
      {
        prompt: "What can you spot around a meerkat's eyes?",
        choices: [
          { id: "patches", text: "Dark patches" },
          { id: "feathers", text: "Blue feathers" },
          { id: "scales", text: "Large silver scales" },
        ],
        correctId: "patches",
        explanation:
          "Meerkats have dark fur around their eyes and a narrow pointed snout.",
        sourceIds: ["meerkat-smithsonian"],
      },
      {
        prompt: "Why does a meerkat lookout stand up high?",
        choices: [
          { id: "rain", text: "To make rain fall" },
          { id: "danger", text: "To watch for danger" },
          { id: "leaves", text: "To grow new leaves" },
        ],
        correctId: "danger",
        explanation:
          "A high lookout can spot a predator and warn the feeding group.",
        sourceIds: ["meerkat-sdz"],
      },
      {
        prompt: "Why are burrows useful in a dry, open habitat?",
        choices: [
          { id: "flight", text: "They teach meerkats to fly" },
          { id: "fish", text: "They fill with sea fish" },
          {
            id: "shelter",
            text: "They provide shelter and steadier temperatures",
          },
        ],
        correctId: "shelter",
        explanation:
          "The mob can hide underground, where deep tunnels avoid big temperature changes.",
        sourceIds: ["meerkat-sdz"],
      },
    ],
    sources: [
      {
        id: "meerkat-smithsonian",
        title: "Smithsonian's National Zoo: Meerkat",
        url: "https://nationalzoo.si.edu/animals/meerkat",
      },
      {
        id: "meerkat-sdz",
        title: "San Diego Zoo Wildlife Alliance: Meerkat",
        url: "https://animals.sandiegozoo.org/animals/meerkat",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "olive-baboon",
    name: "Olive baboon",
    scientificName: "Papio anubis",
    group: "Mammal",
    aliases: ["Anubis baboon"],
    summary:
      "Olive baboons are large, long-muzzled monkeys that live in troops and eat many different foods.",
    description:
      "From a distance, an olive baboon's coat looks grey-green. Its long muzzle and four-legged walk can seem doglike, but this animal is a monkey. Adult males are larger than females and have a shaggy mane over their shoulders. Troops travel and feed together, and grooming is part of social life. Baboons find food on the ground, in trees and underground. Eating roots, fruit, leaves and small animals helps them use several kinds of habitat.",
    descriptionSourceIds: ["baboon-wisconsin", "baboon-seneca"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Olive_baboon",
    habitat:
      "Savanna near trees, woodland and some forests across equatorial Africa.",
    stats: [
      {
        label: "Size",
        value: "Average adult mass: females about 15 kg; males about 24 kg.",
        sourceIds: ["baboon-wisconsin"],
      },
      {
        label: "Lifespan",
        value:
          "Wild: 25–30 years reported; human care: not established by these sources.",
        sourceIds: ["baboon-wisconsin"],
      },
      {
        label: "Lives",
        value: "Troops with females, males and young; often 15–150 members.",
        sourceIds: ["baboon-seneca"],
      },
      {
        label: "Diet",
        value: "Plants, fruit, roots, insects and other small animals.",
        sourceIds: ["baboon-wisconsin", "baboon-seneca"],
      },
      {
        label: "Range",
        value:
          "A broad belt across equatorial Africa, including Kenya and Tanzania.",
        sourceIds: ["baboon-wisconsin"],
      },
      {
        label: "Habitat",
        value: "Savanna, woodland and forest.",
        sourceIds: ["baboon-wisconsin"],
      },
    ],
    questions: [
      {
        prompt: "Which face shape helps you recognise an olive baboon?",
        choices: [
          { id: "beak", text: "A flat duck bill" },
          { id: "muzzle", text: "A long muzzle" },
          { id: "trunk", text: "A curling trunk" },
        ],
        correctId: "muzzle",
        explanation: "Its long, projecting muzzle is a useful baboon clue.",
        sourceIds: ["baboon-wisconsin"],
      },
      {
        prompt: "What is a group of olive baboons called?",
        choices: [
          { id: "school", text: "A school" },
          { id: "swarm", text: "A swarm" },
          { id: "troop", text: "A troop" },
        ],
        correctId: "troop",
        explanation:
          "A troop includes adults and young that share a social group.",
        sourceIds: ["baboon-seneca"],
      },
      {
        prompt: "Which menu shows why baboons are omnivores?",
        choices: [
          { id: "mixed", text: "Fruit, leaves and insects" },
          { id: "grass", text: "Only grass" },
          { id: "meat", text: "Only meat" },
        ],
        correctId: "mixed",
        explanation:
          "Omnivores eat both plants and animals, as olive baboons do.",
        sourceIds: ["baboon-seneca"],
      },
    ],
    sources: [
      {
        id: "baboon-wisconsin",
        title: "Wisconsin National Primate Research Center: Olive baboon",
        url: "https://primate.wisc.edu/primate-info-net/pin-factsheets/pin-factsheet-olive-baboon/",
      },
      {
        id: "baboon-seneca",
        title: "Seneca Park Zoo: Olive Baboon",
        url: "https://senecaparkzoo.org/olive-baboon/",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "vervet-monkey",
    name: "Vervet monkey",
    scientificName: "Chlorocebus pygerythrus",
    group: "Mammal",
    aliases: ["Vervet"],
    summary:
      "Vervet monkeys have black faces and use different alarm calls to warn their troop about danger.",
    description:
      "A black face framed by pale fur helps identify a vervet monkey. These quick monkeys move on all fours through trees and across the ground. Their troops search for fruit, leaves and other foods, including some insects. Different alarm calls help group members respond to dangers such as eagles or leopards. Trees provide sleeping places and cover, while nearby water is important too. Females usually remain with their birth group, where relatives share a busy social life.",
    descriptionSourceIds: ["vervet-columbus", "vervet-sanbi"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Vervet_monkey",
    habitat: "Savanna and open woodland with trees and nearby water.",
    stats: [
      {
        label: "Size",
        value: "Adult mass: females about 3.4–5.3 kg; males 3.9–8 kg.",
        sourceIds: ["vervet-sanbi"],
      },
      {
        label: "Lifespan",
        value:
          "Wild: about 10 years estimated for females in one study; human care: species-specific median unknown.",
        sourceIds: ["vervet-life-study", "vervet-columbus"],
      },
      {
        label: "Lives",
        value: "Troops, often 10–50 monkeys.",
        sourceIds: ["vervet-columbus"],
      },
      {
        label: "Diet",
        value: "Mostly plant foods, plus insects, eggs and small animals.",
        sourceIds: ["vervet-sanbi"],
      },
      {
        label: "Range",
        value: "Eastern and southern Africa.",
        sourceIds: ["vervet-columbus"],
      },
      {
        label: "Habitat",
        value: "Savanna and woodland near trees and water.",
        sourceIds: ["vervet-columbus"],
      },
    ],
    questions: [
      {
        prompt: "Which face belongs to a vervet monkey?",
        choices: [
          { id: "bill", text: "A yellow bill with feathers" },
          { id: "nose", text: "A long pink trunk" },
          { id: "face", text: "A black face edged with pale fur" },
        ],
        correctId: "face",
        explanation:
          "The dark face and pale surrounding fur are useful identification clues.",
        sourceIds: ["vervet-columbus"],
      },
      {
        prompt: "Why do vervets use different alarm calls?",
        choices: [
          { id: "warnings", text: "To warn about different dangers" },
          { id: "colour", text: "To change their fur colour" },
          { id: "rain", text: "To stop the rain" },
        ],
        correctId: "warnings",
        explanation:
          "A call about an eagle prompts a different response from one about a leopard.",
        sourceIds: ["vervet-sanbi"],
      },
      {
        prompt: "Which place gives vervets useful shelter and water?",
        choices: [
          { id: "sand", text: "A bare dune far from water" },
          { id: "woodland", text: "Woodland beside a river" },
          { id: "ice", text: "An empty sheet of sea ice" },
        ],
        correctId: "woodland",
        explanation:
          "Trees offer cover and sleeping places, and the river supplies water.",
        sourceIds: ["vervet-columbus"],
      },
    ],
    sources: [
      {
        id: "vervet-columbus",
        title: "Columbus Zoo: Vervet Monkey (Chlorocebus pygerythrus)",
        url: "https://www.columbuszoo.org/animals/vervet-monkey",
      },
      {
        id: "vervet-sanbi",
        title: "South African National Biodiversity Institute: Vervet monkey",
        url: "https://www.sanbi.org/gardens/lowveld/wildlife-biodiversity-4/vervet-monkey/",
      },
      {
        id: "vervet-life-study",
        title:
          "Research: Life history of an arid-country Chlorocebus pygerythrus population",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11650935/",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "african-buffalo",
    name: "African buffalo",
    scientificName: "Syncerus caffer",
    group: "Mammal",
    aliases: ["Cape buffalo", "Savanna buffalo"],
    summary:
      "African buffalo are powerful grazers that gather in herds and depend on grass and nearby water.",
    description:
      "The savanna form of African buffalo is a heavy, dark animal with curved horns. Both females and males have horns, and mature bulls can have a thick shield where the horn bases meet. Buffalo spend much of their time eating grass and later chewing it again as cud. Herds often contain females and calves, while some males form smaller groups. Staying together helps reduce danger from predators. Buffalo need water as well as plenty of grazing ground.",
    descriptionSourceIds: ["buffalo-awf", "buffalo-adw"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/African_buffalo",
    habitat:
      "Grassland and woodland near water; the species also includes forest forms.",
    stats: [
      {
        label: "Size",
        value: "Large savanna buffalo: about 1.4–1.6 m at the shoulder.",
        sourceIds: ["buffalo-adw"],
      },
      {
        label: "Lifespan",
        value:
          "Wild: up to 22 years; human care: a record of about 29.5 years.",
        sourceIds: ["buffalo-adw"],
      },
      {
        label: "Lives",
        value: "Herds of females and young; some males form separate groups.",
        sourceIds: ["buffalo-awf"],
      },
      {
        label: "Diet",
        value: "Mainly grass; a plant-eating grazer.",
        sourceIds: ["buffalo-awf"],
      },
      {
        label: "Range",
        value: "Scattered populations across Africa south of the Sahara.",
        sourceIds: ["buffalo-adw"],
      },
      {
        label: "Habitat",
        value: "Savannas, woodlands and forests with dependable water.",
        sourceIds: ["buffalo-adw"],
      },
    ],
    questions: [
      {
        prompt: "Which feature is shared by male and female African buffalo?",
        choices: [
          { id: "horns", text: "Horns" },
          { id: "trunks", text: "Trunks" },
          { id: "wings", text: "Wings" },
        ],
        correctId: "horns",
        explanation:
          "Both sexes have horns, though mature males can have thicker horn bases.",
        sourceIds: ["buffalo-adw"],
      },
      {
        prompt: "What does a grazing buffalo mainly eat?",
        choices: [
          { id: "fish", text: "Fish" },
          { id: "grass", text: "Grass" },
          { id: "termites", text: "Termites" },
        ],
        correctId: "grass",
        explanation:
          "Buffalo are herbivores. Grass supplies most of their food.",
        sourceIds: ["buffalo-awf"],
      },
      {
        prompt: "How can herd life help protect buffalo?",
        choices: [
          { id: "invisible", text: "It makes every buffalo invisible" },
          { id: "flying", text: "It lets the herd fly" },
          { id: "together", text: "It makes one animal harder to single out" },
        ],
        correctId: "together",
        explanation:
          "A large group makes it harder for a predator to isolate one buffalo.",
        sourceIds: ["buffalo-awf"],
      },
    ],
    sources: [
      {
        id: "buffalo-awf",
        title: "African Wildlife Foundation: African Buffalo",
        url: "https://www.awf.org/wildlife-conservation/african-buffalo",
      },
      {
        id: "buffalo-adw",
        title: "University of Michigan Animal Diversity Web: Syncerus caffer",
        url: "https://animaldiversity.org/accounts/Syncerus_caffer/",
      },
    ],
    reviewedAt: "2026-09-20",
  },
  {
    id: "nile-monitor",
    name: "Nile monitor",
    scientificName: "Varanus niloticus",
    group: "Reptile",
    aliases: ["Water leguaan"],
    summary:
      "A Nile monitor is a large swimming lizard with a long tail and a forked tongue.",
    description:
      "Look beside the water for a long lizard with yellowish spots or bands. The Nile monitor has strong clawed feet for climbing and a flattened tail that helps it swim. It usually searches for food alone, using its forked tongue to pick up chemical clues. Its meals include snails, crabs, fish, eggs and other small animals. Open sunny places let it bask, while nearby rivers, pools and burrows provide places to escape or rest.",
    descriptionSourceIds: ["monitor-fwc", "monitor-adw"],
    wikipediaUrl: "https://en.wikipedia.org/wiki/Nile_monitor",
    habitat:
      "Riverbanks, lakesides and other wet edges in savanna and woodland.",
    stats: [
      {
        label: "Size",
        value:
          "Typical adult about 1.5 m long, including its tail; some reach about 2 m.",
        sourceIds: ["monitor-fwc"],
      },
      {
        label: "Lifespan",
        value:
          "Wild: not established by these sources; human care: 10–20 years reported.",
        sourceIds: ["monitor-adw"],
      },
      {
        label: "Lives",
        value: "Usually alone outside the breeding season.",
        sourceIds: ["monitor-adw"],
      },
      {
        label: "Diet",
        value: "Animal foods such as snails, crabs, fish and eggs.",
        sourceIds: ["monitor-fwc"],
      },
      {
        label: "Range",
        value: "Much of sub-Saharan Africa and the Nile valley into Egypt.",
        sourceIds: ["monitor-adw"],
      },
      {
        label: "Habitat",
        value: "Savanna, woodland and wetlands, usually near water.",
        sourceIds: ["monitor-adw"],
      },
    ],
    questions: [
      {
        prompt: "Which body covering does a Nile monitor have?",
        choices: [
          { id: "fur", text: "Thick woolly fur" },
          { id: "scales", text: "Small scales" },
          { id: "feathers", text: "Long flight feathers" },
        ],
        correctId: "scales",
        explanation:
          "This reptile's tough skin is covered in small, beadlike scales.",
        sourceIds: ["monitor-adw"],
      },
      {
        prompt: "How does a Nile monitor's flattened tail help?",
        choices: [
          { id: "fly", text: "It works as a flying wing" },
          { id: "milk", text: "It stores milk for babies" },
          { id: "swim", text: "It helps the lizard swim" },
        ],
        correctId: "swim",
        explanation:
          "The long tail is shaped to help the monitor move through water.",
        sourceIds: ["monitor-fwc"],
      },
      {
        prompt: "Where would you expect to find a Nile monitor?",
        choices: [
          { id: "bank", text: "A sunny riverbank with nearby cover" },
          { id: "ice", text: "A frozen ocean ice sheet" },
          { id: "sky", text: "Flying above the clouds" },
        ],
        correctId: "bank",
        explanation:
          "It uses sunny basking places and usually stays near water.",
        sourceIds: ["monitor-fwc"],
      },
    ],
    sources: [
      {
        id: "monitor-fwc",
        title:
          "Florida Fish and Wildlife Conservation Commission: Nile Monitor",
        url: "https://myfwc.com/wildlifehabitats/profiles/reptiles/lizards/nile-monitor/",
      },
      {
        id: "monitor-adw",
        title: "University of Michigan Animal Diversity Web: Varanus niloticus",
        url: "https://animaldiversity.org/accounts/Varanus_niloticus/",
      },
    ],
    reviewedAt: "2026-09-20",
  },
];
