import { describe, expect, it } from "vitest";
import {
  annualRainfallMm,
  monthlyRainfallMm,
  seronera,
} from "../../src/content/climate";
import {
  createEnvironment,
  seasonForMonth,
  seasons,
  solarPosition,
  stormChanceFor,
  sunTimes,
} from "../../src/game/environment";

const APRIL = 3;
const JULY = 6;
const AUGUST = 7;

describe("savanna climate data", () => {
  it("keeps every month cited, ordered, and physically possible", () => {
    expect(seronera.months).toHaveLength(12);
    seronera.months.forEach((month, index) => {
      expect(month.month).toBe(index);
      expect(month.rainMmPerDay).toBeGreaterThanOrEqual(0);
      expect(month.maxC).toBeGreaterThan(month.minC);
    });
    expect(seronera.sourceIds.length).toBeGreaterThan(0);
  });

  it("totals about 950 mm a year, the published central Serengeti figure", () => {
    const annual = annualRainfallMm(seronera, 2026);
    expect(annual).toBeGreaterThan(850);
    expect(annual).toBeLessThan(1050);
  });

  it("makes April far wetter than July", () => {
    expect(monthlyRainfallMm(seronera, 2026, APRIL)).toBeGreaterThan(
      monthlyRainfallMm(seronera, 2026, JULY) * 10,
    );
  });
});

describe("seasons", () => {
  it("assigns all twelve months to exactly one season", () => {
    const months = seasons
      .flatMap((season) => season.months)
      .sort((a, b) => a - b);
    expect(months).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(seasonForMonth(APRIL).id).toBe("long-rains");
    expect(seasonForMonth(JULY).id).toBe("dry");
  });

  it("jumps to the middle of a season rather than its first day", () => {
    const environment = createEnvironment({ naturalStorms: false });
    environment.setSeason("dry");
    const { clock, season } = environment.state();
    expect(season.id).toBe("dry");
    // The dry season runs June to October, so its middle is mid August.
    expect(clock.month).toBe(AUGUST);
    expect(clock.day).toBe(15);
  });
});

describe("the sun over the Serengeti", () => {
  it("runs a day close to twelve hours all year, two degrees off the equator", () => {
    for (const day of [1, 80, 172, 266, 355]) {
      const { sunrise, sunset } = sunTimes(seronera.latitude, day);
      expect(sunset - sunrise).toBeGreaterThan(11.8);
      expect(sunset - sunrise).toBeLessThan(12.3);
    }
  });

  it("is below the horizon at midnight and high overhead at noon", () => {
    expect(solarPosition(seronera.latitude, 100, 0).altitude).toBeLessThan(0);
    expect(solarPosition(seronera.latitude, 100, 12).altitude).toBeGreaterThan(
      1.3,
    );
  });

  it("rises in the east and sets in the west", () => {
    const morning = solarPosition(seronera.latitude, 100, 8).azimuth;
    const evening = solarPosition(seronera.latitude, 100, 16).azimuth;
    // Azimuth is measured clockwise from north, so east is near 90 degrees.
    expect((morning * 180) / Math.PI).toBeGreaterThan(45);
    expect((morning * 180) / Math.PI).toBeLessThan(135);
    expect((evening * 180) / Math.PI).toBeGreaterThan(225);
    expect((evening * 180) / Math.PI).toBeLessThan(315);
  });
});

describe("the savanna year", () => {
  it("is greener and wetter in the long rains than in the dry season", () => {
    const environment = createEnvironment({ naturalStorms: false });
    environment.setDate(2026, APRIL, 15);
    const wet = environment.state();
    environment.setDate(2026, JULY, 15);
    const dry = environment.state();
    expect(wet.greenness).toBeGreaterThan(dry.greenness + 0.4);
    expect(wet.waterLevel).toBeGreaterThan(dry.waterLevel + 0.4);
    expect(wet.monthRainfallMm).toBeGreaterThan(dry.monthRainfallMm);
  });

  it("keeps the grass green for weeks after the rain stops", () => {
    const environment = createEnvironment({ naturalStorms: false });
    // May is already much drier than April, but the grass has not caught up.
    environment.setDate(2026, APRIL, 15);
    const april = environment.state();
    environment.setDate(2026, 4, 15);
    const may = environment.state();
    expect(may.monthRainfallMm).toBeLessThan(april.monthRainfallMm * 0.6);
    expect(may.greenness).toBeGreaterThan(0.55);
  });

  it("empties the waterhole more slowly than it browns the grass", () => {
    const environment = createEnvironment({ naturalStorms: false });
    environment.setDate(2026, 5, 15);
    const june = environment.state();
    expect(june.waterLevel).toBeGreaterThan(june.greenness);
  });

  it("makes a storm far likelier in April than in July", () => {
    expect(stormChanceFor(seronera, 2026, 105)).toBeGreaterThan(0.6);
    expect(stormChanceFor(seronera, 2026, 196)).toBeLessThan(0.1);
  });

  it("reports the same savanna whenever you come back to a date", () => {
    const environment = createEnvironment({ naturalStorms: false });
    environment.setDate(2026, APRIL, 15);
    const first = environment.state();
    environment.setDate(2026, 9, 2);
    environment.stepYear(3);
    environment.setDate(2026, APRIL, 15);
    expect(environment.state()).toEqual(first);
  });
});

