import { afterEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import {
  createSaveStore,
  SAVE_KEY,
  SAVE_STORE_NAME,
  SaveError,
} from "../../src/state/save";
import {
  continueAfterAnswer,
  newProgress,
  recordPhoto,
  submitAnswer,
} from "../../src/state/progress";
import { zebra } from "../../src/content/species";

const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/ZAAAAABJRU5ErkJggg==";

async function rawPut(
  factory: IDBFactory,
  name: string,
  value: unknown,
): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(name, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(SAVE_STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SAVE_STORE_NAME, "readwrite");
    tx.objectStore(SAVE_STORE_NAME).put(value, SAVE_KEY);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("IndexedDB persistence", () => {
  it("creates an empty v1 store and resumes a pending wrong-answer explanation", async () => {
    const factory = new IDBFactory();
    const firstSession = createSaveStore(factory, "resume");
    expect(await firstSession.load()).toBeNull();
    const question = zebra.quizzes[0];
    const wrong = question.choices.find(
      (choice) => choice.id !== question.correctChoiceId,
    )!;
    const progress = submitAnswer(
      newProgress({ volume: 0.4 }),
      question.id,
      wrong.id,
    ).progress;
    await firstSession.save(progress);
    const nextSession = createSaveStore(factory, "resume");
    expect(await nextSession.load()).toEqual(progress);
    expect(
      continueAfterAnswer((await nextSession.load())!).quiz.questionIndex,
    ).toBe(1);
  });

  it("persists the actual image and settings, then clears only on explicit request", async () => {
    const store = createSaveStore(new IDBFactory(), "photo");
    let progress = newProgress({ lowQuality: true });
    for (const q of zebra.quizzes)
      progress = continueAfterAnswer(
        submitAnswer(progress, q.id, q.correctChoiceId).progress,
      );
    progress = recordPhoto(progress, PHOTO);
    await store.save(progress);
    expect(await store.load()).toEqual(progress);
    await store.clear();
    expect(await store.load()).toBeNull();
  });

  it("serializes writes and snapshots their values at the moment save is requested", async () => {
    const store = createSaveStore(new IDBFactory(), "ordered");
    const progress = newProgress();
    const firstWrite = store.save(progress);
    progress.settings.volume = 0.2;
    await firstWrite;
    expect((await store.load())?.settings.volume).toBe(0.75);
    const secondWrite = store.save(progress);
    const thirdWrite = store.save({
      ...progress,
      settings: { ...progress.settings, volume: 0.8 },
    });
    await Promise.all([secondWrite, thirdWrite]);
    expect((await store.load())?.settings.volume).toBe(0.8);
  });

  it("surfaces corruption repeatedly rather than silently deleting it", async () => {
    const factory = new IDBFactory();
    await rawPut(factory, "corrupt", {
      schemaVersion: 1,
      quiz: { questionIndex: 99 },
    });
    const store = createSaveStore(factory, "corrupt");
    await expect(store.load()).rejects.toMatchObject({ code: "corrupt" });
    await expect(store.load()).rejects.toMatchObject({ code: "corrupt" });
  });

  it("preserves unsupported save schemas for a future compatible game", async () => {
    const factory = new IDBFactory();
    await rawPut(factory, "future-schema", {
      ...newProgress(),
      schemaVersion: 2,
    });
    await expect(
      createSaveStore(factory, "future-schema").load(),
    ).rejects.toMatchObject({ code: "unsupported-version" });
  });

  it("does not downgrade a newer database version", async () => {
    const factory = new IDBFactory();
    await new Promise<void>((resolve, reject) => {
      const request = factory.open("future-db", 2);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    await expect(
      createSaveStore(factory, "future-db").load(),
    ).rejects.toMatchObject({ code: "unsupported-version" });
  });

  it("rejects invalid writes before touching the stored discovery", async () => {
    const store = createSaveStore(new IDBFactory(), "invalid");
    const original = newProgress();
    await store.save(original);
    await expect(
      store.save({
        ...original,
        settings: { ...original.settings, volume: Number.NaN },
      }),
    ).rejects.toMatchObject({ code: "invalid-progress" });
    expect(await store.load()).toEqual(original);
  });

  it("surfaces disabled storage without claiming progress was saved", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const store = createSaveStore();
    await expect(store.save(newProgress())).rejects.toMatchObject({
      code: "unavailable",
    });
    await expect(store.load()).rejects.toBeInstanceOf(SaveError);
  });

  it("handles browsers that throw a security error when storage is accessed", async () => {
    vi.stubGlobal("indexedDB", undefined);
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      get: () => {
        throw new DOMException("Storage disabled", "SecurityError");
      },
    });
    await expect(createSaveStore().load()).rejects.toMatchObject({
      code: "unavailable",
    });
  });

  it("surfaces quota failure, preserves the last save, and allows a later retry", async () => {
    const store = createSaveStore(new IDBFactory(), "quota");
    const original = newProgress();
    await store.save(original);
    const changed = newProgress({ volume: 0.1 });
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementationOnce(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });
    await expect(store.save(changed)).rejects.toMatchObject({
      code: "write-failed",
    });
    spy.mockRestore();
    expect(await store.load()).toEqual(original);
    await store.save(changed);
    expect(await store.load()).toEqual(changed);
  });

  it("waits for transaction commit instead of treating a successful request as a saved game", async () => {
    const store = createSaveStore(new IDBFactory(), "abort-after-request");
    const original = newProgress();
    await store.save(original);
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
    await expect(
      store.save(newProgress({ volume: 0.2 })),
    ).rejects.toMatchObject({ code: "write-failed" });
    spy.mockRestore();
    expect(await store.load()).toEqual(original);
  });
});
