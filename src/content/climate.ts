import type { SourceRecord } from "./types";

/**
 * Measured climate normals for one place in the savanna, so the seasons in the
 * game follow the real year rather than a designer's guess. Rainfall is stored
 * as a daily mean for the month, exactly as the source publishes it.
 */
export interface ClimateMonth {
  /** 0 = January. */
  month: number;
  name: string;
  /** Mean rainfall over the month, millimetres per day. */
  rainMmPerDay: number;
  /** Mean daily maximum air temperature, degrees Celsius. */
  maxC: number;
  /** Mean daily minimum air temperature, degrees Celsius. */
  minC: number;
}

export interface ClimateSite {
  id: string;
  name: string;
  region: string;
  /** Degrees north, negative south of the equator. */
  latitude: number;
  /** Degrees east, negative west of Greenwich. */
  longitude: number;
  elevationM: number;
  period: string;
  months: ClimateMonth[];
  sourceIds: string[];
  lastReviewed: string;
}

export const climateReviewedAt = "2026-09-20";

/**
 * Seronera, in the central Serengeti, is where the game's savanna is set.
 * Values are the NASA POWER 20-year monthly climatology (2001-2020) sampled at
 * 2.4333 S, 34.8233 E, which is built on NASA's MERRA-2 reanalysis.
 */
export const seronera: ClimateSite = {
  id: "seronera",
  name: "Seronera",
  region: "Central Serengeti, Tanzania",
  latitude: -2.4333,
  longitude: 34.8233,
  elevationM: 1510,
  period: "January 2001 to December 2020",
  lastReviewed: climateReviewedAt,
  sourceIds: ["nasa-power", "serengeti-rainfall"],
  months: [
    { month: 0, name: "January", rainMmPerDay: 3.83, maxC: 32.53, minC: 9.9 },
    {
      month: 1,
      name: "February",
      rainMmPerDay: 2.79,
      maxC: 33.59,
      minC: 11.16,
    },
    { month: 2, name: "March", rainMmPerDay: 4.54, maxC: 33.79, minC: 12.26 },
    { month: 3, name: "April", rainMmPerDay: 4.73, maxC: 31.73, minC: 12.73 },
    { month: 4, name: "May", rainMmPerDay: 2.13, maxC: 29.06, minC: 10.21 },
    { month: 5, name: "June", rainMmPerDay: 0.57, maxC: 28.98, minC: 9.1 },
    { month: 6, name: "July", rainMmPerDay: 0.3, maxC: 30.65, minC: 8.46 },
    { month: 7, name: "August", rainMmPerDay: 0.64, maxC: 31.6, minC: 10.02 },
    {
      month: 8,
      name: "September",
      rainMmPerDay: 0.86,
      maxC: 32.76,
      minC: 10.59,
    },
    { month: 9, name: "October", rainMmPerDay: 1.92, maxC: 33.67, minC: 12.24 },
    {
      month: 10,
      name: "November",
      rainMmPerDay: 4.66,
      maxC: 31.6,
      minC: 13.06,
    },
    {
      month: 11,
      name: "December",
      rainMmPerDay: 4.32,
      maxC: 32.7,
      minC: 11.93,
    },
  ],
};

export const climateSources: SourceRecord[] = [
  {
    id: "nasa-power",
    title:
      "POWER Climatology API, 20-year monthly climatology for 2.4333 S, 34.8233 E",
    publisher:
      "NASA Langley Research Center, Prediction Of Worldwide Energy Resources",
    url: "https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=PRECTOTCORR,T2M_MAX,T2M_MIN&community=AG&longitude=34.8233&latitude=-2.4333&format=JSON",
    lastReviewed: climateReviewedAt,
    reviewerNote:
      "Rainfall is PRECTOTCORR in millimetres per day; temperatures are T2M_MAX and T2M_MIN in degrees Celsius. Built on the MERRA-2 reanalysis, so it describes the 2001-2020 average year and not any single year's weather.",
  },
  {
    id: "serengeti-rainfall",
    title: "Serengeti National Park, climate and the wildebeest migration",
    publisher: "Tanzania National Parks",
    url: "https://www.tanzaniaparks.go.tz/national_parks/serengeti-national-park",
    lastReviewed: climateReviewedAt,
    reviewerNote:
      "Used only for the named seasons: short rains from November, long rains from March to May, and a dry season from June to October.",
  },
];

/** Millimetres of rain the average year brings in this calendar month. */
export function monthlyRainfallMm(
  site: ClimateSite,
  year: number,
  month: number,
): number {
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return site.months[month].rainMmPerDay * days;
}

/** Millimetres of rain the average year brings in total. */
export function annualRainfallMm(site: ClimateSite, year: number): number {
  let total = 0;
  for (let month = 0; month < 12; month++)
    total += monthlyRainfallMm(site, year, month);
  return total;
}
