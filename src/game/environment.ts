import {
  monthlyRainfallMm,
  seronera,
  type ClimateSite,
} from "../content/climate";

/**
 * The savanna year, simulated from measured climate normals. Nothing here
 * imports a renderer: the simulation produces numbers, and the visual layer
 * decides what to do with them. Every value is a function of the date, so
 * scrubbing to a month gives the same savanna every time.
 */

export type SeasonId = "short-rains" | "green" | "long-rains" | "dry";
export type WeatherId = "clear" | "cloudy" | "storm";

export interface Season {
  id: SeasonId;
  name: string;
  /** What a child sees happening in the savanna during this season. */
  summary: string;
  /** Calendar months in this season, 0 = January. */
  months: number[];
}

export interface EnvironmentClock {
  year: number;
  /** 0 = January. */
  month: number;
  /** 1-31. */
  day: number;
  /** Local solar hour, 0-24. */
  hour: number;
  /** 1-366. */
  dayOfYear: number;
}

export interface EnvironmentState {
  clock: EnvironmentClock;
  season: Season;
  weather: WeatherId;
  /** 0 when dry, rising to 1 at the heart of a storm. */
  stormIntensity: number;
  /** 0 to 1, how much of the sky is covered. */
  cloudCover: number;
  /** Metres per second at the player's height. */
  windSpeed: number;
  /** Air temperature right now, degrees Celsius. */
  temperatureC: number;
  /** Millimetres of rain the average year brings in this calendar month. */
  monthRainfallMm: number;
  /** Chance that the average year brings a storm on this date, 0 to 1. */
  stormChance: number;
  /** How green the grass is, 0 straw to 1 lush. Lags the rain by weeks. */
  greenness: number;
  /** How full the waterhole is, 0 cracked mud to 1 brimming. */
  waterLevel: number;
  /** Sun height above the horizon, radians. Negative at night. */
  sunAltitude: number;
  /** Sun compass bearing, radians clockwise from north. */
  sunAzimuth: number;
  /** 0 at night, 1 with the sun overhead. */
  daylight: number;
  /** Local solar time the sun comes up, in hours. */
  sunriseHour: number;
  /** Local solar time the sun goes down, in hours. */
  sunsetHour: number;
}

export interface EnvironmentOptions {
  site?: ClimateSite;
  /** Where the simulated year starts. */
  start?: { year: number; month: number; day: number; hour: number };
  /** Real seconds one simulated day takes. 0 pauses the clock. */
  secondsPerDay?: number;
  /** Storms the simulation rolls for itself, on top of any the child triggers. */
  naturalStorms?: boolean;
}

export interface Environment {
  state(): EnvironmentState;
  /** Advance by real elapsed seconds at the current speed. */
  advance(realSeconds: number): EnvironmentState;
  setSecondsPerDay(seconds: number): void;
  secondsPerDay(): number;
  setDate(year: number, month: number, day?: number): void;
  setHour(hour: number): void;
  stepMonth(delta: number): void;
  stepYear(delta: number): void;
  setSeason(id: SeasonId): void;
  /** Start a storm now, whatever the date says. */
  triggerStorm(): void;
  /** End any storm and push the clouds away. */
  clearSkies(): void;
  site(): ClimateSite;
}

export const seasons: Season[] = [
  {
    id: "short-rains",
    name: "Short rains",
    summary:
      "The first storms break the dry season. Brown grass turns green again and the puddles come back.",
    months: [10, 11],
  },
  {
    id: "green",
    name: "Green season",
    summary:
      "Warm days, tall grass, and a storm most afternoons. This is when zebra and wildebeest foals are born.",
    months: [0, 1],
  },
  {
    id: "long-rains",
    name: "Long rains",
    summary:
      "The wettest months of the year. The savanna is at its greenest and the waterholes are full.",
    months: [2, 3, 4],
  },
  {
    id: "dry",
    name: "Dry season",
    summary:
      "Months can pass with almost no rain. The grass dries to straw and the herds follow the water north.",
    months: [5, 6, 7, 8, 9],
  },
];

const seasonByMonth: SeasonId[] = (() => {
  const table = new Array<SeasonId>(12);
  for (const season of seasons)
    for (const month of season.months) table[month] = season.id;
  return table;
})();

