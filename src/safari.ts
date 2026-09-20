import "./safari.css";
import {
  safariStops,
  safariEnding,
  safariContentReviewedAt,
} from "./content/safari";
import {
  narratorSample,
  safariNarration,
  safariStopNarration,
} from "./content/narration";
import { createSafariWorld } from "./game/safari-world";
import {
  narrate,
  setNarrationVolume,
  stopNarration,
  getNarratorDescription,
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
  <div id="audio-notice" class="notice" role="status" hidden></div>
  <main class="safari-stage">
    <div class="scene-area">
      <div id="safari-world" aria-label="Savanna scene with Sophia, her jeep, and the current animal"></div>
      <div class="scene-label"><span id="scene-chapter">Base camp</span><span id="scene-hint">Your adventure begins here</span></div>
      <div id="world-banner" class="world-notice" role="alert" hidden></div>
      <div id="photo-frame" aria-hidden="true" hidden><i></i><i></i><i></i><i></i></div>
      <div id="movement" aria-label="Move Sophia" hidden>
        <button data-move="forward" aria-label="Walk forward">↑</button><button data-move="left" aria-label="Walk left">←</button><button data-move="backward" aria-label="Walk backward">↓</button><button data-move="right" aria-label="Walk right">→</button>
      </div>
      <p class="scene-keyboard">Walk: W A S D or arrow keys · Look: drag the scene</p>
    </div>
    <section id="story-panel" class="story-panel" aria-labelledby="story-title" aria-busy="true"><p class="eyebrow">Preparing your field book</p><h1 id="story-title">A little adventure awaits.</h1><p>Loading your saved story…</p></section>
  </main>
  <footer class="safari-footer"><span id="save-status" role="status">Opening your field book…</span><span>Created by Sophia, age 7, with AI and help from her mom.</span></footer>
  <dialog id="book-dialog" aria-labelledby="book-title"><div class="dialog-top"><div><p class="eyebrow">Your expedition</p><h2 id="book-title">Route & field book</h2></div><button data-close aria-label="Close field book">Close</button></div><p class="dialog-intro">Seven stops, seven clues. Revisit any stop you have reached.</p><ol id="route-list" class="route-list"></ol><div id="book-pages" class="book-pages"></div></dialog>
  <dialog id="settings-dialog" aria-labelledby="settings-title"><div class="dialog-top"><h2 id="settings-title">Make it yours</h2><button data-close aria-label="Close settings">Close</button></div><div class="settings-fields"><label><span>Read the story aloud</span><input id="narration-setting" type="checkbox"></label><label class="volume"><span>Narration volume</span><input id="volume-setting" type="range" min="0" max="1" step="0.05"></label><label><span>Reduce motion</span><input id="motion-setting" type="checkbox"></label><label><span>Lighter graphics</span><input id="quality-setting" type="checkbox"></label></div><p id="narrator-description" class="secondary"></p><button id="hear-guide">Hear the guide</button><p id="narration-feedback" class="secondary" role="status"></p><p class="secondary">Every instruction also appears on screen.</p><details><summary>About this safari</summary><p class="secondary">An imagined savanna adventure with sourced natural history. Animal models and poses are prototypes. Sources are listed beside each discovery in your field book.</p></details><button id="restart-button" class="danger">Restart this story</button><p class="secondary">This replaces only the story safari. Your classic zebra encounter stays separate.</p></dialog>
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
};
type Mode = "intro" | "explore" | "question" | "photo" | "success" | "ending";
let mode: Mode = "intro";
let currentNarration = "";
let narrationDialog: HTMLDialogElement | null = null;
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
  if (progress.settings.narration) playGuide(text);
}
function playGuide(text: string) {
  narrationDialog = document.querySelector<HTMLDialogElement>("dialog[open]");
  let reported = false;
  const report = (message: string) => {
    reported = true;
    if ($<HTMLDialogElement>("settings-dialog").open)
      $("narration-feedback").textContent = message;
    else {
      $("audio-notice").hidden = false;
      $("audio-notice").textContent = message;
    }
  };
  $("narration-feedback").textContent = "";
  $("audio-notice").hidden = true;
  setNarrationVolume(progress.settings.volume);
  if (!narrate(text, report) && !reported)
    report(
      "Guide audio is unavailable right now. All the story text is on screen.",
    );
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
  $("movement").hidden = mode !== "explore";
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
    narration = safariNarration.intro;
  } else if (mode === "explore") {
    body = `<p class="eyebrow">Stop ${index + 1} · ${animal.chapter}</p><h1 id="story-title" tabindex="-1">${animal.name}</h1><p>${animal.story}</p><p class="mission">${animal.mission}</p><div class="actions">${button("guide-animal", "Guide Sophia closer")}${button("discover-clue", "Discover the clue", true)}</div><p id="approach-status" class="secondary" role="status"></p>`;
    narration = safariStopNarration(animal, "explore");
  } else if (mode === "question") {
    if (!discovery.answer) {
      body = `<p class="eyebrow">A little discovery</p><h1 id="story-title" tabindex="-1">${animal.question.prompt}</h1><div class="choices">${animal.question.choices.map((c, i) => `<button data-answer="${c.id}"><span aria-hidden="true">${i + 1}</span>${c.text}</button>`).join("")}</div>`;
      narration = safariStopNarration(animal, "question");
    } else {
      const correct = discovery.answer === animal.question.correctId;
      body = `<p class="eyebrow">${correct ? "You spotted it" : "Let’s discover it together"}</p><h1 id="story-title" tabindex="-1">${animal.clue}</h1><p>${animal.question.explanation}</p><div class="actions">${!correct ? button("retry-answer", "Try again") : ""}${button("learn-clue", "I’ve got it · Take a photo", true)}</div>`;
      narration = safariStopNarration(
        animal,
        correct ? "correct" : "incorrect",
      );
    }
  } else if (mode === "photo") {
    body = `<p class="eyebrow">Add a picture to your field book</p><h1 id="story-title" tabindex="-1">Photograph the ${animal.name.toLowerCase()}</h1><p id="photo-status" role="status">Preparing your view…</p><div class="actions">${button("frame-animal", "Help me frame it")}${button("take-photo", "Take photo", true)}</div>`;
    narration = safariStopNarration(animal, "photo");
  } else if (mode === "success") {
    body = `<div class="discovery-top"><img class="photo-thumb" src="${discovery.photo!.dataUrl}" alt="Your photograph of the ${animal.name.toLowerCase()}"><div><p class="eyebrow">Clue ${index + 1} collected</p><h1 id="story-title" tabindex="-1">${animal.clue}</h1></div></div><p>${animal.facts[0]}</p><div class="actions">${button("retake-photo", "Retake photo")}${index < safariStops.length - 1 ? button("next-stop", "Back to the jeep →", true) : button("finish-safari", "See our seven clues →", true)}</div><p class="secondary">${index < safariStops.length - 1 ? `Jump to our next stop: ${safariStops[index + 1].name}.` : "The field book is ready. Let’s bring it all together."}</p>`;
    narration = safariStopNarration(animal, "success");
  } else {
    body = `<p class="eyebrow">Your sunset field book · 7 of 7</p><h1 id="story-title" tabindex="-1">One connected home.</h1><p>${safariEnding}</p><div class="clue-pills">${safariStops.map((s) => `<span>${s.clue}</span>`).join("")}</div><div class="actions">${button("open-finished-book", "Open my field book", true)}${button("revisit-route", "Explore again")}</div>`;
    narration = safariNarration.ending;
  }
  panel.innerHTML = `${body}<div class="panel-bottom">${button("repeat-story", "Read it aloud")}<span class="secondary">Look closely. Leave room.</span></div>`;
  panel.setAttribute("aria-busy", "false");
  $("repeat-story").onclick = () => {
    playGuide(currentNarration);
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
    if (!status.nearby || !status.animalLoaded) return;
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
  if (discover) discover.disabled = !status.nearby || !status.animalLoaded;
  const capture = document.getElementById(
    "take-photo",
  ) as HTMLButtonElement | null;
  if (capture) capture.disabled = !status.photoReady || !status.animalLoaded;
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
}
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
  $("narrator-description").textContent = getNarratorDescription();
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
$("hear-guide").onclick = () => {
  $("narrator-description").textContent = getNarratorDescription();
  playGuide(narratorSample);
};
document.querySelectorAll<HTMLDialogElement>("dialog").forEach((d) => {
  d.querySelector<HTMLButtonElement>("[data-close]")!.onclick = () => d.close();
  d.addEventListener("close", () => {
    // A queued old close event must not cancel the next stop's newer story line.
    if (narrationDialog === d) {
      stopNarration();
      narrationDialog = null;
    }
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
    if (id === "narration-setting" && !progress.settings.narration)
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
window.addEventListener("blur", stopNarration);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopNarration();
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
