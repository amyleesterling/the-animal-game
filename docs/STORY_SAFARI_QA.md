# Story safari and asset revision verification

Date: 2026-09-20. Branch: `codex/story-safari`.

## Observed model quality

Four OpenAI-generated references were inspected before upload. The completed
Meshy batch produced four GLBs and sixteen cardinal renders. All sixteen were
visually inspected, including rear and opposite-side geometry.

- Lion: recognizable feline face, continuous mane, four legs, intact tail.
  The large fragmented mane/head shapes in the rejected version are absent.
- Ostrich: two distinct legs and connected wings/feather coat. The large
  detached-looking sheets in the rejected version are absent. Feather detail
  is still a simplified mesh surface rather than individual animated feathers.
- Hippo: broad continuous muzzle with small nostrils on top; the rejected
  rounded paired nose lobes are absent.
- Land Cruiser: vintage FJ40 silhouette, four road wheels, rear spare, ivory
  roof, and roof rack with luggage. Slight AI-generated surface irregularities
  remain; this is a playtest asset, not a mechanical CAD model.

The optimized lion, ostrich, and hippo were also opened in the real gallery.
Lighting, textures, grounding, and interactive viewing were inspected. Contact
shadows improve grounding. Versioned model requests prevent a refreshed
manifest from silently loading cached old replacements.

The actual generated jeep was inspected beside Sophia at the giraffe stop.
Its authored forward direction is -X, established from cardinal views and raw
geometry bounds, and corrected to the world's +X convention. All four models
preserve every non-image buffer; only textures were resized to 1024px. Shipped
sizes are 1.92 MB lion, 1.49 MB ostrich, 1.10 MB hippo, and 2.15 MB jeep.

Generation: https://github.com/amyleesterling/the-animal-game/actions/runs/35529496947
All four succeeded and reported 120 credits. Receipts are in
`SAFARI_ASSET_GENERATION.json`; no account balance, credential, or signed service
download URL is committed.

## Story and save checks

The seven-stop browser scenario loads actual animal files and captures seven
actual JPEG canvas photographs. It tests wrong-answer feedback followed by a
reload, retry, chapter advancement, a mid-route reload, the ending, seven saved
field-book images, revisiting the zebra, and another reload. The actual jeep
must load successfully in this scenario.

Phone tests cover readable functional text, touch movement, scene height,
question and camera controls, and field-book access without horizontal
overflow. Additional scenarios exercise missing animal files, corrupt-save
preservation and explicit reset, a deliberately delayed initial IndexedDB read,
and a deliberately delayed reset write. The classic save remains separate.

Manual browser inspection covered the 1280×720 desktop entry, zebra guide,
quiz, photograph and elephant transition; the 390×844 phone elephant encounter
and photograph; and the actual jeep/giraffe view. A nearby tree initially
obscured the giraffe arrival camera. Tree placement now leaves clearance for
all seven default arrival and guide camera corridors.

Independent review found and fixed initial-read and reset-write races, static
mesh culling, and sunlight shadow-resource cleanup. Movement labels and the
instant next-stop travel instruction were corrected. Browser and generation
tests use isolated test data; no user field book was reset during inspection.

## Checks executed

- `npm run format:check`: passed.
- `npm test`: 111 tests passed across eleven files.
- `npm run build`: TypeScript and Vite production build passed.
- The six new story browser scenarios passed during targeted development.
- All image-generation requests were preceded by eleven passing offline
  submission/resume/download safeguard tests and an actual-reference dry run.

The final integrated browser run and hosted deployment are recorded in the
pull request and shared Kanban handoff. Chromium phone emulation does not
establish performance on a physical iPhone or Android phone. No real-device,
child playtest, or scientific-review signoff is claimed. Animals are static;
Sophia is animated; jeep travel changes stops instantly rather than simulating
driving. Those limitations are intentional for this playtest.
