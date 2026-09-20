# The Sunset Safari

The new playtest is `safari.html`. The original zebra expedition and its saved
field book remain available at the home page. A separate IndexedDB database
stores the story journey so the earlier save is preserved.

Sophia has a packed Land Cruiser and an empty field book. Before sunset, find
seven clues about the savanna: grass, water, food at different heights, roots,
watchful neighbors, hunters, and animals that eat carrion as well as hunt.
There is no countdown. Each stop has a short observation, one question with
supportive feedback, a wildlife photograph, and a clue added to the field book.
The ending brings those observations together without claiming that a few
sightings are a scientific habitat assessment.

Nearby discoveries follow the animal in front of Sophia, independently of the
suggested route. At roughly 10–13 metres (scaled for the animal), a prompt pauses
movement and asks for the animal's name. Common names, case differences and a
single spelling slip are accepted. **Skip · tell me the name** supplies its name
and continues into the quiz. A name starts a partial field-book page immediately;
the question and photograph complete its clue. Typed names stay on this device.

If the player is driving, the prompt parks the jeep; continuing uses the same
clear-space exit check as manual parking before opening the quiz. Dismissing a
prompt keeps it quiet until moving at least four metres beyond its trigger range;
the **Discover nearby animal** button can reopen it without walking away. Completed
animals never reopen automatically. A saved unfinished discovery resumes without
asking for its name again. The suggested next stop is the first missing photograph,
so discovering animals out of order still leads to all seven clues.

Story schema v2 records identification and permits discoveries in any order. Valid
v1 saves are migrated in memory and upgraded on the next save, preserving photos,
answers, settings and completion. Invalid or unsupported saves remain protected.

The route visits plains zebra, African savanna elephant, northern giraffe,
common warthog, Thomson's gazelle, cheetah, and spotted hyena. The player can
walk around the connected savanna and return to unlocked stops from the field
book. The jeep supports getting in, driving, reversing, braking and getting
out at a clear parking spot. A direction arrow points toward the current stop.
After each discovery, choose **Back to jeep & drive** to travel there yourself,
or **Quick jump to next stop** to arrive immediately. Animals retain their
static authored poses; Sophia uses her supplied walking animation.

Driving pauses when settings or the field book opens, the tab is hidden, or
the browser loses focus. Vehicle collisions keep the jeep clear of trees,
animals, the waterhole and world edges. Park and get out to answer questions
or take photographs. Photo mode has **Back to exploring** so a parked jeep can
be moved if it blocks the view. Saved questions and photographs resume after
driving; the exact parking position resets on refresh. See [driving QA](DRIVING_QA.md).

## Reference-led asset revisions

The initial nine-model batch used only text prompts with Meshy T2 geometry.
Amy's screenshots identified poor lion mane/head geometry, fragmented ostrich
feathers, and an unnatural hippo muzzle. Those models were replaced through
a separate, bounded four-model Image-to-3D batch, including the safari vehicle.

The four new reference images were created with Codex's built-in OpenAI image
generation, reviewed for silhouette and anatomy, and supplied directly to
Meshy as PNG data URIs. Images and the exact prompts are retained in
`assets/references/`. The lion uses a continuous mane; the ostrich uses a
coherent feather coat and two distinct legs; the hippo has a broad continuous
muzzle with nostrils on top. The vehicle reference is a sand-colored vintage
FJ40 Land Cruiser with ivory roof, roof rack, modest luggage, and rear spare.

The Meshy request selects standard Meshy 7.1 generation, image enhancement off,
texturing at 2K, and triangle remeshing at approximately 20,000 faces per animal
and 25,000 for the jeep. Four cardinal renders are retained with the raw model
downloads for inspection. The batch estimate is 120 credits. Actual task IDs,
reported consumption, source/reference/output hashes, and mesh counts are
recorded after completion in `SAFARI_ASSET_GENERATION.json`.

The workflow uses the existing GitHub environment secret. Credentials never
enter the game or committed files. The one-time tag is immutable, paid POSTs
are not retried, and uncertain submissions retain their checkpoint for
reconciliation. `scripts/prepare-safari-assets.py` compresses textures for web
delivery and verifies every non-image buffer remains identical.

The three revised species stay in the animal workbench for inspection. The
seven accepted species form the playable story. This separation lets Amy
continue evaluating the new art without blocking the safari.
