# Soph and the nine animal previews

Verified on 2026-09-20, Windows, Chrome/Chromium and the Codex in-app browser.

## Delivered behavior

- Supplied Soph character replaces the explorer placeholder after loading.
  Its authored walk plays only during actual movement; collision controls
  determine travel. Stationary and reduced-motion poses stay still.
- Missing or undecodable avatar assets retain the procedural explorer.
  Photo mode preserves the existing unobstructed zebra framing.
- The separate animal workbench loads one of nine textured Meshy models at
  a time, supports mouse/touch orbit, keyboard and button turn/zoom/reset,
  and releases the previous model when changing selection.
- The original zebra quiz, photography and browser-local field book remain
  the playable encounter. The nine new species are static art previews.

## Evidence

- TypeScript, formatting and production build passed.
- Complete browser suite: 13/13 passed, including the full zebra expedition,
  phone portrait/landscape touch controls, saved photo/reload, 2 FPS guide,
  texture/model failures, Soph loading and fallback, and actual load/rotation
  of each of the nine generated animals.
- Unit suite passed. It includes actual skinned GLB joint animation,
  horizontal root-motion removal, grounded normalization, subpath URLs,
  decoder failure and resource lifecycle checks. Eight generation safeguard
  tests use isolated subprocesses with all network mocked/disabled; they
  verify bounded billing, failure, resume and Windows checkpoint handling.
- Screenshots inspected for the supplied character, all nine actual models,
  and a 390px-wide phone gallery. The in-app browser showed no console errors
  or warnings in the normal character and animal-preview flows.
- A separate reviewer inspected the combined character, gallery and Meshy
  workflow. The identified subpath, texture-decoder and checkpoint issues
  were fixed and verified.

The Meshy generation itself is verified by successful Actions run
[35526999078](https://github.com/amyleesterling/the-animal-game/actions/runs/35526999078):
9/9 textured GLBs, 135 reported credits. Source prompts/task IDs are in
`TEST_ANIMAL_GENERATION.json`; optimized file hashes and sizes are in
`public/models/test-animals/manifest.json`. All non-image buffers were
verified unchanged by texture optimization.

## Practical limits

No real iPhone, Android, Safari, child playtest, or wildlife-expert review was
performed. Phone checks are browser emulation and layout checks. The nine
new animals have no rig or animation clips. Art review is still needed:
the lion has a small detached fragment near its tail, and some models have
stylized proportions and surface artifacts. These files are explicitly test
assets, not production or scientifically approved models. No real-Earth
terrain integration is part of this change.
