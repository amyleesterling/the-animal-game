import { afterEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { safariStops } from "../../src/content/safari";
import {
  answerSafari,
  createSafariStore,
  discoveredCount,
  isSafariProgress,
  isStopUnlocked,
  learnSafariClue,
  newSafari,
  photographSafari,
  retrySafariAnswer,
  SAFARI_KEY,
  SAFARI_STORE,
  visitStop,
} from "../../src/state/safari";
import { createSaveStore } from "../../src/state/save";
import { newProgress } from "../../src/state/progress";
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/ZAAAAABJRU5ErkJggg==";
const NOW = "2026-09-20T18:00:00.000Z";
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
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("seven-stop story content and progression", () => {
  it("contains only the seven accepted animals with present assets, cited facts and usable questions", () => {
    expect(safariStops.map((s) => s.id)).toEqual([
      "plains-zebra",
      "african-elephant",
      "giraffe",
      "common-warthog",
      "thomsons-gazelle",
      "cheetah",
      "spotted-hyena",
    ]);
    expect(new Set(safariStops.map((s) => s.id)).size).toBe(7);
    for (const s of safariStops) {
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
    for (const s of safariStops) {
      p = visitStop(p, s.id);
      p = photographSafari(
        learnSafariClue(answerSafari(p, s.question.correctId)),
        PHOTO,
        NOW,
      );
      expect(isSafariProgress(p)).toBe(true);
    }
    expect(discoveredCount(p)).toBe(7);
    expect(p.completedAt).toBe(NOW);
    p = visitStop(p, "plains-zebra");
    expect(p.entries["plains-zebra"].visits).toBe(2);
    expect(photographSafari(p, PHOTO).completedAt).toBe(NOW);
    expect(discoveredCount(p)).toBe(7);
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
    ]) {
      const bad = structuredClone(p);
      mutate(bad);
      expect(isSafariProgress(bad)).toBe(false);
    }
  });
});

describe("story IndexedDB saves", () => {
  it("resumes feedback, photos, current stop and settings without modifying the classic save", async () => {
    const factory = new IDBFactory();
    const classic = createSaveStore(factory);
    const original = newProgress({ volume: 0.35 });
    await classic.save(original);
    const store = createSafariStore(factory);
    let p = answerSafari(
      visitStop(newSafari({ reducedMotion: true }), "plains-zebra"),
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
    await rawPut(factory, "future-schema", {
      ...newSafari(),
      schemaVersion: 2,
    });
    await expect(
      createSafariStore(factory, "future-schema").load(),
    ).rejects.toMatchObject({ code: "unsupported-version" });
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
