import "./safari.css";
import {
  safariStops,
  safariEnding,
  safariContentReviewedAt,
} from "./content/safari";
import { createSafariWorld } from "./game/safari-world";
import {
  narrate,
  setNarrationVolume,
  stopNarration,
} from "./accessibility/narration";
import {
  answerSafari,
  createSafariStore,
  discoveredCount,
  isStopUnlocked,
  learnSafariClue,
  newSafari,
  photographSafari,
  retrySafariAnswer,
  visitStop,
  type SafariProgress,
} from "./state/safari";
import type { SafariStatus, SafariWorld } from "./safari-contracts";

const app = document.querySelector<HTMLDivElement>("#safari-app")!;
app.innerHTML = `
  <header class="safari-header">
    <a class="brand" href="./"><span class="brand-mark" aria-hidden="true">S</span><span>Sophia’s Wild World<span class="brand-sub">The Sunset Safari</span></span></a>
    <nav aria-label="Safari tools"><button id="route-button">Route & field book <span id="clue-count">0/7</span></button><button id="settings-button" aria-label="Settings">Settings</button></nav>
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
      <p id="scene-keyboard" class="scene-keyboard">Walk: W A S D or arrow keys · E: get in · Look: drag</p>
    </div>
    <section id="vehicle-card" class="vehicle-card" aria-label="Safari jeep" hidden>
      <div id="walking-vehicle"><p class="eyebrow">Your Land Cruiser</p><button id="enter-jeep" class="primary" disabled>Get in the jeep</button><button id="return-jeep" hidden>Return to the jeep</button><p id="vehicle-hint" class="secondary">Getting the jeep ready…</p></div>
      <div id="driving-vehicle" hidden><div class="drive-heading"><span class="eyebrow">At the wheel</span><span id="drive-speed" class="speed">0 km/h</span></div><div class="drive-destination"><span id="drive-compass" aria-hidden="true">↑</span><div><strong id="drive-destination"></strong><p id="drive-distance" class="secondary"></p></div></div><button id="exit-jeep">Park & get out</button><p id="exit-hint" class="secondary">Brake to a stop, then step out to explore.</p></div>
      <p id="vehicle-feedback" class="secondary" role="status"></p>
    </section>
    <section id="story-panel" class="story-panel" aria-labelledby="story-title" aria-busy="true"><p class="eyebrow">Preparing your field book</p><h1 id="story-title">A little adventure awaits.</h1><p>Loading your saved story…</p></section>
  </main>
  <footer class="safari-footer"><span id="save-status" role="status">Opening your field book…</span><span>Created by Sophia, age 7, with AI and help from her mom.</span></footer>
  <dialog id="book-dialog" aria-labelledby="book-title"><div class="dialog-top"><div><p class="eyebrow">Your expedition</p><h2 id="book-title">Route & field book</h2></div><button data-close aria-label="Close field book">Close</button></div><p class="dialog-intro">Seven stops, seven clues. Revisit any stop you have reached.</p><ol id="route-list" class="route-list"></ol><div id="book-pages" class="book-pages"></div></dialog>
  <dialog id="settings-dialog" aria-labelledby="settings-title"><div class="dialog-top"><h2 id="settings-title">Make it yours</h2><button data-close aria-label="Close settings">Close</button></div><div class="settings-fields"><label><span>Read the story aloud</span><input id="narration-setting" type="checkbox"></label><label class="volume"><span>Narration volume</span><input id="volume-setting" type="range" min="0" max="1" step="0.05"></label><label><span>Reduce motion</span><input id="motion-setting" type="checkbox"></label><label><span>Lighter graphics</span><input id="quality-setting" type="checkbox"></label></div><p class="secondary">Narration uses an available local English voice. Every instruction also appears on screen.</p><details><summary>About this safari</summary><p class="secondary">An imagined savanna adventure with sourced natural history. Animal models and poses are prototypes. Sources are listed beside each discovery in your field book.</p></details><button id="restart-button" class="danger">Restart this story</button><p class="secondary">This replaces only the story safari. Your classic zebra encounter stays separate.</p></dialog>
  <p id="announcement" class="sr-only" aria-live="polite"></p>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const panel = $("story-panel");
const store = createSafariStore();
let progress = newSafari({
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
});
let world: SafariWorld | null = null;
let status: SafariStatus = {
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
type Mode = "intro" | "explore" | "question" | "photo" | "success" | "ending";
let mode: Mode = "intro";
let currentNarration = "";
let dirty = false;
let readFailed = false;
let disposed = false;
let saveRevision = 0;
let busy = false;
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
      mode !== "question" && !document.querySelector("dialog[open]"),
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
  if (progress.settings.narration) narrate(text);
}
function button(id: string, text: string, primary = false) {
  return `<button id="${id}" class="${primary ? "primary" : ""}">${text}</button>`;
}
function deriveMode(): Mode {
  if (!progress.started) return "intro";
  if (entry().photo) return "success";
  if (entry().learned) return "photo";
  if (entry().answer) return "question";
  return "explore";
}
function render(announce = true) {
  const animal = stop();
  const discovery = entry();
  const index = safariStops.indexOf(animal);
  $("clue-count").textContent = `${discoveredCount(progress)}/7`;
  $("scene-chapter").textContent =
    mode === "intro" ? "Base camp" : `${index + 1} / 7 · ${animal.name}`;
  $("scene-hint").textContent =
    mode === "intro" ? "The jeep is packed. Let’s explore." : animal.chapter;
  $("movement").hidden = mode !== "explore" || status.driving;
  $("photo-frame").hidden = mode !== "photo";
  document.body.dataset.mode = mode;
  world?.setPhotoMode(mode === "photo");
  world?.setActive(
    mode !== "question" && !document.querySelector("dialog[open]"),
  );
  let body = "";
  let narration = "";
  if (mode === "intro") {
    body = `<p class="eyebrow">A seven-stop story</p><h1 id="story-title" tabindex="-1">Before the sun<br>sets on the savanna.</h1><p>Help Sophia find seven clues about a healthy savanna. Travel by jeep, meet the animals, and fill your field book with discoveries.</p><p class="secondary">Take your time. The sunset will wait for you.</p>${button("begin-safari", "Let’s go on safari →", true)}`;
    narration =
      "Help Sophia find seven clues about a healthy savanna before sunset. Travel by jeep, meet seven animals, and photograph your discoveries. Take your time. The sunset will wait for you.";
  } else if (mode === "explore") {
    body = `<p class="eyebrow">Stop ${index + 1} · ${animal.chapter}</p><h1 id="story-title" tabindex="-1">${animal.name}</h1><p>${animal.story}</p><p class="mission">${animal.mission}</p><div class="actions">${button("guide-animal", "Guide Sophia closer")}${discovery.learned ? button("resume-photo", "Photograph this discovery", true) : button("discover-clue", "Discover the clue", true)}</div><p id="approach-status" class="secondary" role="status"></p>`;
    narration = `${animal.story} ${animal.mission} Use Guide Sophia closer, or walk with the arrow buttons. Then choose Discover the clue.`;
  } else if (mode === "question") {
    if (!discovery.answer) {
      body = `<p class="eyebrow">A little discovery</p><h1 id="story-title" tabindex="-1">${animal.question.prompt}</h1><div class="choices">${animal.question.choices.map((c, i) => `<button data-answer="${c.id}"><span aria-hidden="true">${i + 1}</span>${c.text}</button>`).join("")}</div>`;
      narration = `${animal.question.prompt} ${animal.question.choices.map((c, i) => `${i + 1}. ${c.text}.`).join(" ")}`;
    } else {
      const correct = discovery.answer === animal.question.correctId;
      body = `<p class="eyebrow">${correct ? "You spotted it" : "Let’s discover it together"}</p><h1 id="story-title" tabindex="-1">${animal.clue}</h1><p>${animal.question.explanation}</p><div class="actions">${!correct ? button("retry-answer", "Try again") : ""}${button("learn-clue", "I’ve got it · Take a photo", true)}</div>`;
      narration = `${correct ? "You spotted it!" : "Let’s discover it together."} ${animal.question.explanation} When you’re ready, choose I’ve got it to take a photo.`;
    }
  } else if (mode === "photo") {
    body = `<p class="eyebrow">Add a picture to your field book</p><h1 id="story-title" tabindex="-1">Photograph the ${animal.name.toLowerCase()}</h1><p id="photo-status" role="status">Preparing your view…</p><div class="actions">${button("frame-animal", "Help me frame it")}${button("take-photo", "Take photo", true)}</div>${button("leave-photo", "Back to exploring")}`;
    narration = `Photograph the ${animal.name.toLowerCase()}. Choose Help me frame it, then Take photo when your view is ready.`;
  } else if (mode === "success") {
    body = `<div class="discovery-top"><img class="photo-thumb" src="${discovery.photo!.dataUrl}" alt="Your photograph of the ${animal.name.toLowerCase()}"><div><p class="eyebrow">Clue ${index + 1} collected</p><h1 id="story-title" tabindex="-1">${animal.clue}</h1></div></div><p>${animal.facts[0]}</p>${index < safariStops.length - 1 ? button("drive-next-stop", "Back to jeep & drive →", true) : ""}<div class="actions">${button("retake-photo", "Retake photo")}${index < safariStops.length - 1 ? button("next-stop", "Quick jump to next stop") : button("finish-safari", "See our seven clues →", true)}</div><p class="secondary">${index < safariStops.length - 1 ? `Next stop: ${safariStops[index + 1].name}. Drive there, or take a quick jump.` : "The field book is ready. Let’s bring it all together."}</p>`;
    narration = `Clue ${index + 1} collected. ${animal.clue}. ${animal.facts[0]} ${index < 6 ? `Back to the jeep. Next stop: ${safariStops[index + 1].name}.` : "All seven clues are ready. Let’s bring them together."}`;
  } else {
    body = `<p class="eyebrow">Your sunset field book · 7 of 7</p><h1 id="story-title" tabindex="-1">One connected home.</h1><p>${safariEnding}</p><div class="clue-pills">${safariStops.map((s) => `<span>${s.clue}</span>`).join("")}</div><div class="actions">${button("open-finished-book", "Open my field book", true)}${button("revisit-route", "Explore again")}</div>`;
    narration = safariEnding;
  }
  panel.innerHTML = `${body}<div class="panel-bottom">${button("repeat-story", "Read it aloud")}<span class="secondary">Look closely. Leave room.</span></div>`;
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
    mode = deriveMode();
    render();
  });
  bind("guide-animal", () => world?.guideToAnimal());
  bind("discover-clue", () => {
    if (status.driving || !status.nearby || !status.animalLoaded) return;
    mode = "question";
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
    mode = "photo";
    render();
    world?.guideToAnimal();
  });
  bind("frame-animal", () => world?.guideToAnimal());
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
          "The picture is not ready. Try Help me frame it, then take another photo.",
        );
      update(photographSafari(progress, photo));
      mode = "success";
      render();
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
  bind("next-stop", () => travel(safariStops[index + 1].id));
  bind("drive-next-stop", () => driveToNextStop(safariStops[index + 1].id));
  bind("finish-safari", () => {
    mode = "ending";
    render();
  });
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
      : "Choose Help me frame it for a clear view.";
  if (photoStatus && photoStatus.textContent !== photoMessage)
    photoStatus.textContent = photoMessage;
  updateVehicleControls();
}
function updateVehicleControls() {
  const driving = status.driving;
  document.body.dataset.driving = String(driving);
  panel.hidden = driving;
  $("vehicle-card").hidden = !world || mode === "question" || mode === "photo";
  $("walking-vehicle").hidden = driving;
  $("driving-vehicle").hidden = !driving;
  $("drive-controls").hidden = !driving;
  $("movement").hidden = driving || mode !== "explore";
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
      : `${Math.round(status.destinationDistance)} m to your story stop`;
  $("drive-compass").style.transform =
    `rotate(${status.destinationBearing}rad)`;
  $("exit-hint").textContent = status.canExitJeep
    ? "Step out to discover your clue."
    : Math.abs(status.speedKph) > 2.8
      ? "Hold Brake or Space to stop before getting out."
      : "Move to an open spot so there is room to get out.";
  $("scene-keyboard").textContent = driving
    ? "W / ↑: go · S / ↓: reverse · A D / ← →: steer · Space: brake · E: get out"
    : "Walk: W A S D or arrow keys · E: get in · Look: drag";
}
function enterJeep() {
  if (
    busy ||
    !world ||
    !status.canEnterJeep ||
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
    "Follow the arrow to your next story stop. Take your time.";
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
  world?.setActive(false);
  document
    .querySelectorAll("#drive-controls .held")
    .forEach((control) => control.classList.remove("held"));
  $<HTMLDialogElement>(id).showModal();
}
function closeDialogs() {
  document
    .querySelectorAll<HTMLDialogElement>("dialog[open]")
    .forEach((d) => d.close());
  world?.setActive(mode !== "question");
}
function openBook() {
  $("route-list").innerHTML = safariStops
    .map(
      (s, i) =>
        `<li><button data-visit="${s.id}" ${!isStopUnlocked(progress, s.id) || !progress.started ? "disabled" : ""} ${s.id === progress.currentStopId ? 'aria-current="step"' : ""}><span class="route-number">${progress.entries[s.id].photo ? "✓" : i + 1}</span><span>${s.name}<small>${progress.entries[s.id].photo ? s.clue : isStopUnlocked(progress, s.id) ? "Your next discovery" : "Further along the route"}</small></span></button></li>`,
    )
    .join("");
  const pages = safariStops.filter((s) => progress.entries[s.id].photo);
  $("book-pages").innerHTML = pages.length
    ? `<h3>Your photographs</h3>${pages.map((s) => `<article class="book-page"><img src="${progress.entries[s.id].photo!.dataUrl}" alt="Your photograph of the ${s.name.toLowerCase()}"><h3>${s.name}</h3><p class="secondary"><i>${s.scientificName}</i></p><p>${s.facts[0]}</p><details><summary>Fact sources</summary><ul>${s.sources.map((source) => `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></li>`).join("")}</ul><p class="secondary">Sources checked ${safariContentReviewedAt}.</p></details></article>`).join("")}`
    : `<p class="empty-book">Your first page is waiting for a photograph.</p>`;
  $("route-list")
    .querySelectorAll<HTMLButtonElement>("[data-visit]")
    .forEach((b) => (b.onclick = () => travel(b.dataset.visit!)));
  openDialog("book-dialog");
}
$("route-button").onclick = openBook;
$("settings-button").onclick = () => {
  $<HTMLInputElement>("narration-setting").checked =
    progress.settings.narration;
  $<HTMLInputElement>("volume-setting").value = String(
    progress.settings.volume,
  );
  $<HTMLInputElement>("motion-setting").checked =
    progress.settings.reducedMotion;
  $<HTMLInputElement>("quality-setting").checked = progress.settings.lowQuality;
  openDialog("settings-dialog");
};
document.querySelectorAll<HTMLDialogElement>("dialog").forEach((d) => {
  d.querySelector<HTMLButtonElement>("[data-close]")!.onclick = () => d.close();
  d.addEventListener("close", () => {
    if (!busy && !document.querySelector("dialog[open]"))
      world?.setActive(mode !== "question");
  });
});
for (const id of [
  "narration-setting",
  "volume-setting",
  "motion-setting",
  "quality-setting",
])
  $(id).onchange = () => {
    update({
      ...progress,
      settings: {
        narration: $<HTMLInputElement>("narration-setting").checked,
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
      "Restart the story and replace its seven-stop field book? Your classic zebra discovery will stay as it is.",
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
