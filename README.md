# The Animal Game

**A world-exploration game imagined by Sophia and created with Amy, Cora, and AI.**

Children explore living animal habitats, observe wildlife, answer short voice-guided questions, photograph species, and build an interactive field book filled with their own discoveries.

## First expedition: African Savanna

The first version begins with ten animals: plains zebra, African elephant, giraffe, lion, cheetah, spotted hyena, ostrich, warthog, Thomson's gazelle, and hippopotamus.

The core loop is:

1. Explore the habitat.
2. Notice and approach an animal.
3. Answer three short questions based on observation and animal science.
4. Take an in-game photograph.
5. Unlock the animal's field-book page, including the player's photo, a walking 3D model, calls, stats, adaptations, ecological role, and additional facts.

## First build target

The first playable vertical slice is **Meet the Zebra**: one small grassland, one animated zebra, one complete encounter and quiz, photo mode, local save data, and one polished field-book page.

## Why we are making it

This is both an educational game and a classroom-friendly example of what children can create when they use AI as a creative and technical tool. Sophia supplies the original idea, goals, creative direction, testing, criticism, and final decisions. We will keep a Creator's Log so students and teachers can see the real process from idea to research, assets, code, testing, and revision.

## Project plan

See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for the full product, educational, technical, accessibility, privacy, content, and milestone plan.

## Play the Sunset Safari