export function seasonForMonth(month: number): Season {
  const id = seasonByMonth[((month % 12) + 12) % 12];
  return seasons.find((season) => season.id === id) as Season;
}

const DAY_MS = 86_400_000;
const STORM_HOURS = 2.6;
/**
 * Real seconds a triggered storm takes to build and pass while the clock is
 * paused. A child who presses "Make a storm" should get a storm, not a storm
 * that waits for them to also start time.
 */
const PAUSED_STORM_SECONDS = 36;
const GRASS_MEMORY_DAYS = 24;
const WATER_MEMORY_DAYS = 70;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / DAY_MS) + 1;
}

/**
 * Mean rainfall on a given day of the year, interpolated between the monthly
 * normals so the seasons arrive gradually instead of switching on the first.
 */
function rainMmPerDay(site: ClimateSite, year: number, day: number): number {
  const total = daysInYear(year);
  const centres: number[] = [];
  let elapsed = 0;
  for (let month = 0; month < 12; month++) {
    const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    centres.push(elapsed + length / 2);
    elapsed += length;
  }
  const wrapped = ((((day - 1) % total) + total) % total) + 1;
  let next = centres.findIndex((centre) => centre >= wrapped);
  if (next === -1) next = 12;
  const previous = next - 1;
  const previousDay = previous < 0 ? centres[11] - total : centres[previous];
  const nextDay = next > 11 ? centres[0] + total : centres[next];
  const t = (wrapped - previousDay) / (nextDay - previousDay);
  const a = site.months[((previous % 12) + 12) % 12].rainMmPerDay;
  const b = site.months[next % 12].rainMmPerDay;
  return a + (b - a) * t;
}

/**
 * Grass and groundwater answer rain slowly. Both are an exponentially weighted
 * sum of the rain that has already fallen, with a short memory for the grass
 * and a long one for the waterhole, which is why the savanna stays green for
 * weeks after the last storm and dries out long after that.
 */
function laggedRain(
  site: ClimateSite,
  year: number,
  day: number,
  memoryDays: number,
): number {
  const window = Math.ceil(memoryDays * 4);
  let weighted = 0;
  let weights = 0;
  for (let back = 0; back < window; back++) {
    const weight = Math.exp(-back / memoryDays);
    weighted += rainMmPerDay(site, year, day - back) * weight;
    weights += weight;
  }
  return weighted / weights;
}

