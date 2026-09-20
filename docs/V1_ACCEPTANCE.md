# Meet the Zebra: architecture and acceptance

## Delivery boundary

The first playable build completes the **Meet the Zebra** coding assignment
at the end of `PROJECT_PLAN.md`. The larger public-v1 definition with ten
species is the next product milestone. The first slice must still carry its
one animal through the entire experience: explore, meet, learn, photograph,
save, and revisit.

The world and backup zebra use stylized procedural art. The primary zebra is
Amy's supplied Meshy GLB, with recorded CC BY 4.0 attribution and optimized
textures. It has no embedded skeleton or clips; game poses are approximate.
These remain prototype assets, not scientifically reviewed anatomy or evidence
that the eventual photoreal art direction is complete.

## Architecture decision

Use TypeScript, Vite, Three.js, semantic DOM controls, and small explicit state
functions. The renderer owns the 3D world; it reports encounter and camera
readiness to the application. The application owns the accessible controls,
encounter sequence, narration requests, and field book. Species data owns
facts and configuration. Save code owns versioned storage and validation.

```text
Species content + citations
       |                 |
       v                 v
World / zebra       Quiz + field book
       |                 |
       | status          | progression
       v                 v
     Application / accessible DOM
       |                 |
       | capture         | save / reload
       v                 v
 Photo thumbnail     Versioned IndexedDB
```

`src/game/contracts.ts` is the integration boundary. World behavior is
`grazing`, `walking`, `alert`, or `retreating`. The shell must consume all
states. World methods cover pausing, photo mode, zoom, movement, quality,
guided approach, capture, and disposal. Renderer failures reach the shell
through its error callback rather than leaving an empty canvas.

### Engineering risks to resolve in implementation

| Risk | Required behavior | Evidence |
| --- | --- | --- |
| UI and world disagree about readiness | Capture returns no image until a valid view exists; failed captures cannot unlock the field book | Invalid/valid photo paths |
| Rapid answers skip questions | One deliberate transition per answer and next action; incorrect answers preserve encouragement and a path forward | Progression tests and repeated input |
| Storage fails or contains old/invalid data | Validate on load, handle errors visibly, keep the game usable, never call an unsuccessful write saved | Persistence tests and reload |
| Narration is unavailable | All essential content stays readable; speech failure never blocks progress | Browser fallback check |
| Controls conflict with world input | Dialog, keyboard focus, and world movement have clear ownership; blur/cancel clears held movement | Keyboard and modal walkthrough |
| Multiple animation loops accumulate | Dispose renderers/listeners and pause inactive views; field-book previews have bounded lifecycle | Source review and repeated open/close |
| Mobile controls become unreadable | Reflow text and controls without dropping below agreed font sizes | Narrow and wide screenshots |

## Automated acceptance

Run the repository's `npm run check`, `npm test`, and `npm run build` against
the integrated tree. Browser tests are run with `npm run test:e2e` when the
declared browser dependencies are available. A missing browser executable is
an environment limitation, not a passing browser test.

Logic tests should cover substantive boundaries:

- Species IDs, exactly three questions, valid answer identifiers, narration,
  and source links pass the content schema.
- Wrong answers cannot corrupt or prematurely advance progression.
- Completion and photo unlock happen only from valid prior states.
- Saving and reloading preserve a photograph and progress together.
- Missing, malformed, or incompatible saves recover predictably.
- Storage failures do not produce an unhandled rejection or false saved state.

## Browser acceptance walkthrough

Start with a fresh browser profile or a deliberate reset of this game's own
local data. Do not clear unrelated browser storage.

| Step | Action | Expected observable result |
| --- | --- | --- |
| 1 | Open the game | Clear purpose and one obvious start action; no account or personal-data form |
| 2 | Start the expedition | Savanna renders, movement guidance is legible, and the zebra can be found |
| 3 | Approach slowly; then too closely | Encounter becomes available; zebra behavior changes and it can retreat without attacking |
| 4 | Open encounter, hear/repeat narration | Same essential content is available in visible text and can be replayed when browser speech is supported |
| 5 | Choose an incorrect quiz answer | Warm explanation and a clear next action; no shame, dead end, or lost progress |
| 6 | Finish all three questions | Completion appears once and leads to camera access |
| 7 | Try an invalid photo view | Helpful feedback; no false field-book unlock |
| 8 | Frame and take a valid photo | Image is the rendered game view; the zebra entry unlocks |
| 9 | Open the field book | Captured photo, cited-data-derived facts, common/scientific name, and rotatable animated specimen are available |
| 10 | Reload | Saved discovery and photo return; the player can continue exploring |
| 11 | Reopen/close camera, book, and settings repeatedly | Controls remain responsive, focus usable, and no new console errors occur |
| 12 | Enable reduced motion, narration off, low graphics | Settings take effect, remain understandable, and do not block the loop |

Repeat the essential loop with keyboard alone. Check visible focus, Escape
behavior, movement-key cleanup, and accessible names for icon controls.

Inspect at a wide desktop viewport, a 13-inch-laptop-sized viewport, and a
narrow mobile viewport. Body and functional copy must stay at least 16 CSS
px, secondary copy at least 14 px, labels at least 12 px. Confirm no clipped
essential actions, horizontal overflow, or color-only state distinction.

## Evidence and release gates

Record actual environment, date, browser/version, viewport, tested tree,
commands, outcomes, screenshots, and remaining limitations in the QA report.
Do not invent an FPS measurement or label a high-end desktop result as a
Chromebook result. Targets remain 30 FPS on an agreed lower-end device and
roughly 5–8 seconds to first interaction on an ordinary connection.

Before calling the larger game a polished public release, complete the
ten-species scope, scientific review, asset provenance review, real hardware
performance checks, and observations from at least five children ages 6–10.
Preserve their privacy when recording playtest observations. These activities
are separate from the first working software slice.
