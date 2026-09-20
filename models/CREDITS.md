# Zebra model

**Zebra Portrait** by **amyleerobinson**, created with Meshy and supplied by Amy.

- Source: https://www.meshy.ai/s/fURUJE
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- License terms: https://creativecommons.org/licenses/by/4.0/
- Included file: `zebra.glb`

Changes: embedded textures reduced from 2048 × 2048 to 1024 × 1024 and
recompressed as JPEG. Original mesh geometry, indices and UVs are preserved.
The game adjusts scale/orientation and applies approximate procedural poses.
The original export contains no skeleton or animation clips.

This AI-generated model and its game poses have not been reviewed for
species-specific anatomy or movement. No endorsement by the model creator
or Meshy is implied. Full provenance and checksums: `../assets-manifest.json`.

# Soph walking character

`soph-walking.glb` was supplied by Amy as `soph character walking.glb` on
2026-09-20 for use as the playable explorer. It contains a 23-bone skeleton
and the authored one-second `Walking_Woman` animation. The file identifies
Blender as its exporter but contains no creator or license metadata;
neither is inferred here.

The embedded texture was reduced from 2048px PNG to an opaque 1024px JPEG.
Geometry, skin and animation buffers are unchanged. The game normalizes
height and facing, removes horizontal root travel from a runtime copy of
the walking clip, and pauses the pose when stationary or using reduced motion.
Source and shipped hashes are in `../assets-manifest.json`.

# Nine savanna test animals

The `test-animals/` models were generated at Amy's request using her Meshy API
account on 2026-09-20. Geometry: Meshy T2 Smart Topology. Textures: Meshy 7.1.
The batch used 135 credits and completed all nine requested roster species.
The models contain no skeletons or animation clips. No source images were
uploaded. Texture optimization preserved non-image buffers byte for byte.

Prompts and task receipts: `docs/TEST_ANIMAL_GENERATION.json` in the source
repository. Per-model hashes, sizes and task IDs: `test-animals/manifest.json`.
Generation record: https://github.com/amyleesterling/the-animal-game/actions/runs/35526999078

These are AI-generated art tests, with anatomy and animation review pending.
No third-party creator credit, distribution license, or scientific approval
is inferred from API access.
