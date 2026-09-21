# Twenty-five more savanna discoveries

The safari retains its seven-stop story and adds 25 optional discoveries. Students
can walk or drive to any new animal, identify it (or ask for its name), answer
three questions with feedback, and save a photograph. The route and field book
also offer a quick jump, a searchable animal guide, and filters by animal group.

Every new species has a one-sentence summary, a longer paragraph, a Wikipedia
link, and sourced measurements, lifespan information, diet, social life, habitat,
and range. The three questions include choices, the answer, an explanation, and
citations. Sources sit beside the claims they support. Lifespan records, care
settings, life stages, and evidence gaps are distinguished rather than combined
into an unsupported typical age.

| Group         | New animals                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Insects       | Lamarck’s dung beetle, mound-building termite, mopane emperor moth, African monarch, desert locust                                                                |
| Rodents       | Cape porcupine, South African springhare, striped grass mouse, naked mole-rat                                                                                     |
| Birds         | Secretarybird, lilac-breasted roller, southern ground hornbill, helmeted guineafowl, grey crowned crane, white-backed vulture, red-billed oxpecker, marabou stork |
| Other mammals | Aardvark, bat-eared fox, banded mongoose, meerkat, olive baboon, vervet monkey, African buffalo                                                                   |
| Reptiles      | Nile monitor                                                                                                                                                      |

This is an imagined reserve containing animals from several African regions,
not a reconstruction of a single real locality. Individual profiles give their
actual ranges. Small insects and two tiny rodents have explicitly labeled
enlarged study views; real measurements remain in the field book. The naked
mole-rat appears in an open burrow cutaway. The dung beetle’s exact-species
Wikipedia article is Spanish and the interface labels that language.

Research audits: [small animals](research/SAVANNA_SMALL_LIFE.md),
[birds](research/SAVANNA_BIRDS.md), and
[mammals and monitor](research/SAVANNA_MAMMALS.md). These are source checks, not
an independent scientific-review signoff.

## Models and performance

Twenty-four selected models use individually generated OpenAI image references
sent through Meshy Image-to-3D. The locally authored, full-volume Cape porcupine
replacement passed review of its hero view and four cardinal views as a
recognizable stylized v1 model. Its provenance identifies authored geometry and
texture work, not an accepted Meshy output.
All original references and prompts are retained. The
generation workflows use immutable one-time tags, exact species lists,
checkpointed task IDs, bounded concurrency, and no automatic paid POST retries.
The API key remains in the existing GitHub environment secret.

Four cardinal views and mesh dimensions exposed flat Cape porcupine, South
African springhare and bat-eared fox outputs in the initial batch. The first
repair batch produced accepted springhare and fox candidates, but its porcupine
had detached head and quill forms without a complete torso and legs. A second,
porcupine-only repair also failed that anatomy review. All three Meshy porcupines
and the two other rejected originals are blocked from publication by task ID.

The generation history retains the original 25-model batch (750 reported
credits), the three-model repair batch (90), and the final porcupine attempt
(30): **870 reported Meshy credits**, including rejected work. The authored
replacement makes no additional API submission. Preparation requires explicit
visual acceptance, verifies its GLB and source-script hashes, and keeps every
rejected candidate's receipt beside the final authored asset's provenance.

Only two animal model requests run at once, with at most eight animal models
retained around the visitor. Selection prioritizes the chosen animal; eviction,
aborts and late completion dispose resources. New animals get fitted close-up photo
framing. The normal seven-stop road stays intact, and additional clearings do
not overlap the automatic encounter zones at their arrival/viewing points.

## Saved progress

Schema 3 stores the current question and previous quiz answers. Existing schema
1 and 2 seven-stop field books migrate in memory, preserve photographs,
identifications, settings and completed-story dates, and add empty entries for
the 25 new species. A load alone does not rewrite the old save. Future schemas,
invalid data and read failures remain protected from accidental overwriting.

Finishing the original seven photographs still completes the story. Optional
discoveries do not reset completion or force an existing student to repeat a
quiz. The classic zebra adventure remains a separate saved experience.

## Verification

The content catalog has structural checks for species counts, source IDs,
descriptions, statistics and all 75 questions. State tests cover question
progression, retries, reloads, photography and legacy migration. World tests
cover placement, photo framing, bounded loading and disposal. Browser checks
cover real-model encounters, three-question discovery, saved progress, cache
eviction and phone field-book layouts. Final run results and deployment hashes
are recorded in the task handoff.

Physical phones and child playtesting remain separate from emulated viewport
checks. Generated animal models retain static poses.
