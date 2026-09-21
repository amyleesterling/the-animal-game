import { safariStops, safariStoryStops } from "../content/safari";
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
  /** Zero-based active question; completed quizzes remain on their final question. */
  questionIndex: number;
  /** Prior answers survive retries and reloads; the active slot mirrors answer. */
  quizAnswers: (string | null)[];
  learned: boolean;
  photo: { dataUrl: string; capturedAt: string } | null;
  visits: number;
}
export interface SafariProgress {
  schemaVersion: 3;
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
    schemaVersion: 3,
    started: false,
    currentStopId: safariStops[0].id,
    entries: Object.fromEntries(safariStops.map((s) => [s.id, emptyEntry(s)])),
    settings: { ...defaultSettings, ...settings },
    completedAt: null,
  };
}
function questionsForStop(stop: SafariStop): SafariStop["question"][] {
  return stop.profile?.questions ?? [stop.question];
}
function emptyEntry(stop: SafariStop): SafariEntry {
  return {
    identification: null,
    attempts: 0,
    answer: null,
    questionIndex: 0,
    quizAnswers: questionsForStop(stop).map(() => null),
    learned: false,
    photo: null,
    visits: 0,
  };
}
export function currentSafariQuestion(
  p: SafariProgress,
  id = p.currentStopId,
): SafariStop["question"] {
  const stop = safariStops.find((stop) => stop.id === id);
  const question = stop && questionsForStop(stop)[p.entries[id]?.questionIndex];
  if (!question) throw new Error("That safari question is not available.");
  return question;
}
export function safariQuizProgress(p: SafariProgress, id = p.currentStopId) {
  const stop = safariStops.find((stop) => stop.id === id);
  if (!stop || !p.entries[id])
    throw new Error("That animal is not part of this safari yet.");
  const entry = p.entries[id];
  return {
    index: entry.questionIndex,
    number: entry.questionIndex + 1,
    total: questionsForStop(stop).length,
    complete: entry.learned,
  };
}
export function discoveredCount(p: SafariProgress): number {
  return safariStops.filter((s) => p.entries[s.id].photo).length;
}
/** The original story ends after its seven photographs; optional discoveries do not delay it. */
export function safariStoryComplete(p: SafariProgress): boolean {
  return safariStoryStops.every((stop) => Boolean(p.entries[stop.id]?.photo));
}
export function isStopUnlocked(p: SafariProgress, id: string): boolean {
  if (!safariStops.some((stop) => stop.id === id)) return false;
  const index = safariStoryStops.findIndex((s) => s.id === id);
  return (
    index < 0 ||
    p.entries[id].visits > 0 ||
    safariStoryStops.slice(0, index).every((s) => p.entries[s.id].photo)
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
  return (
    safariStoryStops.find((stop) => !p.entries[stop.id].photo) ??
    safariStops.find((stop) => !p.entries[stop.id].photo)
  );
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
  if (!currentSafariQuestion(p).choices.some((c) => c.id === choiceId))
    throw new Error("Choose one of the three answers.");
  const quizAnswers = [...entry.quizAnswers];
  quizAnswers[entry.questionIndex] = choiceId;
  return changeEntry(p, {
    answer: choiceId,
    quizAnswers,
    attempts: entry.attempts + 1,
  });
}
export function retrySafariAnswer(p: SafariProgress): SafariProgress {
  const entry = p.entries[p.currentStopId];
  if (entry.learned) return p;
  const quizAnswers = [...entry.quizAnswers];
  quizAnswers[entry.questionIndex] = null;
  return changeEntry(p, { answer: null, quizAnswers });
}
export function learnSafariClue(p: SafariProgress): SafariProgress {
  const entry = p.entries[p.currentStopId];
  if (entry.learned) return p;
  if (!entry.answer)
    throw new Error("Choose an answer and read its explanation first.");
  if (entry.questionIndex + 1 < safariQuizProgress(p).total)
    return changeEntry(p, {
      questionIndex: entry.questionIndex + 1,
      answer: null,
    });
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
      p.completedAt ?? (safariStoryComplete(next) ? capturedAt : null),
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

type PreviousSafariEntry = Omit<SafariEntry, "questionIndex" | "quizAnswers">;
type LegacySafariEntry = Omit<PreviousSafariEntry, "identification">;
type PreviousSafariProgress = Omit<
  SafariProgress,
  "schemaVersion" | "entries"
> & {
  schemaVersion: 1 | 2;
  entries: Record<string, LegacySafariEntry | PreviousSafariEntry>;
};

/** Old saves must satisfy their original seven-stop rules before adding new entries. */
function isPreviousSafariProgress(
  value: unknown,
): value is PreviousSafariProgress {
  return validProgress(value, 1) || validProgress(value, 2);
}
export function isSafariProgress(value: unknown): value is SafariProgress {
  return validProgress(value, 3);
}
function validProgress(value: unknown, version: 1 | 2 | 3): boolean {
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
  const stops = version === 3 ? safariStops : safariStoryStops;
  if (
    Object.keys(value.entries).length !== stops.length ||
    typeof value.currentStopId !== "string" ||
    !stops.some((s) => s.id === value.currentStopId)
  )
    return false;
  let missingPhoto = false;
  for (const stop of stops) {
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
    const questions = version === 3 ? questionsForStop(stop) : [stop.question];
    const questionIndex = version === 3 ? entry.questionIndex : 0;
    if (
      !Number.isSafeInteger(questionIndex) ||
      (questionIndex as number) < 0 ||
      (questionIndex as number) >= questions.length
    )
      return false;
    const question = questions[questionIndex as number];
    if (
      entry.answer !== null &&
      (!question.choices.some((c) => c.id === entry.answer) ||
        (entry.attempts as number) < 1)
    )
      return false;
    if (entry.learned && entry.answer === null) return false;
    if ((entry.attempts as number) > 0 && (entry.visits as number) === 0)
      return false;
    if (version === 3) {
      if (
        !Array.isArray(entry.quizAnswers) ||
        entry.quizAnswers.length !== questions.length
      )
        return false;
      let answered = 0;
      for (let i = 0; i < questions.length; i++) {
        const answer = entry.quizAnswers[i];
        if (answer !== null) {
          if (!questions[i].choices.some((choice) => choice.id === answer))
            return false;
          answered++;
        }
        if (
          (i < (questionIndex as number) && answer === null) ||
          (i > (questionIndex as number) && answer !== null)
        )
          return false;
      }
      if (
        entry.quizAnswers[questionIndex as number] !== entry.answer ||
        (entry.attempts as number) < answered ||
        (entry.learned && questionIndex !== questions.length - 1)
      )
        return false;
    }
    if (version >= 2) {
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
        (entry.answer !== null ||
          (questionIndex as number) > 0 ||
          entry.learned ||
          entry.photo !== null) &&
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
    const current = safariStoryStops.findIndex(
      (stop) => stop.id === p.currentStopId,
    );
    if (
      !safariStoryStops
        .slice(0, current)
        .every((stop) => p.entries[stop.id].photo)
    )
      return false;
  }
  if (
    !p.started &&
    (p.currentStopId !== safariStoryStops[0].id ||
      Object.values(p.entries).some((e) => e.visits > 0 || e.attempts > 0))
  )
    return false;
  if (p.started && p.entries[p.currentStopId].visits === 0) return false;
  return safariStoryComplete(p)
    ? isDate(p.completedAt)
    : p.completedAt === null;
}

function migratePreviousProgress(
  value: PreviousSafariProgress,
): SafariProgress {
  return {
    ...value,
    schemaVersion: 3,
    entries: Object.fromEntries(
      safariStops.map((stop) => {
        const entry = value.entries[stop.id];
        if (!entry) return [stop.id, emptyEntry(stop)];
        return [
          stop.id,
          {
            ...emptyEntry(stop),
            attempts: entry.attempts,
            answer: entry.answer,
            quizAnswers: [entry.answer],
            learned: entry.learned,
            photo: entry.photo,
            visits: entry.visits,
            identification:
              value.schemaVersion === 2
                ? (entry as PreviousSafariEntry).identification
                : entry.answer !== null || entry.learned || entry.photo !== null
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
          value.schemaVersion !== 2 &&
          value.schemaVersion !== 3
        )
          throw new SaveError(
            "unsupported-version",
            "This story save uses an unsupported version. It has been left untouched.",
          );
        const progress = isPreviousSafariProgress(value)
          ? migratePreviousProgress(value)
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