describe("walking the clock", () => {
  it("rolls an hour past midnight into the next day", () => {
    const environment = createEnvironment({
      start: { year: 2026, month: APRIL, day: 30, hour: 23 },
      secondsPerDay: 24,
      naturalStorms: false,
    });
    environment.advance(2);
    const { clock } = environment.state();
    expect(clock.month).toBe(4);
    expect(clock.day).toBe(1);
    expect(clock.hour).toBeCloseTo(1, 5);
  });

  it("does not move while paused", () => {
    const environment = createEnvironment({
      secondsPerDay: 0,
      naturalStorms: false,
    });
    const before = environment.state().clock;
    environment.advance(600);
    expect(environment.state().clock).toEqual(before);
  });

  it("steps months across a year boundary and handles a short month", () => {
    const environment = createEnvironment({
      start: { year: 2026, month: 11, day: 31, hour: 9 },
      naturalStorms: false,
    });
    environment.stepMonth(1);
    expect(environment.state().clock).toMatchObject({
      year: 2027,
      month: 0,
      day: 31,
    });
    environment.stepMonth(1);
    // February has no 31st, so the date settles on the last day it has.
    expect(environment.state().clock).toMatchObject({
      year: 2027,
      month: 1,
      day: 28,
    });
  });

  it("finds February 29 in a leap year", () => {
    const environment = createEnvironment({
      start: { year: 2027, month: 1, day: 28, hour: 9 },
      naturalStorms: false,
    });
    environment.stepYear(1);
    environment.setDate(2028, 1, 29);
    expect(environment.state().clock).toMatchObject({ year: 2028, day: 29 });
  });
});

describe("storms", () => {
  it("starts when a child asks, whatever the date says", () => {
    const environment = createEnvironment({
      start: { year: 2026, month: JULY, day: 15, hour: 9 },
      secondsPerDay: 24,
    });
    expect(environment.state().weather).not.toBe("storm");
    environment.triggerStorm();
    environment.advance(1);
    const during = environment.state();
    expect(during.weather).toBe("storm");
    expect(during.stormIntensity).toBeGreaterThan(0);
    expect(during.cloudCover).toBeGreaterThan(0.6);
  });

  it("still runs a triggered storm while the clock is paused", () => {
    // The weather desk opens paused. Pressing the button must give a child a
    // storm, not a storm that waits for them to also start time.
    const environment = createEnvironment({
      start: { year: 2026, month: JULY, day: 15, hour: 9 },
      secondsPerDay: 0,
      naturalStorms: false,
    });
    environment.triggerStorm();
    environment.advance(6);
    const during = environment.state();
    expect(during.weather).toBe("storm");
    expect(during.stormIntensity).toBeGreaterThan(0.4);
    // The paused clock has not moved, even though the storm has.
    expect(during.clock.hour).toBe(9);
    // And the storm still passes on its own.
    environment.advance(40);
    expect(environment.state().weather).not.toBe("storm");
  });

  it("cools the air, raises the wind, and then passes", () => {
    const environment = createEnvironment({
      start: { year: 2026, month: JULY, day: 15, hour: 9 },
      secondsPerDay: 24,
      naturalStorms: false,
    });
    const calm = environment.state();
    environment.triggerStorm();
    // One real second is one simulated hour at 24 seconds a day.
    environment.advance(1.3);
    const peak = environment.state();
    expect(peak.temperatureC).toBeLessThan(calm.temperatureC);
    expect(peak.windSpeed).toBeGreaterThan(calm.windSpeed * 2);
    environment.advance(3);
    expect(environment.state().weather).not.toBe("storm");
  });

  it("brings the same storm back on the same date", () => {
    const wetDay = { year: 2026, month: APRIL, day: 12, hour: 15 };
    const first = createEnvironment({ start: wetDay });
    const second = createEnvironment({ start: wetDay });
    expect(first.state().stormIntensity).toBe(second.state().stormIntensity);
  });

  it("brings more storm hours to April than to July over a whole month", () => {
    const stormHours = (month: number) => {
      const environment = createEnvironment({
        start: { year: 2026, month, day: 1, hour: 0 },
        secondsPerDay: 24,
      });
      let hours = 0;
      for (let step = 0; step < 24 * 28; step++) {
        environment.advance(1);
        if (environment.state().weather === "storm") hours++;
      }
      return hours;
    };
    expect(stormHours(APRIL)).toBeGreaterThan(stormHours(JULY) * 3);
  });

  it("lets a child send the storm away for the rest of that day", () => {
    const environment = createEnvironment({
      start: { year: 2026, month: APRIL, day: 1, hour: 0 },
      secondsPerDay: 24,
    });
    let stormyHours = 0;
    for (let step = 0; step < 24; step++) {
      environment.advance(1);
      if (environment.state().weather === "storm") {
        environment.clearSkies();
        stormyHours++;
      }
    }
    // The first stormy hour is allowed; clearing the sky stops the rest.
    expect(stormyHours).toBeLessThanOrEqual(1);
  });
});
