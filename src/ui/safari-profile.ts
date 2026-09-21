import type { SafariStop } from "../safari-contracts";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

/** Render only the curated content catalog; citations stay beside their claims. */
export function renderSafariProfile(animal: SafariStop) {
  const profile = animal.profile;
  if (!profile)
    return `<p>${escape(animal.facts[0])}</p><details><summary>Fact sources</summary><ul>${animal.sources.map((source) => `<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></li>`).join("")}</ul></details>`;
  const citations = (ids: string[]) =>
    `<span class="fact-citations">${ids
      .map((id) => {
        const index = profile.sources.findIndex((source) => source.id === id);
        const source = profile.sources[index];
        return source
          ? `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="Source: ${escape(source.title)}">[${index + 1}]</a>`
          : "";
      })
      .join(" ")}</span>`;
  return `<p class="profile-summary">${escape(profile.summary)}</p>
    ${animal.viewingNote ? `<p class="viewing-note secondary">${escape(animal.viewingNote)}</p>` : ""}
    <details class="animal-profile"><summary>About this animal · size, lifespan & more</summary>
      <p>${escape(profile.description)} ${citations(profile.descriptionSourceIds)}</p>
      <dl class="animal-stats">${profile.stats.map((stat) => `<div><dt>${escape(stat.label)}</dt><dd>${escape(stat.value)} ${citations(stat.sourceIds)}</dd></div>`).join("")}</dl>
      <p><a href="${escape(profile.wikipediaUrl)}" target="_blank" rel="noopener noreferrer">Read on Wikipedia${profile.wikipediaLanguage ? ` (${escape(profile.wikipediaLanguage)})` : ""} ↗</a></p>
      <details class="quiz-review"><summary>Review the three quiz questions</summary><ol>${profile.questions.map((q) => `<li><p><strong>${escape(q.prompt)}</strong></p><ul>${q.choices.map((choice) => `<li>${escape(choice.text)}</li>`).join("")}</ul><details><summary>Show answer & explanation</summary><p><strong>${escape(q.choices.find((c) => c.id === q.correctId)!.text)}</strong>. ${escape(q.explanation)} ${citations(q.sourceIds)}</p></details></li>`).join("")}</ol></details>
      <details><summary>Research sources</summary><ol>${profile.sources.map((source) => `<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></li>`).join("")}</ol><p class="secondary">Sources checked ${escape(profile.reviewedAt)}. Size and lifespan vary; records and estimates are labeled.</p></details>
    </details>`;
}
