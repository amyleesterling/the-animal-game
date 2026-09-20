# Meet the Zebra — QA report

Date: 2026-09-19. Scope: the first complete zebra expedition, not the future
ten-species public release. The checks below were performed against the
integrated working tree before its initial implementation commit.

## Result

**All four browser regression tests passed** with `npm run test:e2e` in about
1.2 minutes. The complete mouse/button journey and the essential Tab/Space
keyboard journey both reached a photographed zebra field-book entry.

After the final photo-save change, the affected discovery/save/reset test was
run again with
`npm run test:e2e -- --grep "wrong answers stay friendly"`: **1 passed** in
37.4 seconds (33.5 seconds in the test). Source review confirms the shutter
guards duplicate submission and awaits persistence before opening the field
book. The three other passing results above remain from the full run; they
were not needlessly repeated for this focused change.

| Check | Result |
| --- | --- |
| Wrong answer → explanation → retry | Passed; returns to the same question |
| Wrong answer → continue learning | Passed; no dead end or forced perfect score |
| Three questions → real scene photo → field book | Passed |
| Reload after capture | Passed; the stored photo URL and discovery return |
| Cancel the reset confirmation | Passed; discovery remains |
| Confirm reset → immediately reload | Passed after fixing the save-commit race |
| Complete essential loop with Tab/Space only | Passed |
| Reduced motion, simple graphics, narration preference after reload | Passed |
| Unknown save version preserved through ordinary interaction | Passed |
| Explicit reset replaces unknown save version | Passed |
| Mobile text and layout | Passed: visible text ≥12 CSS px, functional button text ≥16 CSS px, no horizontal overflow |
| Uncaught page errors in the full discovery/save/reset journey | None observed |

The integration lead also recorded a passing TypeScript check, all 29 unit
tests, a successful production build, and a dependency audit with zero known
vulnerabilities at the time of this run. The final build emitted 547.34 kB of
JavaScript, approximately 144.48 kB gzip. Bundle size is not a load-time or
hardware-performance measurement.

## Environment and evidence

- Windows host; installed Chrome **153.0.8010.48**.
- Playwright Chromium project using the Chrome channel, one worker.
- WebGL enabled with ANGLE/SwiftShader for the headless runs. These results do
  not measure a real Chromebook GPU or normal hardware-rendering speed.
- Development URL: `http://127.0.0.1:5173`.
- Browser suite viewports: **1440 × 960** and **390 × 844**, at normal CSS scale.
- Reproducible tests: `tests/e2e/expedition.spec.ts`.

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
