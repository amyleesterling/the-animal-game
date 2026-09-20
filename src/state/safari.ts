import { safariStops } from "../content/safari";
import { matchesAnimalName } from "../content/animal-names";
import type { SafariStop } from "../safari-contracts";
import {
  defaultSettings,
  isValidPhotoDataUrl,
  type GameSettings,
} from "./progress";
import { SaveError } from "./save";

export const SAFARI_DATABASE = "sophias-wild-world-story-safari";
export const SAFARI_STORE = "journey";
export const SAFARI_KEY = "current";
export interface SafariEntry {
  identification: { name: string; skipped: boolean } | null;
  attempts: number;
  answer: string | null;
  learned: boolean;
  photo: { dataUrl: string; capturedAt: string } | null;
  visits: number;
}
export interface SafariProgress {
  schemaVersion: 2;
  started: boolean;
  currentStopId: string;
  entries: Record<string, SafariEntry>;
  settings: GameSettings;
  completedAt: string | null;
}
export function newSafari(
  settings: Partial<GameSettings> = {},
): SafariProgress {
  return {
    schemaVersion: 2,
    started: false,
    currentStopId: safariStops[0].id,
    entries: Object.fromEntries(
      safariStops.map((s) => [
        s.id,
        {
          identification: null,
          attempts: 0,
          answer: null,
          learned: false,
          photo: null,
          visits: 0,
        },
      ]),
    ),
    settings: { ...defaultSettings, ...settings },
    completedAt: null,
  };
}
export function discoveredCount(p: SafariProgress): number {
  return safariStops.filter((s) => p.entries[s.id].photo).length;
}
export function isStopUnlocked(p: SafariProgress, id: string): boolean {
  const index = safariStops.findIndex((s) => s.id === id);
  return (
    index >= 0 &&
    (p.entries[id].visits > 0 ||
      safariStops.slice(0, index).every((s) => p.entries[s.id].photo))
  );
}
function changeEntry(
  p: SafariProgress,
  edit: Partial<SafariEntry>,
): SafariProgress {
  return {
    ...p,
    entries: {
      ...p.entries,
      [p.currentStopId]: { ...p.entries[p.currentStopId], ...edit },
    },
  };
}
export function visitStop(p: SafariProgress, id: string): SafariProgress {
  if (!isStopUnlocked(p, id))
    throw new Error("Follow the route to discover this stop first.");
  return encounterStop(p, id);
}

/** The world/UI confirms proximity and loading; this transition records any known animal encounter. */
export function encounterStop(p: SafariProgress, id: string): SafariProgress {
  if (!safariStops.some((stop) => stop.id === id))
    throw new Error("That animal is not part of this safari yet.");
  return changeEntry(
    { ...p, started: true, currentStopId: id },
    { visits: p.entries[id].visits + 1 },
  );
}

export function identifySafari(
  p: SafariProgress,
  name: string,
  skipped = false,
): SafariProgress {
  const stop = safariStops.find((stop) => stop.id === p.currentStopId);
  if (!stop || !p.started || p.entries[stop.id].visits < 1)
    throw new Error("Come closer to an animal before naming it.");
  if (p.entries[stop.id].identification) return p;
  if (
    typeof skipped !== "boolean" ||
    (!skipped && !matchesAnimalName(stop.id, name))
  )
    throw new Error(
      "Take another look and try its animal name, or choose Tell me the name.",
    );
  return changeEntry(p, {
    identification: {
      name: skipped ? stop.name : name.trim().replace(/\s+/g, " "),
      skipped,
    },
  });
}

