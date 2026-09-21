/**
 * Background music for the safari.
 *
 * "Mazingira Mpya", supplied by Amy as a 48 kHz stereo WAV master. The shipped
 * file is a seamless loop cut from it: the outro fade is removed and the tail
 * is cross faded back into the head, so repeat playback has no gap.
 *
 * Three rules this module keeps:
 *  - Nothing is fetched until music is actually switched on, so a player who
 *    turns it off never pays for the download.
 *  - Playback only ever starts from a real user gesture, which is what browser
 *    autoplay policy requires and what stops sound arriving unasked.
 *  - Speech wins. The game reads itself aloud, so the music ducks whenever
 *    narration is speaking and comes back when it stops.
 *
 * The preference lives in localStorage rather than the IndexedDB save, so this
 * does not force a schemaVersion bump on SafariProgress. Folding it into the
 * save settings later is a content migration, not a rewrite of this file.
 */

const STORAGE_KEY = "sophias-wild-world-music";
const TRACK = "/assets/audio/mazingira-mpya-loop.m4a";

/** Sits under speech and under the scene, never on top of either. */
const FULL_VOLUME = 0.34;
const DUCKED_VOLUME = 0.08;
const FADE_MS = 600;
const DUCK_POLL_MS = 250;

let audio: HTMLAudioElement | null = null;
let duckTimer: number | undefined;
let fadeTimer: number | undefined;
let wantsMusic = readPreference();
let gestureArmed = false;

function readPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    // Private mode and blocked storage both land here; music simply stays on.
    return true;
  }
}

function writePreference(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // A preference we cannot persist is still honoured for this session.
  }
}

export function musicEnabled() {
  return wantsMusic;
}

function fadeTo(target: number) {
  const element = audio;
  if (!element) return;
  window.clearInterval(fadeTimer);
  const from = element.volume;
  const started = performance.now();
  fadeTimer = window.setInterval(() => {
    const t = Math.min(1, (performance.now() - started) / FADE_MS);
    element.volume = from + (target - from) * t;
    if (t === 1) window.clearInterval(fadeTimer);
  }, 40);
}

/**
 * speechSynthesis has no global start or end event, so the only reliable read
 * of "is the game talking right now" is its own speaking flag. Polled only
 * while music is actually playing.
 */
function watchNarration() {
  window.clearInterval(duckTimer);
  let ducked = false;
  duckTimer = window.setInterval(() => {
    if (!audio || audio.paused) return;
    const speaking = Boolean(window.speechSynthesis?.speaking);
    if (speaking === ducked) return;
    ducked = speaking;
    fadeTo(speaking ? DUCKED_VOLUME : FULL_VOLUME);
  }, DUCK_POLL_MS);
}

function ensureAudio() {
  if (audio) return audio;
  audio = new Audio(TRACK);
  audio.loop = true;
  audio.preload = "none";
  audio.volume = 0;
  return audio;
}

/**
 * The observable state of the music, on the body element.
 *
 * Fetching the file proves nothing on its own: setting preload starts the
 * download whether or not playback is then allowed. This flag is only set from
 * the resolved play() promise, so "playing" means audio is actually running.
 */
function markState(state: "playing" | "off" | "blocked") {
  document.body.dataset.music = state;
}

function start() {
  if (!wantsMusic) return;
  const element = ensureAudio();
  element.preload = "auto";
  void element
    .play()
    .then(() => {
      markState("playing");
      fadeTo(FULL_VOLUME);
      watchNarration();
    })
    .catch(() => {
      // Autoplay refused, or the file is missing. Stay silent and wait for the
      // next gesture rather than reporting a failure the player cannot act on.
      markState("blocked");
    });
}

function stop() {
  window.clearInterval(duckTimer);
  window.clearInterval(fadeTimer);
  markState("off");
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0;
}

export function setMusicEnabled(on: boolean) {
  wantsMusic = on;
  writePreference(on);
  if (on) start();
  else stop();
}

/**
 * Arms playback on the first real interaction. Call once at start up; the
 * listeners remove themselves as soon as they have served their purpose.
 */
export function armBackgroundMusic() {
  if (gestureArmed) return;
  gestureArmed = true;
  const begin = () => {
    window.removeEventListener("pointerdown", begin);
    window.removeEventListener("keydown", begin);
    start();
  };
  window.addEventListener("pointerdown", begin, { once: true });
  window.addEventListener("keydown", begin, { once: true });
}
