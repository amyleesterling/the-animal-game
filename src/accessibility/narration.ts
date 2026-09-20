import manifest from "../content/narration-manifest.json";
import { narrationClips } from "../content/narration";
import { normalizeNarration, readVoicePack } from "./voice-pack";

const pack = readVoicePack(manifest, narrationClips);
let volume = 0.8;
let active:
  { audio: HTMLAudioElement; timer: ReturnType<typeof setTimeout> } | undefined;
let deviceUtterance: SpeechSynthesisUtterance | undefined;

export function getNarratorDescription(): string {
  if (pack.status === "ready")
    return "Elimu · male Tanzanian English guide. AI-generated recordings.";
  if (pack.status === "invalid")
    return "The guide recordings need an update. All instructions are also written on screen.";
  const voice = deviceVoice();
  return `${voice ? `Device voice: ${voice.name}.` : "Device narration."} The Tanzanian guide recordings are being prepared.`;
}

function deviceVoice(): SpeechSynthesisVoice | undefined {
  if (!("speechSynthesis" in window)) return;
  return window.speechSynthesis
    .getVoices()
    .find((voice) => voice.localService && voice.lang.startsWith("en"));
}

export function stopNarration(): void {
  if (deviceUtterance) {
    deviceUtterance.onerror = deviceUtterance.onend = null;
    deviceUtterance = undefined;
  }
  if (active) {
    const { audio, timer } = active;
    active = undefined;
    clearTimeout(timer);
    audio.onended = audio.onerror = audio.onplaying = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function setNarrationVolume(value: number): void {
  if (!Number.isFinite(value)) return;
  volume = Math.min(1, Math.max(0, value));
  if (active) active.audio.volume = volume;
  if (deviceUtterance) deviceUtterance.volume = volume;
}

/** Returns false only for an immediate unavailable voice; reports async failures once. */
export function narrate(
  text: string,
  onError?: (message: string) => void,
): boolean {
  stopNarration();
  if (pack.status === "ready") {
    const clip = pack.clips.get(normalizeNarration(text));
    if (!clip) return false;
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = volume;
    // Relative to the page, including a GitHub Pages repository subdirectory.
    audio.src = `./${clip.path}`;
    const fail = (message: string) => {
      if (active?.audio !== audio) return;
      stopNarration();
      onError?.(message);
    };
    const timer = setTimeout(
      () =>
        fail(
          "The guide recording is taking too long to load. Try Read aloud again.",
        ),
      20_000,
    );
    active = { audio, timer };
    audio.onplaying = () => {
      if (active?.audio === audio) clearTimeout(timer);
    };
    audio.onended = () => {
      if (active?.audio === audio) stopNarration();
    };
    audio.onerror = () =>
      fail(
        "The guide recording could not load. Try Read aloud again. The words are also on screen.",
      );
    try {
      void audio.play().catch((error: unknown) => {
        fail(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Tap Read aloud to hear your guide. Your browser paused automatic audio."
            : "The guide recording could not play. Try Read aloud again. The words are also on screen.",
        );
      });
    } catch {
      fail("The guide recording could not play. Try Read aloud again.");
    }
    return true;
  }
  // Unconfigured development builds keep the existing accessible local voice.
  // Once recordings exist, playback failures never switch to a different narrator.
  if (pack.status !== "pending") return false;
  const voice = deviceVoice();
  if (!voice) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  deviceUtterance = utterance;
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 1;
  utterance.volume = volume;
  utterance.onend = () => {
    if (deviceUtterance === utterance) deviceUtterance = undefined;
  };
  utterance.onerror = (event) => {
    if (deviceUtterance !== utterance) return;
    deviceUtterance = undefined;
    if (event.error !== "canceled" && event.error !== "interrupted")
      onError?.(
        "The device voice could not play. The words are also on screen.",
      );
  };
  window.speechSynthesis.speak(utterance);
  return true;
}
