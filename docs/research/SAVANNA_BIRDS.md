# Savanna bird research audit

Reviewed 2026-09-20. This is an editorial source check for a children's game,
not a scientific peer review. The eight entries live in
`src/content/savanna-birds.ts`. Each has a one-sentence summary, a 75–81-word
paragraph, size/lifespan/social/diet/range facts, and three questions ordered
**spot → understand → connect**. Every stat, description and quiz explanation
references source IDs declared on its profile.

Measurements describe adults and are approximate. A recorded maximum is not
an average or a guaranteed limit. No unsupported maximum, exact wild lifespan,
or current conservation label is inferred from a general bird-family page.
Wikipedia is supplemental; all eight species links were opened and matched
to the requested names.

## Claim and source map

| Species                  | Sources and claim coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Quiz progression                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Secretarybird            | [San Diego Zoo](https://animals.sandiegozoo.org/animals/secretary-bird): height, span, hunting, pairs, range and care lifespan. [Wikipedia](https://en.wikipedia.org/wiki/Secretarybird): appearance and explicitly qualified wild estimate.                                                                                                                                                                                                                                                                                                              | Long legs/crest → ground hunting → grass plus roost trees     |
| Lilac-breasted roller    | [London Zoo](https://www.londonzoo.org/whats-here/animals/lilac-breasted-roller): perch hunting and diet. [Cologne Zoo](https://koelnerzoo.de/component/advportfoliopro/project/50-gabelracke?Itemid=368&catid=107%3Atiere): length and social territory. [Cornell](https://ebird.org/species/librol2): identifying colours and perches. [AnAge](https://genomics.senescence.info/species/entry.php?species=Coracias_caudatus): care record. [Wikipedia](https://en.wikipedia.org/wiki/Lilac-breasted_roller): span, tail and broad range.                | Chest colour → lookout perch → prey                           |
| Southern ground hornbill | [Mabula conservation project](https://ground-hornbill.org.za/ground-hornbill-101/): helpers, nesting, feeding, range and wild longevity. [San Diego Zoo](https://animals.sandiegozoo.org/animals/hornbill): explicitly named species height. [Cornell](https://ebird.org/species/soghor1): plumage and adult facial skin. [Wikipedia](https://en.wikipedia.org/wiki/Southern_ground_hornbill): supplemental identity.                                                                                                                                     | Red face → family helpers → nest hollows                      |
| Helmeted guineafowl      | [Indianapolis Zoo](https://www.indianapoliszoo.com/animals/helmeted-guinea-fowl/): casque, feeding, flocks, length and native range. [Michigan ADW](https://animaldiversity.org/accounts/Numida_meleagris/): appearance and alarm calls. [Mulhouse Zoo](https://www.zoo-mulhouse.com/en/le-parc/animaux/helmeted-guineafowl/): explicitly zoo lifespan. [Wikipedia](https://en.wikipedia.org/wiki/Helmeted_guineafowl): introduced range.                                                                                                                 | Casque → mixed diet → alarm call                              |
| Grey crowned crane       | [Chester Zoo](https://www.chesterzoo.org/animals/grey-crowned-crane): crown, pairs/flocks, diet and height. [Michigan ADW](https://animaldiversity.org/accounts/Balearica_regulorum/): span, wild/care lifespans and gripping hind toe. [Wikipedia](https://en.wikipedia.org/wiki/Grey_crowned_crane): supplemental identity.                                                                                                                                                                                                                             | Crown feathers → gripping toe → wetland and grassland         |
| White-backed vulture     | [Ueno Zoo](https://www.tokyo-zoo.net/en/ueno/encyclopedia/african-white-backed-vulture/index.html): identifying back, length and carrion. [Emerald Park Zoo](https://www.emeraldpark.ie/explore-zoo/african-white-backed-vulture/): span, thermals and social groups. [Cleveland Zoo](https://resourcelibrary.clevelandmetroparks.com/animals/9): gliding. [AnAge](https://genomics.senescence.info/species/entry.php?species=Gyps_africanus): separately labelled records. [Wikipedia](https://en.wikipedia.org/wiki/White-backed_vulture): broad range. | White back → thermals → removal of remains                    |
| Red-billed oxpecker      | [Mpala Research Centre](https://mpala.org/field_guide/view/redbilled_oxpecker/): mammal association, diet, range and qualified longevity. [Weeks's field experiment](https://www.csun.edu/~dgray/BE528/Weeks2000oxpeckers.pdf): wound-feeding harms, without claiming every host interaction is harmful. [BirdLife South Africa](https://www.birdlife.org.za/red-data-book/red-data-book/our-scientific-approach-and-assessment-methods/): requested spelling. [Wikipedia](https://en.wikipedia.org/wiki/Red-billed_oxpecker): flocking and nesting.      | Mammal perch → ticks → mixed effect on host                   |
| Marabou stork            | [French natural-history museum](https://www.mnhn.fr/en/marabou-stork): accepted name, habitat, diet, range and soaring. [Toronto Zoo](https://www.torontozoo.com/animals/Marabou%20stork): anatomy and size. [Michigan ADW](https://animaldiversity.org/accounts/Leptoptilos_crumeniferus/): colonies and live prey. [AnAge](https://genomics.senescence.info/species/entry.php?species=Leptoptilos_crumeniferus): wild/care longevity. [Wikipedia](https://en.wikipedia.org/wiki/Marabou_stork): supplemental identity.                                  | Throat pouch/bill → mixed hunting/scavenging → waterside prey |

## Decisions and limitations

- Secretarybird: San Diego's general lifespan figure is not itself labelled
  wild. The profile labels the supplemental wild number an estimate. Its
  outdated conservation wording is not copied.
- Roller: AnAge's 13.7-year care record is rounded to nearly 14, not presented
  as typical longevity. A wild value was not established. Cologne uses the
  older `caudata`; the profile retains `Coracias caudatus`.
- Ground hornbill: the generic hornbill article is used only for the size
  explicitly assigned to this species. It must not supply another hornbill's
  nesting behaviour. Mabula search extracts were readable; a subsequent page
  fetch returned HTTP 429.
- Guineafowl: ADW has apparent measurement errors (51–64 **mm** length and a
  very large wingspan). Those values are rejected. Length instead follows
  Indianapolis; no wingspan is published here. Wild longevity estimates are
  inconsistent with care summaries, so the profile does not assert one.
- Crane: Chester describes its East African subspecies; only traits applying
  to the wider species are used. ADW distinguishes the wild and care numbers.
- Vulture: AnAge lists 19.1 years wild and 19.7 in care; the game rounds these
  to records around 19 and 20. It does not treat them as averages or confuse
  `Gyps africanus` with Asia's white-rumped vulture.
- Oxpecker: Mpala's 15-year maximum has no wild/care qualifier; the stat says
  so. BirdLife's `Buphagus erythrorynchus` matches the requested roster.
  Older sources use `erythrorhynchus`; Cornell currently displays
  `erythroryncha`. These spelling differences do not indicate a different
  bird. The host relationship is not simplified into “always helpful.”
- Marabou: older resources use `crumeniferus`; the museum and requested
  roster use `Leptoptilos crumenifer`. AnAge's individual care record
  (44.7 years) is rounded to nearly 45. It is not an expected lifespan.
  Toronto's ordinary wingspan range is preferred to exceptional span claims.

## Model review cues

These are identification cues for reviewing an illustrative asset, not a
claim that a generated model has passed an anatomical review.

- Secretarybird: tall walking legs, grey torso, black thigh feathers and
  backward crest; preserve the raptor bill. See the San Diego source above.
- Roller: compact body, lilac chest and blue wings, long outer tail streamers;
  use the lilac-breasted adult form rather than a blue-breasted form.
  [Cornell identification](https://ebird.org/species/librol2) and
  [supplemental tail description](https://en.wikipedia.org/wiki/Lilac-breasted_roller).
- Southern ground hornbill: large black ground bird, curved heavy bill, red
  adult face; the female also has a blue-purple throat centre. White flight
  feathers are most visible with open wings.
  [Cornell identification](https://ebird.org/species/soghor1).
- Guineafowl: rounded spotted body, small bare head and casque; avoid a
  vulturine guineafowl's blue striped chest. [ADW](https://animaldiversity.org/accounts/Numida_meleagris/).
- Grey crowned crane: golden crown, long legs and neck, grey body, white wing
  panels, red throat pouch. [Chester Zoo](https://www.chesterzoo.org/animals/grey-crowned-crane).
- White-backed vulture: broad wings, brown body, pale ruff, small sparsely
  feathered head, hooked bill; folded wings partly conceal the white back.
  [Ueno](https://www.tokyo-zoo.net/en/ueno/encyclopedia/african-white-backed-vulture/index.html).
- Oxpecker: small olive-brown bird, entirely red adult bill, yellow skin
  around the red eye; avoid the yellow-billed species' yellow bill base.
  [Cornell identification](https://ebird.org/species/reboxp1).
- Marabou: long legs, dark back/white underside, mostly bare head, huge bill
  and throat pouch. [Toronto Zoo](https://www.torontozoo.com/animals/Marabou%20stork).

## Validation

A direct TypeScript-module check confirmed eight unique Bird entries,
description lengths of 75–81 words, exactly three questions per bird,
three unique choices per question, valid correct-answer IDs and resolving,
nonempty source references. Formatting and final type-check results are
recorded in the handoff. Visual quality of generated models and integrated
gameplay are separate gates; no paid model request was made for this research.
