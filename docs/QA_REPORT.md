# Meet the Zebra — QA report

Date: 2026-09-19. Scope: the first complete zebra expedition, not the future
ten-species public release. The record includes the initial integrated-tree
checks and the subsequent low-frame-rate regression investigation.

## Result

**All five browser regression tests passed locally** with `npm run test:e2e`
in about 1.1 minutes after the slow-rendering fix. The complete mouse/button
journey and the essential Tab/Space keyboard journey both reached a
photographed zebra field-book entry. The new two-frame-per-second test also
reaches the first encounter without changing graphics or motion settings.

After the final photo-save change, the affected discovery/save/reset test was
run again with
`npm run test:e2e -- --grep "wrong answers stay friendly"`: **1 passed** in
37.4 seconds (33.5 seconds in the test). Source review confirms the shutter
guards duplicate submission and awaits persistence before opening the field
book. A later complete five-test run then checked the shared movement and
photo paths after the CI-driven guide fix, superseding the earlier local run.

| Check                                                              | Result                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Guide at two frames per second                                     | Passed after elapsed-time fix; encounter ready within the 8-second expectation             |
| Wrong answer → explanation → retry                                 | Passed; returns to the same question                                                       |
| Wrong answer → continue learning                                   | Passed; no dead end or forced perfect score                                                |
| Three questions → real scene photo → field book                    | Passed                                                                                     |
| Reload after capture                                               | Passed; the stored photo URL and discovery return                                          |
| Cancel the reset confirmation                                      | Passed; discovery remains                                                                  |
| Confirm reset → immediately reload                                 | Passed after fixing the save-commit race                                                   |
| Complete essential loop with Tab/Space only                        | Passed                                                                                     |
| Reduced motion, simple graphics, narration preference after reload | Passed                                                                                     |
| Unknown save version preserved through ordinary interaction        | Passed                                                                                     |
| Explicit reset replaces unknown save version                       | Passed                                                                                     |
| Mobile text and layout                                             | Passed: visible text ≥12 CSS px, functional button text ≥16 CSS px, no horizontal overflow |
| Uncaught page errors in the full discovery/save/reset journey      | None observed                                                                              |

The integration team recorded passing TypeScript, all **32 unit tests across
four files**, a successful production build, and a dependency audit with zero
known vulnerabilities at the time of this run. The final build emitted
547.72 kB of JavaScript, approximately 144.60 kB gzip. The unit count includes
three movement regressions added for the slow-rendering fix. Bundle size is
not a load-time or hardware-performance measurement.

## Environment and evidence

- Windows host; installed Chrome **153.0.8010.48**.
- Playwright Chromium project using the Chrome channel, one worker.
- WebGL enabled with ANGLE/SwiftShader for the headless runs. These results do
  not measure a real Chromebook GPU or normal hardware-rendering speed.
- Development URL: `http://127.0.0.1:5173`.
- Browser suite viewports: **1440 × 960** and **390 × 844**, at normal CSS scale.
- Reproducible tests: `tests/e2e/expedition.spec.ts`.

## Linux CI and slow-rendering regression

