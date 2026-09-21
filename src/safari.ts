import "./safari.css";
import "./field-notebook.css";
import "./ui/field-photo.css";
import { safariStops, safariStoryStops, safariEnding } from "./content/safari";
import { renderFieldEntry } from "./ui/field-entry";
import { installFieldPhotoFrames } from "./ui/field-photo";
import { publicAsset } from "./public-asset";
import {
  armBackgroundMusic,
  musicEnabled,
  setMusicEnabled,
} from "./audio/background-music";
import { createSafariWorld } from "./game/safari-world";
import { matchesAnimalName } from "./content/animal-names";
import { safariEncounterRange } from "./game/encounters";
import type { ArrivalStage } from "./game/arrival-sequence";
import {
  tarangireArrival,
  tarangireArrivalSources,
  tarangireArrivalStages,
} from "./content/tarangire-arrival";
import {
  narrate,
  setNarrationVolume,
  stopNarration,
} from "./accessibility/narration";
import {
  answerSafari,
  currentSafariQuestion,
  safariQuizProgress,
  safariStoryComplete,
  createSafariStore,
  discoveredCount,
  encounterStop,
  identifySafari,
  isStopUnlocked,
  learnSafariClue,
  newSafari,
  nextSafariStop,
  photographSafari,
  recordSafariObservation,
  retrySafariAnswer,
  visitStop,
  type SafariProgress,
} from "./state/safari";
import type {
  PhotoAdjustAction,
  SafariStatus,
  SafariWorld,
} from "./safari-contracts";

