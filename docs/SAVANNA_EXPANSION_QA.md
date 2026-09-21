# Savanna expansion verification

Browser verification on 2026-09-21 covered **41 distinct passing cases**:
four character cases passed before a development-server outage, then the
remaining 37 passed after the packaging repair. The resumed run took 12.7
minutes and finished with no failed tests. These are two run segments, not a
claim that the first 41-case command completed successfully.

## Browser and coverage

The launched browser reported **Chrome 153.0.8010.48** on Windows. Playwright
used one worker and the project's ANGLE/SwiftShader WebGL configuration.
The local target was `http://127.0.0.1:5173/`.

Observed viewport sizes were 2048×1169, 1440×960, 1280×720, 820×1180,
390×844, 667×375 and 568×320 CSS pixels. Touch tests used browser emulation.

The five new expansion cases verified:

- A real secretarybird model, naming, wrong-answer retry, all three quiz
  questions, reload between questions, a saved photograph and return to the
  first unfinished story stop.
- A completed version-two seven-stop save across a new page session. Loading
  preserved its stored value; the next settings save wrote schema three with
  all seven photos intact and 25 empty discovery entries.
- Enlarged insect and burrow viewing notes, three-question completion and
  actual rendered close-up photographs of the dung beetle and naked mole-rat.
- Selected-model loading, no more than eight retained animal models/two
  pending loads, eviction and reloading, and automatic reapproach after
  dismissing an animal and visiting distant clearings.
- All 32 field-guide entries, bird/insect filters, scientific-name search,
  empty results, cited details, Wikipedia links and quiz explanations. Phone
  portrait and short landscape checks found no horizontal overflow, no text
  below 12px and form controls/disclosure labels at least 16px.

The existing suite also passed the complete seven-stop story, version-one
save migration, off-route encounters on foot and in the jeep, pause/reset
races, keyboard/touch controls, classic photography, protected saves,
model/texture failures, the original model gallery, and the two characters'
welcome/exploration/photo transitions.

## Review findings and run interruption

The new model cache exposed a dismissal bug during source review: an evicted
animal could remain suppressed because its far-away distance stopped being
reported. The UI now rearms against the explorer's position and every animal
coordinate. The new distant-visit regression passed. Restart confirmation
also now accurately says that it replaces all 32 discoveries.

The initial browser command lost its server while starting the fifth case.
Subsequent navigations failed with `ERR_CONNECTION_REFUSED`; the run was
stopped and its traces retained. The coordinator traced the Vite crash to
Windows `EPERM` when reading a newly prepared buffalo GLB. File permissions
were repaired without changing asset bytes, and Vite was restarted. Only the
remaining 37 cases were run again; their result was 37/37 passing.

## Commands and retained evidence

Run from the repository root:

```powershell
node node_modules/@playwright/test/cli.js test --workers=1 --output='../savanna-qa/e2e-full' --reporter=line
node node_modules/@playwright/test/cli.js test --workers=1 --grep-invert 'the centered welcome pair repeats|Sophia and Cora welcome without|reduced-motion pair stays stationary|the safari pair walks together' --output='../savanna-qa/e2e-after-packaging-repair' --reporter=line
```

Artifacts are local siblings of the repository, deliberately outside Vite's
watched source tree. The original outage traces and four passing character
cases remain in `../savanna-qa/e2e-full/`. The successful resumed run and its
`passed` summary are in `../savanna-qa/e2e-after-packaging-repair/`.
An earlier independent migration/profile run passed 2/2 in 44.3 seconds under
`../savanna-qa/e2e-profiles-migration/`; those cases passed again in the final
37-case segment.

Inspected screenshots in the resumed output include:

