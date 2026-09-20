export interface RecordedClip {
  id: string;
  text: string;
  path: string;
  sha256: string;
}

export type VoicePack = {
  status: "pending" | "invalid" | "ready";
  clips: Map<string, RecordedClip>;
};

export const normalizeNarration = (text: string): string =>
  text.trim().replace(/\s+/g, " ");

/** A partial or stale recording batch must never masquerade as the new guide. */
export function readVoicePack(
  value: unknown,
  catalog: readonly { id: string; text: string }[],
): VoicePack {
  const invalid = (): VoicePack => ({ status: "invalid", clips: new Map() });
  if (!value || typeof value !== "object") return invalid();
  const pack = value as Record<string, unknown>;
  if (
    pack.version !== 1 ||
    pack.voice !== "en-TZ-ElimuNeural" ||
    pack.locale !== "en-TZ" ||
    !Array.isArray(pack.clips)
  )
    return invalid();
  if (pack.clips.length === 0 && pack.generatedAt === null)
    return { status: "pending", clips: new Map() };
  if (
    typeof pack.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(pack.generatedAt)) ||
    pack.clips.length !== catalog.length ||
    catalog.length === 0
  )
    return invalid();
  const expected = new Map(catalog.map((clip) => [clip.id, clip.text]));
  const seen = new Set<string>();
  const clips = new Map<string, RecordedClip>();
  for (const item of pack.clips) {
    if (!item || typeof item !== "object") return invalid();
    const clip = item as RecordedClip;
    if (
      typeof clip.id !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clip.id) ||
      seen.has(clip.id) ||
      typeof clip.text !== "string" ||
      clip.text !== expected.get(clip.id) ||
      typeof clip.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(clip.sha256) ||
      clip.path !== `audio/elimu/${clip.id}-${clip.sha256.slice(0, 12)}.mp3`
    )
      return invalid();
    seen.add(clip.id);
    clips.set(normalizeNarration(clip.text), clip);
  }
  return { status: "ready", clips };
}
