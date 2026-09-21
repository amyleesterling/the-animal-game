import type { SafariStop } from "../safari-contracts";
import { smallLifeProfiles } from "./savanna-small-life";
import { birdProfiles } from "./savanna-birds";
import { mammalProfiles } from "./savanna-mammals";

// Perimeter clearings preserve the original story road and its guide corridors.
// Model heights are presentation settings; real measurements remain in profiles.
const placements: Record<string, { at: [number, number]; height: number }> = {
  "lamarcks-dung-beetle": { at: [-86, 64], height: 0.45 },
  "mound-building-termite": { at: [-58, 64], height: 0.4 },
  "mopane-emperor-moth": { at: [-30, 64], height: 0.65 },
  "african-monarch": { at: [-2, 64], height: 0.6 },
  "desert-locust": { at: [26, 64], height: 0.5 },
  "cape-porcupine": { at: [-86, 36], height: 0.75 },
  "south-african-springhare": { at: [-58, 36], height: 0.55 },
  "striped-grass-mouse": { at: [54, 64], height: 0.35 },
  "naked-mole-rat": { at: [82, 64], height: 0.35 },
  secretarybird: { at: [-86, 8], height: 1.3 },
  "lilac-breasted-roller": { at: [-86, -20], height: 0.3 },
  "southern-ground-hornbill": { at: [-86, -48], height: 0.85 },
  "helmeted-guineafowl": { at: [-86, -76], height: 0.5 },
  "grey-crowned-crane": { at: [-86, -104], height: 1.05 },
  "white-backed-vulture": { at: [-58, -104], height: 0.9 },
  "red-billed-oxpecker": { at: [-30, -104], height: 0.22 },
  "marabou-stork": { at: [-2, -104], height: 1.45 },
  aardvark: { at: [26, -104], height: 0.9 },
  "bat-eared-fox": { at: [54, -104], height: 0.6 },
  "banded-mongoose": { at: [82, -104], height: 0.32 },
  meerkat: { at: [54, -76], height: 0.5 },
  "olive-baboon": { at: [82, -76], height: 1 },
  "vervet-monkey": { at: [-58, -48], height: 0.65 },
  "african-buffalo": { at: [-30, -20], height: 1.8 },
  "nile-monitor": { at: [82, -48], height: 0.35 },
};

export const expansionStops: SafariStop[] = [
  ...smallLifeProfiles,
  ...birdProfiles,
  ...mammalProfiles,
].map((profile) => {
  const placement = placements[profile.id];
  if (!placement) throw new Error(`Missing clearing for ${profile.id}.`);
  const insect = profile.group === "Insect";
  const burrow = profile.id === "naked-mole-rat";
  const viewingNote = burrow
    ? "Enlarged burrow cutaway: this underground animal is shown in an open study display. Its real size is in the field book."
    : insect || profile.id === "striped-grass-mouse"
      ? "Enlarged nature-study model: this animal is shown bigger so you can inspect it. Its real size is in the field book."
      : undefined;
  return {
    id: profile.id,
    name: profile.name,
    scientificName: profile.scientificName,
    chapter: "Savanna discovery",
    story: profile.summary,
    mission: `Observe the ${profile.name.toLowerCase()} and discover its place in the savanna.`,
    clue: profile.habitat,
    facts: profile.stats.map((stat) => `${stat.label}: ${stat.value}`),
    sources: profile.sources.map(({ title, url }) => ({ title, url })),
    question: profile.questions[0],
    modelPath: `/models/savanna-expansion/${profile.id}.glb`,
    height: placement.height,
    // Show the monarch's spread wings and the vervet's turned face in photos.
    forwardAxis:
      profile.id === "african-monarch"
        ? "+x"
        : profile.id === "vervet-monkey"
          ? "-z"
          : "+z",
    position: [placement.at[0], 0, placement.at[1]],
    profile,
    viewingNote,
    habitatFeature: burrow ? "burrow" : insect ? "insect" : undefined,
  };
});
