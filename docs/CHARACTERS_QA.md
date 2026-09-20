# Character presentation verification

Branch: `codex/sophia-cora-companions`. Date: 2026-09-20.

Initial Cora integration: six distinct browser cases passed against the local integrated build:
four real-pair cases and two classic startup/keyboard regressions. The phone
case also passed again after a camera correction. Desktop and phone welcome
screenshots visibly show both real models with raised greeting hands. No
character blocker remains from this review. The subsequent supplied-Sophia-wave
verification is recorded at the end of this document.

`tests/e2e/characters.spec.ts` verifies:

- Both real models load for the welcome scene. Movement keys do not move
  either character's root while they greet the player.
- Classic exploration moves both characters, preserves personal space,
  pauses both roots for settings, hides Cora from the photograph, and restores
  the pair on return.
- Reduced-motion portrait (390×844) and short landscape (667×375) layouts keep
  readable, reachable welcome controls. Real touch movement moves both
  characters after starting.
- Story Safari supports both characters walking, settings pause/resume,
  actual jeep movement, safe exit, encounter/quiz, and photo-mode visibility.
- If Cora's model request fails, her companion remains hidden while Sophia
  can still explore in both worlds. No duplicate Sophia is substituted.

The configured character count is not proof that both models rendered. Tests
also require both load states, actual companion visibility, finite position
diagnostics, and real companion displacement. Screenshots establish the
visible appearance and framing; model unit tests establish animation and
resource ownership behavior.

The player owner reports 18 passing tests using the actual combined Cora asset,
including authored wave playback, a fixed raised-hand reduced-motion frame,
grounding, restoration to walking, and resource cleanup. Active Chrome
screenshots independently confirm Cora's raised greeting, both with normal
motion on desktop and reduced motion on phone. Formation fixtures verify
collision and ownership logic; they do not substitute for real appearance.

Independent review found follower drift at one frame per second: the prior
0.5-second travel cap allowed Sophia to move farther each frame than Cora
could follow. The world owner reproduced six metres of lag after five seconds,
then separated the travel and animation caps. Travel now consumes up to two
seconds in 0.2-metre collision substeps; the visual animation cap stays at
0.5 seconds. Eleven companion tests passed, including one-FPS catch-up and a
blocked-path regression that rejects teleporting through an obstacle.

Visual review caught a separate phone defect despite passing state checks:
the classic mission card covered both characters' heads and upper bodies.
The coordinator raised the portrait camera target, lowering the pair in the
frame. The new 390×844 screenshot shows both full figures below the card and
clear of the walking controls. The phone case passed again after the change.

The coordinator also corrected stale welcome proximity when starting classic
exploration. The new browser regression pauses animation between welcome and
start, then confirms that Meet is disabled synchronously and cannot open the
quiz from outside encounter range. The complete keyboard expedition passes,
including photo capture and repeated field-book reopening.

The first run used:

```text
node node_modules/@playwright/test/cli.js test tests/e2e/characters.spec.ts --output="C:/Users/amyle/Documents/New project/cora-browser-results"
4 passed (1.6m)
```

The desktop loop passed in 30.2 seconds, phone in 20.4 seconds, Safari in
29.2 seconds, and the unavailable-model case in 13.4 seconds. Browser output
uses the sibling `../cora-browser-results/` directory,
outside Vite's watched files. The phone welcome is a scrollable page; a
full-page screenshot does not imply that every control fits into one viewport.
Tests scroll to each welcome action and check legibility, a minimum 44px
touch height, and that no scene layer intercepts its click/tap target.

After the portrait and startup corrections:

```text
node node_modules/@playwright/test/cli.js test tests/e2e/characters.spec.ts tests/e2e/expedition.spec.ts --grep "reduced-motion pair|essential expedition|starting clears welcome" --output="C:/Users/amyle/Documents/New project/cora-followup-results"
3 passed (46.8s)
```

The phone case passed in 21.6 seconds, synchronous-start regression in
3.2 seconds, and keyboard expedition in 17.8 seconds. The coordinator reports
183 unit tests passing across 15 files with two workers, the final production
build (including TypeScript), and the full formatting check.

Inspected first-run screenshots, relative to `../cora-browser-results/`:

