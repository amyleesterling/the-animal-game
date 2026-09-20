# Meshy zebra integration — verification

Date: 2026-09-20. Follow-up to merged PR #1, on `codex/meshy-zebra-asset`.
Scope: Amy's supplied model through world → encounter → photograph → saved
field book, including loading and texture failure. This is still the first
zebra expedition, not the full ten-species release.

## Asset evidence

- One static mesh, 4,297 triangles and 3,658 vertices. No embedded skeleton or
  animation clips. The game supplies approximate leg/head poses.
- Source: 8,780,956 bytes with three 2048 × 2048 JPEG textures.
- Bundled: 1,140,112 bytes with three 1024 × 1024 JPEG textures, about 87% smaller.
- A direct source/output comparison confirmed index, position, UV and normal
  buffers are byte-identical. Hashes and preparation recipe are in the manifest.
- Model and textures are self-contained and served by the game, with no Meshy
  connection needed while playing. Attribution appears in For grown-ups,
  `public/models/CREDITS.md`, the manifest and the GLB copyright field.

## Browser observations

The Codex in-app Chromium browser was inspected at 1280 × 720 and 390 × 844,
at normal zoom. The new mesh and stripes appeared in all three herd members.
The specimen loaded, stood on its platform, and rotated with arrow input.
The full quiz/photo/book flow completed and the photo survived reload.
Mobile field-book media and credits remained legible and fit without clipping
essential actions. The temporary viewport override was reset afterward.

`data-model-state="loaded"` on world and specimen canvases distinguishes a
successful imported model from a silently surviving procedural fallback.
The normal manual flow produced no browser error or warning logs. The
automated suite checks imported-model readiness alongside the existing
keyboard, low-frame-rate, mobile and persistence behavior.

## Failure-path review

Independent review reproduced a Three.js loader behavior: failed embedded
texture decoding can resolve a model with no base-color map. The integration
now rejects a mesh without a usable stripe texture and preserves the striped
procedural fallback. That also keeps the visual quiz answer meaningful.

The same reproduction found that failed decodes left embedded blob URLs
unreleased. A per-load URL tracker now revokes them on both success and
failure. The reviewer repeated the real-GLB failure test: loading rejected,
three image URLs were created, and all three were released.

Unit coverage includes normalization against actual GLB vertices, stable torso
and moving feet, still reduced-motion poses, independent resource disposal,
abort before parse, late parse completion, missing textures and decoder failure.
HTTP caching follows normal response headers so a future model update can
revalidate the stable file path.

The first final browser run also exposed an intermittent keyboard reopen
failure after Escape. The old native `close` event handler restored focus
and disposed a global specimen asynchronously, allowing it to interfere
with subsequent focus or a new preview. Cleanup now happens synchronously
in the shared close function, and Escape routes through that same function.
The keyboard regression now closes and reopens the loaded book three times.
That keyboard playthrough passed three independent repeated runs. Review of
the synchronous close change caught reset-from-quiz ordering; reset now sets
exploration mode before closing and explicitly restores world activity. A
browser regression checks walking out of encounter range and guiding back
after this reset.

The first Linux CI run passed seven browser tests but exposed slow manual
walking in the reset test. Manual travel used a capped animation step while
the guide already used elapsed time. Manual travel now consumes visible
elapsed time, checking tree, pond and world-boundary collisions every 0.2
world units. Pause, visibility and fresh-input transitions reset stale timing.

The reset regression now uses reduced motion to start at the same 8 m guide
destination and renders at two frames per second. An isolated negative control
with capped travel still enabled failed to leave encounter range within eight
seconds. Restoring elapsed-time travel passed the same test in 7.1 seconds
overall. Four additional unit cases cover equal travel at different frame
rates, trees, the pond and world bounds. Independent review found no further
issues with the movement fix.

## Final checks

All checks below passed against the integrated tree, using Windows, Node 22.14,
Vite 7.3.6 and the repository's Chromium/SwiftShader browser configuration:

| Check | Result |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run check` | Pass |
| `npm test` | 60 tests passed across 6 files |
| `npm run build` | Pass; JavaScript 648.91 kB / 173.30 kB gzip |
| `npm run test:e2e` | 8 tests passed in about 2 minutes |
| Keyboard flow, `--repeat-each 3` | 3 additional passes after the focus fix |
| `git diff --check` | Pass |

The browser suite includes full discovery with HTTP 503 model failure and with
forced texture-decoder failure, as well as normal imported-model appearance,
photo/save/reload, keyboard reopening, reset-during-quiz movement, mobile
legibility/preferences and preservation of unsupported saves.

[Verified desktop field book](evidence/meshy-zebra-field-book.png) shows the
imported zebra in both the saved photograph and the 3D specimen. CI retains
additional browser screenshots and failure traces in its browser-evidence artifact.

## Remaining scope

The supplied AI-generated anatomy and approximate game poses need expert
review and a production animation rig. Herd members share the same prototype
stripe texture; individual texture variants remain future work. No real-device
Chromebook, iOS/Safari, Firefox, school-network or long-session performance
claim is made. No child playtest, merge of this follow-up, or deployment is
implied by local checks.
