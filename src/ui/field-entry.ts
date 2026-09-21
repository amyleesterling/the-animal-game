import type { SafariStop } from "../safari-contracts";
import type { SafariEntry } from "../state/safari";
import {
  renderSafariMeasurements,
  renderSafariObservations,
  renderSafariResearch,
} from "./safari-profile";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

function recordedOn(capturedAt: string) {
  const when = new Date(capturedAt);
  if (Number.isNaN(when.getTime())) return "";
  return when.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** A printed label with either a filled value or an empty ruled line. */
function field(label: string, value: string | null, blank: string) {
  return `<div class="entry-field${value ? "" : " is-blank"}"><dt>${escape(label)}</dt><dd>${value ?? escape(blank)}</dd></div>`;
}

export type FieldEntryOptions = {
  animal: SafariStop;
  saved: SafariEntry;
  /** One-based position on the route, printed as the specimen number. */
  number: number;
  /** Only unlocked animals offer a way to travel there. */
  unlocked: boolean;
};

/**
 * One page of the field notebook, laid out as a pre printed specimen form.
 * Every label is always present so a child can see what is still to collect;
 * only the values arrive as they play. Nothing here invents a value for a
 * field the curated content does not record.
 */
export function renderFieldEntry({
  animal,
  saved,
  number,
  unlocked,
}: FieldEntryOptions) {
  const profile = animal.profile;
  const lower = escape(animal.name.toLowerCase());
  const recorded = saved.photo ? recordedOn(saved.photo.capturedAt) : "";

  const plate = saved.photo
    ? `<img loading="lazy" src="${saved.photo.dataUrl}" alt="Your photograph of the ${lower}">`
    : `<p class="pending-photo secondary">${
        saved.identification
          ? "Name recorded. Finish this discovery to add a photograph."
          : "Visit this animal to name it, answer its quiz and add a photograph."
      }</p>`;

  const named = saved.identification
    ? `${escape(saved.identification.name)}${saved.identification.skipped ? ' <span class="entry-aside">(name supplied)</span>' : ""}`
    : null;

  return `<article class="book-page field-entry" data-animal-id="${animal.id}">
    <header class="entry-head">
      <span class="entry-no">Specimen ${number}</span>
      ${saved.photo ? `<span class="entry-stamp">Recorded${recorded ? ` ${escape(recorded)}` : ""}</span>` : ""}
    </header>
    <div class="entry-plate">
      <p class="entry-label">Photograph</p>
      ${plate}
    </div>
    <div class="entry-title">
      <p class="entry-label">Common name</p>
      <h3>${escape(animal.name)}</h3>
      <p class="entry-sci"><i>${escape(animal.scientificName)}</i></p>
    </div>
    <dl class="entry-fields">
      ${field("Named by you", named, "not yet recorded")}
      ${profile ? field("Group", escape(profile.group), "") : ""}
      ${profile?.habitat ? field("Habitat", escape(profile.habitat), "") : ""}
    </dl>
    ${
      renderSafariMeasurements(animal)
        ? `<section class="entry-block"><h4 class="entry-label">Measurements and habits</h4>${renderSafariMeasurements(animal)}</section>`
        : ""
    }
    <section class="entry-block">
      <h4 class="entry-label">Observations</h4>
      ${renderSafariObservations(animal)}
    </section>
    <section class="entry-block">
      <h4 class="entry-label">Additional research</h4>
      ${renderSafariResearch(animal)}
    </section>
    ${unlocked ? `<button data-visit="${animal.id}">${saved.photo ? "Revisit" : "Find"} ${escape(animal.name)}</button>` : ""}
  </article>`;
}