[Start the seven-stop story safari](https://amyleesterling.github.io/the-animal-game/safari.html).
Help Sophia gather seven clues before sunset, meet seven species, and photograph
each animal for a saved field book. The vintage Land Cruiser with roof rack is
now drivable. Choose **Get in the jeep**, then use **W/S** or **↑/↓** for
forward/reverse, **A/D** or **←/→** to steer, and **Space** to brake.
**E** boards or exits when stopped with room beside the jeep. On a phone, hold
the on-screen steering and pedal buttons, then choose **Park & get out**.
Follow the direction arrow between discoveries, or use the optional quick jump.
Sophia walks with her supplied animation; animal models and vehicle wheels
currently hold static poses.

The jeep stops for trees, animals, water and the edge of the play area. Settings,
switching tabs and losing focus stop it and release its controls. Story progress
and photographs are saved; refreshing places Sophia and the jeep at the current
story stop rather than remembering the exact parking spot. See
[driving verification](docs/DRIVING_QA.md) for test coverage and device limits.

The lion, ostrich, and hippo have been rebuilt with generated reference images
and Meshy Image-to-3D. They remain available for inspection in the model gallery.
See [story and asset process](docs/STORY_SAFARI.md) and the
[generation receipt](docs/SAFARI_ASSET_GENERATION.json).

## Play the original zebra slice

[Open the hosted playtest](https://amyleesterling.github.io/the-animal-game/)
on a computer or phone. See [deployment notes](docs/DEPLOYMENT.md) for hosting,
verification commands and device limitations.

**Meet the Zebra is now a playable prototype.** Explore a small 3D savanna,
meet an animated zebra, make three discoveries, take an in-game photograph,
and open a field-book page containing your own photo and a rotatable zebra.
Progress, photographs, and preferences are saved in this browser using
IndexedDB. There are no accounts or backend services.

This original slice focuses on the plains zebra. Its field book and save remain
separate from the new seven-species story safari.
The zebra uses Amy's supplied Meshy model, **Zebra Portrait** by
**amyleerobinson**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Its textures are optimized for the game; the source has no skeleton or animation clips.
The game adds approximate procedural poses. The scenery and backup zebra remain
original procedural art. See the [asset credits](public/models/CREDITS.md)
and [provenance manifest](public/assets-manifest.json).

The explorer now uses Amy's supplied **Soph walking character**, with its
embedded walking animation. [Preview the nine next animals](https://amyleesterling.github.io/the-animal-game/animal-lab.html)
in a separate rotatable gallery. All nine textured GLBs were generated through
Meshy's API; they are static models, with seven species including the supplied
zebra now featured in the story safari. The gallery
loads one model at a time. See [generation records](docs/MESHY_GENERATION.md).

### Run locally

Requires Node.js 22.12 or newer and a browser with WebGL.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.
On Windows, use `npm.cmd` when passing extra command-line flags through
PowerShell. No API keys, environment file, or cloud account is required.

```sh
npm run check
npm test
npm run build
npm run preview
```

For the browser suite, install Chrome if it is not already available:

```sh
npx playwright install chrome
npm run test:e2e
```

The CI workflow runs types, logic/content/storage tests, a production build,
and Chromium browser playthroughs. `dist/` is a static build; this repository
does not automatically publish it.

### Controls

| Action | Control |
| --- | --- |
| Walk | W/A/S/D, arrow keys, or on-screen arrow buttons |
| Look around | Drag the landscape |
| Accessible navigation | Choose “Guide me to the zebra” or “Guide me to a good view” |
| Meet the zebra | Approach, then choose “Meet the zebra” |
| Hear instructions/questions | Read-aloud buttons; enable automatic narration in Settings |
| Photograph | Complete the three questions, open camera, adjust zoom, take photo |
| Explore a model | Drag the field-book model, or focus it and use left/right arrows |
| Close a dialog | Close button or Escape |

Wrong answers offer a clue, another try, and a way to keep discovering.
There is no timer or score penalty. A keyboard-only player can complete the
entire discovery loop using Tab and Space with the guided navigation buttons.

Settings include local-device narration, volume, reduced motion, and simple
graphics. Text always remains available. Read-aloud requires a local English
voice exposed by the browser; unsupported devices continue with written
instructions. System fonts are used without external font requests.

### Save behavior

Photographs and progress stay in this browser on this origin. Clearing browser
data, changing browsers, or changing the site's origin will not carry the
field book across. The game never requests access to a real camera.

Storage failures show a notice. Unsupported or corrupt saves are preserved,
and that visit becomes temporary until a grown-up deliberately resets the
field book. Reset requires confirmation and does not report completion until
the IndexedDB transaction commits. This is a version-1 schema; future versions
must add explicit migrations instead of silently interpreting newer data.

## Architecture and content authoring

| Location | Responsibility |
| --- | --- |
| `src/main.ts`, `src/style.css` | Accessible DOM interface and flow coordination |
| `src/game/contracts.ts` | Boundary between the UI and the world |
| `src/game/world.ts` | Habitat, player, proximity, animal behavior, photo framing |
| `src/game/zebra.ts`, `zebra-model.ts`, `specimen.ts` | GLB loading, procedural poses/fallback, resource cleanup and field-book preview |
| `src/content/` | Species, sources, quizzes, asset identifiers, spawn and behavior data |
| `src/state/progress.ts` | Explicit encounter/photo progression and save validation |
| `src/state/save.ts` | Versioned IndexedDB storage and failure reporting |
| `src/accessibility/narration.ts` | Local-device speech and readable fallback |
| `tests/unit/`, `tests/e2e/` | Content/save/state tests and real browser playthroughs |

Add facts and questions in `src/content/species.ts` using the contracts in
`types.ts`. Every factual item needs narration, source IDs, and a review date.
Each playable species has exactly three questions in spot → understand →
connect order, with three uniquely identified choices and a valid answer ID.
Add source records and an asset manifest entry before using a new asset.

`assertValidContent()` runs at startup; unit tests reject missing narration,
citations, duplicate IDs, invalid answers, and undefined assets. The roster
does not automatically make a species playable: a new species also needs a
reviewed model, reusable world integration, and encounter tests.

### Current asset and performance budgets

- The self-contained zebra GLB is served locally from `public/models/zebra.glb`:
  1,140,112 bytes, 4,297 triangles, 3,658 vertices and three 1024 × 1024 textures.
  No Meshy request or account is needed to play. A procedural zebra keeps the
  expedition usable while loading or if the asset is unavailable.
- The uploaded 8,780,956-byte export was prepared with
  `python scripts/optimize-zebra.py /path/to/original.glb` (Python + Pillow 12.3.0).
  Geometry and UVs are preserved; texture resizing/compression reduced the
  model download by about 87%. Source and output hashes are in the manifest.
  Python is only needed to regenerate the asset, not to build or play the game.
- Vegetation is instanced or merged; device pixel ratio is capped at 1.75, or
  1 in simple graphics mode. Simple graphics also reduces vegetation/shadows.
- Captures are actual 960 × 720 JPEG scene renders. The save validator limits
  image payload size and accepts only supported image data URLs.
- Target compressed JavaScript: under 200 kB for this first slice; production
  build with the GLB loader measures about 173 kB gzip.
- Target frame rate: 30 FPS on an agreed school device. Actual Chromebook
  performance, startup on a school connection, and mobile battery use have
  **not** been measured. Simple graphics is manual in this slice.

## Agent team and review process

This build uses four bounded Codex roles: integration/UI, 3D world,
content/progression/storage, and independent setup/review/QA. Ownership and
handoff instructions are in [docs/AGENT_FLEET.md](docs/AGENT_FLEET.md).

gstack's official instruction-only digest is pinned in `AGENTS.md`.
Codex runs the agents; gstack provides the review process. The full gstack
runtime and slash-command suite are not installed. See
[docs/GSTACK.md](docs/GSTACK.md) for the exact upstream version and attribution.

## Acceptance and next steps

The slice's acceptance path is: a first-time explorer starts, finds the zebra,
answers three questions, photographs it, opens the completed page, and refreshes
without losing the photo. See [docs/V1_ACCEPTANCE.md](docs/V1_ACCEPTANCE.md)
and [docs/QA_REPORT.md](docs/QA_REPORT.md) for the tested boundaries and evidence.

Next work, in order:

1. Have Sophia play the slice and record her actual decisions in the
   [Creator's Log](docs/CREATOR_LOG.md); observe at least five target-age children.
2. Obtain wildlife-expert review and replace prototype anatomy/animation with
   reviewed production assets; add licensed calls and dependable recorded narration.
3. Validate performance on a school Chromebook and tablet; add automatic quality
   adjustment, offline caching, and any needed accessibility refinements.
4. Expand the reusable encounter/world systems to the other nine savanna species.
5. Complete the larger public-release checks in `PROJECT_PLAN.md` before calling
   the ten-animal game a finished public v1.
