export interface SourceRecord {
  id: string;
  title: string;
  publisher: string;
  url: string;
  lastReviewed: string;
  reviewerNote?: string;
}

export interface NarratedFact {
  id: string;
  text: string;
  narration: string;
  sourceIds: string[];
  lastReviewed: string;
}

export interface QuizChoice {
  id: string;
  text: string;
  narration: string;
  symbol: string;
}

export interface QuizQuestion {
  id: string;
  kind: "spot" | "understand" | "connect";
  prompt: string;
  narration: string;
  choices: QuizChoice[];
  correctChoiceId: string;
  explanation: string;
  narrationExplanation: string;
  sourceIds: string[];
  lastReviewed: string;
  reviewerNote: string;
}

export interface SpeciesStat extends NarratedFact {
  label: string;
  value: string;
  min?: number;
  max?: number;
  unit?: string;
  note?: string;
}

export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  pronunciation: string;
  lastReviewed: string;
  taxonomySourceIds: string[];
  introduction: NarratedFact;
  summary: NarratedFact;
  stats: SpeciesStat[];
  adaptations: NarratedFact[];
  ecologicalRole: NarratedFact[];
  quizzes: QuizQuestion[];
  sources: SourceRecord[];
  model: {
    assetId: string;
    assetPath: string;
    assetForwardAxis: "+x" | "-x" | "+z" | "-z";
    targetHeight: number;
    fallbackAssetId: string;
    bodyColor: number;
    stripeColor: number;
    scale: number;
    bodyLength: number;
    bodyHeight: number;
    bodyWidth: number;
  };
  audio: { narration: "recorded-guide"; callAssetId: string | null };
  spawn: {
    position: [number, number, number];
    herdOffsets: [number, number, number][];
    roamRadius: number;
  };
  behaviors: {
    grazeSeconds: number;
    walkSeconds: number;
    walkSpeed: number;
    alertRadius: number;
    comfortRadius: number;
    retreatSpeed: number;
    encounterRadius: number;
    photoMaxDistance: number;
  };
}

export interface RosterEntry {
  id: string;
  commonName: string;
  scientificName: string;
  available: boolean;
  clue: string;
  symbol: string;
}

export interface AssetAttribution {
  title: string;
  creator: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  modifications: string;
}

interface AssetBase {
  id: string;
  status: "prototype" | "reviewed";
  alt: string;
}

export type AssetDefinition = AssetBase &
  (
    | { kind: "procedural"; implementation: string }
    | { kind: "audio"; assetPath: string }
    | {
        kind: "glb";
        assetPath: string;
        attribution: AssetAttribution;
        rig: { skeletal: boolean; embeddedAnimationClips: number };
        reviewNote: string;
      }
  );
