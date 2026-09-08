# Sophia's Animal World — African Savanna MVP

## One-sentence vision

A joyful 3D exploration game where children roam living habitats, observe animals, answer tiny voice-guided quizzes, photograph species, and build a beautiful interactive field book.

## Product promise

The game should make learning feel like discovery, not homework. A child should be able to wander freely, notice an animal behaving naturally, learn three memorable facts, take a satisfying photograph, and feel genuine excitement when the animal appears in their personal field book.

Working title: **Sophia's Wild World**  
First biome: **African Savanna**  
Initial audience: **ages 6–10**, playable with minimal reading  
First platform: **desktop web**, with tablet support considered from the beginning

## The school-showcase story

This is not only a game for children; it is a visible example of what a child can create by directing AI with imagination, questions, taste, and revision.

The project should preserve Sophia's authorship from the beginning:

- Credit: **“Created by Sophia, age 7, with AI and help from her mom.”**
- Keep a simple **Creator's Log** containing Sophia's original ideas, decisions, sketches, voice notes, questions, and changes she requests after playtesting.
- Add a parent/teacher-facing **How We Made It** page outside the child gameplay flow.
- Show the real process: idea → plan → animal research → asset creation → code → testing → revision.
- Explain that AI is a tool, while Sophia supplies the goal, creative direction, evaluation, and final decisions.
- Include a classroom-friendly two-minute demo path that works without accounts or setup.
- Eventually provide a small “Design your own animal encounter” classroom activity using a printable or local-only template.

The showcase should avoid implying that the child typed one magic sentence and AI produced a finished game. Its real educational power is showing that children can direct an iterative creative and technical process, check facts, discover problems, and improve what they made.

---

## Core player loop

1. **Explore** the savanna on foot.
2. **Notice clues** such as tracks, calls, movement, feathers, dung, or silhouettes.
3. **Approach an animal** without getting so close that it retreats.
4. **Meet the animal** through a short narrated introduction.
5. **Answer three questions**, one at a time, using large visual choices.
6. **Enter photo mode** when the player reaches a good observation position.
7. **Take a photograph**; reward composition, distance, visibility, and interesting behavior.
8. **Unlock the species** in the field book, along with the photo the player took.
9. **Revisit the animal page** to inspect a walking 3D model, hear its call, and explore facts and stats.
10. **Continue the safari** toward the next clue or animal.

The quiz should not block discovery forever. If a child answers incorrectly, the narrator gives a warm explanation and lets them try again or continue. Curiosity wins; nobody gets sentenced by the Zebra Court.

---

## African savanna starter roster

Use ten visually distinct animals that introduce different diets, body plans, social systems, and ecological roles.

| Animal | Learning hook | Signature behavior in game |
| --- | --- | --- |
| Plains zebra | Stripes, herd life, grazing | Herd bunches together and flicks tails |
| African elephant | Trunks, family groups, ecosystem engineering | Sprays dust or reaches for branches |
| Giraffe | Height, tongue, browsing | Walks between acacias and feeds overhead |
| Lion | Pride structure, hunting, resting | Rests in shade; occasional roar |
| Cheetah | Speed, acceleration, solitary life | Scans from a termite mound or performs a short sprint |
| Spotted hyena | Powerful jaws, clans, misunderstood behavior | Trots in a group and vocalizes |
| Common ostrich | Largest living bird, eggs, running | Runs, pecks, or displays wings |
| Common warthog | Tusks, burrows, kneeling to feed | Kneels while grazing; trots with tail raised |
| Thomson's gazelle | Speed, vigilance, predator avoidance | Stots or snaps to alert posture |
| Hippopotamus | Semi-aquatic life, grazing, territorial behavior | Surfaces, yawns, and moves between water and shore |

