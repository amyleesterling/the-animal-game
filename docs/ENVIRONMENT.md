# The savanna environment

The environment system gives the game a year. A child can make a storm, step
through the months, jump between seasons, move the sun across the sky, and
watch the grass green up and dry out in response.

Open it at `/weather-lab.html` (`npm run dev`).

## What is measured and what is modelled

This distinction matters, and the interface states it on the panel itself.

**Measured.** Rainfall and temperature come from the NASA POWER 20-year monthly
climatology (January 2001 to December 2020), sampled at 2.4333 S, 34.8233 E,
which is Seronera in the central Serengeti where the game's savanna is set.
POWER is built on NASA's MERRA-2 reanalysis. The twelve monthly values live in
`src/content/climate.ts` with their source record, exactly as published:
rainfall in millimetres per day, temperature in degrees Celsius.

The shape of the year that falls out of those numbers:

| Month    | Rain (mm/day) | Month     | Rain (mm/day) |
| -------- | ------------- | --------- | ------------- |
| January  | 3.83          | July      | 0.30          |
| February | 2.79          | August    | 0.64          |
| March    | 4.54          | September | 0.86          |
| April    | 4.73          | October   | 1.92          |
| May      | 2.13          | November  | 4.66          |
| June     | 0.57          | December  | 4.32          |

That totals about 950 mm a year, which matches the published figure for the
central Serengeti. April is roughly sixteen times wetter than July.

**Computed from physics.** The sun's altitude and compass bearing come from the
NOAA solar position approximation for this latitude and day of year, in local
solar time. Two degrees off the equator means the day stays close to twelve
hours all year, so sunrise and sunset barely move. This is the point worth
making to a child: **this savanna's seasons are wet and dry, not summer and
winter.**

**Modelled.** Everything else is a defensible model, not a measurement:

- **Greenness** and **waterhole level** are exponentially weighted sums of the
  rain that has already fallen, with a 24-day memory for grass and a 70-day
  memory for groundwater. That lag is why the savanna stays green for weeks
  after the last storm, and why the waterhole outlasts the grass.
- **Storms.** Equatorial rain arrives as afternoon thunderstorms rather than
  all-day drizzle, so a wet month is mostly a month with more storm days in it.
  Each date is rolled against that month's storm likelihood using seeded noise,
  which means **the same date always brings back the same weather**. A storm
  runs about 2.6 hours on a build-fast, trail-off-slowly envelope.
- **Temperature through the day** is a sine between the month's mean minimum
  and maximum, shifted so the coolest hour is before dawn and the warmest is
  mid afternoon. A storm knocks several degrees off it.

## Architecture

Three files, and the split between them is the point.

### `src/game/environment.ts` — the simulation

Pure TypeScript. Imports no renderer. Produces an `EnvironmentState` that is a
function of the date, so scrubbing to a month gives the same savanna every
time. This is what the unit tests exercise.

```ts
const environment = createEnvironment({
  start: { year: 2026, month: 3, day: 12, hour: 9 },
  secondsPerDay: 0, // 0 pauses; 60 is a day a minute
});
environment.triggerStorm();
environment.stepMonth(1);
const state = environment.advance(deltaSeconds);
```

### `src/game/environment-visuals.ts` — what it looks like

Takes a state and applies it to a Three.js scene: sky colour, fog, the sun's
position and colour, hemisphere light, rain, lightning, grass and ground
colour, waterhole size. It decides nothing about the weather.

Rain is one `InstancedMesh` of up to 7,000 streaks in a column that follows the
camera, so a downpour costs one draw call.

```ts
const visuals = createEnvironmentVisuals({
  scene,
  camera,
  sun,
  hemisphere,
  grassMaterials: [grassMaterial],
  groundMaterials: [groundMaterial],
  water,
  sunDisc,
});
visuals.apply(state, delta);
grassLean(visuals.windSway());
```

### `src/ui/environment-controls.ts` — the weather desk

The panel. Make a storm, clear the sky, twelve months, four seasons, year back
and forward, a time-of-day slider, and four speeds. It reports the state in
words a child can read: "Dry straw", "Cracked mud", "Up 6:18 am, down 6:26 pm".
Every control is at least 44 px tall and at least 16 px of text.

## Wiring it into an expedition

The savanna world builds its own scene, so it only needs to hand the visual
layer the handles it already has:

1. Create an `Environment` next to the world.
2. Pass the world's `sun`, `hemisphere`, grass material and ground material to
   `createEnvironmentVisuals`.
3. In the animation loop, call `environment.advance(delta)` and then
   `visuals.apply(state, delta)`.
4. Feed `visuals.windSway()` into whatever already animates the grass.
5. Mount `createEnvironmentControls` wherever the settings live.

Nothing in the simulation or the visual layer knows about zebras, so animal
behaviour can read the same state later: sheltering in a storm, gathering at
the waterhole when it shrinks, moving on when the grass browns off.

## Verification

- `npm test` — 27 unit tests covering the climate data, the seasons, solar
  geometry, the lagged greenness and water response, clock arithmetic across
  month, year and leap-year boundaries, and storm behaviour.
- `npm run test:e2e` — seven browser tests that assert what a child would see,
  with screenshots written to `docs/evidence/weather/`.

## The year chart

The 3D savanna shows the weather. The year chart shows the **climate**, which
is the part a falling raindrop cannot show: what changes from month to month,
and why.

`src/ui/year-chart.ts` draws two panels on a shared month axis:

- **Rain that falls** — the twelve measured monthly totals, as bars.
- **How the savanna answers** — the modelled greenness and waterhole level.

They are deliberately two panels rather than two lines on two y-axes.
Millimetres and "how green" are not comparable quantities, and putting them on
one axis would invent a relationship the data does not have.

Two findings are computed from the profile rather than asserted over it, so
they stay true if the climate data is ever updated:

- **May receives 66 mm and the grass is 76 out of 100. October receives almost
  the same, 60 mm, and the grass is 20.** Same rain, different savanna,
  because of what fell in the months before. `matchedRainPair()` searches for
  the pair of months with near-equal rainfall and the largest gap in
  greenness.
- **The grass is brownest in August, but the waterhole is lowest in
  September.** Groundwater has a longer memory than roots do.
  `troughMonths()` finds both.

`yearProfile()` in `src/game/environment.ts` is the single source of truth; a
unit test asserts it agrees with the live simulation on the same date, so the
chart can never drift from the savanna it describes.

`src/content/savanna-year.ts` carries what each month means on the ground,
including where the great migration usually is. The migration follows rainfall
and new grass, so its timing shifts by weeks from year to year, and the copy
describes a typical year rather than a schedule. Cited to Boone, Thirgood and
Hopcraft (Ecology, 2006) for the migration modelled from rainfall and
vegetation growth, and McNaughton (Nature, 1990) for why the herds calve on
the mineral-rich southern short grass plains.

### Chart colours

Grass `#008300` and waterhole `#2a78d6`, validated against a white surface:
colour-blind separation Delta E 26.5 (protan) and 29.0 for normal vision, both
clear of the floors. Identity is never carried by colour alone: both series
are named in a legend, and a table view lists every number.