The initial Linux [pull-request CI run](https://github.com/amyleesterling/the-animal-game/actions/runs/35478443212)
at commit `2b687324fbf4c24914f7987534bcd600d52bd4d6` passed installation,
the 29 unit tests, and production build, but finished the browser suite with
**3 passed, 1 failed**. The first guide action did not enable “Meet the zebra”
within 20 seconds. The integration lead verified the same failure in push run
`35478443158`; this was not treated as a passing cross-platform result.

A new browser regression reproduced the cause on the local host. It replaces
`requestAnimationFrame` with a 500 ms timer and matches cancellation with
`clearTimeout`, while keeping ordinary graphics and motion preferences. The
old movement code capped each frame's elapsed time at 50 ms: at two frames
per second, a 4.8 m/s guide advances only about 0.48 m per real second.

Before the fix, the new test failed because “Meet the zebra” stayed disabled
for its entire 8-second expectation (11.6 seconds for the test). The failure
trace and screenshot were preserved outside the repository at
`../animal-game-validation/low-fps-before/`. The regression exercises elapsed
time handling; it does not simulate or certify real Chromebook performance.

The fix advances the guide using uncapped visible elapsed time, clamps each
step to the remaining distance, and resets its time reference when guidance
or activation starts. The animation timestep remains independently bounded.

After the fix, the **unchanged two-frame-per-second regression passed** in
6.4 seconds for the whole test, including opening the first quiz. The full
local run then passed **5/5** in 1.1 minutes: slow-render guide (6.4 s), normal
discovery/photo/reset (24.9 s), keyboard journey (10.1 s), mobile/preferences
(9.1 s), and unsupported-save protection (9.5 s).

A fresh Linux CI result is still pending at this report's handoff and must be
recorded separately by the integration lead. Local slow-render verification
does not claim that the remote workflow has passed.

## Screenshots and execution notes

Screenshots were inspected visually in addition to the DOM assertions:

- `test-results/expedition-wrong-answers-s-f10ae-nd-reset-needs-confirmation/desktop-field-book.png`
- `test-results/expedition-narrow-layouts--ecd0b--preferences-survive-reload/mobile-welcome.png`
- `test-results/expedition-narrow-layouts--ecd0b--preferences-survive-reload/mobile-quiz.png`
- `test-results/expedition-narrow-layouts--ecd0b--preferences-survive-reload/mobile-field-book.png`

`test-results/` is intentionally ignored by Git and recreated by the suite.
The checked-in tests are the durable reproduction instructions; screenshots
are local evidence, not bundled game assets. A focused run replaces that output
directory and retains only its own screenshots; rerun the full suite to
regenerate the complete desktop and mobile set listed above.

The integration lead separately inspected agent-browser screenshots of the
welcome view at **1440 × 960** and the playing view at **1280 × 720**. Text and
controls were readable with no clipped essential actions; the browser error
list was empty. This provides the short-desktop inspection in addition to the
automated suite's desktop and mobile coverage.

The first test attempt could not launch Vite because sandboxed esbuild lacked
directory access. Running the same local test command with host subprocess
permission resolved that environment issue. An early run was interrupted by
concurrent Vite hot reload; it was discarded and repeated on stable source.

## Findings resolved during review

1. **Confirmed reset appeared complete before storage committed.** The browser
   test reproduced the old photo returning on immediate refresh. Reset now
   waits for the committed write before updating the count and closing the
   dialog, disables duplicate submission, and restores prior in-memory state
   with an error message if saving fails. The same regression now passes.
2. **An unsupported/corrupt save could be replaced by normal actions after a
   load failure.** The shell now blocks automatic writes until explicit
   grown-up reset. The browser test plants a future-version record and proves
   ordinary settings changes preserve it.
3. **Portrait photos could crop the zebra's head in the field book.** Capture
   now renders a consistent 960 × 720 frame, and portrait framing preserves
   horizontal composition. Fresh desktop and mobile screenshots show the
   full focal zebra.
4. **The specimen was only rotatable with a pointer.** It now accepts focus
   and left/right arrow rotation with accessible instructions. Source review
   confirmed the key handler and its cleanup; the browser journey verifies
   that the field book remains keyboard-reachable.
5. **Secondary action text fell below the agreed functional text size.** The
   affected buttons now use at least 16 CSS px. Mobile assertions and visual
   inspection verified the revised controls.
6. **A specimen-renderer failure could break a saved field-book page.** The
   preview is now isolated behind error handling so the saved photo and text
   remain available. This fallback was source-reviewed; a forced GPU failure
   was not exercised in this suite.
7. **Photo discovery appeared before its save completed.** Photo capture now
   waits for persistence before opening the field book and presents an inline
   unsaved-photo warning if storage fails or writes are blocked. The affected
   photo/reload/reset regression passed after this change; the storage-failure
   warning itself was source-reviewed rather than fault-injected in-browser.
8. **Slow frames stretched guided walking beyond the encounter timeout.** The
   Linux failure led to the deterministic two-frame-per-second reproduction
   and elapsed-time fix documented above. The exact regression changed from
   failing to passing, and all five browser flows passed afterward.

## Coverage limits and next release gates

- The browser suite verifies ordinary photo-save/reload timing. It does not
  simulate closing the browser during a pending photo write or an OS crash.
- Real spoken audio quality, local voice availability, and full screen-reader
  interaction need device testing. Written essential instructions remain
  available, and the essential keyboard flow passed.
- No real Chromebook/tablet/iOS/Safari/Firefox benchmark, network-throttled
  loading benchmark, battery test, or measured 30-FPS signoff was performed.
- No child playtest or independent animal-expert review is implied. The
  content records explicitly retain expert-review-pending notes.
- The zebra is an original stylized procedural prototype. Animal calls and
  the other nine playable species remain future work.
- Photo quality grading, occlusion in every location, prolonged free roaming,
  and long-session memory stability need broader playtesting before release.

This report follows the project's adapted gstack review and QA playbook.
It is not a claim that the full gstack browser runtime, outside-model review,
or an upstream interactive skill session was installed or executed.