Scientific accuracy note: lock each species to a specific common and scientific name. Do not mix facts from similar species (for example, plains zebra vs. Grevy's zebra or common hippo vs. pygmy hippo).

---

## Quiz design

Each first encounter has exactly three questions:

1. **Spot it** — a visible body or behavior clue.
2. **Understand it** — diet, habitat, movement, communication, or social life.
3. **Connect it** — its ecological role, adaptation, conservation, or relationship with another species.

Question rules:

- Three large answer choices, with pictures whenever possible.
- Narrate the question and every answer choice.
- Use plain language and one scientific idea per question.
- Never shame an incorrect answer.
- Give a one-sentence explanation after every answer.
- Randomize answer order, not the factual wording.
- Avoid trick questions and ambiguous absolutes.
- Store citations and reviewer notes in the content data even if they are not shown in the children's interface.

### Example: plains zebra

1. **Does this zebra have black spots, black stripes, or purple zigzags?**  
   Answer: Black stripes. Each zebra has its own stripe pattern.
2. **What does a zebra mostly eat: grass, fish, or fruit?**  
   Answer: Grass. Zebras are grazing herbivores.
3. **Why is living in a herd useful: finding treasure, watching for predators, or building nests?**  
   Answer: Watching for predators. More eyes and ears can notice danger.

### Example: elephant

1. **Which body part can an elephant use to smell, drink, and pick things up?**  
   Answer: Its trunk.
2. **What does an African elephant eat: plants, only insects, or other elephants?**  
   Answer: Plants, including grasses, leaves, bark, and fruit.
3. **How can elephants change their habitat?**  
   Answer: By opening paths, moving seeds, digging for water, and pushing over vegetation.

---

## Field book

The field book is the heart of long-term collection and learning.

### Collection view

- Ten illustrated species cards for the first biome.
- Undiscovered animals appear as inviting silhouettes with clue text, not frustrating blank locks.
- Each discovered card shows the player's best photograph and discovery date.
- Filters: all, discovered, undiscovered, herbivores, carnivores, birds, mammals.
- Biome completion meter, but no pressure timer.

### Species page

- Player's best photograph plus a small photo gallery.
- Interactive 3D model in a habitat vignette, idling and walking.
- Common name and scientific name, with pronunciation audio.
- Animal call, where appropriate and ethically sourced.
- Stats displayed visually: height/length, weight range, speed, diet, lifespan, social group, active time, habitat, and conservation status.
- “Amazing adaptations” section with three memorable facts.
- “Its job in the savanna” ecological-role section.
- Range map.
- Size comparison beside a child, bicycle, or familiar object.
- Quiz replay and optional harder questions.
- “Look again” challenge prompting the player to photograph a behavior, group, or habitat interaction.

Avoid presenting one exact number when biology varies. Use ranges, qualifiers, sex/age distinctions where relevant, and units appropriate to the player's locale.

---

## World design

Build a compact but convincing safari reserve rather than a giant empty map.

### Landmark zones

- Arrival camp and field station
- Open grassland
- Acacia grove
- Watering hole
- Rocky kopje
- Seasonal stream and muddy bank
- Termite-mound overlook
- Shaded hippo pool

Each zone should support two or three species and make navigation possible by memorable silhouettes. Paths may guide young players, but walking off-path should be allowed where safe.

### Living-world systems

- Morning-to-evening lighting cycle, initially cosmetic and slow.
- Ambient birds, insects, wind, grass, and distant calls.
- Small herds and groups rather than isolated museum specimens.
- Simple needs and schedules: drink, graze/browse, rest, scan, socialize, travel.
- Animal comfort radius: approaching too quickly makes an animal alert, retreat, or move away; it does not attack the child avatar.
- Natural interactions in later milestones: oxpeckers on large mammals, predators causing vigilance, animals gathering at water.

Do not turn wild animals into cuddly pets. Wonder comes from observing their real lives.

---

## Photography system

Photo mode should be delightful even in the first prototype.

- One-button camera access.
- Gentle zoom and optional camera stabilization.
- Animal name is not revealed before first successful identification unless accessibility mode requests it.
- Frame feedback: animal visible, not too far away, face/body unobstructed, behavior captured.
- Quality tiers should reward a better view without punishing imperfect motor control.
- Save a lightweight in-game image or thumbnail locally.
- First valid photo unlocks the field-book entry.
- Better later photos can replace the cover image.
- Special photo badges: group, baby, feeding, running, drinking, calling, sunset silhouette.

For child privacy, do not require accounts or collect real-world camera images. This is an in-game camera only.

---

## Narration and accessibility

- Every essential instruction, question, answer, and field-book summary can be heard aloud.
- Subtitles always available and synchronized with narration.
- Large touch targets and controller/keyboard support.
- Reading modes: narrated beginner and independent reader.
- Dyslexia-friendly font option, reduced-motion option, color-independent cues, volume controls, and remappable inputs.
- Repeat button on every spoken line.
- Player can choose a guide voice, but the writing should have one warm, curious personality.
- Downloaded/local audio is preferable for predictable cost, latency, and child safety. Browser text-to-speech is acceptable for an early prototype.

---

## Recommended technical shape

### Web game

- **TypeScript + Vite** for the application shell.
- **Three.js** with **React Three Fiber** if the team prefers React; plain Three.js is also acceptable if the existing codebase is simpler that way.
- **Rapier** or lightweight custom collision for terrain, player movement, and trigger volumes.
- **Zustand** or a small explicit state machine for game state.
- **glTF/GLB** for animals, player, props, and animation clips.
- **Howler.js** or Web Audio for narration, calls, music, and spatial ambience.
- **IndexedDB** for saves, photographs, settings, and field-book progress; localStorage only for tiny preferences.
- **Vitest + Playwright** for logic and browser-path testing.

### Performance targets

- Playable on a typical school Chromebook and a 13-inch laptop.
- First meaningful interaction within roughly 5–8 seconds on an ordinary connection.
- Lazy-load animals, audio, and high-resolution textures by zone.
- Use compressed textures, mesh compression, LODs, instancing for vegetation, pooled particles, and capped device pixel ratio.
- Provide a low-quality mode automatically when frame rate remains low.
- Initial target: stable 30 FPS on lower-end hardware; 60 FPS when capable.

### Architecture principle

Species content must be data-driven. Game systems should not contain zebra-specific or lion-specific logic except where a reusable behavior requires a parameterized component.

Suggested structure:

```text
src/
  app/
  game/
    player/
    world/
    animals/
    camera/
    encounters/
    audio/
  field-book/
  content/
    biomes/
    species/
    quizzes/
  state/
  accessibility/
  ui/
public/
  models/
  textures/
  audio/
  images/
```

### Species data sketch

```ts
type Species = {
  id: string;
  commonName: string;
  scientificName: string;
  biomeIds: string[];
  taxonomy: { class: string; order: string; family: string };
  diet: string[];
  habitats: string[];
  conservationStatus: string;
  stats: Record<string, { min?: number; max?: number; unit?: string; note?: string }>;
  adaptations: Fact[];
  ecologicalRole: Fact[];
  quizzes: QuizQuestion[];
  model: ModelAsset;
  audio: AudioAssets;
  spawn: SpawnRules;
  behaviors: BehaviorConfig[];
  sources: SourceRecord[];
};
```

Build a small content-validation script that rejects missing narration, duplicate IDs, invalid answer indexes, uncited factual claims, inaccessible image alt text, or nonexistent asset paths.

---

## Future travel system

The long-term world map is an expedition atlas.

- The **airport** is the grounded travel method: choose a region, board a short playful flight sequence, land at a new field station.
- **Ancient wildlife portals** can later unlock as a magical fast-travel layer after a biome is substantially explored.
- Each biome has its own field station, guide character, weather, soundscape, equipment, species collection, and conservation story.
- Possible next biomes: Amazon rainforest, North American forest, Arctic tundra, coral reef, Australian outback, wetlands, deep ocean, and prehistoric worlds as an explicitly separate evidence-based mode.

There are roughly millions of described living species across all life, so the game should not promise literal completion of every documented animal. Use expandable goals: complete a local expedition, a biome collection, an animal family, or a themed quest.

---

## Visual-asset plan

For each starter species, eventually prepare:

- One photorealistic hero image in its correct savanna habitat.
- One transparent or neutral-background reference image for collection cards.
- Front, side, rear, and three-quarter model references if generating a 3D asset.
- Adult male/female or juvenile references only where visually or behaviorally important.
- One optimized, rigged GLB with idle, walk, run, eat/drink, alert, and one signature animation.
- A lower-detail distant LOD.
- Footprints, silhouette, icon, range map, and size-comparison artwork.
- Properly licensed or original call/audio clips, with provenance.

Photorealistic images should depict realistic anatomy, habitat, scale, group size, lighting, and behavior. Keep a species asset manifest containing prompt/version, review status, license/source, model polygon count, texture sizes, animation list, and scientific-review notes.

---

## Milestones

### Milestone 0 — Repository foundation

- Create project shell, formatting, linting, tests, CI, README, and content schema.
- Establish performance budget and asset naming conventions.
- Add a tiny debug world and persistent save versioning.

### Milestone 1 — Vertical slice: “Meet the Zebra”

- Small grassland area with player movement and camera.
- One animated zebra with graze, walk, alert, and retreat states.
- Proximity introduction and three-question narrated quiz.
- Photo mode and first-photo detection.
- Zebra field-book page with saved photograph and rotatable walking model.
- Keyboard, touch-friendly UI, subtitles, volume, and reduced-motion setting.

**Vertical-slice acceptance test:** A first-time child can enter, find the zebra, finish the quiz, photograph it, and open its completed field-book page without adult instruction.

### Milestone 2 — Savanna expedition

- Expand to all landmark zones.
- Add the other nine starter species.
- Add clue trails, ambient life, animal group behavior, audio, progress map, and ten field-book pages.
- Add simple quests and photo badges.
- Optimize for Chromebook-class devices.

### Milestone 3 — Polished public demo

- Guided first five minutes plus free exploration.
- Final narration, music, sound mix, onboarding, loading experience, error recovery, and offline-friendly asset caching.
- Scientific and educational review.
- Child playtesting, accessibility testing, browser/device matrix, and privacy review.
- Deploy as a static web app where practical.

### Milestone 4 — World expansion platform

- Biome authoring tools and validation.
- Airport/world atlas.
- Downloadable biome packs or streamed zone bundles.
- Optional family profiles and cloud saves only after privacy architecture is designed deliberately.

---

## Small quests for the savanna

- **Stripe by Stripe:** Find and photograph three zebras; notice that their patterns differ.
- **The Watering-Hole Watch:** Photograph three species using the same water source.
- **Built for Lunch:** Match giraffe, zebra, warthog, and elephant mouth/body adaptations to their foods.
- **Who Made These Tracks?:** Follow footprints without being told the animal's name.
- **Fast, Faster, Patient:** Compare how gazelles, cheetahs, and lions use movement differently.
- **Savanna Gardener:** Discover how elephants alter vegetation and move seeds.
- **Not the Villain:** Learn how spotted hyenas hunt, scavenge, communicate, and live in clans.
- **Golden Hour:** Take a clear photograph near sunset.

Quests should encourage observation and comparison rather than repetitive collection.

---

## Educational and scientific guardrails

- Every factual claim has a source and last-reviewed date.
- Prefer authoritative sources such as IUCN, Smithsonian, San Diego Zoo Wildlife Alliance, Animal Diversity Web, peer-reviewed literature, and recognized conservation organizations.
- Conservation status must include the assessment date because status can change.
- Clearly separate typical behavior from universal behavior.
- Avoid human moral labels such as “mean,” “lazy,” or “bad.”
- Explain predation honestly but without graphic imagery.
- Represent African landscapes as real ecosystems, not a single generic yellow plain.
- Credit local and African scientists, parks, conservation groups, and communities when the game expands into real locations and conservation stories.
- Have an animal expert review content before public release.

---

## Child-safety and privacy baseline

- No chat, public usernames, direct messages, ads, behavioral advertising, or location collection.
- No external links in the child play area.
- Local-first progress for the MVP.
- No requirement to enter a real name, age, email, school, or photograph.
- Parent gate for settings, purchases, account features, or leaving the game.
- If accounts or analytics are added later, design for COPPA and applicable privacy rules before implementation.

---

## Definition of done for the first public version

- All ten species can be found, quizzed, photographed, and viewed in the field book.
- Every species has three reviewed questions, narration, core stats, adaptations, ecological role, sources, and accessible text.
- Save/load is reliable across refreshes and schema upgrades.
- A complete playthrough works using keyboard alone and with narration enabled.
- The game handles missing assets and failed audio gracefully.
- No essential UI is cropped on a 13-inch laptop or common tablet size.
- Performance stays within target on the agreed low-end test device.
- At least five children in the target age range can complete the zebra loop; observations are recorded and the largest confusion points are fixed.
- Scientific, accessibility, privacy, and asset-license checklists are complete.

---

## First coding-agent assignment

> Build the repository foundation and a narrow vertical slice for **Sophia's Wild World**, a child-friendly 3D web exploration game. Use TypeScript and Vite, with Three.js/React Three Fiber if React is selected. Do not attempt the full ten-animal savanna yet. Implement a small performant grassland, third-person player movement, one animated placeholder zebra driven by data, proximity encounter state, a three-question narrated quiz, photo mode, local persistence, and a field-book page showing the captured image plus a rotatable looping zebra model. All species facts, questions, assets, spawn parameters, and behavior configuration must live in validated content data rather than component code. Include subtitles, replay-audio controls, keyboard accessibility, reduced motion, a low-quality graphics mode, tests for quiz/progression/save logic, and a clear asset manifest. Use placeholder assets where final licensed assets do not yet exist. Write a README with local setup, controls, architecture, content-authoring instructions, asset budgets, and the vertical-slice acceptance test. Stop after the complete zebra loop is working and report gaps, performance, and the exact next tasks.

---

## Decisions to make after the repository exists

These do not block the vertical slice:

- Final title and logo.
- Child avatar: Sophia-inspired explorer, customizable explorer, or first-person view.
- Narrator: wildlife guide, field-station radio, talking field book, or Sophia's own voice.
- Art direction: photoreal animals in a stylized-real landscape is likely the best balance.
- Whether quizzes occur before the first photo, after it, or as a blend. Recommended: one observation prompt before the photo, two questions after, so learning does not interrupt the magical first sighting.
- Camera scoring complexity.
- Engine choice if the web prototype reveals performance limits.

## Recommended first creative decision

Make the player a **junior wildlife researcher**, not merely a tourist. Their photographs and observations help the field station complete its living atlas. That gives every quiz, track, picture, and field-book entry a coherent purpose—and lets the game grow into real citizen-science ideas later without pretending the first version is collecting research-grade data.
