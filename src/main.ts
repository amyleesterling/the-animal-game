import "./style.css";
import { createWorld } from "./game/world";
import { CORA_CHARACTER } from "./content/characters";
import { createSpecimen } from "./game/specimen";
import type { World, WorldStatus } from "./game/contracts";
import { assets, zebra, roster } from "./content/species";
import { assertValidContent } from "./content/validate";
import {
  newProgress,
  submitAnswer,
  continueAfterAnswer,
  retryAnswer,
  recordPhoto,
  replayQuiz,
  resetProgress,
} from "./state/progress";
import { loadProgress, saveProgress } from "./state/save";
import { icon } from "./ui/icons";
import {
  narrate,
  stopNarration,
  setNarrationVolume,
} from "./accessibility/narration";

const app = document.querySelector<HTMLDivElement>("#app")!;
const esc = (value: unknown): string =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
let progress = newProgress();
let world: World | undefined;
let started = false;
let mode: "explore" | "quiz" | "photo" = "explore";
let status: WorldStatus = {
  distance: 100,
  nearby: false,
  behavior: "grazing",
  photoReady: false,
  fps: 0,
};
let specimen: { dispose(): void } | undefined;
let speechText = "";
let saveChain = Promise.resolve(true);
let lastFocus: HTMLElement | null = null;
let worldFailed = false;
let saveBlocked = false;
let photoSaving = false;
let lastSaveFailed = false;
const questionOrders = new Map<string, string[]>();