| Scene                                  | Screenshot                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Desktop raised greetings               | `characters-Sophia-and-Cora-80626--leave-the-photograph-clear/sophia-cora-welcome-desktop.png`     |
| Classic exploration pair               | `characters-Sophia-and-Cora-80626--leave-the-photograph-clear/sophia-cora-classic-explore.png`     |
| Clear classic photo                    | `characters-Sophia-and-Cora-80626--leave-the-photograph-clear/classic-photo-without-companion.png` |
| Reduced-motion portrait                | `characters-phone-welcome-p-d6f56-and-short-landscape-actions/sophia-cora-welcome-portrait.png`    |
| Reduced-motion landscape               | `characters-phone-welcome-p-d6f56-and-short-landscape-actions/sophia-cora-welcome-landscape.png`   |
| Phone framing defect before correction | `characters-phone-welcome-p-d6f56-and-short-landscape-actions/sophia-cora-phone-explore.png`       |
| Safari exploration pair                | `characters-the-safari-pair-f10da--and-stays-out-of-the-photo/sophia-cora-safari-explore.png`      |
| Clear Safari photo                     | `characters-the-safari-pair-f10da--and-stays-out-of-the-photo/safari-photo-without-companion.png`  |

The inspected corrected phone image is
`../cora-followup-results/characters-phone-welcome-p-d6f56-and-short-landscape-actions/sophia-cora-phone-explore.png`.

Chrome with software WebGL and emulated mobile viewports does not establish
physical-phone performance or replace child playtesting. No paid generation
or recognition API is used for these checks.

## Sophia's supplied wave follow-up

Amy subsequently supplied Sophia's authored waving GLB. The coordinator is
shipping it with her matching walking asset as `public/models/sophia.glb`.
All four follow-up browser cases passed with the combined asset. The earlier
six-case result above covers Sophia's previous procedural greeting and Cora's
authored greeting.

Independent source review found no blocker in the shared authored-greeting
path: the configured clip is required, greeting and walking actions restore
their own poses, reduced motion selects a fixed raised-hand frame, and only
horizontal root travel is removed from runtime animation copies. Asset
preparation requires compatible geometry, skin, hierarchy, and source texture,
then checks both clips' sample bytes after texture optimization.

An independent GLB metadata/hash check confirmed the 2,161,396-byte file matches
`docs/SOPHIA_ASSET_PREPARATION.json` and contains exactly `Walking_Woman` and
`Wave_for_Help_4`, with one mesh, skin, image, and embedded buffer. The default
player explicitly selects the new model and supplied greeting clip.

```text
node node_modules/@playwright/test/cli.js test tests/e2e/characters.spec.ts tests/e2e/new-models.spec.ts --grep "Sophia and Cora welcome|reduced-motion pair|the safari pair|a missing character model" --output="C:/Users/amyle/Documents/New project/sophia-wave-browser-results"
4 passed (1.5m)
```

Desktop pair behavior passed in 28.6 seconds, phone in 20.3 seconds, Safari in
29.2 seconds, and the missing-Sophia-model playable fallback in 5.5 seconds.
The coordinator reports all 187 unit tests passing across 15 files with two
workers, plus TypeScript, the production build, and the full formatting check.

Active Chrome screenshots show both supplied greetings in the 1440×960
welcome scene. At 390×844 and 667×375, reduced motion holds each character's
raised-hand authored pose. Both figures remain within the scene and the copy
and actions remain readable. The phone exploration screenshot retains the
corrected clear placement below the mission card. Classic and Safari movement,
settings pause/resume, actual jeep travel/exit, and clear photo modes pass with
the new default asset. The desktop case reports no uncaught page errors.

Inspected follow-up evidence, relative to `../sophia-wave-browser-results/`:

- `characters-Sophia-and-Cora-80626--leave-the-photograph-clear/sophia-cora-welcome-desktop.png`
- `characters-Sophia-and-Cora-80626--leave-the-photograph-clear/sophia-cora-classic-explore.png`
- `characters-phone-welcome-p-d6f56-and-short-landscape-actions/sophia-cora-welcome-portrait.png`
- `characters-phone-welcome-p-d6f56-and-short-landscape-actions/sophia-cora-welcome-landscape.png`
- `characters-phone-welcome-p-d6f56-and-short-landscape-actions/sophia-cora-phone-explore.png`
- `characters-the-safari-pair-f10da--and-stays-out-of-the-photo/sophia-cora-safari-explore.png`
- `characters-the-safari-pair-f10da--and-stays-out-of-the-photo/safari-photo-without-companion.png`

No new review finding remains. This follow-up uses the existing meaningful
browser cases; physical-phone performance and child playtesting remain outside
these checks.

## Centered welcome and ambient greeting cycle

The welcome revision moves the pair into the space between the copy and zebras
and alternates each supplied wave with ambient standing. All five character
browser cases pass on the final corrected source, with two additional classic
expedition regressions passing independently.

The updated character suite adds a bounded test at 2048×1169, 1440×960, and
1280×720. It observes each actual player's `standing`/`waving` phases repeating,
their stagger, and unchanged world positions. Standing and waving screenshots
are captured at every desktop size. Precise projected model bounds must remain
inside the scene and clear of the welcome copy. The existing phone case also
checks those bounds and fixed `still` phases under reduced motion at 390×844,
820×1180, and 667×375. Existing walking, pause, jeep, photo, and asset-failure
checks remain. Exact skinned bounds are enabled only by the test URL query
`?characterBounds=1`, avoiding that diagnostic work on normal visits.

