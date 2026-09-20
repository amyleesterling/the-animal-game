import type { SourceRecord } from "./types";
import { climateReviewedAt } from "./climate";

/**
 * What the Serengeti year does to the animals living in it. The climate data
 * says how much rain falls; this says what that rain means on the ground.
 *
 * Every entry describes a typical year. The migration is driven by rainfall
 * and new grass, so its timing moves by weeks from one year to the next and
 * none of this is a guarantee about any particular date.
 */

export interface SavannaMonth {
  /** 0 = January. */
  month: number;
  /** Where the great migration usually is. */
  herds: string;
  /** What a child would notice on the ground. */
  happening: string;
  sourceIds: string[];
}

export const savannaYear: SavannaMonth[] = [
  {
    month: 0,
    herds: "On the short grass plains in the south.",
    happening:
      "The plains are green and the grass is short. It grows on old volcanic ash, which makes it rich in the minerals mother wildebeest need. The first calves arrive.",
    sourceIds: ["mcnaughton-minerals", "boone-migration"],
  },
  {
    month: 1,
    herds: "Still south, packed onto the calving grounds.",
    happening:
      "Calving. Hundreds of thousands of wildebeest calves are born within a few weeks, all at nearly the same time. A calf can stand and run on its first day.",
    sourceIds: ["boone-migration", "tanapa-serengeti"],
  },
  {
    month: 2,
    herds: "Spreading out across the southern plains.",
    happening:
      "The long rains begin. Storms most afternoons, and the grass grows faster than the herds can eat it.",
    sourceIds: ["tanapa-serengeti"],
  },
  {
    month: 3,
    herds: "Beginning to drift north and west.",
    happening:
      "The wettest month of the year. Grass is at its tallest, puddles are everywhere, and the waterholes are full.",
    sourceIds: ["nasa-power", "boone-migration"],
  },
  {
    month: 4,
    herds: "Gathering into long columns heading for the western corridor.",
    happening:
      "The rain eases off. The plains start to dry from the south, and the herds follow the green grass instead of staying put.",
    sourceIds: ["boone-migration"],
  },
  {
    month: 5,
    herds: "In the western corridor, near the Grumeti river.",
    happening:
      "The dry season starts. Grass turns from green to straw, and animals have to walk further between drinks.",
    sourceIds: ["boone-migration", "tanapa-serengeti"],
  },
  {
    month: 6,
    herds: "Pushing north. The first river crossings.",
    happening:
      "The driest stretch of the year is beginning. Dust, and fires in the old dry grass.",
    sourceIds: ["tanapa-serengeti"],
  },
  {
    month: 7,
    herds: "In the north, crossing the Mara river.",
    happening:
      "Deep dry season. The southern plains the herds were born on are bare, and the waterholes there are cracked mud.",
    sourceIds: ["boone-migration", "tanapa-serengeti"],
  },
  {
    month: 8,
    herds: "Still in the north, crossing back and forth.",
    happening:
      "Only the north still has grass worth eating, because it gets more rain than the south does.",
    sourceIds: ["boone-migration"],
  },
  {
    month: 9,
    herds: "Northern Serengeti, watching the sky.",
    happening:
      "The ground is at its driest. Clouds start building again in the afternoons.",
    sourceIds: ["nasa-power", "tanapa-serengeti"],
  },
  {
    month: 10,
    herds: "Turning south as the first storms break.",
    happening:
      "The short rains arrive. Within days the burnt and bare ground shows a haze of new green.",
    sourceIds: ["tanapa-serengeti", "boone-migration"],
  },
  {
    month: 11,
    herds: "Streaming back down to the southern plains.",
    happening:
      "Green season. The herds return to the short grass plains to wait for the calves, and the whole year starts again.",
    sourceIds: ["boone-migration"],
  },
];

export const savannaYearSources: SourceRecord[] = [
  {
    id: "boone-migration",
    title:
      "Serengeti wildebeest migratory patterns modeled from rainfall and new vegetation growth",
    publisher:
      "Boone, R. B., Thirgood, S. J., and Hopcraft, J. G. C., Ecology 87, 1987 to 1994 (2006)",
    url: "https://doi.org/10.1890/0012-9658(2006)87[1987:SWMPMF]2.0.CO;2",
    lastReviewed: climateReviewedAt,
    reviewerNote:
      "The migration follows rainfall and new grass growth, so its route and timing shift from year to year. Used for the month by month position of the herds, as a typical year and not a schedule.",
  },
  {
    id: "mcnaughton-minerals",
    title: "Mineral nutrition and seasonal movements of African migratory ungulates",
    publisher: "McNaughton, S. J., Nature 345, 613 to 615 (1990)",
    url: "https://doi.org/10.1038/345613a0",
    lastReviewed: climateReviewedAt,
    reviewerNote:
      "Used for the claim that the southern short grass plains are rich in the minerals breeding females need, which is part of why the herds calve there.",
  },
  {
    id: "tanapa-serengeti",
    title: "Serengeti National Park",
    publisher: "Tanzania National Parks",
    url: "https://www.tanzaniaparks.go.tz/national_parks/serengeti-national-park",
    lastReviewed: climateReviewedAt,
    reviewerNote:
      "Used for the named seasons and the general shape of the year only.",
  },
];

export function savannaMonth(month: number): SavannaMonth {
  return savannaYear[((month % 12) + 12) % 12];
}
