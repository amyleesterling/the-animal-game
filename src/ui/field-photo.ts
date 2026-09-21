import type { SafariObservation } from "../state/safari";

/** Add child-authored notes and photographs without changing the field book's renderer. */
export function installFieldPhotoFrames(
  root: HTMLElement,
  observationFor: (id: string) => SafariObservation | null | undefined,
): () => void {
  const decorate = () => {
    root
      .querySelectorAll<HTMLElement>("article[data-animal-id]")
      .forEach((page) => {
        const observation = observationFor(page.dataset.animalId ?? "");
        if (!observation || page.querySelector(".field-observation-note"))
          return;
        const note = document.createElement("section");
        note.className = "field-observation-note";
        const heading = document.createElement("h4");
        heading.textContent = "My field notes";
        const details = document.createElement("p");
        details.textContent = `Estimated height: ${observation.heightValue} ${observation.heightUnit} · Colors: ${observation.colors} · Animals seen: ${observation.count}`;
        note.append(heading, details);
        page.querySelector(".field-polaroid")?.after(note);
        if (!note.isConnected) page.append(note);
      });
    root
      .querySelectorAll<HTMLImageElement>(
        'article[data-animal-id] img[src^="data:image/"]',
      )
      .forEach((image) => {
        if (image.closest(".field-polaroid")) return;
        const existingFigure = image.closest("figure");
        const figure = existingFigure ?? document.createElement("figure");
        figure.classList.add("field-polaroid");
        if (!existingFigure) {
          image.before(figure);
          figure.append(image);
        }
        if (!figure.querySelector(".field-photo-tape")) {
          const tape = document.createElement("span");
          tape.className = "field-photo-tape";
          tape.setAttribute("aria-hidden", "true");
          figure.prepend(tape);
        }
        if (!figure.querySelector("figcaption")) {
          const caption = document.createElement("figcaption");
          caption.textContent = "My safari photograph";
          figure.append(caption);
        }
      });
    root
      .querySelectorAll<HTMLElement>("article[data-animal-id]")
      .forEach((page) => {
        const note = page.querySelector(".field-observation-note");
        const polaroid = page.querySelector(".field-polaroid");
        if (note && polaroid && polaroid.nextElementSibling !== note)
          polaroid.after(note);
      });
  };
  const observer = new MutationObserver(decorate);
  observer.observe(root, { childList: true, subtree: true });
  decorate();
  return () => observer.disconnect();
}