These diagnostics come from the rendered models and live animation state;
the tests do not inject poses or simulate a successful load. A local review
measured the precise bounds calculation at about 17.66ms median and 25.48ms
p95 per pair, so normal visits do not execute it. These measurements describe
the diagnostic's local cost, not physical-phone performance.

The first five-case run passed the desktop loop, phone case, and missing-Cora
case. The cycle test confirmed repetition, stagger, and stationary roots, then
found a 3.16px overlap between Cora's conservative projected world bounding box
and the welcome element at 2048×1169 during a wave. The screenshot still showed
a visible gap from the actual text. A 12px additional layout reserve now keeps
the conservative check strict. The Safari case was interrupted by a Vite
page reload during jeep exit after a concurrent source edit; it requires a
clean rerun and was not established as a product regression. It passes on the
final frozen source.

The coordinator separately found portrait-tablet clipping at 820×1180 and
extended the stacked welcome layout to portrait widths up to 1100px. The
expanded phone/tablet case verifies that correction. A reviewer also found
the companion wrapper's half-second animation cap slowed Cora's greeting at
one frame per second. Stationary greetings now use the full visible elapsed
time. A subsequent controller test exposed pose drift when a partially blended
greeting was paused with zero elapsed time. Restoring and caching the pure
authored pose before applying the ambient blend corrects that drift. The
intermediate browser run was stopped for this correction and is not counted
as a pass.

The animation agent reports 43 focused player/companion tests passing,
including actual Cora bone poses and phases at 1 FPS versus 60 FPS through
12 seconds, paused updates, and repeated zero-delta evaluations near both
blend boundaries. The coordinator reports all 197 unit tests passing, plus
the final production build, TypeScript, formatting, and diff checks.

```text
node node_modules/@playwright/test/cli.js test tests/e2e/characters.spec.ts --output="C:/Users/amyle/Documents/New project/welcome-cycle-verified-results"
5 passed (2.4m)
```

The new cycle/framing case passed in 44.5 seconds, classic pair behavior in
29.0 seconds, phone/tablet/landscape in 24.4 seconds, Safari in 30.1 seconds,
and missing-Cora fallback in 11.9 seconds. The desktop test observed both
standing/waving sequences repeat with a stagger and stationary roots, and
reported no uncaught page errors. The final Safari check covers actual
walking, modal pause/resume, jeep driving/exit, and unobstructed photo mode.

The coordinator independently ran:

```text
node node_modules/@playwright/test/cli.js test tests/e2e/expedition.spec.ts --grep "starting clears welcome|essential expedition" --output="C:/Users/amyle/Documents/New project/welcome-cycle-expedition-results"
2 passed (25.3s)
```

Active Chrome screenshots at 2048×1169, 1440×960, and 1280×720 show both full
figures between the welcome copy and zebras, with legible, reachable actions.
The 390×844, 820×1180, and 667×375 screenshots show the centered pair in the
scene above the copy, without the previous tablet clipping. Reduced motion
holds both authored raised-hand poses. These are full-page mobile captures:
the page scrolls, and the tests verify each action after scrolling it into
view. The phone exploration screenshot also shows both figures clear of the
mission card. Classic and Safari photo screenshots contain no companion.

Inspected final evidence, relative to `../welcome-cycle-verified-results/`:

- `characters-the-centered-we-8ad34-waving-across-desktop-sizes/welcome-2048-waving.png`
- `characters-the-centered-we-8ad34-waving-across-desktop-sizes/welcome-1440-standing.png`
- `characters-the-centered-we-8ad34-waving-across-desktop-sizes/welcome-1280-waving.png`
- `characters-phone-welcome-p-13e29-and-short-landscape-actions/sophia-cora-welcome-portrait.png`
- `characters-phone-welcome-p-13e29-and-short-landscape-actions/sophia-cora-welcome-portrait-tablet.png`
- `characters-phone-welcome-p-13e29-and-short-landscape-actions/sophia-cora-welcome-landscape.png`
- `characters-phone-welcome-p-13e29-and-short-landscape-actions/sophia-cora-phone-explore.png`
- `characters-the-safari-pair-f10da--and-stays-out-of-the-photo/sophia-cora-safari-explore.png`
- `characters-the-safari-pair-f10da--and-stays-out-of-the-photo/safari-photo-without-companion.png`
- `characters-Sophia-and-Cora-80626--leave-the-photograph-clear/classic-photo-without-companion.png`

Desktop screenshot filenames identify Sophia's observed phase; Cora may be in
the other phase because the cycles are staggered. No actionable review finding
remains. Chrome software WebGL and emulated mobile viewports do not establish
physical-phone performance or replace child playtesting.