app.innerHTML = `
  <div class="world" id="world" aria-label="An interactive 3D African savanna"></div>
  <div class="world-shade"></div>
  <header class="topbar">
    <a class="brand" href="#" aria-label="Sophia’s Wild World, home"><span class="brand-mark">${icon("leaf")}</span><span>Sophia’s <strong>Wild World</strong></span></a>
    <div class="expedition-label"><span class="live-dot"></span> AFRICAN SAVANNA <span class="divider">/</span> Expedition 01</div>
    <nav aria-label="Explorer tools"><button class="nav-button" id="book-button">${icon("book")}<span>Field book</span><span class="book-count" id="book-count">0 / 1</span></button><button class="icon-button" id="settings-button" aria-label="Settings">${icon("settings")}</button></nav>
  </header>
  <main id="hud">
    <section class="welcome" id="welcome" aria-labelledby="welcome-title">
      <div class="eyebrow">${icon("compass")} YOUR FIRST EXPEDITION</div>
      <h1 id="welcome-title">A world of<br>little <em>wonders.</em></h1>
      <p class="welcome-copy">Seven animals. Seven clues. Join ${CORA_CHARACTER ? "Sophia and Cora on a" : "Sophia’s"} Land Cruiser safari to discover what makes a savanna thrive.</p>
      <a class="primary start-button safari-entry" href="./safari.html">Start the story safari ${icon("arrow")}</a>
      <button class="primary start-button" id="start-button">Let’s explore ${icon("arrow")}</button>
      <p class="quiet start-note">Your original zebra adventure and field book are still here, too.</p>
      <a class="animal-preview-link" href="./animal-lab.html">Preview the next animals ${icon("arrow")}</a>
      <div class="welcome-steps"><span>${icon("compass")} Explore</span><span>${icon("camera")} Discover</span><span>${icon("book")} Remember</span></div>
    </section>
    <section class="mission-card hidden" id="mission" aria-labelledby="mission-title"></section>
    <div class="location-tag welcome-names" id="location-tag"><span class="location-line"></span><div><span class="eyebrow">${CORA_CHARACTER ? "YOUR SAFARI FRIENDS" : "YOUR SAFARI FRIEND"}</span><p>${CORA_CHARACTER ? "Sophia & Cora" : "Sophia"}</p></div></div>
    <div class="photo-overlay hidden" id="photo-overlay"><div class="viewfinder" aria-hidden="true"><i></i><i></i><i></i><i></i><span>+</span></div><div class="photo-controls"><div><strong id="frame-status">Find your striped friend</strong><span class="quiet">A little space keeps wildlife comfortable.</span></div><label class="zoom-label">Zoom <input id="zoom" type="range" min="1" max="2" step="0.05" value="1"></label><button class="primary" id="shutter">${icon("camera")} Take photo</button><button class="soft" id="leave-photo">Back</button></div></div>
    <div class="touch-controls hidden" id="touch-controls" aria-label="Movement controls"><button data-move="forward" aria-label="Walk forward">↑</button><button data-move="left" aria-label="Walk left">←</button><button data-move="backward" aria-label="Walk backward">↓</button><button data-move="right" aria-label="Walk right">→</button></div>
    <div id="subtitle" class="subtitle hidden" role="status" aria-live="polite"></div>
    <div id="notice" class="notice hidden" role="status"></div>
  </main>
  <footer class="bottom-bar"><span class="creator">Imagined by Sophia. Made with curiosity.</span><span id="control-hint" class="control-hint">${icon("sun")} A new day. A new discovery.</span><button class="text-button" id="grownups-button">For grown-ups</button></footer>
  <dialog id="dialog" aria-labelledby="dialog-title"><div id="dialog-content"></div></dialog>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const dialog = $<HTMLDialogElement>("dialog");
function notice(message: string): void {
  $("notice").textContent = message;
  $("notice").classList.remove("hidden");
}
function speak(text: string, force = false): void {
  speechText = text;
  if ((progress.settings.narration || force) && !narrate(text) && force)
    notice(
      "A local English voice is not available on this device. All instructions are also written on screen.",
    );
}
function persist(): Promise<boolean> {
  if (saveBlocked) {
    lastSaveFailed = true;
    notice(
      "The existing saved field book needs attention. This visit is temporary; use “Start a new field book” in For grown-ups only if you want to replace it.",
    );
    return Promise.resolve(false);
  }
  const snapshot = structuredClone(progress);
  saveChain = saveChain
    .then(() => saveProgress(snapshot))
    .then(() => {
      lastSaveFailed = false;
      return true;
    })
    .catch(() => {
      lastSaveFailed = true;
      notice(
        "Your adventure is still here, but this browser could not save it. Keep this tab open to keep exploring.",
      );
      return false;
    });
  return saveChain;
}
function updateCount(): void {
  $("book-count").textContent = `${progress.discoveredAt ? 1 : 0} / 1`;
}
function button(id: string, handler: () => void): void {
  $(id)?.addEventListener("click", handler);
}
function closeDialog(): void {
  if (!dialog.open) return;
  // Finish the old preview before another dialog can open. Native `close`
  // events are queued and must not later dispose a new preview or steal focus.
  specimen?.dispose();
  specimen = undefined;
  dialog.close();
  world?.setActive(started && mode !== "quiz");
  stopNarration();
  lastFocus?.focus();
  lastFocus = null;
}
function openDialog(html: string): void {
  lastFocus = document.activeElement as HTMLElement;
  world?.setActive(false);
  stopNarration();
  $("dialog-content").innerHTML = html;
  dialog.showModal();
  $("dialog-content")
    .querySelectorAll("[data-close]")
    .forEach((el) => el.addEventListener("click", closeDialog));
}
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDialog();
});
const closeButton = `<button class="icon-button dialog-close" data-close aria-label="Close">${icon("close")}</button>`;

function renderMission(focus = false): void {
  const mission = $("mission");
  if (mode === "quiz") {
    const q = zebra.quizzes[progress.quiz.questionIndex];
    if (!q) {
      mode = "explore";
      renderMission(focus);
      return;
    }
    const answer = progress.quiz.lastAnswer;
    if (!questionOrders.has(q.id)) {
      const ids = q.choices.map((c) => c.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      questionOrders.set(q.id, ids);
    }
    const choices = questionOrders
      .get(q.id)!
      .map((id) => q.choices.find((c) => c.id === id)!);
    mission.innerHTML = `<div class="card-heading"><span class="eyebrow">LITTLE DISCOVERY ${progress.quiz.questionIndex + 1} OF 3</span><button id="repeat" class="icon-button" aria-label="Read question and answers aloud">${icon("sound")}</button></div><div class="quiz-progress">${zebra.quizzes.map((_, i) => `<span class="${i <= progress.quiz.questionIndex ? "filled" : ""}"></span>`).join("")}</div><h2 id="mission-title" tabindex="-1">${esc(q.prompt)}</h2>${answer ? `<div class="feedback ${answer.correct ? "correct" : ""}" role="status"><strong>${answer.correct ? "You spotted it!" : "A little clue for you…"}</strong><p>${esc(answer.explanation)}</p></div><div class="action-row">${!answer.correct ? '<button class="soft" id="retry">Try again</button>' : ""}<button class="primary" id="next-question">${progress.quiz.questionIndex === 2 ? "Ready for a photo" : "Keep discovering"} ${icon("arrow")}</button></div>` : `<div class="answers">${choices.map((c, i) => `<button class="answer" data-answer="${esc(c.id)}"><span class="answer-letter">${String.fromCharCode(65 + i)}</span>${esc(c.text)}</button>`).join("")}</div>`}<button class="text-button" id="pause-quiz">Explore for a while</button>`;
    const narration = `${q.narration} ${choices.map((c) => c.narration).join(". ")}`;
    button("repeat", () => speak(answer?.explanation ?? narration, true));
    mission.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((el) =>
      el.addEventListener("click", () => {
        const result = submitAnswer(progress, q.id, el.dataset.answer!);
        progress = result.progress;
        persist();
        renderMission(true);
        speak(result.explanation);
      }),
    );
    button("retry", () => {
      progress = retryAnswer(progress);
      persist();
      renderMission(true);
    });
    button("next-question", () => {
      progress = continueAfterAnswer(progress);
      persist();
      if (progress.quiz.questionIndex === zebra.quizzes.length)
        mode = "explore";
      renderMission(true);
      if (mode === "quiz") speakCurrentQuestion();
      else {
        world?.setActive(true);
        speak(
          "You’re ready to take a photograph. Open your camera and give your zebra a little space.",
        );
      }
    });
    button("pause-quiz", () => {
      mode = "explore";
      world?.setActive(true);
      stopNarration();
      renderMission(true);
    });
  } else if (progress.encounterCompleted) {
    mission.innerHTML = `<div class="card-heading"><span class="eyebrow">${progress.discoveredAt ? "ONE WONDER, FOUND" : "YOUR NEXT DISCOVERY"}</span>${icon(progress.discoveredAt ? "check" : "camera")}</div><h2 id="mission-title" tabindex="-1">${progress.discoveredAt ? "Hello, stripey friend." : "A moment to remember."}</h2><p>${progress.discoveredAt ? "Your zebra has a page in your field book. Visit again, or frame another lovely photo." : "Now it’s your turn to be a wildlife photographer. Give the zebra some space, then open your camera."}</p><button class="primary" id="camera-button">${icon("camera")} ${progress.discoveredAt ? "Take another photo" : "Open camera"}</button>${progress.discoveredAt ? `<button class="soft" id="mission-book">${icon("book")} See my field book</button>` : ""}<button class="text-button" id="guide-button">${icon("compass")} Guide me to a good view</button>`;
    button("camera-button", enterPhoto);
    button("mission-book", openBook);
    button("guide-button", () => {
      world?.guideToAnimal();
      speak("Let’s find a comfortable spot to watch.");
    });
  } else {
    mission.innerHTML = `<div class="card-heading"><span class="eyebrow">YOUR FIRST FIELD NOTE</span>${icon("compass")}</div><h2 id="mission-title" tabindex="-1">Who’s wearing stripes?</h2><p>Follow the path to your striped neighbor. Move gently, and see what you notice.</p><div class="animal-status"><span class="live-dot"></span><span id="animal-status-text">Look for the zebra near the acacia tree.</span></div><button class="primary" id="meet-button" ${status.nearby ? "" : "disabled"}>${progress.quiz.questionIndex > 0 || progress.quiz.lastAnswer ? "Continue discovering" : "Meet the zebra"} ${icon("arrow")}</button><button class="soft" id="guide-button">${icon("compass")} Guide me to the zebra</button><button class="text-button" id="repeat">${icon("sound")} Read my mission</button>`;
    button("guide-button", () => {
      world?.guideToAnimal();
      speak("Let’s take a gentle walk to the zebra.");
    });
    button("meet-button", () => {
      if (!status.nearby) return;
      mode = "quiz";
      world?.setActive(false);
      renderMission(true);
      speakCurrentQuestion();
    });
    button("repeat", () =>
      speak(
        "Follow the path to your striped neighbor. Move with the arrow keys, or choose Guide me to the zebra. When you’re close enough, choose Meet the zebra.",
        true,
      ),
    );
  }
  if (focus) $("mission-title")?.focus({ preventScroll: true });
}
function speakCurrentQuestion(): void {
  const q = zebra.quizzes[progress.quiz.questionIndex];
  if (q)
    speak(`${q.narration} ${q.choices.map((c) => c.narration).join(". ")}`);
}
function enterPhoto(): void {
  mode = "photo";
  $("mission").classList.add("hidden");
  $("photo-overlay").classList.remove("hidden");
  $("touch-controls").classList.add("hidden");
  world?.setPhotoMode(true);
  world?.setActive(true);
  $("shutter").focus();
  speak("Frame your zebra. When the view is ready, choose Take photo.");
}
function leavePhoto(): void {
  mode = "explore";
  world?.setPhotoMode(false);
  $("photo-overlay").classList.add("hidden");
  $("mission").classList.remove("hidden");
  $("touch-controls").classList.remove("hidden");
  renderMission(true);
}
function handleStatus(next: WorldStatus): void {
  status = next;
  const meet = $<HTMLButtonElement>("meet-button");
  if (meet) meet.disabled = !next.nearby;
  const label = $("animal-status-text");
  if (label)
    label.textContent =
      next.behavior === "retreating"
        ? "A little more space will help it feel calm."
        : next.nearby
          ? "A perfect spot to say hello."
          : "Follow the path, or let your guide help.";
  $<HTMLButtonElement>("shutter").disabled = photoSaving || !next.photoReady;
  $("frame-status").textContent = next.photoReady
    ? "Lovely view. Ready when you are!"
    : "Give your zebra room to fit in the frame.";
}
function openBook(): void {
  const discovered = Boolean(progress.photo && progress.discoveredAt);
  openDialog(
    `<div class="book-layout"><aside class="book-sidebar"><div class="eyebrow">YOUR DISCOVERIES</div><h2 id="dialog-title">The field book.</h2><p>A little collection of big wonders.</p><div class="collection-count"><strong>${discovered ? "1" : "0"}</strong><span>of 1 animal discovered<br>in your first expedition</span></div><div class="book-tab">${icon("leaf")} African savanna</div><p class="quiet">Nine more neighbors are planned for a future expedition.</p><div class="coming-list">${roster
      .filter((a) => a.id !== zebra.id)
      .map((a) => `<span>${esc(a.commonName)}</span>`)
      .join(
        "",
      )}</div></aside><article class="book-page">${closeButton}${discovered ? `<div class="eyebrow">FIELD NOTE 001 · YOUR DISCOVERY</div><h3>Plains zebra</h3><p class="latin">${esc(zebra.scientificName)}</p><div class="book-media"><figure class="photo-paper"><img src="${progress.photo!.dataUrl}" alt="Your in-game photograph of the plains zebra in the savanna"><figcaption>Spotted by you · ${new Date(progress.discoveredAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</figcaption></figure><div class="specimen-wrap"><div id="specimen" aria-label="A rotating 3D zebra model"></div><span class="specimen-hint">Drag to turn · a closer look</span></div></div><p class="book-summary">${esc(zebra.summary.text)}</p><button class="soft" id="read-summary">${icon("sound")} Read this page</button><div class="facts-grid">${zebra.stats.map((s) => `<div><span>${esc(s.label)}</span><strong>${esc(s.value)}</strong></div>`).join("")}</div><div class="field-facts"><section><h4>Amazing adaptations</h4>${zebra.adaptations.map((f) => `<p>${esc(f.text)}</p>`).join("")}</section><section><h4>A job in the grasslands</h4>${zebra.ecologicalRole.map((f) => `<p>${esc(f.text)}</p>`).join("")}<p class="call-note">Animal calls are coming in a future update.</p></section></div><div class="action-row"><button class="soft" id="replay-quiz">${icon("reset")} Discover again</button><button class="primary" data-close>Back to the savanna ${icon("arrow")}</button></div>` : `<div class="empty-book"><span class="empty-icon">${icon("book")}</span><div class="eyebrow">EVERY DISCOVERY STARTS WITH CURIOSITY</div><h3>Your first page is waiting.</h3><p>Meet the zebra, make three little discoveries, and take a photograph. Your very own photo will live here.</p><button class="primary" data-close>Let’s go exploring ${icon("arrow")}</button></div>`}</article></div>`,
  );
  if (discovered) {
    if (lastSaveFailed) {
      const warning = document.createElement("p");
      warning.className = "save-warning";
      warning.setAttribute("role", "status");
      warning.textContent =
        "Your latest changes have not been saved. Keep this tab open to keep your new discoveries.";
      document.querySelector(".book-page .latin")?.after(warning);
    }
    try {
      specimen = createSpecimen($("specimen"), progress.settings.reducedMotion);
    } catch {
      $("specimen").innerHTML =
        '<p class="quiet">The 3D preview is unavailable on this device. Your photograph and field notes are here.</p>';
    }
    button("read-summary", () =>
      speak(
        `${zebra.pronunciation}. ${zebra.summary.narration} ${zebra.stats.map((f) => `${f.label}. ${f.narration}`).join(" ")} ${zebra.adaptations.map((f) => f.narration).join(" ")} ${zebra.ecologicalRole.map((f) => f.narration).join(" ")}`,
        true,
      ),
    );
    button("replay-quiz", () => {
      progress = replayQuiz(progress);
      persist();
      closeDialog();
      if (!started) start();
      mode = "quiz";
      world?.setActive(false);
      renderMission(true);
      speakCurrentQuestion();
    });
  }
}
function openSettings(): void {
  openDialog(
    `<div class="settings-page">${closeButton}<div class="eyebrow">MAKE YOURSELF COMFORTABLE</div><h2 id="dialog-title">Your way to explore.</h2><p>Change these whenever you like.</p><label class="setting"><span><strong>Read aloud</strong><small>Use an available local English device voice.</small></span><input type="checkbox" id="narration-toggle" ${progress.settings.narration ? "checked" : ""}></label><label class="setting"><span><strong>Voice volume</strong></span><input type="range" id="volume" min="0" max="1" step="0.1" value="${progress.settings.volume}"></label><label class="setting"><span><strong>Reduced motion</strong><small>Calmer camera movements and still previews.</small></span><input type="checkbox" id="motion-toggle" ${progress.settings.reducedMotion ? "checked" : ""}></label><label class="setting"><span><strong>Simple graphics</strong><small>A lighter world for smaller computers.</small></span><input type="checkbox" id="quality-toggle" ${progress.settings.lowQuality ? "checked" : ""}></label><div class="controls-help"><h3>Find your feet</h3><p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys to walk. Drag the landscape to look around. On a touchscreen, use the arrow buttons.</p><p>“Guide me” takes you to a comfortable viewing spot. You can complete the whole adventure with buttons.</p></div><button class="primary" data-close>Ready to explore ${icon("arrow")}</button></div>`,
  );
  const update = () => {
    progress.settings = {
      narration: $<HTMLInputElement>("narration-toggle").checked,
      volume: Number($<HTMLInputElement>("volume").value),
      reducedMotion: $<HTMLInputElement>("motion-toggle").checked,
      lowQuality: $<HTMLInputElement>("quality-toggle").checked,
    };
    setNarrationVolume(progress.settings.volume);
    world?.setOptions(progress.settings);
    if (!progress.settings.narration) stopNarration();
    document.documentElement.classList.toggle(
      "reduce-motion",
      progress.settings.reducedMotion,
    );
    persist();
  };
  ["narration-toggle", "volume", "motion-toggle", "quality-toggle"].forEach(
    (id) => $(id).addEventListener("change", update),
  );
}
function modelCredits(): string {
  const asset = assets.find((entry) => entry.id === zebra.model.assetId);
  if (asset?.kind !== "glb") return "";
  const credit = asset.attribution;
  return `<section class="model-credits"><h3>Our zebra model</h3><p><a href="${esc(credit.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(credit.title)}</a> by ${esc(credit.creator)}, created with Meshy and supplied by Amy. Licensed under <a href="${esc(credit.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(credit.license)}</a>.</p><p>${esc(credit.modifications)}</p><h3>Your explorers</h3><p>Amy supplied Sophia’s walking character and Cora’s walking and waving animations. They welcome you together and explore side by side. Reduced motion keeps their poses still.</p><h3>The next animals</h3><p><a href="./animal-lab.html">Open the animal previews</a> to rotate and inspect the next models. These are early art tests; their anatomy and future movements still need review.</p></section>`;
}
function openGrownups(): void {
  openDialog(
    `<div class="settings-page grownups">${closeButton}<div class="eyebrow">BEHIND THE ADVENTURE</div><h2 id="dialog-title">A small creator.<br>A big imagination.</h2><p>Created by Sophia, age 7, with AI and help from her mom.</p><p>Sophia supplies the idea and creative direction. Amy, Cora, and AI help turn those ideas into a game through research, building, testing, and revision.</p><h3>About this first expedition</h3><p>Meet the Zebra is a playable prototype: one animal, three questions, an in-game photograph, and a field-book page. Its zebra model was supplied by Amy. The habitat and the backup zebra are original procedural art. The anatomy and movements are still being refined.</p>${modelCredits()}<h3>Saved on this browser</h3><p>Photographs and progress stay in this browser’s storage. There are no accounts, real-world camera access, ads, or analytics in this build. Clearing browser data will clear your field book. Read-aloud uses an available local device voice.</p><h3>Our field references</h3><p>Animal facts are checked against the sources below. Specialist review and child playtesting are still needed before a public release.</p><ul>${zebra.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join("")}</ul><h3>A fresh notebook</h3><p>Starting over removes this browser’s zebra discovery and photo.</p><button class="soft" id="reset-confirm">Start a new field book…</button></div>`,
  );
  button("reset-confirm", () => {
    $("reset-confirm").outerHTML =
      `<div class="reset-confirm"><p><strong>Erase your saved photo and discovery?</strong> This cannot be undone.</p><button class="danger" id="reset-now">Erase and start again</button><button class="soft" id="keep-book">Keep my field book</button></div>`;
    button("keep-book", () => {
      closeDialog();
      openGrownups();
    });
    button("reset-now", async () => {
      const resetButton = $<HTMLButtonElement>("reset-now");
      resetButton.disabled = true;
      resetButton.textContent = "Starting a fresh field book…";
      const previous = progress;
      const wasBlocked = saveBlocked;
      saveBlocked = false;
      progress = resetProgress(progress);
      if (!(await persist())) {
        progress = previous;
        saveBlocked = wasBlocked;
        resetButton.disabled = false;
        resetButton.textContent = "Try erasing again";
        const error = document.createElement("p");
        error.setAttribute("role", "alert");
        error.textContent =
          "This browser could not erase the saved field book. Your previous discovery is still here.";
        resetButton.parentElement?.append(error);
        return;
      }
      updateCount();
      mode = "explore";
      world?.setPhotoMode(false);
      closeDialog();
      // Reset may finish after the dialog was already dismissed during saving.
      world?.setActive(started && !dialog.open && !document.hidden);
      $("notice").classList.add("hidden");
      $("photo-overlay").classList.add("hidden");
      if (started) $("mission").classList.remove("hidden");
      renderMission(true);
    });
    $("reset-now").focus();
  });
}
function start(): void {
  if (worldFailed || !world) return;
  started = true;
  $("welcome").classList.add("hidden");
  $("location-tag").classList.add("hidden");
  $("mission").classList.remove("hidden");
  $("touch-controls").classList.remove("hidden");
  app.classList.add("playing");
  $("control-hint").innerHTML =
    "<span><kbd>W A S D</kbd> / arrow keys to walk</span><span>Drag to look around</span>";
  world.setActive(true);
  renderMission(true);
  speak(
    progress.encounterCompleted
      ? "Welcome back to the savanna. Your field book is waiting."
      : "Welcome, explorer. Follow the path to your striped neighbor, or choose Guide me to the zebra.",
  );
}
button("start-button", start);
button("book-button", openBook);
button("settings-button", openSettings);
button("grownups-button", openGrownups);
button("leave-photo", leavePhoto);
button("shutter", async () => {
  if (photoSaving) return;
  const data = world?.capture();
  if (!data) {
    notice("Let’s find a clearer view first. Give the zebra a little space.");
    return;
  }
  photoSaving = true;
  $<HTMLButtonElement>("shutter").disabled = true;
  $("shutter").textContent = "Keeping your photo…";
  try {
    progress = recordPhoto(progress, data);
    await persist();
    updateCount();
    leavePhoto();
    openBook();
  } catch {
    notice("That photo did not save. Please try taking it again.");
  } finally {
    photoSaving = false;
    $("shutter").innerHTML = `${icon("camera")} Take photo`;
  }
});
$("zoom").addEventListener("input", () =>
  world?.setZoom(Number($<HTMLInputElement>("zoom").value)),
);
document.querySelector(".brand")!.addEventListener("click", (e) => {
  e.preventDefault();
  if (started) {
    if (mode === "photo") leavePhoto();
    else {
      mode = "explore";
      world?.setActive(true);
      renderMission(true);
    }
  }
});
document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((el) => {
  const direction = el.dataset.move as
    "forward" | "backward" | "left" | "right";
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    world?.setMovement(direction, true);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((event) =>
    el.addEventListener(event, () => world?.setMovement(direction, false)),
  );
});
window.addEventListener("blur", () => stopNarration());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopNarration();
    world?.setActive(false);
  } else world?.setActive(started && mode !== "quiz" && !dialog.open);
});

async function init(): Promise<void> {
  const startupControls = [
    "start-button",
    "book-button",
    "settings-button",
    "grownups-button",
  ];
  startupControls.forEach((id) => {
    $<HTMLButtonElement>(id).disabled = true;
  });
  try {
    assertValidContent();
  } catch {
    notice(
      "The expedition’s field notes could not be loaded. Please refresh to try again.",
    );
    return;
  }
  try {
    progress = (await loadProgress()) ?? newProgress();
  } catch {
    saveBlocked = true;
    notice(
      "Your saved field book could not be opened, so it has been left untouched. You can explore temporarily, or start a new field book in For grown-ups.",
    );
  }
  startupControls
    .filter((id) => id !== "start-button")
    .forEach((id) => {
      $<HTMLButtonElement>(id).disabled = false;
    });
  setNarrationVolume(progress.settings.volume);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches)
    progress.settings.reducedMotion = true;
  document.documentElement.classList.toggle(
    "reduce-motion",
    progress.settings.reducedMotion,
  );
  updateCount();
  if (progress.encounterCompleted || progress.quiz.questionIndex > 0)
    $("start-button").innerHTML = `Continue exploring ${icon("arrow")}`;
  try {
    world = createWorld($("world"), {
      ...progress.settings,
      onStatus: handleStatus,
      onError: (message) => {
        worldFailed = true;
        notice(message);
        $<HTMLButtonElement>("start-button").disabled = true;
      },
    });
    world.setActive(false);
    if (!worldFailed) $<HTMLButtonElement>("start-button").disabled = false;
  } catch {
    worldFailed = true;
    notice(
      "This adventure needs 3D graphics. Try a browser with WebGL enabled, or another device. Your saved field book is still available.",
    );
  }
}
void init();
