import {
  tarangireAttribution,
  tarangireBoundary,
  tarangireBounds,
  tarangireRiver,
  tarangireSources,
  type LngLat,
} from "../content/tarangire-map";

/**
 * The real Tarangire National Park, drawn from OpenStreetMap geometry.
 *
 * Equirectangular, with longitude scaled by the cosine of the middle latitude
 * so the park is not stretched sideways. At this size and this far from the
 * poles that is accurate enough for a map a child reads, and it keeps the
 * scale bar honest, which a raw lat/lon plot would not.
 *
 * Nothing from the game is drawn on it. The study trail is imagined and its
 * animals come from several African regions, so plotting the game on real
 * geography would blur the line the rest of the project keeps. This page says
 * what the real place is; the rest of the book is the imagined expedition.
 */

const WIDTH = 520;
const PAD = 26;

const midLat = (tarangireBounds.north + tarangireBounds.south) / 2;
const lonScale = Math.cos((midLat * Math.PI) / 180);

const spanLon = (tarangireBounds.east - tarangireBounds.west) * lonScale;
const spanLat = tarangireBounds.north - tarangireBounds.south;
const scale = (WIDTH - PAD * 2) / spanLon;
const HEIGHT = Math.round(spanLat * scale + PAD * 2);

const project = ([lon, lat]: LngLat) => [
  PAD + (lon - tarangireBounds.west) * lonScale * scale,
  PAD + (tarangireBounds.north - lat) * scale,
];

const path = (points: LngLat[], close: boolean) =>
  points
    .map((point, index) => {
      const [x, y] = project(point);
      return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("") + (close ? "Z" : "");

/** One degree of latitude is 110.574 km; good to a few metres at this scale. */
const kmPerDegreeLat = 110.574;
const pxPerKm = scale / kmPerDegreeLat;

function scaleBar() {
  // Choose a round number of kilometres that fits comfortably in the frame.
  const target = (WIDTH - PAD * 2) * 0.32;
  const km = [5, 10, 20, 25].reduce((best, value) =>
    Math.abs(value * pxPerKm - target) < Math.abs(best * pxPerKm - target)
      ? value
      : best,
  );
  const length = km * pxPerKm;
  const y = HEIGHT - 14;
  const x = PAD;
  return `<g class="map-scale">
    <line x1="${x}" y1="${y}" x2="${x + length}" y2="${y}"></line>
    <line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 4}"></line>
    <line x1="${x + length}" y1="${y - 4}" x2="${x + length}" y2="${y + 4}"></line>
    <text x="${x + length + 8}" y="${y + 4}">${km} km</text>
  </g>`;
}

export function renderTarangireMap() {
  const rivers = tarangireRiver
    .map((segment) => `<path class="map-river" d="${path(segment, false)}"/>`)
    .join("");
  return `<section class="park-map" aria-labelledby="park-map-title">
    <p class="entry-label">The real park</p>
    <h3 id="park-map-title">Tarangire National Park</h3>
    <p class="map-sub">Manyara Region, Tanzania</p>
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img"
         aria-label="Outline of Tarangire National Park in Tanzania with the Tarangire River running through it, drawn from OpenStreetMap data.">
      <path class="map-park" d="${path(tarangireBoundary, true)}"/>
      ${rivers}
      <g class="map-north" transform="translate(${WIDTH - PAD - 6} ${PAD + 4})">
        <line x1="0" y1="20" x2="0" y2="0"></line>
        <path d="M-5 6 L0 -4 L5 6 Z"></path>
        <text x="0" y="34">N</text>
      </g>
      ${scaleBar()}
    </svg>
    <p class="map-note secondary">The blue line is the Tarangire River, which the park is named for. Our study trail is imagined and its animals come from several African regions, so it is not drawn here.</p>
    <p class="map-credit secondary">${tarangireAttribution}. ${tarangireSources
      .map(
        (source) =>
          `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title}</a>`,
      )
      .join(" · ")}</p>
  </section>`;
}
