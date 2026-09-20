import {
  matchedRainPair,
  troughMonths,
  yearProfile,
  type EnvironmentState,
  type YearMonthProfile,
} from "../game/environment";
import { savannaMonth } from "../content/savanna-year";

/**
 * The whole savanna year on one screen, which is the part a falling raindrop
 * cannot show. Two panels stacked on a shared month axis: the rain that falls,
 * and how the savanna answers it. They are deliberately separate panels rather
 * than two lines on two scales, because millimetres and "how green" are not
 * comparable quantities and putting them on one axis would invent a
 * relationship the data does not have.
 */

export interface YearChart {
  element: HTMLElement;
  update(state: EnvironmentState): void;
}

const MONTH_INITIALS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];
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

const WIDTH = 348;
const COLUMN = WIDTH / 12;
const PANEL_HEIGHT = 58;
const PANEL_PAD = 5;
/** Each panel is its own drawing, so each can carry a real heading above it. */
const PANEL_BOX = PANEL_HEIGHT + PANEL_PAD * 2;
const BASE = PANEL_PAD + PANEL_HEIGHT;

function svg(tag: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs))
    node.setAttribute(key, String(value));
  return node;
}

function centre(month: number): number {
  return month * COLUMN + COLUMN / 2;
}

export function createYearChart(): YearChart {
  const profile = yearProfile();
  const maxRain = Math.max(...profile.map((m) => m.rainMm));
  const pair = matchedRainPair(profile);
  const troughs = troughMonths(profile);

  const element = document.createElement("section");
  element.className = "year-chart";
  element.setAttribute("aria-label", "The savanna year");

  const heading = document.createElement("h3");
  heading.className = "year-chart__title";
  heading.textContent = "The whole year";
  element.append(heading);

  const lead = document.createElement("p");
  lead.className = "year-chart__lead";
  lead.textContent =
    "Rain is measured. How green the grass gets, and how full the waterhole is, are worked out from that rain.";
  element.append(lead);

  // Panel headings live in HTML rather than inside the drawing, so they keep
  // their own text size on a narrow screen.
  const rainLabel = document.createElement("p");
  rainLabel.className = "year-chart__panel-title";
  rainLabel.textContent = "Rain that falls";
  const answerLabel = document.createElement("p");
  answerLabel.className =
    "year-chart__panel-title year-chart__panel-title--second";
  answerLabel.textContent = "How the savanna answers";

  function panel(label: string): { plot: SVGElement; marker: SVGElement } {
    const plot = svg("svg", {
      viewBox: `0 0 ${WIDTH} ${PANEL_BOX}`,
      class: "year-chart__plot",
      role: "img",
      "aria-label": label,
    });
    // The band marking the month the savanna is currently showing.
    const marker = svg("rect", {
      class: "year-chart__marker",
      x: 0,
      y: 0,
      width: COLUMN,
      height: PANEL_BOX,
      rx: 4,
    });
    plot.append(marker);
    return { plot, marker };
  }

  const rain = panel("Rainfall for each month of the year, in millimetres.");
  const answer = panel(
    "How green the grass is and how full the waterhole is, month by month.",
  );
  const plot = rain.plot;

  // Panel one: measured rainfall, one series, so no legend is needed.
  for (const month of profile) {
    const height = (month.rainMm / maxRain) * PANEL_HEIGHT;
    plot.append(
      svg("rect", {
        class: "year-chart__bar",
        x: month.month * COLUMN + COLUMN * 0.22,
        y: BASE - height,
        width: COLUMN * 0.56,
        height: Math.max(height, 1),
        rx: 2,
      }),
    );
  }
  plot.append(
    svg("line", {
      class: "year-chart__axis",
      x1: 0,
      y1: BASE,
      x2: WIDTH,
      y2: BASE,
    }),
  );

  // Panel two: the modelled response. Two series, so both are direct labelled
  // and a legend sits underneath.
  for (const fraction of [0.5, 1]) {
    answer.plot.append(
      svg("line", {
        class: "year-chart__grid",
        x1: 0,
        y1: BASE - PANEL_HEIGHT * fraction,
        x2: WIDTH,
        y2: BASE - PANEL_HEIGHT * fraction,
      }),
    );
  }
  function polyline(
    values: (month: YearMonthProfile) => number,
    className: string,
  ): SVGElement {
    const points = profile
      .map((m) => `${centre(m.month)},${BASE - values(m) * PANEL_HEIGHT}`)
      .join(" ");
    return svg("polyline", { class: className, points });
  }
  answer.plot.append(
    polyline((m) => m.waterLevel, "year-chart__line year-chart__line--water"),
    polyline((m) => m.greenness, "year-chart__line year-chart__line--grass"),
    svg("line", {
      class: "year-chart__axis",
      x1: 0,
      y1: BASE,
      x2: WIDTH,
      y2: BASE,
    }),
  );

  const grassDot = svg("circle", {
    class: "year-chart__dot year-chart__dot--grass",
    r: 4,
    cx: 0,
    cy: 0,
  });
  const waterDot = svg("circle", {
    class: "year-chart__dot year-chart__dot--water",
    r: 4,
    cx: 0,
    cy: 0,
  });
  answer.plot.append(waterDot, grassDot);

  element.append(rainLabel, rain.plot, answerLabel, answer.plot);

  // The month axis is real HTML text, so it never shrinks below a readable
  // size when the panel is narrow.
  const axis = document.createElement("ol");
  axis.className = "year-chart__months";
  const monthCells = MONTH_INITIALS.map((initial, index) => {
    const cell = document.createElement("li");
    cell.textContent = initial;
    cell.title = MONTH_NAMES[index];
    axis.append(cell);
    return cell;
  });
  element.append(axis);

  const legend = document.createElement("ul");
  legend.className = "year-chart__legend";
  for (const [name, kind] of [
    ["Grass", "grass"],
    ["Waterhole", "water"],
  ]) {
    const item = document.createElement("li");
    const swatch = document.createElement("span");
    swatch.className = `year-chart__swatch year-chart__swatch--${kind}`;
    item.append(swatch, document.createTextNode(name));
    legend.append(item);
  }
  element.append(legend);

  const reading = document.createElement("p");
  reading.className = "year-chart__reading";
  reading.setAttribute("role", "status");
  element.append(reading);

  // The lesson, stated from the numbers rather than asserted over them.
  if (pair) {
    const lag = document.createElement("p");
    lag.className = "year-chart__lag";
    lag.textContent =
      `${MONTH_NAMES[pair.wetter.month]} gets ${Math.round(pair.wetter.rainMm)} mm of rain and the grass is ` +
      `${Math.round(pair.wetter.greenness * 100)} out of 100 green. ` +
      `${MONTH_NAMES[pair.drier.month]} gets almost the same rain, ${Math.round(pair.drier.rainMm)} mm, ` +
      `but the grass is only ${Math.round(pair.drier.greenness * 100)}. ` +
      "The savanna remembers the months before, not just this one.";
    element.append(lag);
  }
  const trough = document.createElement("p");
  trough.className = "year-chart__lag";
  trough.textContent =
    `The grass is brownest in ${MONTH_NAMES[troughs.brownestGrass]}, but the waterhole is lowest in ` +
    `${MONTH_NAMES[troughs.lowestWater]}. Water underground lasts longer than roots do.`;
  element.append(trough);

  // A table view, so the same numbers are available without reading a picture.
  const details = document.createElement("details");
  details.className = "year-chart__table";
  const summary = document.createElement("summary");
  summary.textContent = "See the numbers";
  const table = document.createElement("table");
  table.innerHTML =
    "<thead><tr><th>Month</th><th>Rain</th><th>Grass</th><th>Waterhole</th></tr></thead><tbody>" +
    profile
      .map(
        (m) =>
          `<tr><th scope="row">${MONTH_NAMES[m.month]}</th><td>${Math.round(m.rainMm)} mm</td>` +
          `<td>${Math.round(m.greenness * 100)}</td><td>${Math.round(m.waterLevel * 100)}</td></tr>`,
      )
      .join("") +
    "</tbody>";
  details.append(summary, table);
  element.append(details);

  let shownMonth = -1;

  return {
    element,
    update(state) {
      const month = state.clock.month;
      if (month === shownMonth) return;
      shownMonth = month;
      const entry = profile[month];
      const x = String(month * COLUMN);
      rain.marker.setAttribute("x", x);
      answer.marker.setAttribute("x", x);
      grassDot.setAttribute("cx", String(centre(month)));
      grassDot.setAttribute(
        "cy",
        String(BASE - entry.greenness * PANEL_HEIGHT),
      );
      waterDot.setAttribute("cx", String(centre(month)));
      waterDot.setAttribute(
        "cy",
        String(BASE - entry.waterLevel * PANEL_HEIGHT),
      );
      monthCells.forEach((cell, index) =>
        cell.classList.toggle("is-current", index === month),
      );
      reading.textContent =
        `${MONTH_NAMES[month]}: ${Math.round(entry.rainMm)} mm of rain. ` +
        `Grass ${Math.round(entry.greenness * 100)} out of 100, waterhole ${Math.round(entry.waterLevel * 100)}. ` +
        savannaMonth(month).happening;
    },
  };
}
