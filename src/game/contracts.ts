export type AnimalBehavior = "grazing" | "walking" | "alert" | "retreating";
export type WorldStatus = {
  distance: number;
  nearby: boolean;
  behavior: AnimalBehavior;
  photoReady: boolean;
  fps: number;
};
export type WorldOptions = {
  reducedMotion: boolean;
  lowQuality: boolean;
  welcomeContent?: HTMLElement;
  onStatus: (status: WorldStatus) => void;
  onError: (message: string) => void;
};
export interface World {
  setActive(active: boolean): void;
  setPhotoMode(active: boolean): void;
  setZoom(zoom: number): void;
  setMovement(
    direction: "forward" | "backward" | "left" | "right",
    pressed: boolean,
  ): void;
  setOptions(
    options: Partial<Pick<WorldOptions, "reducedMotion" | "lowQuality">>,
  ): void;
  guideToAnimal(): void;
  capture(): string | null;
  dispose(): void;
}
