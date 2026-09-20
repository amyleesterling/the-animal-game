import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readVoicePack } from "../../src/accessibility/voice-pack";

const catalog = [
  { id: "welcome", text: "Welcome, explorer." },
  { id: "question", text: "What can you see?" },
];
const hash = "a".repeat(64);
const completePack = () => ({
  version: 1,
  voice: "en-TZ-ElimuNeural",
  locale: "en-TZ",
  generatedAt: "2026-09-20T20:00:00.000Z",
  clips: catalog.map((clip) => ({
    ...clip,
    path: `audio/elimu/${clip.id}-${hash.slice(0, 12)}.mp3`,
    sha256: hash,
  })),
});
const fixture = vi.hoisted(() => ({ manifest: {} as unknown }));
vi.mock("../../src/content/narration-manifest.json", () => ({
  get default() {
    return fixture.manifest;
  },
}));
vi.mock("../../src/content/narration", () => ({
  narrationClips: [
    { id: "welcome", text: "Welcome, explorer." },
    { id: "question", text: "What can you see?" },
  ],
}));

class FakeAudio {
  static instances: FakeAudio[] = [];
  static nextPlay: (() => Promise<void>) | undefined;
  src = "";
  preload = "";
  volume = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  play = vi.fn(FakeAudio.nextPlay ?? (() => Promise.resolve()));
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn((name: string) => {
    if (name === "src") this.src = "";
  });
  constructor() {
    FakeAudio.instances.push(this);
    FakeAudio.nextPlay = undefined;
  }
}

describe("recorded voice pack validation", () => {
  it("accepts only complete recordings of the current authored text", () => {
    expect(readVoicePack(completePack(), catalog).status).toBe("ready");
    const stale = completePack();
    stale.clips[0].text = "An older welcome";
    expect(readVoicePack(stale, catalog).status).toBe("invalid");
    const partial = completePack();
    partial.clips.pop();
    expect(readVoicePack(partial, catalog).status).toBe("invalid");
  });

  it("rejects external paths, duplicate IDs, and mislabeled voices", () => {
    for (const mutation of [
      (pack: ReturnType<typeof completePack>) => {
        pack.clips[0].path = "https://example.com/recording.mp3";
      },
      (pack: ReturnType<typeof completePack>) => {
        pack.clips[1] = pack.clips[0];
      },
      (pack: ReturnType<typeof completePack>) => {
        pack.voice = "some-other-voice";
      },
    ]) {
      const pack = completePack();
      mutation(pack);
      expect(readVoicePack(pack, catalog).status).toBe("invalid");
    }
  });

  it("distinguishes an explicitly pending pack from incomplete published audio", () => {
    expect(
      readVoicePack(
        { ...completePack(), generatedAt: null, clips: [] },
        catalog,
      ).status,
    ).toBe("pending");
    expect(
      readVoicePack({ ...completePack(), clips: [] }, catalog).status,
    ).toBe("invalid");
  });
});

describe("narration playback", () => {
  let narrator: typeof import("../../src/accessibility/narration");
  const speech = {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: vi.fn(() => []),
  };
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();
    fixture.manifest = completePack();
    FakeAudio.instances = [];
    FakeAudio.nextPlay = undefined;
    vi.stubGlobal("window", { speechSynthesis: speech });
    vi.stubGlobal("Audio", FakeAudio);
    narrator = await import("../../src/accessibility/narration");
  });
  afterEach(() => {
    narrator.stopNarration();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("plays the exact authored recording from the current site subdirectory", () => {
    expect(narrator.narrate(" Welcome,   explorer. ")).toBe(true);
    const audio = FakeAudio.instances[0];
    expect(audio.src).toBe(`./audio/elimu/welcome-${hash.slice(0, 12)}.mp3`);
    expect(audio.play).toHaveBeenCalledOnce();
    expect(speech.speak).not.toHaveBeenCalled();
    expect(narrator.getNarratorDescription()).toContain("Elimu");
  });

  it("updates volume immediately and keeps it within the valid range", () => {
    narrator.narrate(catalog[0].text);
    const audio = FakeAudio.instances[0];
    narrator.setNarrationVolume(0.3);
    expect(audio.volume).toBe(0.3);
    narrator.setNarrationVolume(12);
    expect(audio.volume).toBe(1);
    narrator.setNarrationVolume(-1);
    expect(audio.volume).toBe(0);
    narrator.setNarrationVolume(NaN);
    expect(audio.volume).toBe(0);
  });

  it("cancels old playback without surfacing its late rejection or stopping the next line", async () => {
    let rejectOld!: (error: Error) => void;
    FakeAudio.nextPlay = () =>
      new Promise<void>((_, reject) => {
        rejectOld = reject;
      });
    const onError = vi.fn();
    narrator.narrate(catalog[0].text, onError);
    const old = FakeAudio.instances[0];
    narrator.narrate(catalog[1].text, onError);
    rejectOld(new Error("Aborted old playback"));
    await Promise.resolve();
    expect(old.pause).toHaveBeenCalledOnce();
    expect(old.src).toBe("");
    expect(onError).not.toHaveBeenCalled();
    expect(FakeAudio.instances[1].pause).not.toHaveBeenCalled();
  });

  it("gives a useful browser autoplay message instead of silently switching voice", async () => {
    FakeAudio.nextPlay = () =>
      Promise.reject(new DOMException("Gesture needed", "NotAllowedError"));
    const onError = vi.fn();
    narrator.narrate(catalog[0].text, onError);
    await Promise.resolve();
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("Tap Read aloud"),
    );
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it("reports a failed download once and releases the media source", () => {
    const onError = vi.fn();
    narrator.narrate(catalog[0].text, onError);
    const audio = FakeAudio.instances[0];
    const fail = audio.onerror!;
    fail();
    fail();
    vi.advanceTimersByTime(20_000);
    expect(onError).toHaveBeenCalledOnce();
    expect(audio.src).toBe("");
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it("reports a stalled load but permits long recordings after playback starts", () => {
    const onError = vi.fn();
    narrator.narrate(catalog[0].text, onError);
    vi.advanceTimersByTime(20_000);
    expect(onError).toHaveBeenCalledOnce();
    onError.mockClear();
    narrator.narrate(catalog[1].text, onError);
    FakeAudio.instances[1].onplaying!();
    vi.advanceTimersByTime(120_000);
    expect(onError).not.toHaveBeenCalled();
    FakeAudio.instances[1].onended!();
    expect(FakeAudio.instances[1].pause).toHaveBeenCalledOnce();
  });

  it("does not guess a different voice for unknown text or an invalid pack", async () => {
    expect(narrator.narrate("Unrecorded text")).toBe(false);
    expect(FakeAudio.instances).toHaveLength(0);
    expect(speech.speak).not.toHaveBeenCalled();
    fixture.manifest = { ...completePack(), clips: [] };
    vi.resetModules();
    narrator = await import("../../src/accessibility/narration");
    expect(narrator.narrate(catalog[0].text)).toBe(false);
    expect(narrator.getNarratorDescription()).not.toContain("Elimu");
  });
});