const app = document.querySelector<HTMLDivElement>("#safari-app")!;
app.innerHTML = `
  <header class="safari-header">
    <a class="brand" href="./"><span class="brand-mark" aria-hidden="true">S</span><span>Sophia’s Wild World<span class="brand-sub">The Sunset Safari</span></span></a>
    <nav aria-label="Safari tools"><button id="route-button"><img class="route-icon" src="${publicAsset("/assets/notebook/cover-icon.webp")}" alt="" width="74" height="96">Route & field book <span id="clue-count">0/${safariStops.length}</span></button><button id="settings-button" aria-label="Settings">Settings</button></nav>
  </header>
  <div id="save-banner" class="notice" role="alert" hidden></div>
  <main class="safari-stage">
    <div class="scene-area">
      <div id="safari-world" aria-label="Savanna scene with Sophia, her jeep, and the current animal"></div>
      <div class="scene-label"><span id="scene-chapter">Base camp</span><span id="scene-hint">Your adventure begins here</span></div>
      <div id="world-banner" class="world-notice" role="alert" hidden></div>
      <div id="photo-frame" aria-hidden="true" hidden><i></i><i></i><i></i><i></i></div>
      <div id="movement" aria-label="Move Sophia" hidden>
        <button data-move="forward" aria-label="Walk forward">↑</button><button data-move="left" aria-label="Walk left">←</button><button data-move="backward" aria-label="Walk backward">↓</button><button data-move="right" aria-label="Walk right">→</button>
      </div>
      <div id="drive-controls" aria-label="Drive the jeep" hidden>
        <div class="drive-steering"><button data-drive="left" aria-label="Steer left"><span aria-hidden="true">←</span>Left</button><button data-drive="right" aria-label="Steer right"><span aria-hidden="true">→</span>Right</button></div>
        <div class="drive-pedals"><button data-drive="forward" aria-label="Accelerate"><span aria-hidden="true">↑</span>Go</button><button data-drive="backward" aria-label="Reverse"><span aria-hidden="true">↓</span>Reverse</button><button id="brake-jeep" aria-label="Brake"><span aria-hidden="true">■</span>Brake</button></div>
      </div>
      <p id="scene-keyboard" class="scene-keyboard">Tap the ground to walk there · W A S D or arrow keys · E: get in · Drag to look</p>
    </div>
    <section id="vehicle-card" class="vehicle-card" aria-label="Safari jeep" hidden>
      <div id="walking-vehicle"><p class="eyebrow">Your Land Cruiser</p><button id="enter-jeep" class="primary" disabled>Get in the jeep</button><button id="return-jeep" hidden>Return to the jeep</button><p id="vehicle-hint" class="secondary">Getting the jeep ready…</p></div>
      <div id="driving-vehicle" hidden><div class="drive-heading"><span class="eyebrow">At the wheel</span><span id="drive-speed" class="speed">0 km/h</span></div><div class="drive-destination"><span id="drive-compass" aria-hidden="true">↑</span><div><strong id="drive-destination"></strong><p id="drive-distance" class="secondary"></p></div></div><button id="exit-jeep">Park & get out</button><p id="exit-hint" class="secondary">Brake to a stop, then step out to explore.</p></div>
      <p id="vehicle-feedback" class="secondary" role="status"></p>
      <button id="nearby-encounter" class="primary" hidden>Discover nearby animal</button>
    </section>
    <section id="story-panel" class="story-panel" aria-labelledby="story-title" aria-busy="true"><p class="eyebrow">Preparing your field book</p><h1 id="story-title">A little adventure awaits.</h1><p>Loading your saved story…</p></section>
  </main>
  <footer class="safari-footer"><span id="save-status" role="status">Opening your field book…</span><span>Created by Sophia, age 7, with AI and help from her mom.</span></footer>
  <dialog id="encounter-dialog" aria-labelledby="encounter-title" aria-describedby="encounter-intro"><div class="dialog-top"><div><p class="eyebrow">A wildlife discovery</p><h2 id="encounter-title">Animal ahead!</h2></div><button id="encounter-later" data-close>Keep exploring</button></div><p id="encounter-intro" class="dialog-intro">Look around and notice what makes this animal special.</p><div id="encounter-spotting" class="actions"><button id="log-animal" class="primary">Log this animal</button></div><form id="name-animal" hidden><div id="animal-name-field"><label for="animal-name">What do you think it is?</label><input id="animal-name" name="animal" type="text" maxlength="60" autocomplete="off" placeholder="Your best guess" aria-describedby="name-feedback" required></div><p id="name-feedback" role="status" aria-live="polite"></p><div class="actions"><button id="confirm-animal" class="primary" type="submit">Record my guess</button><button id="skip-animal" type="button">Tell me the name</button></div></form><p id="encounter-driving-note" class="secondary" hidden>The jeep is paused. We’ll step out when you continue.</p></dialog>
  <div id="notebook-intro" class="notebook-intro" hidden aria-hidden="true"><div class="notebook-intro-stage"><video id="notebook-intro-video" src="${publicAsset("/assets/notebook/opening.mp4")}" muted playsinline preload="auto"></video><div class="notebook-intro-title"><p class="intro-mark">Field Notes</p><p class="intro-place">Tanzania, 2026</p><p class="intro-count" id="notebook-intro-count"></p><p class="intro-by">Kept by Sophia</p></div></div></div>
  <dialog id="book-dialog" aria-labelledby="book-title"><div class="notebook-body"><div class="notebook-head"><div><p class="eyebrow">Tanzania, 2026</p><h2 id="book-title">Route & field book</h2></div><button data-close aria-label="Close field book">Close</button></div><div class="notebook-spread"><section class="notebook-page notebook-page--index" aria-label="Route index"><p class="dialog-intro">Seven story clues and 25 more animals to discover, from insects to birds. This imagined reserve brings together wildlife from different African regions. Check each profile for its real range.</p><div class="book-tools"><label for="book-search">Find an animal<input id="book-search" type="search" placeholder="Name or scientific name"></label><label for="book-group">Animal group<select id="book-group"><option value="all">All animals</option><option value="Insect">Insects</option><option value="Rodent">Rodents</option><option value="Bird">Birds</option><option value="Mammal">Other mammals</option><option value="Reptile">Reptiles</option></select></label><button id="book-view" aria-pressed="false">Browse all animal profiles</button></div><p id="book-results" class="secondary" role="status"></p><ol id="route-list" class="route-list"></ol></section><section class="notebook-page notebook-page--entries" aria-label="Your field book pages"><div id="book-pages" class="book-pages"></div></section></div></div></dialog>
  <dialog id="settings-dialog" aria-labelledby="settings-title"><div class="dialog-top"><h2 id="settings-title">Make it yours</h2><button data-close aria-label="Close settings">Close</button></div><div class="settings-fields"><label><span>Background music</span><input id="music-setting" type="checkbox"></label><label class="volume"><span>Narration volume</span><input id="volume-setting" type="range" min="0" max="1" step="0.05"></label><label><span>Reduce motion</span><input id="motion-setting" type="checkbox"></label><label><span>Lighter graphics</span><input id="quality-setting" type="checkbox"></label></div><p class="secondary">Read it aloud plays only when you press the button. Every instruction also appears on screen.</p><details><summary>About this safari</summary><p class="secondary">An imagined savanna adventure with sourced natural history. Animal models and poses are prototypes. Sources are listed beside each discovery in your field book.</p></details><button id="restart-button" class="danger">Restart this story</button><p class="secondary">This replaces only the story safari. Your classic zebra encounter stays separate.</p></dialog>
  <p id="announcement" class="sr-only" aria-live="polite"></p>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const panel = $("story-panel");
installFieldPhotoFrames(
  $("book-pages"),
  (id) => progress.entries[id]?.observations,
);
const store = createSafariStore();
let progress = newSafari({
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
});
let world: SafariWorld | null = null;
let status: SafariStatus = {
  encounters: [],
  nearby: false,
  photoReady: false,
  animalLoaded: false,
  jeepLoaded: false,
  distance: Infinity,
  driving: false,
  canEnterJeep: false,
  canExitJeep: false,
  speedKph: 0,
  jeepDistance: Infinity,
  destinationDistance: Infinity,
  destinationBearing: 0,
};
type Mode =
  | "intro"
  | "arrival"
  | "explore"
  | "observe"
  | "question"
  | "photo"
  | "success"
  | "ending";
let mode: Mode = "intro";
let arrivalStage: ArrivalStage = "walking";
let currentNarration = "";
let dirty = false;
let readFailed = false;
let disposed = false;
let saveRevision = 0;
let busy = false;
let pendingEncounterId: string | null = null;
let encounterTransition = false;
let encounterCheckQueued = false;
const dismissedEncounters = new Set<string>();
const disabledBeforeBusy = new Map<
  HTMLButtonElement | HTMLInputElement,
  boolean
>();
function setBusy(value: boolean) {
  busy = value;
  app.inert = value;
  app.setAttribute("aria-busy", String(value));
  if (value) {
    app
      .querySelectorAll<HTMLButtonElement | HTMLInputElement>("button,input")
      .forEach((control) => {
        disabledBeforeBusy.set(control, control.disabled);
        control.disabled = true;
      });
    world?.setActive(false);
  } else {
    disabledBeforeBusy.forEach((disabled, control) => {
      control.disabled = disabled;
    });
    disabledBeforeBusy.clear();
    world?.setActive(
      mode !== "observe" &&
        mode !== "question" &&
        !document.querySelector("dialog[open]"),
    );
  }
}
// Modal dialogs escape ancestor inertness. Capture guards also cover their Escape key.
for (const type of ["click", "change", "input", "keydown"])
  app.addEventListener(
    type,
    (event) => {
      if (busy) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
setBusy(true);
const stop = () => safariStops.find((s) => s.id === progress.currentStopId)!;
const entry = () => progress.entries[progress.currentStopId];
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

function reportSave(error: unknown) {
  $("save-status").textContent = "Not saved — keep this tab open";
  const banner = $("save-banner");
  banner.hidden = false;
  banner.replaceChildren();
  const text = document.createElement("span");
  text.textContent =
    error instanceof Error
      ? error.message
      : "Your story could not be saved. Keep this tab open.";
  const retry = document.createElement("button");
  retry.textContent = readFailed ? "Reload saved story" : "Retry saving";
  retry.onclick = () => {
    if (readFailed) location.reload();
    else void persist();
  };
  banner.append(text, retry);
}
async function persist() {
  const revision = ++saveRevision;
  dirty = true;
  $("save-status").textContent = "Saving your story…";
  try {
    await store.save(progress);
    if (revision !== saveRevision || disposed) return;
    dirty = false;
    $("save-status").textContent = "Story saved on this device";
    $("save-banner").hidden = true;
  } catch (error) {
    if (revision === saveRevision && !disposed) reportSave(error);
  }
}
function update(next: SafariProgress) {
  progress = next;
  void persist();
}
function say(text: string) {
  currentNarration = text;
  $("announcement").textContent = text;
  stopNarration();
}
function button(id: string, text: string, primary = false) {
  return `<button id="${id}" class="${primary ? "primary" : ""}">${text}</button>`;
}
function deriveMode(): Mode {
  if (!progress.started) return "intro";
  if (entry().photo) return "success";
  if (entry().learned) return "photo";
  if (entry().answer) return "question";
  if (entry().identification)
    return entry().observations ? "question" : "observe";
  return "explore";
}
function render(announce = true) {
  const animal = stop();
  const discovery = entry();
  const index = safariStops.indexOf(animal);
  const nextStop = nextSafariStop(progress);
  const clueCount = discoveredCount(progress);
  const question = currentSafariQuestion(progress);
  const quiz = safariQuizProgress(progress);
  const storyComplete = safariStoryComplete(progress);
  $("clue-count").textContent = `${clueCount}/${safariStops.length}`;
  $("scene-chapter").textContent =
    mode === "intro"
      ? "Base camp"
      : mode === "arrival"
        ? "On the way to our study trail"
        : `${index + 1} / ${safariStops.length} · ${animal.name}`;
  $("scene-hint").textContent =
    mode === "intro"
      ? "Sophia and Cora are ready for the road."
      : mode === "arrival"
        ? "Inspired by Tarangire National Park, Tanzania"
        : animal.chapter;
  $("movement").hidden = mode !== "explore" || status.driving;
  $("photo-frame").hidden = mode !== "photo";
  document.body.dataset.mode = mode;
  world?.setPhotoMode(mode === "photo");
  world?.setInspecting(mode === "observe" || mode === "question");
  world?.setActive(
    mode !== "observe" &&
      mode !== "question" &&
      !document.querySelector("dialog[open]"),
  );
  let body = "";
  let narration = "";
  if (mode === "intro") {
    body = `<p class="eyebrow">Seven story stops · 25 extra discoveries</p><h1 id="story-title" tabindex="-1">Before the sun<br>sets on the savanna.</h1><p>Help Sophia and Cora find seven clues about a healthy savanna. First, they’ll meet at the jeep and take a short drive toward our wildlife study trail.</p><p class="secondary">${tarangireArrival.journeyNote} ${tarangireArrival.studyTrailNote}</p><p class="secondary">Inspired by <a href="${tarangireArrivalSources[0].url}" target="_blank" rel="noopener noreferrer">Tarangire National Park, Tanzania</a>.</p>${button("begin-safari", "Begin the journey →", true)}`;
    narration =
      "Help Sophia and Cora find seven clues about a healthy savanna. First, they’ll meet at the jeep and take a short drive toward our wildlife study trail.";
  } else if (mode === "arrival") {
    const stageId =
      arrivalStage === "walking"
        ? "walk-to-jeep"
        : arrivalStage === "boarding"
          ? "board-jeep"
          : arrivalStage === "driving" || arrivalStage === "parking"
            ? "drive-last-stretch"
            : "arrive-study-trail";
    const stage = tarangireArrivalStages.find((item) => item.id === stageId)!;
    body = `<p class="eyebrow">${tarangireArrival.title}</p><h1 id="story-title" tabindex="-1">${stage.title}</h1><p>${stage.prompt}</p><p class="secondary">${tarangireArrival.journeyNote}</p><p class="secondary">${tarangireArrival.studyTrailNote}</p><p class="secondary">Landscape and approach inspired by <a href="${tarangireArrivalSources[0].url}" target="_blank" rel="noopener noreferrer">Tanzania National Parks</a>.</p>${button("skip-arrival", "Skip the drive →", true)}`;
    narration = stage.narration;
  } else if (mode === "explore") {
    body = `<p class="eyebrow">${animal.profile ? "Extra discovery" : `Story stop ${index + 1}`} · ${animal.chapter}</p><h1 id="story-title" tabindex="-1">${animal.name}</h1><p>${animal.story}</p><p class="mission">${animal.mission}</p>${animal.viewingNote ? `<p class="viewing-note secondary">${escape(animal.viewingNote)}</p>` : ""}<div class="actions">${button("guide-animal", "Guide Sophia closer")}${discovery.learned ? button("resume-photo", "Photograph this discovery", true) : button("discover-clue", "Discover the clue", true)}</div><p id="approach-status" class="secondary" role="status"></p>`;
    narration = `${animal.story} ${animal.mission} Walk or drive toward an animal to begin a discovery. You can also use Guide Sophia closer.`;
  } else if (mode === "observe") {
    const identification = discovery.identification!;
    const guessedRight = matchesAnimalName(animal.id, identification.name);
    const introduction = identification.skipped
      ? "You asked us to name it."
      : guessedRight
        ? `You wrote “${escape(identification.name)}.” You spotted it!`
        : `You wrote “${escape(identification.name)}.” Good noticing — let’s look closer.`;
    const notes = discovery.observations;
    body = `<p class="eyebrow">Step 1 · Meet your animal</p><h1 id="story-title" tabindex="-1">Meet the ${escape(animal.name)}.</h1><p class="guess-note">${introduction}</p><p>Drag the landscape to look around. Sophia and Cora will wait while you make your field notes.</p><form id="field-observations" class="observation-form"><div class="observation-height"><label for="height-value">Estimated height</label><div><input id="height-value" type="number" min="0.1" max="10000" step="any" inputmode="decimal" value="${notes?.heightValue ?? ""}" required><select id="height-unit" aria-label="Height unit"><option value="m" ${notes?.heightUnit !== "cm" ? "selected" : ""}>metres</option><option value="cm" ${notes?.heightUnit === "cm" ? "selected" : ""}>centimetres</option></select></div></div><label for="colors-seen">Colors you can see<input id="colors-seen" type="text" maxlength="60" placeholder="e.g. brown and cream" value="${escape(notes?.colors ?? "")}" required></label><label for="animal-count">How many do you see?<input id="animal-count" type="number" min="1" max="999" step="1" inputmode="numeric" value="${notes?.count ?? 1}" required></label><p class="secondary">Make your best estimate. These are your observations, not quiz answers.</p><p id="observation-feedback" role="status" aria-live="polite"></p><button class="primary" type="submit">Save notes · Start the quiz</button></form>`;
    narration = `Meet the ${animal.name}. Look around and record your estimate of its height, its colors, and how many you can see. Then start the quiz.`;
  } else if (mode === "question") {
    const notes = discovery.observations;
    const noteLine = notes
      ? `<p class="recorded-observation">Your field notes: about ${notes.heightValue} ${notes.heightUnit} tall · ${escape(notes.colors)} · ${notes.count} seen</p>${button("edit-notes", "Edit field notes")}`
      : "";
    if (!discovery.answer) {
      body = `<p class="eyebrow">Step 2 · Question ${quiz.number} of ${quiz.total}</p><h1 id="story-title" tabindex="-1">${question.prompt}</h1>${noteLine}<div class="choices">${question.choices.map((c, i) => `<button data-answer="${c.id}"><span aria-hidden="true">${i + 1}</span>${c.text}</button>`).join("")}</div>`;
      narration = `${question.prompt} ${question.choices.map((c, i) => `${i + 1}. ${c.text}.`).join(" ")}`;
    } else {
      const correct = discovery.answer === question.correctId;
      body = `<p class="eyebrow">${correct ? "You spotted it" : "Let’s discover it together"}</p><h1 id="story-title" tabindex="-1">${animal.clue}</h1><p>${question.explanation}</p>${noteLine}<div class="actions">${!correct ? button("retry-answer", "Try again") : ""}${button("learn-clue", quiz.number < quiz.total ? "I’ve got it · Next question" : "I’ve got it · Take a photo", true)}</div>`;
      narration = `${correct ? "You spotted it!" : "Let’s discover it together."} ${question.explanation} When you’re ready, choose I’ve got it ${quiz.number < quiz.total ? "for the next question" : "to take a photo"}.`;
    }
  } else if (mode === "photo") {
    body = `<p class="eyebrow">Add a picture to your field book</p><h1 id="story-title" tabindex="-1">Photograph the ${animal.name.toLowerCase()}</h1><p id="photo-status" role="status">Preparing your view…</p><p class="secondary photo-help">Drag the view to choose an angle. Pinch or scroll to zoom. The frame shows what your photo will capture.</p><div class="photo-controls" role="group" aria-label="Adjust the photo view"><button data-photo-adjust="orbit-left" aria-label="Turn left"><span class="ctl-icon" aria-hidden="true">↶</span><span class="ctl-label">Turn left</span></button><button data-photo-adjust="orbit-right" aria-label="Turn right"><span class="ctl-icon" aria-hidden="true">↷</span><span class="ctl-label">Turn right</span></button><button data-photo-adjust="aim-up" aria-label="Aim up"><span class="ctl-icon" aria-hidden="true">↑</span><span class="ctl-label">Aim up</span></button><button data-photo-adjust="aim-down" aria-label="Aim down"><span class="ctl-icon" aria-hidden="true">↓</span><span class="ctl-label">Aim down</span></button><button data-photo-adjust="zoom-in" aria-label="Closer"><span class="ctl-icon" aria-hidden="true">+</span><span class="ctl-label">Closer</span></button><button data-photo-adjust="zoom-out" aria-label="Farther"><span class="ctl-icon" aria-hidden="true">−</span><span class="ctl-label">Farther</span></button></div><div class="actions">${button("frame-animal", "Reset view")}${button("take-photo", "Take photo", true)}</div>${button("leave-photo", "Back to exploring")}`;
    narration = `Photograph the ${animal.name.toLowerCase()}. Drag the scene or use the photo controls to choose your view. Choose Take photo when you like the composition.`;
  } else if (mode === "success") {
    body = `<div class="discovery-top"><img class="photo-thumb" src="${discovery.photo!.dataUrl}" alt="Your photograph of the ${animal.name.toLowerCase()}"><div><p class="eyebrow">${clueCount} of ${safariStops.length} animals recorded</p><h1 id="story-title" tabindex="-1">${animal.clue}</h1></div></div><p>${animal.facts[0]}</p>${nextStop ? button("drive-next-stop", "Back to jeep & drive →", true) : ""}<div class="actions">${button("retake-photo", "Retake photo")}${nextStop ? button("next-stop", "Quick jump to next stop") : ""}${storyComplete ? button("finish-safari", "See our seven clues →", true) : ""}${button("discovery-book", "See its page in my field book")}</div><p class="secondary">${nextStop ? `Suggested next stop: ${nextStop.name}. Drive there, or take a quick jump.` : "The field book is ready. Let’s bring it all together."}</p>`;
    narration = `${clueCount} of ${safariStops.length} animals recorded. ${animal.clue}. ${animal.facts[0]} ${nextStop ? `Back to the jeep. Suggested next stop: ${nextStop.name}.` : "Your field book is complete. Let’s explore what we found."}`;
  } else {
    body = `<p class="eyebrow">Your sunset field book · 7 of 7</p><h1 id="story-title" tabindex="-1">One connected home.</h1><p>${safariEnding}</p><div class="clue-pills">${safariStoryStops.map((s) => `<span>${s.clue}</span>`).join("")}</div><div class="actions">${button("open-finished-book", "Open my field book", true)}${button("revisit-route", "Explore again")}</div>`;
    narration = safariEnding;
  }
  const identity =
    mode === "question" && discovery.identification
      ? `<p id="identified-name" class="identified-name">Name recorded: <strong>${escape(animal.name)}</strong></p>`
      : "";
  panel.innerHTML = `${identity}${body}<div class="panel-bottom">${button("repeat-story", "Read it aloud")}<span class="secondary">Look closely. Leave room.</span></div>`;
  panel.setAttribute("aria-busy", "false");
  $("repeat-story").onclick = () => {
    setNarrationVolume(progress.settings.volume);
    if (!narrate(currentNarration))
      $("announcement").textContent =
        "A local English voice is not available. All the story text is on screen.";
  };
  const bind = (id: string, action: () => void) => {
    const el = document.getElementById(id);
    if (el) el.onclick = action;
  };
  bind("begin-safari", () => {
    update(visitStop(progress, progress.currentStopId));
    mode = world ? "arrival" : deriveMode();
    render();
    world?.startArrival(
      (stage) => {
        if (mode !== "arrival" || stage === arrivalStage) return;
        arrivalStage = stage;
        render();
      },
      () => {
        if (mode !== "arrival") return;
        mode = deriveMode();
        render();
      },
    );
  });
  bind("skip-arrival", () => world?.skipArrival());
  bind("guide-animal", () => world?.guideToAnimal());
  bind("discover-clue", () => {
    if (status.driving || !status.nearby || !status.animalLoaded) return;
    beginEncounter(progress.currentStopId);
  });
  panel
    .querySelector<HTMLFormElement>("#field-observations")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        update(
          recordSafariObservation(progress, {
            heightValue: Number($<HTMLInputElement>("height-value").value),
            heightUnit: $<HTMLSelectElement>("height-unit").value as "cm" | "m",
            colors: $<HTMLInputElement>("colors-seen").value,
            count: Number($<HTMLInputElement>("animal-count").value),
          }),
        );
        mode = "question";
        render();
      } catch (error) {
        $("observation-feedback").textContent =
          error instanceof Error ? error.message : "Check your field notes.";
      }
    });
  bind("edit-notes", () => {
    mode = "observe";
    render();
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach(
    (el) =>
      (el.onclick = () => {
        update(answerSafari(progress, el.dataset.answer!));
        render();
      }),
  );
  bind("retry-answer", () => {
    update(retrySafariAnswer(progress));
    render();
  });
  bind("learn-clue", () => {
    update(learnSafariClue(progress));
    mode = deriveMode();
    render();
    if (mode === "photo") world?.guideToAnimal();
  });
  bind("frame-animal", () => {
    world?.guideToAnimal();
    world?.adjustPhoto("reset");
  });
  panel
    .querySelectorAll<HTMLButtonElement>("[data-photo-adjust]")
    .forEach((control) => {
      control.onclick = () =>
        world?.adjustPhoto(control.dataset.photoAdjust as PhotoAdjustAction);
    });
  bind("leave-photo", () => {
    mode = "explore";
    render();
  });
  bind("resume-photo", () => {
    mode = "photo";
    render();
    world?.guideToAnimal();
  });
  bind("take-photo", () => {
    if (!status.photoReady || !status.animalLoaded) return;
    try {
      const photo = world?.capture();
      if (!photo)
        throw new Error(
          "The animal is outside the frame. Choose Reset view, then try again.",
        );
      update(photographSafari(progress, photo));
      mode = "success";
      render();
      const photographed = stop();
      $<HTMLInputElement>("book-search").value = "";
      $<HTMLSelectElement>("book-group").value = "all";
      openBook();
      requestAnimationFrame(() => {
        $("book-pages")
          .querySelector<HTMLElement>(
            `.book-page[data-animal-id="${photographed.id}"]`,
          )
          ?.scrollIntoView({ block: "nearest" });
      });
    } catch (error) {
      $("photo-status").textContent =
        error instanceof Error
          ? error.message
          : "The photo did not capture. Try again.";
    }
  });
  bind("retake-photo", () => {
    mode = "photo";
    render();
    world?.guideToAnimal();
  });
  bind("next-stop", () => {
    if (nextStop) travel(nextStop.id);
  });
  bind("drive-next-stop", () => {
    if (nextStop) driveToNextStop(nextStop.id);
  });
  bind("finish-safari", () => {
    mode = "ending";
    render();
  });
  bind("discovery-book", () => openBookAt(stop().id));
  bind("open-finished-book", openBook);
  bind("revisit-route", openBook);
  updateStatus();
  if (announce) {
    say(narration);
    if (mode !== "intro") $("story-title").focus({ preventScroll: true });
  } else currentNarration = narration;
}
function updateStatus() {
  const discover = document.getElementById(
    "discover-clue",
  ) as HTMLButtonElement | null;
  if (discover)
    discover.disabled =
      status.driving || !status.nearby || !status.animalLoaded;
  const capture = document.getElementById(
    "take-photo",
  ) as HTMLButtonElement | null;
  if (capture)
    capture.disabled =
      status.driving || !status.photoReady || !status.animalLoaded;
  const approach = document.getElementById("approach-status");
  const message = !status.animalLoaded
    ? "Getting your animal ready…"
    : status.nearby
      ? "A lovely viewing spot. You can discover the clue."
      : "Stay a little way back. Guide Sophia to a viewing spot.";
  if (approach && approach.textContent !== message)
    approach.textContent = message;
  const photoStatus = document.getElementById("photo-status");
  const photoMessage =
    status.photoReady && status.animalLoaded
      ? "Your animal is in frame. Ready when you are."
      : "Aim at the animal, or choose Reset view for a clear shot.";
  if (photoStatus && photoStatus.textContent !== photoMessage)
    photoStatus.textContent = photoMessage;
  alignPhotoFrame();
  updateVehicleControls();
  queueEncounterCheck();
}
/** Place the viewfinder on the camera's actual 4:3 viewport. */
function alignPhotoFrame() {
  if (mode !== "photo") return;
  const canvas = $("safari-world").querySelector("canvas");
  const scene = app.querySelector<HTMLElement>(".scene-area");
  if (!canvas || !scene) return;
  const data = canvas.dataset;
  const left = Number(data.photoViewportLeft);
  const top = Number(data.photoViewportTop);
  const width = Number(data.photoViewportWidth);
  const height = Number(data.photoViewportHeight);
  if (![left, top, width, height].every(Number.isFinite) || width < 1) return;
  const canvasRect = canvas.getBoundingClientRect();
  const sceneRect = scene.getBoundingClientRect();
  const frame = $("photo-frame");
  frame.style.left = `${canvasRect.left - sceneRect.left + left}px`;
  frame.style.top = `${canvasRect.top - sceneRect.top + top}px`;
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
}
function updateVehicleControls() {
  const driving = status.driving;
  document.body.dataset.driving = String(driving);
  panel.hidden = driving || Boolean(pendingEncounterId);
  $("vehicle-card").hidden =
    !world ||
    mode === "intro" ||
    mode === "arrival" ||
    mode === "observe" ||
    mode === "question" ||
    mode === "photo";
  $("walking-vehicle").hidden = driving;
  $("driving-vehicle").hidden = !driving;
  $("drive-controls").hidden = !driving || mode === "arrival";
  $("movement").hidden = driving || mode !== "explore";
  $("nearby-encounter").hidden =
    !nearbyDiscovery() ||
    mode === "observe" ||
    mode === "question" ||
    mode === "photo" ||
    !progress.started;
  $<HTMLButtonElement>("enter-jeep").disabled = busy || !status.canEnterJeep;
  $("return-jeep").hidden = driving || status.canEnterJeep;
  $<HTMLButtonElement>("exit-jeep").disabled = busy || !status.canExitJeep;
  $("vehicle-hint").textContent = status.canEnterJeep
    ? "Hop in and explore. E on a keyboard works too."
    : "Walk back to your parked jeep, or choose Return to the jeep.";
  $("drive-speed").textContent =
    `${Math.round(Math.abs(status.speedKph))} km/h${status.speedKph < -0.5 ? " · R" : ""}`;
  $("drive-destination").textContent = stop().name;
  $("drive-distance").textContent =
    status.destinationDistance < 17
      ? "You’re close. Park a little way from the animal."
      : `${Math.round(status.destinationDistance)} m to your selected animal`;
  $("drive-compass").style.transform =
    `rotate(${status.destinationBearing}rad)`;
  $("exit-hint").textContent = status.canExitJeep
    ? "Step out to discover your clue."
    : Math.abs(status.speedKph) > 2.8
      ? "Hold Brake or Space to stop before getting out."
      : "Move to an open spot so there is room to get out.";
  $("scene-keyboard").textContent =
    mode === "observe" || mode === "question" || pendingEncounterId
      ? "Drag the landscape to look around the animal"
      : driving
        ? "W / ↑: go · S / ↓: reverse · A D / ← →: steer · Space: brake · E: get out"
        : "Tap the ground to walk there · W A S D or arrow keys · E: get in · Drag to look";
}
/**
 * An animal you cannot see is not a discovery. Range alone offered the popup
 * for a small animal standing ten metres away and out of frame, so the animal
 * has to be in view as well.
 */
function nearbyDiscovery() {
  return status.encounters.find(
    (animal) =>
      animal.distance <= animal.range &&
      animal.onScreen &&
      !progress.entries[animal.id]?.photo,
  );
}
// World status can arrive during render/setActive. Defer modal transitions so
// a status callback never recursively changes the world that produced it.
function queueEncounterCheck() {
  if (encounterCheckQueued) return;
  encounterCheckQueued = true;
  queueMicrotask(() => {
    encounterCheckQueued = false;
    for (const animal of safariStops) {
      const position = status.explorerPosition;
      const distance = position
        ? Math.hypot(
            position.x - animal.position[0],
            position.z - animal.position[2],
          )
        : status.encounters.find((encounter) => encounter.id === animal.id)
            ?.distance;
      if (
        distance !== undefined &&
        distance > safariEncounterRange(animal.height) + 4
      )
        dismissedEncounters.delete(animal.id);
    }
    if (
      busy ||
      disposed ||
      !world ||
      !progress.started ||
      encounterTransition ||
      pendingEncounterId ||
      document.hidden ||
      document.querySelector("dialog[open]") ||
      mode === "observe" ||
      mode === "question" ||
      mode === "photo" ||
      mode === "arrival" ||
      mode === "intro"
    )
      return;
    const animal = nearbyDiscovery();
    if (animal && !dismissedEncounters.has(animal.id))
      beginEncounter(animal.id);
  });
}
function beginEncounter(id: string) {
  if (
    busy ||
    !world ||
    encounterTransition ||
    pendingEncounterId ||
    document.querySelector("dialog[open]")
  )
    return;
  const animal = safariStops.find((s) => s.id === id);
  const proximity = status.encounters.find((s) => s.id === id);
  if (
    !animal ||
    !proximity ||
    proximity.distance > proximity.range ||
    progress.entries[id].photo
  )
    return;
  pendingEncounterId = id;
  dismissedEncounters.add(id);
  $("scene-chapter").textContent = "Animal ahead!";
  $("scene-hint").textContent = "Look around before making a field note";
  const identification = progress.entries[id].identification;
  const dialog = $<HTMLDialogElement>("encounter-dialog");
  dialog.dataset.animalId = id;
  $("encounter-title").textContent = "Animal ahead!";
  $("encounter-intro").textContent = identification
    ? "You have already met this animal. Pick up your field notes when you are ready."
    : "Look around and notice its shape, colors, and neighbors. Drag the scene to see more.";
  $("encounter-spotting").hidden = false;
  $("name-animal").hidden = true;
  $("log-animal").textContent = identification
    ? "Continue this discovery"
    : "Log this animal";
  const input = $<HTMLInputElement>("animal-name");
  input.value = identification?.name ?? "";
  input.removeAttribute("aria-invalid");
  $("name-feedback").textContent = "";
  $("encounter-driving-note").hidden = !status.driving;
  openDialog("encounter-dialog");
  $("log-animal").focus();
  $("announcement").textContent = identification
    ? "A nearby discovery is ready to continue."
    : "Animal ahead! Look around, then log what you find.";
}
$("log-animal").onclick = () => {
  const id = pendingEncounterId;
  if (!id) return;
  if (progress.entries[id].identification) {
    finishEncounter(false);
    return;
  }
  $("encounter-spotting").hidden = true;
  $("name-animal").hidden = false;
  $("encounter-title").textContent = "What do you think it is?";
  $("encounter-intro").textContent =
    "Type your best guess. We’ll show you the animal’s name on the next screen.";
  $<HTMLInputElement>("animal-name").focus();
};
function finishEncounter(skipped: boolean) {
  const id = pendingEncounterId;
  if (busy || !world || !id || encounterTransition) return;
  const animal = safariStops.find((s) => s.id === id)!;
  const input = $<HTMLInputElement>("animal-name");
  if (!progress.entries[id].identification && !skipped && !input.value.trim()) {
    input.setAttribute("aria-invalid", "true");
    $("name-feedback").textContent =
      "Write your best guess or ask for the name.";
    input.focus();
    return;
  }
  encounterTransition = true;
  try {
    let next = encounterStop(progress, id);
    if (!next.entries[id].identification)
      next = identifySafari(next, input.value, skipped);
    if (status.driving) {
      // Opening the prompt already braked the jeep. Exit only through the
      // world's safe-exit check, never place Sophia inside an obstacle.
      world.setActive(true);
      if (!world.exitJeep()) {
        world.setActive(false);
        $("name-feedback").textContent =
          "There isn’t room to step out here. Choose Keep exploring, park in an open spot, then try again.";
        return;
      }
    }
    if (skipped) input.value = animal.name;
    update(next);
    mode = deriveMode();
    pendingEncounterId = null;
    closeDialog($<HTMLDialogElement>("encounter-dialog"));
    world.setStop(id, true);
    render();
    if (mode === "photo") world.guideToAnimal();
    if (matchMedia("(max-width: 700px)").matches)
      panel.scrollIntoView({ block: "start", behavior: "instant" });
  } catch (error) {
    $("name-feedback").textContent =
      error instanceof Error
        ? error.message
        : "Please try again, or choose Skip.";
  } finally {
    encounterTransition = false;
  }
}
$("name-animal").addEventListener("submit", (event) => {
  event.preventDefault();
  finishEncounter(false);
});
$("skip-animal").onclick = () => finishEncounter(true);
$("nearby-encounter").onclick = () => {
  const animal = nearbyDiscovery();
  if (animal) beginEncounter(animal.id);
};
function enterJeep() {
  if (
    busy ||
    !world ||
    !status.canEnterJeep ||
    mode === "observe" ||
    mode === "question" ||
    mode === "photo"
  )
    return;
  if (!progress.started) {
    update(visitStop(progress, progress.currentStopId));
    mode = deriveMode();
    render(false);
  }
  if (world.enterJeep()) {
    stopNarration();
    $("vehicle-feedback").textContent =
      "Hold Go to drive. Use Left and Right to steer.";
    $("exit-jeep").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}
function exitJeep() {
  if (busy || !world || !status.driving) return;
  if (!world.exitJeep()) {
    $("vehicle-feedback").textContent =
      "Brake to a stop in an open spot before getting out.";
    return;
  }
  $("vehicle-feedback").textContent =
    "You’re back on foot. Your jeep will wait here.";
  mode = deriveMode();
  render(false);
  $($("vehicle-card").hidden ? "story-title" : "enter-jeep").focus({
    preventScroll: true,
  });
}
function driveToNextStop(id: string) {
  if (busy || !world) return;
  world.returnToJeep();
  if (!world.enterJeep()) {
    $("vehicle-feedback").textContent =
      "The jeep needs a clear boarding spot. Try Get in the jeep.";
    return;
  }
  update(visitStop(progress, id));
  world.setStop(id, true);
  // A revisited destination may have a saved question/photo in progress.
  // Keep its controls available during the drive; resume that step on exit.
  mode = "explore";
  $("world-banner").hidden = true;
  stopNarration();
  render(false);
  $("vehicle-feedback").textContent =
    "Follow the arrow to your next animal. Take your time.";
  $("exit-jeep").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}
$("enter-jeep").onclick = enterJeep;
$("exit-jeep").onclick = exitJeep;
$("return-jeep").onclick = () => {
  if (busy || !world) return;
  world.returnToJeep();
  $("vehicle-feedback").textContent =
    "Back beside your jeep. Ready for another drive?";
};
window.addEventListener("keydown", (event) => {
  if (
    event.code !== "KeyE" ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    busy ||
    document.querySelector("dialog[open]") ||
    (event.target as HTMLElement | null)?.closest(
      'input, textarea, select, [contenteditable="true"]',
    )
  )
    return;
  event.preventDefault();
  if (status.driving) exitJeep();
  else enterJeep();
});
function travel(id: string) {
  closeDialogs();
  update(visitStop(progress, id));
  status = { ...status, animalLoaded: false, nearby: false, photoReady: false };
  $("world-banner").hidden = true;
  world?.setStop(id);
  mode = deriveMode();
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function openDialog(id: string) {
  stopNarration();
  world?.setInspecting(id === "encounter-dialog");
  world?.setActive(false);
  document
    .querySelectorAll("#drive-controls .held")
    .forEach((control) => control.classList.remove("held"));
  const dialog = $<HTMLDialogElement>(id);
  if (id === "encounter-dialog") dialog.show();
  else dialog.showModal();
}
function closeDialogs() {
  document
    .querySelectorAll<HTMLDialogElement>("dialog[open]")
    .forEach(closeDialog);
}
function resumeAfterDialog(dialog: HTMLDialogElement) {
  // Native close events are queued. An earlier close must not clear a newly
  // opened encounter, and button dismissal must resume before the next keydown.
  if (dialog.open) return;
  const dismissedSighting =
    dialog.id === "encounter-dialog" && pendingEncounterId !== null;
  if (dialog.id === "encounter-dialog") pendingEncounterId = null;
  if (!busy && !document.querySelector("dialog[open]")) {
    world?.setInspecting(mode === "observe" || mode === "question");
    world?.setActive(mode !== "observe" && mode !== "question");
    updateVehicleControls();
    if (dismissedSighting) render(false);
  }
}
function closeDialog(dialog: HTMLDialogElement) {
  dialog.close();
  resumeAfterDialog(dialog);
}
let browseAllProfiles = false;
/** Which leaf of the book is turned to. One species per leaf. */
let bookLeaf = 0;
function renderBook() {
  const query = $<HTMLInputElement>("book-search")
    .value.trim()
    .toLocaleLowerCase();
  const group = $<HTMLSelectElement>("book-group").value;
  const matching = safariStops.filter(
    (animal) =>
      (group === "all" || (animal.profile?.group ?? "Mammal") === group) &&
      (!query ||
        [
          animal.name,
          animal.scientificName,
          ...(animal.profile?.aliases ?? []),
        ].some((value) => value.toLocaleLowerCase().includes(query))),
  );
  $("book-results").textContent =
    `${matching.length} animals · ${discoveredCount(progress)} of ${safariStops.length} photographed`;
  $("book-view").textContent = browseAllProfiles
    ? "Show only animals I’ve met"
    : "Browse all animal profiles";
  $("book-view").setAttribute("aria-pressed", String(browseAllProfiles));
  $("route-list").innerHTML = matching
    .map((animal) => {
      const saved = progress.entries[animal.id];
      const index = safariStops.indexOf(animal);
      const unlocked = isStopUnlocked(progress, animal.id);
      // Reading about an animal and travelling to it are different intents, so
      // the name opens its page and a separate control goes there.
      const note = saved.photo
        ? "In your field book"
        : saved.identification
          ? "Named. Its photograph is still to come"
          : unlocked
            ? animal.profile
              ? "Ready to find · " + animal.profile.group.toLowerCase()
              : "Ready to find"
            : "Keep exploring to find this one";
      return `<li><button class="route-open" data-leaf-to="${animal.id}" ${animal.id === progress.currentStopId ? 'aria-current="step"' : ""}><span class="route-number">${saved.photo ? "✓" : index + 1}</span><span>${escape(animal.name)}<small>${note}</small></span></button><button class="route-go" data-visit="${animal.id}" ${!unlocked ? "disabled" : ""} aria-label="Travel to the ${escape(animal.name.toLowerCase())}">Go</button></li>`;
    })
    .join("");
  const pages = matching.filter(
    (animal) =>
      browseAllProfiles ||
      progress.entries[animal.id].identification ||
      progress.entries[animal.id].photo,
  );
  if (bookLeaf >= pages.length) bookLeaf = 0;
  const turned = pages[bookLeaf];
  $("book-pages").innerHTML = pages.length
    ? `<h3>${browseAllProfiles ? "Savanna animal guide" : "Animals you’ve met"}</h3>${pages
        .map((animal, index) =>
          renderFieldEntry({
            animal,
            saved: progress.entries[animal.id],
            number: safariStops.indexOf(animal) + 1,
            unlocked: isStopUnlocked(progress, animal.id),
            leaf: index + 1,
            leaves: pages.length,
            open: index === bookLeaf,
          }),
        )
        .join("")}${
        pages.length > 1
          ? `<nav class="book-pager" aria-label="Turn the pages"><button id="book-back" ${bookLeaf === 0 ? "disabled" : ""}>Back a page</button><p class="book-leaf-count" role="status">Page ${bookLeaf + 1} of ${pages.length}<span>${escape(turned.name)}</span></p><button id="book-forward" ${bookLeaf === pages.length - 1 ? "disabled" : ""}>Next page</button></nav>`
          : ""
      }`
    : matching.length
      ? `<div class="notebook-empty"><img src="${publicAsset("/assets/notebook/cover-hero.webp")}" alt="" width="574" height="620" loading="lazy"><p class="empty-book">No pages yet. Walk or drive near an animal to start its page, or choose Browse all animal profiles to read ahead.</p></div>`
      : `<p class="empty-book">No animals match. Try a shorter name or another group.</p>`;
  $("book-dialog")
    .querySelectorAll<HTMLButtonElement>("[data-visit]")
    .forEach(
      (button) => (button.onclick = () => travel(button.dataset.visit!)),
    );
  $("book-dialog")
    .querySelectorAll<HTMLButtonElement>("[data-leaf-to]")
    .forEach((button) => {
      button.onclick = () => {
        const leaf = pages.findIndex(
          (animal) => animal.id === button.dataset.leafTo,
        );
        if (leaf >= 0) return turnTo(leaf);
        // Its page is not in the book being shown, so widen to the full guide.
        browseAllProfiles = true;
        bookLeaf = Math.max(
          0,
          matching.findIndex((animal) => animal.id === button.dataset.leafTo),
        );
        renderBook();
      };
    });
  const back = document.getElementById("book-back");
  if (back) back.onclick = () => turnTo(bookLeaf - 1);
  const forward = document.getElementById("book-forward");
  if (forward) forward.onclick = () => turnTo(bookLeaf + 1);
}
/**
 * Amy's rendered opening plays once per page load, then hands off to the real
 * notebook. It is a transition, never the content: everything readable stays
 * as accessible HTML behind it. Any failure to play just opens the book.
 */
let notebookOpeningSeen = false;
function playNotebookOpening() {
  const layer = $("notebook-intro");
  const video = $<HTMLVideoElement>("notebook-intro-video");
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      layer.hidden = true;
      video.pause();
      layer.onpointerdown = null;
      window.removeEventListener("keydown", skip);
      resolve();
    };
    const skip = () => finish();
    const timer = window.setTimeout(finish, 3200);
    video.onended = finish;
    video.onerror = finish;
    layer.onpointerdown = skip;
    window.addEventListener("keydown", skip, { once: true });
    const found = discoveredCount(progress);
    $("notebook-intro-count").textContent =
      `${found} of ${safariStops.length} species recorded`;
    layer.hidden = false;
    video.currentTime = 0;
    void video.play().catch(finish);
  });
}
/** Open the book turned to one animal's page, the one just photographed. */
async function openBookAt(id: string) {
  const leaf = safariStops.findIndex((animal) => animal.id === id);
  if (leaf >= 0) {
    browseAllProfiles = true;
    bookLeaf = leaf;
  }
  await openBook();
}
async function openBook() {
  renderBook();
  const skipOpening =
    notebookOpeningSeen ||
    progress.settings.reducedMotion ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!skipOpening) {
    notebookOpeningSeen = true;
    await playNotebookOpening();
  }
  openDialog("book-dialog");
}
function turnTo(leaf: number) {
  bookLeaf = leaf;
  renderBook();
  $("book-pages")
    .querySelector<HTMLElement>(".book-page:not([hidden])")
    ?.scrollIntoView({ block: "start" });
}
/** A different set of animals is a different book, so it opens at the front. */
function reopenBook() {
  bookLeaf = 0;
  renderBook();
}
$("book-search").oninput = reopenBook;
$("book-group").onchange = reopenBook;
$("book-view").onclick = () => {
  browseAllProfiles = !browseAllProfiles;
  reopenBook();
};
$("route-button").onclick = openBook;
$<HTMLInputElement>("music-setting").onchange = (event) =>
  setMusicEnabled((event.target as HTMLInputElement).checked);
armBackgroundMusic();
$("settings-button").onclick = () => {
  $<HTMLInputElement>("volume-setting").value = String(
    progress.settings.volume,
  );
  $<HTMLInputElement>("motion-setting").checked =
    progress.settings.reducedMotion;
  $<HTMLInputElement>("quality-setting").checked = progress.settings.lowQuality;
  $<HTMLInputElement>("music-setting").checked = musicEnabled();
  openDialog("settings-dialog");
};
document.querySelectorAll<HTMLDialogElement>("dialog").forEach((d) => {
  d.querySelector<HTMLButtonElement>("[data-close]")!.onclick = () =>
    closeDialog(d);
  d.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog(d);
  });
  d.addEventListener("close", () => resumeAfterDialog(d));
  if (d.id === "encounter-dialog")
    d.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDialog(d);
    });
});
for (const id of ["volume-setting", "motion-setting", "quality-setting"])
  $(id).onchange = () => {
    update({
      ...progress,
      settings: {
        narration: false,
        volume: Number($<HTMLInputElement>("volume-setting").value),
        reducedMotion: $<HTMLInputElement>("motion-setting").checked,
        lowQuality: $<HTMLInputElement>("quality-setting").checked,
      },
    });
    setNarrationVolume(progress.settings.volume);
    stopNarration();
    world?.setOptions(progress.settings);
  };
$("restart-button").onclick = async () => {
  if (busy) return;
  if (
    !confirm(
      "Restart the safari and replace all 32 field-book discoveries? Your classic zebra discovery will stay as it is.",
    )
  )
    return;
  setBusy(true);
  ++saveRevision;
  dirty = true;
  $("save-status").textContent = "Starting a new story…";
  const fresh = newSafari(progress.settings);
  try {
    await store.replace(fresh);
    readFailed = false;
    dirty = false;
    progress = fresh;
    dismissedEncounters.clear();
    pendingEncounterId = null;
    $("save-banner").hidden = true;
    $("save-status").textContent = "New story saved on this device";
    closeDialogs();
    world?.setStop(progress.currentStopId);
    mode = "intro";
    setBusy(false);
    render();
  } catch (error) {
    reportSave(error);
  } finally {
    setBusy(false);
  }
};
document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((b) => {
  const direction = b.dataset.move as "forward" | "backward" | "left" | "right";
  b.onpointerdown = (event) => {
    event.preventDefault();
    b.setPointerCapture(event.pointerId);
    world?.setMovement(direction, true);
  };
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => world?.setMovement(direction, false));
  b.onkeydown = (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      world?.setMovement(direction, true);
    }
  };
  b.onkeyup = () => world?.setMovement(direction, false);
  b.onblur = () => world?.setMovement(direction, false);
});
document
  .querySelectorAll<HTMLButtonElement>("[data-drive], #brake-jeep")
  .forEach((control) => {
    const direction = control.dataset.drive as
      "forward" | "backward" | "left" | "right" | undefined;
    const press = (pressed: boolean) => {
      control.classList.toggle("held", pressed);
      if (direction) world?.setMovement(direction, pressed);
      else world?.setBrake(pressed);
    };
    control.onpointerdown = (event) => {
      if (busy || !status.driving) return;
      event.preventDefault();
      control.setPointerCapture(event.pointerId);
      press(true);
    };
    for (const type of [
      "pointerup",
      "pointercancel",
      "lostpointercapture",
      "blur",
    ])
      control.addEventListener(type, () => press(false));
    control.onkeydown = (event) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat && !control.classList.contains("held")) return;
      if (!busy && status.driving) press(true);
    };
    control.onkeyup = (event) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      press(false);
    };
  });
function clearHeldControls() {
  document
    .querySelectorAll("#drive-controls .held")
    .forEach((control) => control.classList.remove("held"));
}
window.addEventListener("blur", clearHeldControls);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearHeldControls();
});
window.addEventListener("beforeunload", (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
window.addEventListener("pagehide", () => {
  disposed = true;
  stopNarration();
  world?.dispose();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});

async function start() {
  try {
    const saved = await store.load();
    if (saved) progress = saved;
    $("save-status").textContent = saved
      ? "Your saved story is ready"
      : "Your discoveries will save on this device";
  } catch (error) {
    readFailed = true;
    reportSave(error);
  }
  if (disposed) return;
  setNarrationVolume(progress.settings.volume);
  try {
    world = createSafariWorld($("safari-world"), {
      stops: safariStops,
      reducedMotion: progress.settings.reducedMotion,
      lowQuality: progress.settings.lowQuality,
      onStatus: (next) => {
        status = next;
        updateStatus();
      },
      onError: (message) => {
        const banner = $("world-banner");
        banner.hidden = false;
        banner.textContent = message;
      },
    });
    world.setStop(progress.currentStopId);
    if (!progress.started) world.prepareArrival();
  } catch {
    $("world-banner").hidden = false;
    $("world-banner").innerHTML =
      `The 3D scene could not open. Try reloading or using another browser. <button id="reload-world">Reload scene</button>`;
    $("reload-world").onclick = () => location.reload();
  }
  mode = deriveMode();
  setBusy(false);
  render(false);
}
void start();
