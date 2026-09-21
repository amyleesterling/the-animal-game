import type { SavannaProfile } from "./content/savanna-profile";

/** Story stops and optional discoveries share the same accessible encounter flow. */
export type SafariStop = {
  id: string;
  name: string;
  scientificName: string;
  chapter: string;
  story: string;
  mission: string;
  clue: string;
  facts: string[];
  profile?: SavannaProfile;
  viewingNote?: string;
  habitatFeature?: "burrow" | "insect";
  sources: { title: string; url: string }[];
  question: {
    prompt: string;
    choices: { id: string; text: string }[];
    correctId: string;
    explanation: string;
  };
  modelPath: string;
  height: number;
  forwardAxis: "+x" | "-x" | "+z" | "-z";
  position: [number, number, number];
};

export type SafariStatus = {
  /** Ground position remains available when distant models leave the cache. */
  explorerPosition?: { x: number; z: number };
  /** Loaded animals, nearest first, independently of the chosen story stop. */
  encounters: { id: string; distance: number; range: number }[];
  nearby: boolean;
  photoReady: boolean;
  distance: number;
  animalLoaded: boolean;
  jeepLoaded: boolean;
  driving: boolean;
  canEnterJeep: boolean;
  canExitJeep: boolean;
  speedKph: number;
  jeepDistance: number;
  destinationDistance: number;
  destinationBearing: number;
};

export type SafariWorldOptions = {
  stops: SafariStop[];
  reducedMotion: boolean;
  lowQuality: boolean;
  onStatus: (status: SafariStatus) => void;
  onError: (message: string) => void;
};

export interface SafariWorld {
  setStop(id: string, keepPosition?: boolean): void;
  enterJeep(): boolean;
  exitJeep(): boolean;
  returnToJeep(): void;
  setBrake(pressed: boolean): void;
  guideToAnimal(): void;
  setActive(active: boolean): void;
  setPhotoMode(active: boolean): void;
  setMovement(
    direction: "forward" | "backward" | "left" | "right",
    pressed: boolean,
  ): void;
  setOptions(
    options: Partial<Pick<SafariWorldOptions, "reducedMotion" | "lowQuality">>,
  ): void;
  capture(): string | null;
  dispose(): void;
}
