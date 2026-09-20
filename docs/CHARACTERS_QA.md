# Character presentation verification

Branch: `codex/sophia-cora-companions`. Date: 2026-09-20.

Status: all six distinct targeted browser scenarios pass across the initial
and final runs. Final screenshots were inspected. The coordinator reports
178 passing unit tests, TypeScript, production build, and formatting checks,
including the final camera and touch-target corrections. The player owner
also reported 14/14 focused player tests passing.

Cora's character asset has not been supplied. The runtime configuration keeps
her absent rather than displaying another copy of Sophia. Browser checks
therefore expect one loaded character. Optional companion unit fixtures do
not establish Cora's appearance, animation quality, or final framing.

`tests/e2e/characters.spec.ts` covers:

- Sophia's actual loaded model on the landing scene, with a welcome pose that
  does not move through the world when movement keys are pressed.
- Transition into classic exploration, actual keyboard movement, quiz/photo
  mode, and returning to exploration.
- Reduced-motion preference on a 390×844 touch portrait and 667×375 short
  landscape screen; welcome actions stay readable, reachable and unobstructed.
  Actual touch input still moves Sophia after entering the game.
- The landing link into Story Safari, walking, settings pause/resume, and
  entering and leaving the jeep.

Three existing regression cases also pass: classic wrong-answer retry,
photograph persistence and confirmed reset; keyboard driving/steering/reverse/
brake/exit; and actually driving off route to an elephant encounter, naming
skip, and safe exit into its quiz.

Browser position checks read the scene's actual explorer diagnostics. Pose
correctness and fixed reduced-motion joint transforms require player unit
tests and screenshot inspection; a mode label alone does not prove a visible
character or a correct wave. Screenshots are captured only after several
rendered frames.

The reviewed player unit tests use Sophia's actual skeleton and check planted
feet, lowered idle arms, raised greeting wrist with a bent elbow, unchanged
legs/hips/head while waving, fixed reduced-motion joint transforms, no root
drift, and clean restoration to standing or the original walking cycle. They
also cover separate resource ownership and late-load cleanup for configured
characters. These checks do not validate a Cora model that is not present.

Chrome with software WebGL and emulated phone dimensions cannot establish
physical-phone performance or replace child playtesting. No extra character
asset or paid generation API is used for these checks.

The initial browser run used
`node node_modules/@playwright/test/cli.js test tests/e2e/characters.spec.ts`
with `--output="C:/Users/amyle/Documents/New project/character-browser-results"`.
Desktop/classic and Safari transitions passed; phone verification found the
mobile Settings button was 42px instead of the tested 44px touch target.
Screenshot review independently found the classic camera easing from its
welcome position too slowly, leaving Sophia offscreen after starting. The
interface owner increased the target to 44px and snapped the initial
exploration camera after changing modes.

The final run used the character, expedition, driving, and encounters specs
with `-g "Sophia welcomes|reduced-motion welcome|wrong answers stay friendly|driving off route|keyboard entry starts"`
and `--output="C:/Users/amyle/Documents/New project/character-final-results"`.
All five selected cases passed: desktop/classic 27.2 seconds, phone 26.0,
keyboard driving 16.9, off-route encounter 21.6, and classic photo/save/reset
33.6. Together with the previously passing Safari transition case (20.8
seconds), this verifies six distinct browser scenarios. Durations describe
the local test run and are not performance measurements.

Inspected final screenshots:

- `../character-final-results/characters-Sophia-welcomes-7474e-d-photo-controls-still-work/sophia-welcome-desktop.png`
- `../character-final-results/characters-Sophia-welcomes-7474e-d-photo-controls-still-work/sophia-classic-explore.png`
- `../character-final-results/characters-phone-welcome-c-50756-and-short-landscape-actions/sophia-welcome-portrait.png`
- `../character-final-results/characters-phone-welcome-c-50756-and-short-landscape-actions/sophia-welcome-landscape.png`
- `../character-browser-results/characters-the-landing-saf-65f9b-jeep-transitions-functional/sophia-safari-explore.png`

Sophia faces the camera with planted feet and a raised hand on the welcome
screen. The corrected classic view shows her immediately after starting;
Safari also keeps her visible beside the jeep. The phone scene sits above the
introductory copy so character and text do not overlap. Portrait and short
landscape are scrollable pages: their full-page captures do not imply that
every action fits into one viewport. Browser checks scrolled to each welcome
action and confirmed readable text, minimum 44px height, and an unobstructed
click/tap target.
