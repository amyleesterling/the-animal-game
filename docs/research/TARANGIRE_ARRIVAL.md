# Tarangire-inspired arrival: source and copy notes

Reviewed 2026-09-21. The four-stage arrival is an imagined learning sequence,
inspired by Tarangire National Park in Tanzania. It is not a surveyed route,
a named real entrance, or a complete recreation of the park. The existing
32-animal collection spans several African regions.

## Verified factual basis

| Claim used in copy                                            | Primary source and scope                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An approach from Arusha passes through Makuyuni and Minjingu. | [TANAPA visitor guide](https://www.tanzaniaparks.go.tz/tarangire/visitor-guide), “Getting There.” This supports the route label, without assigning game coordinates or claiming the whole real drive fits into the arrival sequence.                                                                                                   |
| Baobabs, open savanna and acacia woodland inform the scenery. | [TANAPA attractions](https://www.tanzaniaparks.go.tz/tarangire/attractions), baobab, elephant and habitat entries. These support a landscape palette, not the exact position of a tree or road.                                                                                                                                        |
| Water attracts elephants and zebras during the dry season.    | [TANAPA attractions](https://www.tanzaniaparks.go.tz/tarangire/attractions), river/swamp and seasonal movement entries; [TANAPA about page](https://www.tanzaniaparks.go.tz/tarangire/about), introduction. The Tarangire River provides the geographical context. The copy does not promise a sighting on this particular game drive. |

The about page also contains placeholder staff information and duplicated text.
Only its relevant introductory park description is used as corroboration. No
staff names, travel infrastructure claims, size records or superlatives are taken
from it. The visitor guide names several entrance corridors; the game deliberately
leaves its arrival point unnamed rather than selecting an uncertain real gate.

## Four visible stages

1. **Meet at the jeep:** one clear walking instruction at the starting area.
2. **All aboard:** board the vehicle; introduce the route and explain the shortened
   journey before it begins.
3. **The last stretch:** a short road passage with baobabs, acacia trees and open
   grassland. This is authored scenery, not a distance or travel-time simulation.
4. **Our study trail:** park and begin the imagined learning trail. The narration
   explicitly places the wider animal collection across multiple African regions.

The walk, boarding point, road length, parking place and study trail are story
design. They are not sourced real-world waypoints. The short game sequence
may represent this imagined last stretch; it must not be labeled as the actual
Arusha-to-park drive. In real Tarangire, the visitor guide specifies designated
exit points and authorized accompaniment for walking. The game's free exploration
therefore belongs to its clearly labeled imaginary trail, not a claim about
real park access.

## Integration and narration

[tarangire-arrival.ts](../../src/content/tarangire-arrival.ts) exports the reviewed
date, two UI-ready source links, shared context copy, and four ordered stage
records. Each record provides a title, current-action prompt, action label,
narration and source IDs. Fictional directions have no scientific citation.
The narration and prompts are separate so the interface can show a short action
while speaking the fuller context once on entering a stage.

The voice copy is written for approximately ages 6–10: direct verbs, short
sentences, one action at a time, and no quiz-like trick or promise of a sighting.
The route's place names and “baobab” and “acacia” are intentional learning words;
adults can help with pronunciation. This is an editorial assessment, not a
child-playtest result. Do not add unverified phonetic spellings or a claimed local
pronunciation to a voice recording.

Use the journey note before or during the drive and the study-trail note at
arrival or in the source panel. The concise attribution is factual source credit,
not a claim of TANAPA endorsement. The copy is newly written; no photos, maps,
logos, audio, or other network assets were downloaded or incorporated.
