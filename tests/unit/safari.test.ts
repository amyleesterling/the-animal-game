import { afterEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { safariStops, safariStoryStops } from "../../src/content/safari";
import {
  answerSafari,
  createSafariStore,
  currentSafariQuestion,
  discoveredCount,
  encounterStop,
  identifySafari,
  isSafariProgress,
  isStopUnlocked,
  learnSafariClue,
  newSafari,
  nextSafariStop,
  photographSafari,
  retrySafariAnswer,
  safariQuizProgress,
  safariStoryComplete,
  SAFARI_KEY,
  SAFARI_STORE,
  visitStop,
} from "../../src/state/safari";
import { createSaveStore } from "../../src/state/save";
import { newProgress } from "../../src/state/progress";
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/ZAAAAABJRU5ErkJggg==";
const NOW = "2026-09-20T18:00:00.000Z";
function identifyCurrent(p: ReturnType<typeof newSafari>) {
  return identifySafari(p, "", true);
}
function finishCurrent(p: ReturnType<typeof newSafari>) {
  p = identifyCurrent(p);
  while (!p.entries[p.currentStopId].learned)
    p = learnSafariClue(answerSafari(p, currentSafariQuestion(p).correctId));
  return photographSafari(p, PHOTO, NOW);
}
/** Seven-stop snapshots contain no new quiz fields; v1 also predates identification. */
function legacySnapshot(p: ReturnType<typeof newSafari>, version: 1 | 2 = 1) {
  return {
    ...structuredClone(p),
    schemaVersion: version,
    entries: Object.fromEntries(
      safariStoryStops.map(({ id }) => {
        const {
          questionIndex: _index,
          quizAnswers: _answers,
          identification,
          ...legacy
        } = structuredClone(p.entries[id]);
        return [id, version === 1 ? legacy : { ...legacy, identification }];
      }),
    ),
  };
}
async function rawPut(factory: IDBFactory, name: string, value: unknown) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = factory.open(name, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(SAFARI_STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SAFARI_STORE, "readwrite");
    tx.objectStore(SAFARI_STORE).put(value, SAFARI_KEY);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}
async function rawRead(factory: IDBFactory, name: string): Promise<unknown> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(name, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAFARI_STORE, "readonly");
    const request = tx.objectStore(SAFARI_STORE).get(SAFARI_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("seven-stop story content and progression", () => {
  it("contains only the seven accepted animals with present assets, cited facts and usable questions", () => {
    expect(safariStoryStops.map((s) => s.id)).toEqual([
      "plains-zebra",
      "african-elephant",
      "giraffe",
      "common-warthog",
      "thomsons-gazelle",
      "cheetah",
      "spotted-hyena",
    ]);
    expect(new Set(safariStoryStops.map((s) => s.id)).size).toBe(7);
    expect(safariStops.slice(0, 7)).toEqual(safariStoryStops);
    for (const s of safariStoryStops) {
      expect(existsSync(resolve("public", s.modelPath.slice(1)))).toBe(true);
      expect(s.height).toBeGreaterThan(0);
      expect(s.position.every(Number.isFinite)).toBe(true);
      expect(s.story.length).toBeGreaterThan(30);
      expect(s.facts.length).toBeGreaterThan(0);
      expect(s.question.choices).toHaveLength(3);
      expect(new Set(s.question.choices.map((c) => c.id)).size).toBe(3);
      expect(
        s.question.choices.some((c) => c.id === s.question.correctId),
      ).toBe(true);
      expect(s.sources.length).toBeGreaterThan(0);
      expect(
        s.sources.every((source) => new URL(source.url).protocol === "https:"),
      ).toBe(true);
    }
  });
  it("gates each photograph on an acknowledged answer and an actual image", () => {
    let p = newSafari();
    expect(isSafariProgress(p)).toBe(true);
    expect(() => answerSafari(p, "grass")).toThrow();
    p = visitStop(p, "plains-zebra");
    expect(() => visitStop(p, "african-elephant")).toThrow();
    expect(() => learnSafariClue(p)).toThrow();
    expect(() => photographSafari(p, PHOTO)).toThrow();
    expect(() => answerSafari(p, "fish")).toThrow("Name this animal first");
    p = identifyCurrent(p);
    p = answerSafari(p, "fish");
    expect(() => answerSafari(p, "grass")).toThrow();
    expect(isSafariProgress(p)).toBe(true);
    const retry = retrySafariAnswer(p);
    expect(retry.entries["plains-zebra"].attempts).toBe(1);
    expect(retry.entries["plains-zebra"].answer).toBeNull();
    p = learnSafariClue(p); // Understanding can continue after kind feedback, even on a wrong answer.
    expect(() =>
      photographSafari(p, "https://example.com/photo.png"),
    ).toThrow();
    p = photographSafari(p, PHOTO, NOW);
    expect(isStopUnlocked(p, "african-elephant")).toBe(true);
    expect(isSafariProgress(p)).toBe(true);
  });
  it("finishes all seven stops, permits revisits and keeps the completion date", () => {
    let p = newSafari();
    for (const s of safariStoryStops) {
      p = identifyCurrent(visitStop(p, s.id));
      p = photographSafari(
        learnSafariClue(answerSafari(p, s.question.correctId)),
        PHOTO,
        NOW,
      );
      expect(isSafariProgress(p)).toBe(true);
    }
    expect(discoveredCount(p)).toBe(7);
    expect(safariStoryComplete(p)).toBe(true);
    expect(nextSafariStop(p)?.id).toBe(safariStops[7].id);
    expect(p.completedAt).toBe(NOW);
    p = visitStop(p, "plains-zebra");
    expect(p.entries["plains-zebra"].visits).toBe(2);
    expect(photographSafari(p, PHOTO).completedAt).toBe(NOW);
    expect(discoveredCount(p)).toBe(7);
  });
  it("keeps a valid typed identification and makes help explicit", () => {
    const initial = newSafari();
    expect(() => identifySafari(initial, "zebra")).toThrow("Come closer");
    const visited = encounterStop(initial, "plains-zebra");
    expect(() => identifySafari(visited, "giraffe")).toThrow(
      "Take another look",
    );
    expect(visited.entries["plains-zebra"].identification).toBeNull();
    const named = identifySafari(visited, "  ZEBRAS!  ");
    expect(named.entries["plains-zebra"].identification).toEqual({
      name: "ZEBRAS!",
      skipped: false,
    });
    expect(identifySafari(named, "something else", true)).toBe(named);
    expect(isSafariProgress(named)).toBe(true);
    const elephant = identifyCurrent(encounterStop(named, "african-elephant"));
    expect(elephant.entries["african-elephant"].identification).toEqual({
      name: "African savanna elephant",
      skipped: true,
    });
    expect(elephant.entries["plains-zebra"]).toEqual(
      named.entries["plains-zebra"],
    );
  });
  it("supports an elephant-first encounter, visited route jumps and all seven discoveries", () => {
    let p = newSafari();
    expect(() => visitStop(p, "african-elephant")).toThrow();
    expect(() => encounterStop(p, "imaginary-dragon")).toThrow();
    p = finishCurrent(encounterStop(p, "african-elephant"));
    expect(isSafariProgress(p)).toBe(true);
    expect(discoveredCount(p)).toBe(1);
    expect(p.completedAt).toBeNull();
    expect(isStopUnlocked(p, "african-elephant")).toBe(true);
    expect(isStopUnlocked(p, "giraffe")).toBe(false);
    expect(nextSafariStop(p)?.id).toBe("plains-zebra");
    p = visitStop(p, "african-elephant");
    expect(p.entries["african-elephant"].visits).toBe(2);
    for (let next = nextSafariStop(p); next; next = nextSafariStop(p)) {
      expect(isStopUnlocked(p, next.id)).toBe(true);
      p = finishCurrent(visitStop(p, next.id));
      expect(isSafariProgress(p)).toBe(true);
    }
    expect(discoveredCount(p)).toBe(safariStops.length);
    expect(p.completedAt).toBe(NOW);
  });
  it("allows several encounters without erasing partial names, quiz feedback or photos", () => {
    let p = identifySafari(
      encounterStop(newSafari(), "spotted-hyena"),
      "hyaena",
    );
    p = answerSafari(p, "grass");
    const before = structuredClone(p.entries["spotted-hyena"]);
    p = finishCurrent(encounterStop(p, "cheetah"));
    p = encounterStop(p, "giraffe");
    expect(isStopUnlocked(p, "giraffe")).toBe(true);
    expect(isStopUnlocked(p, "spotted-hyena")).toBe(true);
    expect(isSafariProgress(p)).toBe(true);
    p = visitStop(p, "spotted-hyena");
    expect(p.entries["spotted-hyena"]).toEqual({
      ...before,
      visits: before.visits + 1,
    });
    expect(p.entries["cheetah"].photo?.dataUrl).toBe(PHOTO);
  });
  it("rejects forged unlocks, invalid dates, missing entries and unsafe settings", () => {
    const p = newSafari();
    for (const mutate of [
      (v: typeof p) => {
        v.currentStopId = "giraffe";
      },
      (v: typeof p) => {
        v.entries["giraffe"].visits = 1;
      },
      (v: typeof p) => {
        v.entries["plains-zebra"].learned = true;
      },
      (v: typeof p) => {
        v.entries["plains-zebra"].photo = { dataUrl: PHOTO, capturedAt: NOW };
      },
      (v: typeof p) => {
        delete v.entries["cheetah"];
      },
      (v: typeof p) => {
        v.settings.volume = NaN;
      },
      (v: typeof p) => {
        v.completedAt = NOW;
      },
      (v: typeof p) => {
        v.entries["plains-zebra"].identification = {
          name: "zebra",
          skipped: false,
        };
      },
    ]) {
      const bad = structuredClone(p);
      mutate(bad);
      expect(isSafariProgress(bad)).toBe(false);
    }
  });
  it("rejects mismatched names, fabricated skip names, answers before naming and invalid photos", () => {
    const p = finishCurrent(encounterStop(newSafari(), "african-elephant"));
    for (const mutate of [
      (v: typeof p) => {
        v.entries["african-elephant"].identification = null;
      },
      (v: typeof p) => {
        v.entries["african-elephant"].identification = {
          name: "giraffe",
          skipped: false,
        };
      },
      (v: typeof p) => {
        v.entries["african-elephant"].identification = {
          name: "elephant",
          skipped: true,
        };
      },
      (v: typeof p) => {
        v.entries["african-elephant"].visits = 0;
      },
      (v: typeof p) => {
        v.entries["african-elephant"].attempts = 0;
      },
      (v: typeof p) => {
        v.entries["african-elephant"].photo!.capturedAt = "yesterday";
      },
      (v: typeof p) => {
        v.entries["african-elephant"].photo!.dataUrl =
          "https://example.com/elephant.jpg";
      },
      (v: typeof p) => {
        v.completedAt = NOW;
      },
    ]) {
      const bad = structuredClone(p);
      mutate(bad);
      expect(isSafariProgress(bad)).toBe(false);
    }
  });
});

describe("three-question discoveries", () => {
  const id = "secretarybird";
  it("offers all bonus stops without unlocking unfinished story stops", () => {
    const p = newSafari();
    expect(safariStops).toHaveLength(32);
    expect(Object.keys(p.entries)).toHaveLength(32);
    for (const stop of safariStops.slice(7)) {
      expect(isStopUnlocked(p, stop.id)).toBe(true);
      expect(p.entries[stop.id].quizAnswers).toEqual([null, null, null]);
      expect(safariQuizProgress(p, stop.id)).toEqual({
        index: 0,
        number: 1,
        total: 3,
        complete: false,
      });
    }
    expect(isStopUnlocked(p, "african-elephant")).toBe(false);
    expect(isStopUnlocked(p, "not-a-species")).toBe(false);
    const bonus = finishCurrent(visitStop(p, id));
    expect(discoveredCount(bonus)).toBe(1);
    expect(safariStoryComplete(bonus)).toBe(false);
    expect(bonus.completedAt).toBeNull();
    expect(nextSafariStop(bonus)?.id).toBe("plains-zebra");
    expect(isStopUnlocked(bonus, "african-elephant")).toBe(false);
  });

  it("persists each question, retries only its active answer and waits for all explanations before a photo", async () => {
    const factory = new IDBFactory();
    const store = createSafariStore(factory, "three-questions");
    let p = identifyCurrent(visitStop(newSafari(), id));
    const original = structuredClone(p);
    const first = currentSafariQuestion(p);
    const wrong = first.choices.find((c) => c.id !== first.correctId)!.id;
    p = answerSafari(p, wrong);
    expect(original.entries[id].quizAnswers).toEqual([null, null, null]);
    expect(p.entries[id].quizAnswers).toEqual([wrong, null, null]);
    expect(() => photographSafari(p, PHOTO)).toThrow();
    await store.save(p);
    p = (await createSafariStore(factory, "three-questions").load())!;
    expect(p.entries[id].answer).toBe(wrong);
    const pending = structuredClone(p);
    p = retrySafariAnswer(p);
    expect(pending.entries[id].quizAnswers[0]).toBe(wrong);
    expect(p.entries[id].quizAnswers).toEqual([null, null, null]);
    expect(p.entries[id].attempts).toBe(1);
    p = learnSafariClue(answerSafari(p, first.correctId));
    expect(p.entries[id].answer).toBeNull();
    expect(p.entries[id].quizAnswers).toEqual([first.correctId, null, null]);
    expect(safariQuizProgress(p)).toEqual({
      index: 1,
      number: 2,
      total: 3,
      complete: false,
    });
    expect(() => learnSafariClue(p)).toThrow();
    expect(() => photographSafari(p, PHOTO)).toThrow();
    await store.save(p);
    p = (await createSafariStore(factory, "three-questions").load())!;
    expect(currentSafariQuestion(p)).toEqual(
      safariStops.find((s) => s.id === id)!.profile!.questions[1],
    );
    const second = currentSafariQuestion(p);
    const secondWrong = second.choices.find(
      (c) => c.id !== second.correctId,
    )!.id;
    p = answerSafari(p, secondWrong);
    await store.save(p);
    p = (await store.load())!;
    const retry = retrySafariAnswer(p);
    expect(retry.entries[id].quizAnswers).toEqual([
      first.correctId,
      null,
      null,
    ]);
    expect(retry.entries[id].questionIndex).toBe(1);
    expect(retry.entries[id].attempts).toBe(3);
    // A wrong answer can continue after its explanation, matching the original story.
    p = learnSafariClue(p);
    expect(p.entries[id].quizAnswers).toEqual([
      first.correctId,
      secondWrong,
      null,
    ]);
    expect(safariQuizProgress(p).number).toBe(3);
    expect(p.entries[id].learned).toBe(false);
    const final = currentSafariQuestion(p);
    p = answerSafari(p, final.correctId);
    await store.save(p);
    p = (await store.load())!;
    expect(() => photographSafari(p, PHOTO)).toThrow();
    p = learnSafariClue(p);
    expect(safariQuizProgress(p)).toEqual({
      index: 2,
      number: 3,
      total: 3,
      complete: true,
    });
    expect(p.entries[id].quizAnswers).toEqual([
      first.correctId,
      secondWrong,
      final.correctId,
    ]);
    expect(p.entries[id].attempts).toBe(4);
    expect(retrySafariAnswer(p)).toBe(p);
    expect(learnSafariClue(p)).toBe(p);
    expect(() => answerSafari(p, final.correctId)).toThrow();
    p = photographSafari(p, PHOTO, NOW);
    await store.save(p);
    expect(await store.load()).toEqual(p);
    expect(p.completedAt).toBeNull();
    expect(isSafariProgress(p)).toBe(true);
  });

  it("keeps bonus quiz state when another animal is visited and preserves the story completion date", () => {
    let p = identifyCurrent(visitStop(newSafari(), id));
    p = learnSafariClue(answerSafari(p, currentSafariQuestion(p).correctId));
    const partial = structuredClone(p.entries[id]);
    for (const stop of safariStoryStops)
      p = finishCurrent(visitStop(p, stop.id));
    expect(discoveredCount(p)).toBe(7);
    expect(safariStoryComplete(p)).toBe(true);
    expect(p.completedAt).toBe(NOW);
    p = visitStop(p, id);
    expect(p.entries[id]).toEqual({ ...partial, visits: partial.visits + 1 });
    while (!p.entries[id].learned)
      p = learnSafariClue(answerSafari(p, currentSafariQuestion(p).correctId));
    p = photographSafari(p, PHOTO, "2026-09-21T12:00:00.000Z");
    expect(discoveredCount(p)).toBe(8);
    expect(p.completedAt).toBe(NOW);
    expect(isSafariProgress(p)).toBe(true);
  });

  it("rejects skipped, forged, mismatched or incomplete quiz history", () => {
    let p = identifyCurrent(visitStop(newSafari(), id));
    const questions = safariStops.find((stop) => stop.id === id)!.profile!
      .questions;
    p = learnSafariClue(answerSafari(p, questions[0].correctId));
    for (const mutate of [
      (v: typeof p) => {
        v.entries[id].questionIndex = -1;
      },
      (v: typeof p) => {
        v.entries[id].questionIndex = 3;
      },
      (v: typeof p) => {
        v.entries[id].questionIndex = 1.5;
      },
      (v: typeof p) => {
        v.entries[id].quizAnswers = [questions[0].correctId];
      },
      (v: typeof p) => {
        v.entries[id].quizAnswers[0] = null;
      },
      (v: typeof p) => {
        v.entries[id].quizAnswers[0] = "forged";
      },
      (v: typeof p) => {
        v.entries[id].quizAnswers[1] = questions[1].correctId;
      },
      (v: typeof p) => {
        v.entries[id].answer = questions[1].correctId;
      },
      (v: typeof p) => {
        v.entries[id].quizAnswers[2] = questions[2].correctId;
      },
      (v: typeof p) => {
        v.entries[id].attempts = 0;
      },
      (v: typeof p) => {
        v.entries[id].identification = null;
      },
      (v: typeof p) => {
        v.entries[id].learned = true;
      },
      (v: typeof p) => {
        v.entries[id].photo = { dataUrl: PHOTO, capturedAt: NOW };
      },
      (v: typeof p) => {
        v.completedAt = NOW;
      },
    ]) {
      const bad = structuredClone(p);
      mutate(bad);
      expect(isSafariProgress(bad)).toBe(false);
    }
    expect(isSafariProgress(p)).toBe(true);
  });
});

describe("story IndexedDB saves", () => {
  it.each(["new", "named", "answer", "retry", "learned", "complete"] as const)(
    "migrates v2 %s state into 32 entries without writing or replaying old discoveries",
    async (stage) => {
      const factory = new IDBFactory();
      const database = `v2-${stage}`;
      let p = newSafari({ volume: 0.35, reducedMotion: true });
      if (stage === "complete") {
        for (const stop of safariStoryStops)
          p = finishCurrent(visitStop(p, stop.id));
        p = visitStop(p, "plains-zebra");
      } else if (stage !== "new") {
        p = identifySafari(encounterStop(p, "spotted-hyena"), "Hyaena!");
        if (stage !== "named") p = answerSafari(p, "fruit");
        if (stage === "retry") p = retrySafariAnswer(p);
        if (stage === "learned") p = learnSafariClue(p);
      }
      const previous = legacySnapshot(p, 2);
      expect(Object.keys(previous.entries)).toHaveLength(7);
      expect(previous.entries["plains-zebra"]).not.toHaveProperty(
        "quizAnswers",
      );
      await rawPut(factory, database, previous);
      const store = createSafariStore(factory, database);
      const migrated = (await store.load())!;
      expect(migrated).toEqual(p);
      expect(migrated.schemaVersion).toBe(3);
      expect(Object.keys(migrated.entries)).toHaveLength(32);
      expect(migrated.entries.secretarybird.quizAnswers).toEqual([
        null,
        null,
        null,
      ]);
      expect(await rawRead(factory, database)).toEqual(previous);
      if (stage === "complete") {
        expect(safariStoryComplete(migrated)).toBe(true);
        expect(migrated.completedAt).toBe(NOW);
        expect(() => answerSafari(migrated, "grass")).toThrow();
        expect(photographSafari(migrated, PHOTO).completedAt).toBe(NOW);
      }
      await store.save(migrated);
      expect(await rawRead(factory, database)).toEqual(migrated);
    },
  );

  it.each([1, 2] as const)(
    "rejects a malformed v%d roster rather than silently adding defaults",
    async (version) => {
      const factory = new IDBFactory();
      const malformed = legacySnapshot(newSafari(), version);
      delete malformed.entries.giraffe;
      malformed.entries.secretarybird = structuredClone(
        malformed.entries["plains-zebra"],
      );
      await rawPut(factory, `roster-${version}`, malformed);
      const store = createSafariStore(factory, `roster-${version}`);
      await expect(store.load()).rejects.toMatchObject({ code: "corrupt" });
      await expect(store.save(newSafari())).rejects.toMatchObject({
        code: "read-failed",
      });
      expect(await rawRead(factory, `roster-${version}`)).toEqual(malformed);
    },
  );

  it("protects invalid v3 quiz history instead of resetting it", async () => {
    const factory = new IDBFactory();
    const corrupt = newSafari();
    corrupt.entries.secretarybird.questionIndex = 2;
    await rawPut(factory, "bad-quiz", corrupt);
    const store = createSafariStore(factory, "bad-quiz");
    await expect(store.load()).rejects.toMatchObject({ code: "corrupt" });
    await expect(store.save(newSafari())).rejects.toMatchObject({
      code: "read-failed",
    });
    expect(await rawRead(factory, "bad-quiz")).toEqual(corrupt);
  });

  it("resumes an off-route name, wrong answer and another animal’s photograph", async () => {
    const factory = new IDBFactory();
    const store = createSafariStore(factory, "off-route");
    let p = finishCurrent(
      encounterStop(
        newSafari({ volume: 0.4, reducedMotion: true }),
        "african-elephant",
      ),
    );
    p = identifySafari(encounterStop(p, "spotted-hyena"), "  Hyaena! ");
    p = answerSafari(p, "fruit");
    await store.save(p);
    const resumed = await createSafariStore(factory, "off-route").load();
    expect(resumed).toEqual(p);
    expect(resumed?.entries["spotted-hyena"].identification).toEqual({
      name: "Hyaena!",
      skipped: false,
    });
    expect(resumed?.entries["african-elephant"].photo?.dataUrl).toBe(PHOTO);
    expect(resumed?.currentStopId).toBe("spotted-hyena");
    expect(nextSafariStop(resumed!)?.id).toBe("plains-zebra");
  });
  it("migrates a strict v1 photograph and pending answer, and only writes v3 on a normal save", async () => {
    const factory = new IDBFactory();
    let p = finishCurrent(
      visitStop(newSafari({ volume: 0.35, lowQuality: true }), "plains-zebra"),
    );
    p = answerSafari(identifyCurrent(visitStop(p, "african-elephant")), "ears");
    const legacy = legacySnapshot(p);
    await rawPut(factory, "legacy", legacy);
    const store = createSafariStore(factory, "legacy");
    const migrated = (await store.load())!;
    expect(migrated.schemaVersion).toBe(3);
    expect(isSafariProgress(migrated)).toBe(true);
    expect(legacySnapshot(migrated)).toEqual(legacy);
    expect(migrated.entries["plains-zebra"].identification).toEqual({
      name: "Plains zebra",
      skipped: true,
    });
    expect(migrated.entries["african-elephant"].identification).toEqual({
      name: "African savanna elephant",
      skipped: true,
    });
    expect(migrated.entries.giraffe.identification).toBeNull();
    expect(await rawRead(factory, "legacy")).toEqual(legacy);
    await store.save(migrated);
    expect(await rawRead(factory, "legacy")).toEqual(migrated);
    expect(await createSafariStore(factory, "legacy").load()).toEqual(migrated);
  });
  it("migrates a v1 retry without inventing an identification and preserves its attempts", async () => {
    const factory = new IDBFactory();
    const p = retrySafariAnswer(
      answerSafari(
        identifyCurrent(visitStop(newSafari(), "plains-zebra")),
        "fish",
      ),
    );
    await rawPut(factory, "legacy-retry", legacySnapshot(p));
    const migrated = (await createSafariStore(factory, "legacy-retry").load())!;
    expect(migrated.entries["plains-zebra"].identification).toBeNull();
    expect(migrated.entries["plains-zebra"].attempts).toBe(1);
    expect(isSafariProgress(migrated)).toBe(true);
    expect(() => answerSafari(migrated, "grass")).toThrow(
      "Name this animal first",
    );
    const next = answerSafari(identifySafari(migrated, "zebra"), "grass");
    expect(next.entries["plains-zebra"].attempts).toBe(2);
  });
  it("migrates both a never-started v1 save and a complete revisited field book", async () => {
    const factory = new IDBFactory();
    await rawPut(factory, "legacy-new", legacySnapshot(newSafari()));
    expect(await createSafariStore(factory, "legacy-new").load()).toEqual(
      newSafari(),
    );
    let p = newSafari();
    for (const stop of safariStoryStops)
      p = finishCurrent(visitStop(p, stop.id));
    p = visitStop(p, "plains-zebra");
    await rawPut(factory, "legacy-complete", legacySnapshot(p));
    const migrated = (await createSafariStore(
      factory,
      "legacy-complete",
    ).load())!;
    expect(legacySnapshot(migrated)).toEqual(legacySnapshot(p));
    expect(discoveredCount(migrated)).toBe(7);
    expect(migrated.completedAt).toBe(NOW);
    expect(migrated.entries["plains-zebra"].visits).toBe(2);
    expect(nextSafariStop(migrated)?.id).toBe(safariStops[7].id);
  });
  it("does not migrate an old out-of-order save that only the new schema would allow", async () => {
    const factory = new IDBFactory();
    const p = finishCurrent(encounterStop(newSafari(), "african-elephant"));
    expect(isSafariProgress(p)).toBe(true);
    const legacy = legacySnapshot(p);
    await rawPut(factory, "legacy-corrupt", legacy);
    const store = createSafariStore(factory, "legacy-corrupt");
    await expect(store.load()).rejects.toMatchObject({ code: "corrupt" });
    await expect(store.save(newSafari())).rejects.toMatchObject({
      code: "read-failed",
    });
    expect(await rawRead(factory, "legacy-corrupt")).toEqual(legacy);
  });
  it("preserves invalid v2 identifications rather than silently resetting them", async () => {
    const factory = new IDBFactory();
    const bad = finishCurrent(encounterStop(newSafari(), "african-elephant"));
    bad.entries["african-elephant"].identification!.name = "Giraffe";
    const previous = legacySnapshot(bad, 2);
    await rawPut(factory, "bad-name", previous);
    const store = createSafariStore(factory, "bad-name");
    await expect(store.load()).rejects.toMatchObject({ code: "corrupt" });
    await expect(store.save(newSafari())).rejects.toMatchObject({
      code: "read-failed",
    });
    expect(await rawRead(factory, "bad-name")).toEqual(previous);
  });
  it("resumes feedback, photos, current stop and settings without modifying the classic save", async () => {
    const factory = new IDBFactory();
    const classic = createSaveStore(factory);
    const original = newProgress({ volume: 0.35 });
    await classic.save(original);
    const store = createSafariStore(factory);
    let p = answerSafari(
      identifyCurrent(
        visitStop(newSafari({ reducedMotion: true }), "plains-zebra"),
      ),
      "fish",
    );
    await store.save(p);
    expect(await createSafariStore(factory).load()).toEqual(p);
    p = visitStop(
      photographSafari(learnSafariClue(p), PHOTO, NOW),
      "african-elephant",
    );
    await store.save(p);
    expect(await createSafariStore(factory).load()).toEqual(p);
    expect(await classic.load()).toEqual(original);
  });
  it("protects a corrupt read against automatic saves until explicit replacement", async () => {
    const factory = new IDBFactory();
    await rawPut(factory, "bad", { schemaVersion: 1, entries: {} });
    const store = createSafariStore(factory, "bad");
    await expect(store.load()).rejects.toMatchObject({ code: "corrupt" });
    await expect(store.save(newSafari())).rejects.toMatchObject({
      code: "read-failed",
    });
    await expect(
      createSafariStore(factory, "bad").load(),
    ).rejects.toMatchObject({ code: "corrupt" });
    await store.replace(newSafari());
    expect(await store.load()).toEqual(newSafari());
  });
  it("preserves newer schemas and database versions", async () => {
    const factory = new IDBFactory();
    const future = {
      ...newSafari(),
      schemaVersion: 4,
    };
    await rawPut(factory, "future-schema", future);
    const futureStore = createSafariStore(factory, "future-schema");
    await expect(futureStore.load()).rejects.toMatchObject({
      code: "unsupported-version",
    });
    await expect(futureStore.save(newSafari())).rejects.toMatchObject({
      code: "read-failed",
    });
    expect(await rawRead(factory, "future-schema")).toEqual(future);
    await new Promise<void>((resolve, reject) => {
      const r = factory.open("future-db", 2);
      r.onsuccess = () => {
        r.result.close();
        resolve();
      };
      r.onerror = () => reject(r.error);
    });
    await expect(
      createSafariStore(factory, "future-db").load(),
    ).rejects.toMatchObject({ code: "unsupported-version" });
  });
  it("reports unavailable storage and preserves the previous save on quota failure", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(createSafariStore().load()).rejects.toMatchObject({
      code: "unavailable",
    });
    const store = createSafariStore(new IDBFactory(), "quota");
    await store.save(newSafari());
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementationOnce(() => {
        throw new DOMException("Full", "QuotaExceededError");
      });
    await expect(store.save(newSafari({ volume: 0.1 }))).rejects.toMatchObject({
      code: "write-failed",
    });
    spy.mockRestore();
    expect((await store.load())?.settings.volume).toBe(0.75);
    await store.save(newSafari({ volume: 0.1 }));
    expect((await store.load())?.settings.volume).toBe(0.1);
  });
  it("protects a save after a read transaction aborts and only resumes writes after a successful retry", async () => {
    const factory = new IDBFactory();
    const store = createSafariStore(factory, "read-abort");
    const original = newSafari({ volume: 0.25 });
    await store.save(original);
    const get = IDBObjectStore.prototype.get;
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "get")
      .mockImplementationOnce(function (
        this: IDBObjectStore,
        key: IDBValidKey | IDBKeyRange,
      ) {
        const request = get.call(this, key);
        request.addEventListener("success", () => this.transaction.abort());
        return request;
      });
    await expect(store.load()).rejects.toMatchObject({ code: "read-failed" });
    spy.mockRestore();
    await expect(store.save(newSafari())).rejects.toMatchObject({
      code: "read-failed",
    });
    expect(await rawRead(factory, "read-abort")).toEqual(original);
    expect(await store.load()).toEqual(original);
    await store.save(newSafari({ volume: 0.6 }));
    expect((await store.load())?.settings.volume).toBe(0.6);
  });
  it("snapshots queued writes and waits for transaction commit", async () => {
    const store = createSafariStore(new IDBFactory(), "commit");
    const p = newSafari();
    const first = store.save(p);
    p.settings.volume = 0.1;
    await first;
    expect((await store.load())?.settings.volume).toBe(0.75);
    const put = IDBObjectStore.prototype.put;
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementationOnce(function (
        this: IDBObjectStore,
        value: unknown,
        key?: IDBValidKey,
      ) {
        const request = put.call(this, value, key);
        request.addEventListener("success", () => this.transaction.abort());
        return request;
      });
    await expect(store.save(p)).rejects.toMatchObject({ code: "write-failed" });
    spy.mockRestore();
    expect((await store.load())?.settings.volume).toBe(0.75);
    await Promise.all([store.save(p), store.save(newSafari({ volume: 0.6 }))]);
    expect((await store.load())?.settings.volume).toBe(0.6);
  });
});