/** The yearly range of a lagged signal, so it can be reported as 0 to 1. */
function laggedRange(
  site: ClimateSite,
  memoryDays: number,
): { low: number; high: number } {
  let low = Infinity;
  let high = -Infinity;
  for (let day = 1; day <= 365; day++) {
    const value = laggedRain(site, 2025, day, memoryDays);
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  return { low, high };
}

const grassRange = laggedRange(seronera, GRASS_MEMORY_DAYS);
const waterRange = laggedRange(seronera, WATER_MEMORY_DAYS);

function normalise(
  value: number,
  range: { low: number; high: number },
): number {
  return clamp((value - range.low) / (range.high - range.low), 0, 1);
}

/**
 * Solar position from the NOAA approximation, in local solar time, so the sun
 * rises in the east at the angle this latitude really sees. Two degrees from
 * the equator means the day is close to twelve hours all year, which is the
 * point worth noticing: this savanna's seasons are wet and dry, not summer and
 * winter.
 */
export function solarPosition(
  latitudeDeg: number,
  day: number,
  hour: number,
): { altitude: number; azimuth: number; declination: number } {
  const gamma = ((2 * Math.PI) / 365) * (day - 1 + (hour - 12) / 24);
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const latitude = (latitudeDeg * Math.PI) / 180;
  const hourAngle = ((hour - 12) * 15 * Math.PI) / 180;
  const cosZenith =
    Math.sin(latitude) * Math.sin(declination) +
    Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  const zenith = Math.acos(clamp(cosZenith, -1, 1));
  const altitude = Math.PI / 2 - zenith;
  const sinZenith = Math.sin(zenith);
  let azimuth = Math.PI;
  if (sinZenith > 1e-6) {
    const cosAzimuth =
      (Math.sin(declination) - Math.sin(latitude) * cosZenith) /
      (Math.cos(latitude) * sinZenith);
    azimuth = Math.acos(clamp(cosAzimuth, -1, 1));
    if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth;
  }
  return { altitude, azimuth, declination };
}

/** Local solar hours of sunrise and sunset for this latitude and day. */
export function sunTimes(
  latitudeDeg: number,
  day: number,
): { sunrise: number; sunset: number } {
  const { declination } = solarPosition(latitudeDeg, day, 12);
  const latitude = (latitudeDeg * Math.PI) / 180;
  const cosHourAngle = -Math.tan(latitude) * Math.tan(declination);
  if (cosHourAngle <= -1) return { sunrise: 0, sunset: 24 };
  if (cosHourAngle >= 1) return { sunrise: 12, sunset: 12 };
  const halfDay = (Math.acos(cosHourAngle) * 180) / Math.PI / 15;
  return { sunrise: 12 - halfDay, sunset: 12 + halfDay };
}

/**
 * How likely the average year is to bring a storm on this date. Equatorial
 * rain arrives as afternoon thunderstorms rather than all-day drizzle, so a
 * wet month is mostly a month with more storm days in it.
 */
export function stormChanceFor(
  site: ClimateSite,
  year: number,
  day: number,
): number {
  return clamp(rainMmPerDay(site, year, day) / 6.5, 0, 0.92);
}

/** Deterministic noise, so the same date always brings the same weather. */
function dateNoise(year: number, day: number, salt: number): number {
  let seed = ((year * 1000 + day) * 2654435761 + salt * 40503) >>> 0;
  seed = (seed ^ (seed >>> 13)) >>> 0;
  seed = Math.imul(seed, 1274126177) >>> 0;
  return ((seed ^ (seed >>> 16)) >>> 0) / 4294967296;
}

/**
 * The hour a natural storm breaks, if one breaks at all. Convective storms
 * build through the heat of the day, so this lands in the afternoon.
 */
function naturalStormHour(year: number, day: number): number {
  return 13.5 + dateNoise(year, day, 7) * 4.5;
}

/** Storms build fast and trail off slowly, like the real thing. */
function stormEnvelope(elapsedHours: number): number {
  const t = clamp(elapsedHours / STORM_HOURS, 0, 1);
  return clamp(Math.sin(Math.pow(t, 0.62) * Math.PI), 0, 1);
}

export function createEnvironment(
  options: EnvironmentOptions = {},
): Environment {
  const site = options.site ?? seronera;
  const start = options.start ?? { year: 2026, month: 2, day: 21, hour: 9 };
  const naturalStorms = options.naturalStorms ?? true;
  let secondsPerDay = options.secondsPerDay ?? 0;
  let time = Date.UTC(start.year, start.month, start.day);
  let hour = clamp(start.hour, 0, 24);
  /** Hours since a triggered storm began, or null when none is running. */
  let stormAge: number | null = null;
  /** True while the child's own choice overrides the date's own weather. */
  let overridden = false;
  /** Dates whose natural storm the child has waved away. */
  const suppressed = new Set<string>();

  function currentDate(): Date {
    return new Date(time);
  }

  function dateKey(): string {
    const date = currentDate();
    return `${date.getUTCFullYear()}-${dayOfYear(date)}`;
  }

  /** Decide whether a storm is running, and how hard, at the current moment. */
  function resolveStorm(): number {
    if (stormAge !== null) {
      if (stormAge >= STORM_HOURS) {
        stormAge = null;
        overridden = false;
        return 0;
      }
      return stormEnvelope(stormAge);
    }
    if (overridden) return 0;
    if (!naturalStorms || suppressed.has(dateKey())) return 0;
    const date = currentDate();
    const day = dayOfYear(date);
    const year = date.getUTCFullYear();
    if (dateNoise(year, day, 3) > stormChanceFor(site, year, day)) return 0;
    const begins = naturalStormHour(year, day);
    if (hour < begins || hour > begins + STORM_HOURS) return 0;
    return stormEnvelope(hour - begins);
  }

  function build(): EnvironmentState {
    const date = currentDate();
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = dayOfYear(date);
    const stormIntensity = resolveStorm();
    const normals = site.months[month];
    const { sunrise, sunset } = sunTimes(site.latitude, day);
    const { altitude, azimuth } = solarPosition(site.latitude, day, hour);
    const daylight = clamp(Math.sin(Math.max(0, altitude)), 0, 1);

    // The coolest hour is just before sunrise and the warmest is mid afternoon,
    // so the daily swing is a sine shifted a few hours behind the sun.
    const phase = ((hour - 15 + 24) % 24) / 24;
    const warmth = (Math.cos(phase * 2 * Math.PI) + 1) / 2;
    const clearTemperature =
      normals.minC + (normals.maxC - normals.minC) * warmth;

    const seasonalCloud = clamp(rainMmPerDay(site, year, day) / 7, 0.05, 0.62);
    const cloudCover = clamp(
      seasonalCloud + stormIntensity * (1 - seasonalCloud),
      0,
      1,
    );

    return {
      clock: { year, month, day: date.getUTCDate(), hour, dayOfYear: day },
      season: seasonForMonth(month),
      weather:
        stormIntensity > 0.05
          ? "storm"
          : cloudCover > 0.45
            ? "cloudy"
            : "clear",
      stormIntensity,
      cloudCover,
      // A storm arrives on a gust front; a calm day barely stirs the grass.
      windSpeed: 1.4 + stormIntensity * 12 + cloudCover * 1.6,
      // Rain and cloud cool the air by several degrees within minutes.
      temperatureC:
        clearTemperature -
        stormIntensity * 6.5 -
        (cloudCover - seasonalCloud) * 2,
      monthRainfallMm: monthlyRainfallMm(site, year, month),
      stormChance: stormChanceFor(site, year, day),
      greenness: normalise(
        laggedRain(site, year, day, GRASS_MEMORY_DAYS),
        grassRange,
      ),
      waterLevel: normalise(
        laggedRain(site, year, day, WATER_MEMORY_DAYS),
        waterRange,
      ),
      sunAltitude: altitude,
      sunAzimuth: azimuth,
      daylight,
      sunriseHour: sunrise,
      sunsetHour: sunset,
    };
  }

  function addHours(hours: number): void {
    if (stormAge !== null) stormAge += hours;
    hour += hours;
    while (hour >= 24) {
      hour -= 24;
      time += DAY_MS;
      // A new day brings its own weather, so yesterday's choice stops applying.
      overridden = false;
    }
    while (hour < 0) {
      hour += 24;
      time -= DAY_MS;
      overridden = false;
    }
  }

  function jumpTo(year: number, month: number, day?: number): void {
    const wrappedYear = year + Math.floor(month / 12);
    const wrappedMonth = ((month % 12) + 12) % 12;
    const lastDay = new Date(
      Date.UTC(wrappedYear, wrappedMonth + 1, 0),
    ).getUTCDate();
    const target = day ?? currentDate().getUTCDate();
    time = Date.UTC(wrappedYear, wrappedMonth, clamp(target, 1, lastDay));
    stormAge = null;
    overridden = false;
  }

  return {
    state: build,
    advance(realSeconds) {
      if (realSeconds > 0) {
        if (secondsPerDay > 0) addHours((realSeconds / secondsPerDay) * 24);
        else if (stormAge !== null)
          // The clock is paused, so run the storm on its own real-time
          // envelope rather than freezing it at the moment it was triggered.
          stormAge += realSeconds * (STORM_HOURS / PAUSED_STORM_SECONDS);
      }
      return build();
    },
    setSecondsPerDay(seconds) {
      secondsPerDay = Math.max(0, seconds);
    },
    secondsPerDay: () => secondsPerDay,
    setDate: jumpTo,
    setHour(value) {
      hour = clamp(value, 0, 24) % 24;
      stormAge = null;
      overridden = false;
    },
    stepMonth(delta) {
      const date = currentDate();
      jumpTo(
        date.getUTCFullYear(),
        date.getUTCMonth() + delta,
        date.getUTCDate(),
      );
    },
    stepYear(delta) {
      const date = currentDate();
      jumpTo(
        date.getUTCFullYear() + delta,
        date.getUTCMonth(),
        date.getUTCDate(),
      );
    },
    setSeason(id) {
      const season = seasons.find((entry) => entry.id === id);
      if (!season) return;
      // Land in the middle of the season rather than on its first uncertain day.
      const month = season.months[Math.floor(season.months.length / 2)];
      jumpTo(currentDate().getUTCFullYear(), month, 15);
    },
    triggerStorm() {
      stormAge = 0;
      overridden = true;
      suppressed.delete(dateKey());
    },
    clearSkies() {
      stormAge = null;
      overridden = true;
      suppressed.add(dateKey());
    },
    site: () => site,
  };
}
