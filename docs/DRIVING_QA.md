# Jeep driving verification

Date: 2026-09-20. Branch: `codex/drive-safari-jeep`.

Coordinator verification: 122 unit tests passed, including the vehicle and
safari model checks. All 19 pre-existing browser scenarios have passing
results: 18 in the regression run, and the classic touch expedition in an
isolated rerun after the shared trace-directory collision described below.
Together with the six driving scenarios, 25 distinct browser scenarios pass.
TypeScript, production build and repository formatting checks passed.

Status: six distinct driving browser scenarios passed across targeted runs.
The final chase-camera correction passed the repeated phone scenario, and both
portrait and landscape screenshots were inspected.

The browser suite in `tests/e2e/driving.spec.ts` checks the actual Three.js
vehicle and explorer diagnostics, alongside visible controls and saved story
data. Vehicle speed is signed metres per second; heading is the scene's
Y rotation. Tests use displacement and tolerances instead of exact frame
counts or wall-clock driving distances.

Verified browser coverage:

- Keyboard entry from the introduction starts and saves the story.
- Accelerating and steering move and rotate the jeep; reverse moves behind
  its heading; braking enables safe exit and walking resumes afterward.
- Settings and field-book dialogs stop the jeep. A blur signal clears held
  input, and the vehicle stays stopped after returning to the scene, including
  repeated keydown events from a key that was never released.
- A missing generated jeep model leaves the procedural roof-rack jeep usable.
- Selecting the next driving destination preserves the jeep's world position.
  The photograph and chosen stop survive a later refresh.
- Leaving photo mode and returning preserves the learned clue. Driving toward
  a revisited stop with a saved answer or learned-but-unphotographed clue keeps
  movement and exit available; getting out resumes that saved step. Two actual
  photographs remain saved after refresh.
- Real Chromium touch events hold accelerator and steering simultaneously,
  release them, reverse and brake. Portrait and landscape controls remain
  inside the viewport, with readable text and usable touch targets.

The existing seven-stop story suite remains the regression check for quick
travel, questions, photographs, field-book revisits and save failure handling.
Unit tests owned by the world engineer cover vehicle integration and collision
math; these browser tests exercise its public controls and scene state.

Screenshots are written beneath the Playwright `test-results/` directory:
desktop driving, phone portrait driving, and phone landscape driving. This
directory is ignored by Git and retained as a CI artifact. Local copies are
preserved under `generated/qa/driving/` before later Playwright runs clear the
output directory. The final phone camera verification used isolated output at
`generated/qa/driving-camera-run/` while the existing regression suite ran.

Tests use Chrome with software WebGL at 1440×960, 390×844 touch portrait, and
667×375 touch landscape. They do not establish performance on an actual phone.
The blur scenario dispatches a browser blur event and verifies real vehicle
motion afterward; it is not a physical operating-system focus test.

The view follows behind the actual jeep, with drag-to-look camera adjustment.
Its wheels remain part of the static imported mesh; wheel rotation and cabin
driving are not implemented. Jeep position and heading last for the current
session. Refreshing, restarting, or choosing a quick jump parks the jeep at
the selected stop's default parking position; photographs and story progress
remain saved. Choosing “Back to jeep & drive” changes the destination without
moving the jeep.

Independent source review found these integration issues, corrected by the
world and interface owners before the passing browser runs:

- Keep the vehicle's simulation time cap inside the driving helper so it does
  not slow existing walking and guide movement on very slow frames.
- Ignore stale keyboard repeats after pause until a direction is pressed
  afresh; clearing a held boolean alone does not prevent auto-repeat restart.
- Keep phone landscape controls visible without scrolling away from the scene.
- Allow leaving photo mode to move a parked jeep that obstructs the fixed
  photograph viewpoint, preserving the discovered clue.
- Keep driving mode active while traveling toward a previously visited stop;
  derive its saved quiz/photo mode only after leaving the jeep.
- Keep the chase camera in front of nearby tree geometry so foliage does not
  hide the jeep while driving.

The first run passed four scenarios and failed one assertion because the test
used the outdated name “African elephant” instead of the authored “African
savanna elephant.” After using the catalog's name, that route scenario passed
in 20.3 seconds. The additional saved-stage regression passed in 26.1 seconds;
the phone repeat passed in 18.7 seconds. These are test durations, not device
performance measurements.

After the camera adjustment, the isolated phone scenario passed in 28.2
seconds. An earlier concurrent run completed its application assertions but
failed during browser teardown because another run cleared its shared trace
directory; the isolated rerun resolved that test-artifact collision.

Desktop and portrait screenshots were inspected and show readable controls,
the actual textured Land Cruiser, and its chase view. The first portrait
capture happened between resize and the next render; screenshots now wait
for multiple rendered frames. The landscape capture exposed a persistent
tree canopy obscuring the jeep despite otherwise passing input/layout checks.
After correcting the camera, fresh portrait and landscape captures show the
jeep unobscured and all essential controls visible. This is a bounded visual
check of the exercised route, not proof against every possible camera angle.
