import type { SafariStop } from "../safari-contracts";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

/** Citation markers stay beside the claim they support, never collected at the end. */
function citationsFor(animal: SafariStop) {
  const sources = animal.profile?.sources ?? [];
  return (ids: string[]) =>
    `<span class="fact-citations">${ids
      .map((id) => {
        const index = sources.findIndex((source) => source.id === id);
        const source = sources[index];
        return source
          ? `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="Source: ${escape(source.title)}">[${index + 1}]</a>`
          : "";
      })
      .join(" ")}</span>`;
}

/**
 * The measured rows of the field entry: whatever the curated content actually
 * records for this animal. Labels come from the data, so a bird shows Wingspan
 * and an antelope shows Shoulder height. Nothing is invented to fill a slot.
 */
export function renderSafariMeasurements(animal: SafariStop) {
  const profile = animal.profile;
  if (!profile?.stats.length) return "";
  const citations = citationsFor(animal);
  return `<dl class="animal-stats">${profile.stats
    .map(
      (stat) =>
        `<div><dt>${escape(stat.label)}</dt><dd>${escape(stat.value)} ${citations(stat.sourceIds)}</dd></div>`,
    )
    .join("")}</dl>`;
}

/** What you would write down having watched the animal. */
export function renderSafariObservations(animal: SafariStop) {
  const profile = animal.profile;
  const summary = profile ? profile.summary : animal.facts[0];
  return `<p class="profile-summary">${escape(summary)}</p>${
    animal.viewingNote
      ? `<p class="viewing-note secondary">${escape(animal.viewingNote)}</p>`
      : ""
  }`;
}

/** Everything you would look up afterwards, kept behind a disclosure. */
export function renderSafariResearch(animal: SafariStop) {
  const profile = animal.profile;
  if (!profile)
    return `<details class="animal-profile"><summary>Fact sources</summary><ul>${animal.sources
      .map(
        (source) =>
          `<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></li>`,
      )
      .join("")}</ul></details>`;
  const citations = citationsFor(animal);
  return `<details class="animal-profile"><summary>Read more about this animal</summary>
      <p>${escape(profile.description)} ${citations(profile.descriptionSourceIds)}</p>
      <p><a href="${escape(profile.wikipediaUrl)}" target="_blank" rel="noopener noreferrer">Read on Wikipedia${profile.wikipediaLanguage ? ` (${escape(profile.wikipediaLanguage)})` : ""} ↗</a></p>
      <details class="quiz-review"><summary>Review the three quiz questions</summary><ol>${profile.questions
        .map(
          (q) =>
            `<li><p><strong>${escape(q.prompt)}</strong></p><ul>${q.choices
              .map((choice) => `<li>${escape(choice.text)}</li>`)
              .join(
                "",
              )}</ul><details><summary>Show answer &amp; explanation</summary><p><strong>${escape(q.choices.find((c) => c.id === q.correctId)!.text)}</strong>. ${escape(q.explanation)} ${citations(q.sourceIds)}</p></details></li>`,
        )
        .join("")}</ol></details>
      <details><summary>Research sources</summary><ol>${profile.sources
        .map(
          (source) =>
            `<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></li>`,
        )
        .join(
          "",
        )}</ol><p class="secondary">Sources checked ${escape(profile.reviewedAt)}. Size and lifespan vary; records and estimates are labeled.</p></details>
    </details>`;
}

/** Render only the curated content catalog; citations stay beside their claims. */
export function renderSafariProfile(animal: SafariStop) {
  return `${renderSafariObservations(animal)}${renderSafariMeasurements(animal)}${renderSafariResearch(animal)}`;
}
