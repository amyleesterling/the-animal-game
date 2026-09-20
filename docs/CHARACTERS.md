# Sophia and Cora

Sophia's supplied `soph-walking.glb` contains a skeleton and the
`Walking_Woman` clip. The landing page now uses that same model in a planted
standing pose with a gentle wave. Reduced motion keeps the greeting still.
The original walking clip runs only while the explorer moves.

Cora's appearance is pending her own supplied model. `CORA_CHARACTER` in
`src/content/characters.ts` remains `null`; the game does not substitute a
duplicate of Sophia or an invented character. A separate companion is created
only when that configuration names a real asset. Final two-character visuals
have not been verified.

## Add Cora when her file arrives

Use a textured GLB with a skeleton and a walking or running clip, ideally
exported like Sophia's. Record the source and optimized asset hashes in the
asset manifest. Set Cora's asset path, clip name, and relative height in
`CORA_CHARACTER`, then inspect her orientation, feet and texture in the game.
The current generated greeting targets Mixamo arm names; another skeleton
needs a reviewed mapping or its own greeting clip.

The companion controller aims for a place 1.25 metres beside Sophia and uses
the existing world collision checks. It tries a clear alternate side or
briefly follows behind at obstacles. It pauses with the game, hides during
driving and photography, and returns beside Sophia after travel or jeep exit.
If its model fails to load, no substitute character is displayed.

Before enabling Cora publicly, inspect both figures on desktop and phone;
verify her actual locomotion, wave, obstacle clearance, boarding/exit and
photograph framing. Current formation tests use fixtures and cannot validate
the missing model. [Verification record](CHARACTERS_QA.md).
