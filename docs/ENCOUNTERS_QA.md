# Nearby animal discovery verification

Branch: `codex/proximity-animal-discovery`. Date: 2026-09-20.

Status: all 17 distinct encounter, safari, and driving browser scenarios have
passing results across targeted runs. The final shared dialog-close correction
passed all three affected cases. TypeScript and owned-file formatting checks
pass; the coordinator also reported 164 passing unit tests and a successful
production build.

The new suite, `tests/e2e/encounters.spec.ts`, exercises real scene movement
using keyboard controls and reads the world's diagnostic positions. It does
not inject animal, vehicle, player, or proximity state.

Verified coverage:

- Walk from the zebra arrival to the elephant without changing the selected
  route. Confirm that the nearby elephant prompts automatically, a wrong name
  allows retry, typing movement keys keeps the world still, and correct naming
  opens its quiz without moving Sophia. Take a real photograph and reload it
  as the first discovery, before the zebra.
- Steer the actual jeep to the elephant while the route still selects the
  zebra. The prompt brakes the vehicle; Skip supplies the canonical name,
  safely exits the jeep, and resumes the elephant quiz without relocating it.
- Dismiss with Keep exploring and Escape, remain quiet while nearby, then
  leave the encounter range plus its four-metre margin and approach again.
  Manually reopen the prompt without leaving the range, close it, and move
  immediately. A named but unfinished animal offers Continue discovery without
  retyping; it resumes the camera step. A completed zebra does not prompt again
  while another stop is selected.
- Use touch portrait and landscape layouts to check focused input, readable
  functional text, scrollable access to every action, and submission.
- Load a strict version-one IndexedDB fixture with a zebra photograph and an
  unfinished elephant answer. Preserve the image, settings and feedback;
  the next normal save durably writes version two.

The old safari and driving suites identify each newly met animal before the
existing quiz. Their prior motion, pause, photograph, story completion, save
protection, and route-lock assertions remain in place.

The off-route elephant question screenshot and phone naming screenshots at
390×844 and 667×375 were inspected. Text is readable, the input has a visible
focus ring, and every naming action is visible. Files are under the sibling
`../encounter-browser-results/` directory so trace HTML cannot trigger Vite
reloads. The dismissal repeat uses `../encounter-dismissal-results/`, and
the existing suites use `../encounter-regression-results/`.
The final affected cases use `../encounter-final-results/`.
The last run after fixing synchronous close uses `../encounter-close-results/`.

Inspected screenshots include:

- `../encounter-browser-results/encounters-walking-off-rou-3f87d--saves-its-first-photograph/elephant-off-route-question.png`
- `../encounter-browser-results/encounters-phone-animal-na-27e17-e-and-all-actions-reachable/animal-name-portrait.png`
- `../encounter-browser-results/encounters-phone-animal-na-27e17-e-and-all-actions-reachable/animal-name-landscape.png`
- `../encounter-final-results/driving-phone-driving-held-6621c-rait-and-landscape-controls/jeep-driving-phone-landscape.png`

The first run passed four tests and failed the final movement in the dismissal
test: it assumed walking remained north-facing after jeep exit. The world
intentionally preserves the vehicle's camera heading. Correcting the test to
use Back and Left passed the same completed-animal suppression assertion;
the app did not change for that failure.

The existing phone driving path can now enter another animal's encounter
range. Its first run correctly paused at the new naming dialog, so the test
was adapted to choose Keep exploring before continuing the unchanged reverse,
brake, and exit assertions. That affected phone case passed on rerun.

The strengthened manual-reopening check found an application defect: the
native dialog became hidden before its queued close event resumed world
input. Holding a fresh movement key during that gap dropped the keydown;
stale-key protection then correctly ignored repeats. The interface now closes
and resumes synchronously for button, Escape, and programmatic paths. Queued
close events are idempotent and ignore reopened dialogs. The same immediate
movement assertion passed after this source correction.

Commands and final results:

- `node node_modules/@playwright/test/cli.js test tests/e2e/encounters.spec.ts`:
  five distinct scenarios passed across the initial run and affected repeats.
- `node node_modules/@playwright/test/cli.js test tests/e2e/safari.spec.ts tests/e2e/driving.spec.ts`:
  all six safari scenarios and five desktop driving scenarios passed together;
  the phone case passed after adapting its expected nearby-animal pause.
- `node node_modules/@playwright/test/cli.js test tests/e2e/encounters.spec.ts tests/e2e/driving.spec.ts -g "dismissal stays|held touch|modal and blur"`:
  final shared-close verification passed 3/3: desktop pause 14.0 seconds,
  phone driving 21.7 seconds, and strengthened encounter flow 34.7 seconds.
- `node node_modules/typescript/bin/tsc --noEmit` and Prettier checks passed.

Every browser command above used an explicit sibling `--output` directory as
listed above. Test durations describe this local run, not device performance.

The legacy fixture uses a small generated JPEG only to test exact preservation
of stored data. New discovery photographs come from the game renderer. No
paid generation API or external recognition service is called by these tests.

Browser screenshots and traces are local artifacts outside the repository. Each run uses a
separate output directory when another browser suite is active. Chromium with
software WebGL and emulated mobile viewports cannot establish performance or
on-screen keyboard behavior on a physical phone.