/** The first remaining route stop is always unlocked, even after an off-route discovery. */
export function nextSafariStop(p: SafariProgress): SafariStop | undefined {
  return safariStops.find((stop) => !p.entries[stop.id].photo);
}
export function answerSafari(
  p: SafariProgress,
  choiceId: string,
): SafariProgress {
  const stop = safariStops.find((s) => s.id === p.currentStopId)!;
  const entry = p.entries[stop.id];
  if (!p.started || entry.visits < 1 || entry.learned || entry.answer)
    throw new Error("Read the current clue before answering again.");
  if (!entry.identification)
    throw new Error("Name this animal first, or choose Tell me the name.");
  if (!stop.question.choices.some((c) => c.id === choiceId))
    throw new Error("Choose one of the three answers.");
  return changeEntry(p, { answer: choiceId, attempts: entry.attempts + 1 });
}
export function retrySafariAnswer(p: SafariProgress): SafariProgress {
  if (p.entries[p.currentStopId].learned) return p;
  return changeEntry(p, { answer: null });
}
export function learnSafariClue(p: SafariProgress): SafariProgress {
  if (!p.entries[p.currentStopId].answer)
    throw new Error("Choose an answer and read its explanation first.");
  return changeEntry(p, { learned: true });
}
export function photographSafari(
  p: SafariProgress,
  dataUrl: string,
  capturedAt = new Date().toISOString(),
): SafariProgress {
  if (!p.started || !p.entries[p.currentStopId].learned)
    throw new Error("Discover this animal’s clue before taking its photo.");
  if (!isValidPhotoDataUrl(dataUrl) || !isDate(capturedAt))
    throw new Error("The photo did not capture. Please try again.");
  const next = changeEntry(p, { photo: { dataUrl, capturedAt } });
  return {
    ...next,
    completedAt:
      p.completedAt ??
      (discoveredCount(next) === safariStops.length ? capturedAt : null),
  };
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

type LegacySafariEntry = Omit<SafariEntry, "identification">;
type LegacySafariProgress = Omit<
  SafariProgress,
  "schemaVersion" | "entries"
> & {
  schemaVersion: 1;
  entries: Record<string, LegacySafariEntry>;
};

/** The old schema keeps its original sequential rules; migration must not bless corrupt saves. */
function isLegacySafariProgress(value: unknown): value is LegacySafariProgress {
  return validProgress(value, 1);
}
export function isSafariProgress(value: unknown): value is SafariProgress {
  return validProgress(value, 2);
}
function validProgress(value: unknown, version: 1 | 2): boolean {
  if (
    !object(value) ||
    value.schemaVersion !== version ||
    typeof value.started !== "boolean" ||
    !object(value.entries) ||
    !object(value.settings)
  )
    return false;
  const settings = value.settings;
  if (
    ["narration", "reducedMotion", "lowQuality"].some(
      (k) => typeof settings[k] !== "boolean",
    ) ||
    typeof settings.volume !== "number" ||
    !Number.isFinite(settings.volume) ||
    settings.volume < 0 ||
    settings.volume > 1
  )
    return false;
  if (
    Object.keys(value.entries).length !== safariStops.length ||
    typeof value.currentStopId !== "string" ||
    !safariStops.some((s) => s.id === value.currentStopId)
  )
    return false;
  let missingPhoto = false;
  for (const stop of safariStops) {
    const entry = value.entries[stop.id];
    if (
      !object(entry) ||
      !Number.isSafeInteger(entry.attempts) ||
      (entry.attempts as number) < 0 ||
      !Number.isSafeInteger(entry.visits) ||
      (entry.visits as number) < 0 ||
      typeof entry.learned !== "boolean"
    )
      return false;
    if (
      entry.answer !== null &&
      (!stop.question.choices.some((c) => c.id === entry.answer) ||
        (entry.attempts as number) < 1)
    )
      return false;
    if (entry.learned && entry.answer === null) return false;
    if ((entry.attempts as number) > 0 && (entry.visits as number) === 0)
      return false;
    if (version === 2) {
      const identification = entry.identification;
      if (identification !== null) {
        if (
          !object(identification) ||
          typeof identification.name !== "string" ||
          typeof identification.skipped !== "boolean" ||
          (entry.visits as number) < 1 ||
          identification.name !==
            identification.name.trim().replace(/\s+/g, " ")
        )
          return false;
        if (
          identification.skipped
            ? identification.name !== stop.name
            : !matchesAnimalName(stop.id, identification.name)
        )
          return false;
      }
      if (
        (entry.answer !== null || entry.learned || entry.photo !== null) &&
        !identification
      )
        return false;
      // A v1 retry may have attempts but no pending answer; migration asks for its name next.
    }
    // Only v1 required every previous photograph before an animal could be visited.
    if (
      version === 1 &&
      missingPhoto &&
      ((entry.visits as number) > 0 ||
        (entry.attempts as number) > 0 ||
        entry.learned ||
        entry.photo !== null)
    )
      return false;
    if (entry.photo !== null) {
      if (
        !object(entry.photo) ||
        !isValidPhotoDataUrl(entry.photo.dataUrl) ||
        !isDate(entry.photo.capturedAt) ||
        !entry.learned
      )
        return false;
    } else missingPhoto = true;
  }
  const p = value as unknown as SafariProgress;
  if (version === 1) {
    const current = safariStops.findIndex(
      (stop) => stop.id === p.currentStopId,
    );
    if (
      !safariStops.slice(0, current).every((stop) => p.entries[stop.id].photo)
    )
      return false;
  }
  if (
    !p.started &&
    (p.currentStopId !== safariStops[0].id ||
      Object.values(p.entries).some((e) => e.visits > 0 || e.attempts > 0))
  )
    return false;
  if (p.started && p.entries[p.currentStopId].visits === 0) return false;
  return discoveredCount(p) === safariStops.length
    ? isDate(p.completedAt)
    : p.completedAt === null;
}

function migrateLegacyProgress(value: LegacySafariProgress): SafariProgress {
  return {
    ...value,
    schemaVersion: 2,
    entries: Object.fromEntries(
      safariStops.map((stop) => {
        const entry = value.entries[stop.id];
        return [
          stop.id,
          {
            ...entry,
            identification:
              entry.answer !== null || entry.learned || entry.photo !== null
                ? { name: stop.name, skipped: true }
                : null,
          },
        ];
      }),
    ),
  };
}

/** Separate database from the classic encounter. Failed reads never delete or replace data. */
export function createSafariStore(
  factory?: IDBFactory,
  databaseName = SAFARI_DATABASE,
) {
  let writes = Promise.resolve();
  let protectedAfterReadFailure = false;
  async function transaction<T>(
    mode: IDBTransactionMode,
    action: (s: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        const storage = factory ?? globalThis.indexedDB;
        if (!storage) throw new Error("Storage unavailable");
        request = storage.open(databaseName, 1);
      } catch (error) {
        reject(
          new SaveError(
            "unavailable",
            "This browser cannot open the story save. You can explore, but keep this tab open.",
            error,
          ),
        );
        return;
      }
      let failed = false;
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(SAFARI_STORE))
          request.result.createObjectStore(SAFARI_STORE);
      };
      request.onblocked = () => {
        failed = true;
        reject(
          new SaveError(
            "blocked",
            "Another tab is holding the story save open. Close it and retry.",
          ),
        );
      };
      request.onerror = () => {
        failed = true;
        reject(
          new SaveError(
            request.error?.name === "VersionError"
              ? "unsupported-version"
              : "unavailable",
            "The story save could not be opened. Existing data has been left untouched.",
            request.error,
          ),
        );
      };
      request.onsuccess = () => {
        const db = request.result;
        if (failed) {
          db.close();
          return;
        }
        db.onversionchange = () => db.close();
        resolve(db);
      };
    });
    return new Promise((resolve, reject) => {
      const code = mode === "readonly" ? "read-failed" : "write-failed";
      const message =
        mode === "readonly"
          ? "Your saved story could not be read. It has been left untouched."
          : "Your story could not be saved. Keep this tab open and retry.";
      let tx: IDBTransaction;
      let request: IDBRequest<T>;
      try {
        tx = db.transaction(SAFARI_STORE, mode);
        request = action(tx.objectStore(SAFARI_STORE));
      } catch (error) {
        db.close();
        reject(new SaveError(code, message, error));
        return;
      }
      tx.oncomplete = () => {
        db.close();
        resolve(request.result);
      };
      tx.onabort = () => {
        db.close();
        reject(new SaveError(code, message, tx.error ?? request.error));
      };
      tx.onerror = () => undefined;
    });
  }
  function queue(action: () => Promise<void>) {
    const result = writes.then(action);
    writes = result.catch(() => undefined);
    return result;
  }
  return {
    async load(): Promise<SafariProgress | null> {
      await writes;
      try {
        const value = await transaction<unknown>("readonly", (s) =>
          s.get(SAFARI_KEY),
        );
        if (value === undefined) {
          protectedAfterReadFailure = false;
          return null;
        }
        if (
          object(value) &&
          Object.hasOwn(value, "schemaVersion") &&
          value.schemaVersion !== 1 &&
          value.schemaVersion !== 2
        )
          throw new SaveError(
            "unsupported-version",
            "This story save uses an unsupported version. It has been left untouched.",
          );
        const progress = isLegacySafariProgress(value)
          ? migrateLegacyProgress(value)
          : value;
        if (!isSafariProgress(progress))
          throw new SaveError(
            "corrupt",
            "This story save could not be read safely. It has been left untouched. Restart only when you are ready to replace it.",
          );
        protectedAfterReadFailure = false;
        return progress;
      } catch (error) {
        protectedAfterReadFailure = true;
        throw error;
      }
    },
    save(progress: SafariProgress): Promise<void> {
      if (!isSafariProgress(progress))
        return Promise.reject(
          new SaveError("invalid-progress", "This story is not ready to save."),
        );
      const snapshot = structuredClone(progress);
      return queue(async () => {
        if (protectedAfterReadFailure)
          throw new SaveError(
            "read-failed",
            "Your earlier save is protected. Reload to retry it, or explicitly restart the story to replace it.",
          );
        await transaction("readwrite", (s) => s.put(snapshot, SAFARI_KEY));
      });
    },
    /** Explicit user-confirmed replacement also recovers a corrupt value without touching classic saves. */
    replace(progress: SafariProgress): Promise<void> {
      if (!isSafariProgress(progress))
        return Promise.reject(
          new SaveError("invalid-progress", "This story is not ready to save."),
        );
      const snapshot = structuredClone(progress);
      return queue(async () => {
        await transaction("readwrite", (s) => s.put(snapshot, SAFARI_KEY));
        protectedAfterReadFailure = false;
      });
    },
  };
}
