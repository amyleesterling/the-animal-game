import { isProgress, SAVE_SCHEMA_VERSION, type Progress } from "./progress";

export const SAVE_DATABASE_NAME = "sophias-wild-world";
export const SAVE_DATABASE_VERSION = 1;
export const SAVE_STORE_NAME = "progress";
export const SAVE_KEY = "current";

export type SaveErrorCode =
  | "unavailable"
  | "blocked"
  | "corrupt"
  | "unsupported-version"
  | "invalid-progress"
  | "read-failed"
  | "write-failed";

export class SaveError extends Error {
  readonly code: SaveErrorCode;
  readonly cause?: unknown;

  constructor(code: SaveErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "SaveError";
    this.code = code;
    this.cause = cause;
  }
}

export interface SaveStore {
  load(): Promise<Progress | null>;
  save(progress: Progress): Promise<void>;
  clear(): Promise<void>;
}

/** The injected factory lets tests simulate unavailable, blocked and corrupt storage. */
export function createSaveStore(
  factory?: IDBFactory,
  databaseName = SAVE_DATABASE_NAME,
): SaveStore {
  let writes: Promise<void> = Promise.resolve();

  function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        const storage = factory ?? globalThis.indexedDB;
        if (!storage) {
          reject(
            new SaveError(
              "unavailable",
              "Saving is unavailable in this browser. You can still explore, but progress may be lost when you leave.",
            ),
          );
          return;
        }
        request = storage.open(databaseName, SAVE_DATABASE_VERSION);
      } catch (error) {
        reject(
          new SaveError(
            "unavailable",
            "This browser could not open the safari save. You can keep exploring.",
            error,
          ),
        );
        return;
      }
      let failed = false;
      request.onupgradeneeded = () => {
        const db = request.result;
        // Database v1 creates the store. Future schema migrations must be explicit here.
        if (!db.objectStoreNames.contains(SAVE_STORE_NAME))
          db.createObjectStore(SAVE_STORE_NAME);
      };
      request.onblocked = () => {
        failed = true;
        reject(
          new SaveError(
            "blocked",
            "Another safari tab is holding the save open. Close it and try saving again.",
          ),
        );
      };
      request.onerror = () => {
        failed = true;
        const futureVersion = request.error?.name === "VersionError";
        reject(
          new SaveError(
            futureVersion ? "unsupported-version" : "unavailable",
            futureVersion
              ? "This save belongs to a newer version of the game. It has been left untouched."
              : "This browser could not open the safari save. You can keep exploring.",
            request.error,
          ),
        );
      };
      request.onsuccess = () => {
        if (failed) {
          request.result.close();
          return;
        }
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
    });
  }

  async function transaction<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      let request: IDBRequest<T>;
      const errorCode = mode === "readonly" ? "read-failed" : "write-failed";
      const message =
        mode === "readonly"
          ? "Your saved safari could not be loaded. The save has been left untouched."
          : "Your safari could not be saved. Keep this tab open and try again.";
      try {
        tx = db.transaction(SAVE_STORE_NAME, mode);
        request = action(tx.objectStore(SAVE_STORE_NAME));
      } catch (error) {
        db.close();
        reject(new SaveError(errorCode, message, error));
        return;
      }
      tx.oncomplete = () => {
        db.close();
        resolve(request.result);
      };
      tx.onabort = () => {
        db.close();
        reject(new SaveError(errorCode, message, tx.error ?? request.error));
      };
      // Request failures abort the transaction by default. Report only after abort,
      // so a request success followed by a quota/commit failure never looks saved.
      tx.onerror = () => undefined;
    });
  }

  function queueWrite(action: () => Promise<void>): Promise<void> {
    const result = writes.then(action);
    // Keep the queue usable after a failed save; still reject the caller's result.
    writes = result.catch(() => undefined);
    return result;
  }

  return {
    async load() {
      await writes;
      const value = await transaction<unknown>("readonly", (store) =>
        store.get(SAVE_KEY),
      );
      if (value === undefined) return null;
      if (
        typeof value === "object" &&
        value !== null &&
        "schemaVersion" in value &&
        value.schemaVersion !== SAVE_SCHEMA_VERSION
      ) {
        throw new SaveError(
          "unsupported-version",
          "This save uses an unsupported version. It has been left untouched.",
        );
      }
      if (!isProgress(value))
        throw new SaveError(
          "corrupt",
          "This saved safari could not be read safely. Start a new safari only when you are ready to replace it.",
        );
      return value;
    },
    save(progress) {
      if (!isProgress(progress))
        return Promise.reject(
          new SaveError(
            "invalid-progress",
            "This safari is not ready to save. Please try the action again.",
          ),
        );
      // Snapshot now: later UI mutations must not change an already requested save.
      const snapshot = structuredClone(progress);
      return queueWrite(async () => {
        await transaction("readwrite", (store) =>
          store.put(snapshot, SAVE_KEY),
        );
      });
    },
    clear() {
      return queueWrite(async () => {
        await transaction("readwrite", (store) => store.delete(SAVE_KEY));
      });
    },
  };
}

const defaultStore = createSaveStore();
export const loadProgress = (): Promise<Progress | null> => defaultStore.load();
export const saveProgress = (progress: Progress): Promise<void> =>
  defaultStore.save(progress);
export const clearSavedProgress = (): Promise<void> => defaultStore.clear();
