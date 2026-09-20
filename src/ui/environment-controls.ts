import { createYearChart } from "./year-chart";
import {
  seasons,
  type Environment,
  type EnvironmentState,
  type SeasonId,
} from "../game/environment";

/**
 * The weather desk: the panel a child uses to make a storm, walk the months,
 * and jump between years. It reads the simulation and asks it for changes; it
 * never works out the weather itself.
 */

export interface EnvironmentControlsOptions {
  environment: Environment;
  /** Called whenever the child changes something, for narration or saving. */
  onChange?: (state: EnvironmentState, reason: string) => void;
}

export interface EnvironmentControls {
  element: HTMLElement;
  /** Refresh the readout. Call each frame, or after any change. */
  update(state: EnvironmentState): void;
  dispose(): void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Real seconds one simulated day takes, slowest first. */
const SPEEDS = [
  { id: "paused", label: "Paused", secondsPerDay: 0 },
  { id: "day", label: "A day a minute", secondsPerDay: 60 },
  { id: "month", label: "A month a minute", secondsPerDay: 2 },
  { id: "year", label: "A year a minute", secondsPerDay: 0.1644 },
];

function button(
  className: string,
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}

function describeHour(hour: number): string {
  const whole = Math.floor(hour) % 24;
  const minutes = Math.floor((hour - Math.floor(hour)) * 60);
  const suffix = whole < 12 ? "am" : "pm";
  const display = whole % 12 === 0 ? 12 : whole % 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Plain words for a 0 to 1 reading, because a child should not need a decimal. */
function describeLevel(value: number, dry: string, wet: string): string {
  if (value < 0.2) return dry;
  if (value < 0.45) return `A little ${wet.toLowerCase()}`;
  if (value < 0.75) return wet;
  return `Very ${wet.toLowerCase()}`;
}

export function createEnvironmentControls(
  options: EnvironmentControlsOptions,
): EnvironmentControls {
  const { environment, onChange } = options;
  const site = environment.site();

  const element = document.createElement("section");
  element.className = "weather-desk";
  element.setAttribute("aria-label", "Weather and seasons");

  const heading = document.createElement("h2");
  heading.className = "weather-desk__title";
  heading.textContent = "The weather desk";
  element.append(heading);

  const place = document.createElement("p");
  place.className = "weather-desk__place";
  place.textContent = `${site.name}, ${site.region}`;
  element.append(place);

  // Readout.
  const readout = document.createElement("div");
  readout.className = "weather-desk__readout";
  readout.setAttribute("role", "status");
  readout.setAttribute("aria-live", "polite");
  element.append(readout);

  const dateLine = document.createElement("p");
  dateLine.className = "weather-desk__date";
  const seasonLine = document.createElement("p");
  seasonLine.className = "weather-desk__season";
  const summaryLine = document.createElement("p");
  summaryLine.className = "weather-desk__summary";
  readout.append(dateLine, seasonLine, summaryLine);

  const facts = document.createElement("dl");
  facts.className = "weather-desk__facts";
  readout.append(facts);

  function fact(label: string): HTMLElement {
    const term = document.createElement("dt");
    term.textContent = label;
    const value = document.createElement("dd");
    facts.append(term, value);
    return value;
  }

  const skyValue = fact("Sky");
  const temperatureValue = fact("Air");
  const rainValue = fact("Rain this month");
  const grassValue = fact("Grass");
  const waterValue = fact("Waterhole");
  const sunValue = fact("Sun");

  function announce(reason: string): void {
    const state = environment.state();
    update(state);
    onChange?.(state, reason);
  }

  // Storm controls.
  const stormRow = document.createElement("div");
  stormRow.className = "weather-desk__row weather-desk__row--storm";
  const stormButton = button("weather-desk__storm", "Make a storm", () => {
    environment.triggerStorm();
    announce("A storm is rolling in.");
  });
  const clearButton = button("weather-desk__clear", "Clear the sky", () => {
    environment.clearSkies();
    announce("The sky is clearing.");
  });
  stormRow.append(stormButton, clearButton);
  element.append(stormRow);

  // Months.
  const monthGroup = document.createElement("fieldset");
  monthGroup.className = "weather-desk__group";
  const monthLegend = document.createElement("legend");
  monthLegend.textContent = "Month";
  monthGroup.append(monthLegend);
  const monthGrid = document.createElement("div");
  monthGrid.className = "weather-desk__months";
  const monthButtons = MONTH_NAMES.map((name, index) => {
    const control = button("weather-desk__month", name.slice(0, 3), () => {
      environment.setDate(environment.state().clock.year, index);
      announce(`${name}.`);
    });
    control.setAttribute("aria-label", name);
    monthGrid.append(control);
    return control;
  });
  monthGroup.append(monthGrid);
  element.append(monthGroup);

  // Seasons.
  const seasonGroup = document.createElement("fieldset");
  seasonGroup.className = "weather-desk__group";
  const seasonLegend = document.createElement("legend");
  seasonLegend.textContent = "Season";
  seasonGroup.append(seasonLegend);
  const seasonRow = document.createElement("div");
  seasonRow.className = "weather-desk__seasons";
  const seasonButtons = new Map<SeasonId, HTMLButtonElement>();
  for (const season of seasons) {
    const control = button("weather-desk__season-button", season.name, () => {
      environment.setSeason(season.id);
      announce(season.summary);
    });
    seasonRow.append(control);
    seasonButtons.set(season.id, control);
  }
  seasonGroup.append(seasonRow);
  element.append(seasonGroup);

  // Year.
  const yearGroup = document.createElement("fieldset");
  yearGroup.className = "weather-desk__group";
  const yearLegend = document.createElement("legend");
  yearLegend.textContent = "Year";
  yearGroup.append(yearLegend);
  const yearRow = document.createElement("div");
  yearRow.className = "weather-desk__row";
  const yearBack = button("weather-desk__step", "Back a year", () => {
    environment.stepYear(-1);
    announce(`Year ${environment.state().clock.year}.`);
  });
  const yearValue = document.createElement("output");
  yearValue.className = "weather-desk__year";
  const yearForward = button("weather-desk__step", "On a year", () => {
    environment.stepYear(1);
    announce(`Year ${environment.state().clock.year}.`);
  });
  yearRow.append(yearBack, yearValue, yearForward);
  yearGroup.append(yearRow);
  element.append(yearGroup);

  // Time of day.
  const timeGroup = document.createElement("fieldset");
  timeGroup.className = "weather-desk__group";
  const timeLegend = document.createElement("legend");
  timeLegend.textContent = "Time of day";
  timeGroup.append(timeLegend);
  const hourSlider = document.createElement("input");
  hourSlider.type = "range";
  hourSlider.min = "0";
  hourSlider.max = "23.75";
  hourSlider.step = "0.25";
  hourSlider.className = "weather-desk__hour";
  hourSlider.setAttribute("aria-label", "Time of day");
  const hourValue = document.createElement("output");
  hourValue.className = "weather-desk__hour-value";
  hourSlider.addEventListener("input", () => {
    environment.setHour(Number(hourSlider.value));
    announce(describeHour(Number(hourSlider.value)));
  });
  timeGroup.append(hourSlider, hourValue);
  element.append(timeGroup);

  // Speed.
  const speedGroup = document.createElement("fieldset");
  speedGroup.className = "weather-desk__group";
  const speedLegend = document.createElement("legend");
  speedLegend.textContent = "Let time run";
  speedGroup.append(speedLegend);
  const speedRow = document.createElement("div");
  speedRow.className = "weather-desk__speeds";
  const speedButtons = SPEEDS.map((speed) => {
    const control = button("weather-desk__speed", speed.label, () => {
      environment.setSecondsPerDay(speed.secondsPerDay);
      announce(speed.label);
    });
    control.dataset.speed = speed.id;
    speedRow.append(control);
    return control;
  });
  speedGroup.append(speedRow);
  element.append(speedGroup);

  const yearChart = createYearChart();
  element.append(yearChart.element);

  const provenance = document.createElement("p");
  provenance.className = "weather-desk__provenance";
  provenance.textContent = `Rain and temperature are the ${site.period} averages measured at this place. How green the grass gets, and when a storm breaks, are worked out from those averages.`;
  element.append(provenance);

  let lastMonth = -1;
  let lastYear = -1;
  let lastSeason = "";
  let lastSpeed = -1;

  function update(state: EnvironmentState): void {
    const { clock } = state;
    dateLine.textContent = `${MONTH_NAMES[clock.month]} ${clock.day}, ${clock.year}`;
    if (lastSeason !== state.season.id) {
      seasonLine.textContent = state.season.name;
      summaryLine.textContent = state.season.summary;
      for (const [id, control] of seasonButtons)
        control.setAttribute("aria-pressed", String(id === state.season.id));
      lastSeason = state.season.id;
    }
    if (lastMonth !== clock.month) {
      monthButtons.forEach((control, index) =>
        control.setAttribute("aria-pressed", String(index === clock.month)),
      );
      lastMonth = clock.month;
    }
    if (lastYear !== clock.year) {
      yearValue.textContent = String(clock.year);
      lastYear = clock.year;
    }
    const speed = environment.secondsPerDay();
    if (lastSpeed !== speed) {
      speedButtons.forEach((control, index) =>
        control.setAttribute(
          "aria-pressed",
          String(SPEEDS[index].secondsPerDay === speed),
        ),
      );
      lastSpeed = speed;
    }

    yearChart.update(state);

    hourSlider.value = String(clock.hour);
    hourValue.textContent = describeHour(clock.hour);

    skyValue.textContent =
      state.weather === "storm"
        ? "Storm"
        : state.weather === "cloudy"
          ? "Cloudy"
          : clock.hour < state.sunriseHour || clock.hour > state.sunsetHour
            ? "Clear and dark"
            : "Clear and bright";
    stormButton.disabled = state.weather === "storm";
    clearButton.disabled = state.weather !== "storm";
    temperatureValue.textContent = `${Math.round(state.temperatureC)} degrees`;
    rainValue.textContent = `${Math.round(state.monthRainfallMm)} mm`;
    grassValue.textContent = describeLevel(
      state.greenness,
      "Dry straw",
      "Green",
    );
    waterValue.textContent = describeLevel(
      state.waterLevel,
      "Cracked mud",
      "Full",
    );
    sunValue.textContent = `Up ${describeHour(state.sunriseHour)}, down ${describeHour(state.sunsetHour)}`;
  }

  update(environment.state());

  return {
    element,
    update,
    dispose() {
      element.remove();
    },
  };
}
