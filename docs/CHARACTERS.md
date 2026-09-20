# Sophia and Cora

Sophia's `sophia.glb` combines Amy's supplied walking character and
`sophie wave 3d.glb`. It plays the authored `Wave_for_Help_4` clip on the
landing page and `Walking_Woman` while exploring. Reduced motion freezes a
raised-hand greeting. The earlier `soph-walking.glb` is retained for older
builds; the current default character uses the combined model.

Cora joins Sophia using Amy's supplied character files. Her authored
`Wave_for_Help_4` clip plays on the landing page; `Walking_Woman` plays while
she moves beside Sophia in both adventures. Reduced motion freezes a
raised-hand greeting. Both characters now use their supplied greeting clips;
the procedural greeting remains available only for characters without one.

## Preparing the character assets

`scripts/prepare-cora.py` combines Amy's walking and waving files after checking
that their meshes, skeleton and scene hierarchy match. It copies the authored
animation samples unchanged and reuses one mesh and texture. The texture is
optimized with `scripts/optimize-character.py`. The shipped model is
`public/models/cora.glb`; its source and output hashes and verification record
are in `docs/CORA_ASSET_PREPARATION.json` and `public/assets-manifest.json`.

The same script prepares Sophia with `--character Sophia`,
`--output public/models/sophia.glb`, and
`--report docs/SOPHIA_ASSET_PREPARATION.json`. Her report records both original
source files and verifies that geometry, skin, and both clips' samples remain
unchanged. A single mesh and texture serve both animations for each character.

`CORA_CHARACTER` in `src/content/characters.ts` selects the two clips and Cora's
game height. Both characters are currently 1.8 game units tall; this is a
presentation scale, not a claim about their real heights. Each character owns
an independent animation mixer and resources. Movement takes precedence over
the greeting; horizontal root travel is removed from runtime animation copies
so the world controller owns movement and collisions.

The companion controller aims for a place 1.25 metres beside Sophia and uses
the existing world collision checks. It tries a clear alternate side or
briefly follows behind at obstacles. It pauses with the game, hides during
driving and photography, and returns beside Sophia after travel or jeep exit.
If its model fails to load, no substitute character is displayed.

See the [verification record](CHARACTERS_QA.md) for tested flows and devices.