- `savanna-expansion-a-bonus--7969e-oad-and-its-real-photograph/secretarybird-camera.png`
- `savanna-expansion-small-an-366cd-burrow-close-up-photographs/lamarcks-dung-beetle-macro-camera.png`
- `savanna-expansion-small-an-366cd-burrow-close-up-photographs/naked-mole-rat-macro-camera.png`
- `savanna-expansion-phone-sa-6a97c-ortrait-and-short-landscape/bird-profile-portrait.png`
- `savanna-expansion-phone-sa-6a97c-ortrait-and-short-landscape/bird-profile-landscape.png`

The bird, macro animals and controls are readable. In the desktop live macro
preview, the fixed story panel covers a small part of the animals' rear edge;
it does not prevent interaction or capture. Full saved-JPEG inspection is a
separate coordinator gallery check. The field-book overview screenshot does
not show enough of both saved images to substitute for that inspection.

These checks do not establish physical-phone performance, expert anatomical
accuracy or child playtesting. Version-one/two migration photos are explicit
tiny fixture images; new discovery photographs came from the actual scene.

## Integrated code and asset checks

The final serialized unit run passed **348/348 tests in 18 files** in 147.69
seconds (`node node_modules/vitest/vitest.mjs run --maxWorkers=1`). Earlier
parallel runs exceeded time limits in offline generation subprocess fixtures
while the browser suite was active. Those fixture suites now allow 20 seconds
per test; individual child processes retain their 15-second limit. The final
run had no assertion failures or timeouts.

This includes **all 32 production GLBs**: feet grounded at Y=0, configured
height, embedded texture bindings, static/cullable geometry, disposal, and all
bounding-box corners inside portrait, 4:3 and wide landscape camera frames.
Expansion-animal checks use the same close-up setting as the world. After the
final camera adjustment, the focused real-model suite passed again: **38/38**
in 1.86 seconds. Original story-camera distances remain unchanged.

The preparation suite passed **17/17 tests**, including generation receipt
validation, rejected-task blocking, unchanged geometry, transactional rollback,
partial-write cleanup and a real Windows inherited-permission comparison. The
publisher now creates a fresh sibling file in the destination directory before
atomic replacement, including rollback, instead of moving a protected temporary
file into public assets. No access-control API or permission broadening is used.

All 25 published asset hashes match their manifest. They total **30,231,928
bytes**, with embedded textures no larger than 1024 pixels. The accepted
authored porcupine was inspected in five views; its final optimized file is
628,352 bytes. `npm run build` and `npm run format:check` passed after the
packaging repair.

## Complete saved-photo review

A separate fresh-browser walkthrough visited all 25 new clearings, loaded each
real model, skipped naming, advanced through all three questions, and saved an
actual scene photograph. The field book showed **25/32** before and after reload.
There were no page errors or failed model responses. This walkthrough tested
completion using the first answer choice; correct-answer and retry behavior is
covered by the dedicated browser and state tests.

All 25 JPEGs were inspected in five contact sheets, with individual checks of
the authored porcupine, monarch and springhare. Evidence is in
`../savanna-qa/in-game-gallery/`, including `result.json` and `sheet-1.png`
through `sheet-5.png`. Saved photos contain no overlaid interface panels.

That review found the taller birds too distant and the vervet's turned face
pointing away. The final update fits every expansion species to its photo frame
and reverses the vervet's display orientation. These are camera/presentation
changes; configured animal heights and player observation positions are kept.

After this final adjustment, all **five expansion browser cases passed again
in 2.4 minutes**, with no failures. Command:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/savanna-expansion.spec.ts --workers=1 --output='../savanna-qa/e2e-final-camera' --reporter=line
```

The four affected species (secretarybird, marabou stork, vervet monkey and
African buffalo) then completed a second fresh-browser photograph walkthrough.
All four saved and survived reload, without page errors or failed model
responses. Their final JPEGs and contact sheet were visually inspected: complete
bodies fit the frame, the birds are readable at a closer distance, and the
vervet's face is visible. Evidence: `../savanna-qa/in-game-gallery-final/`.
