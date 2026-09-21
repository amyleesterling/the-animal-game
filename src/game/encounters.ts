import type { SafariStatus, SafariStop } from "../safari-contracts";
import type { GroundPosition } from "./movement";

type EncounterAnimal = Pick<SafariStop, "id" | "position" | "height">;

/** The same comfortable approach range used by the selected story stop. */
export function safariEncounterRange(height: number): number {
  return Math.max(7.5, height * 1.9) + 3;
}

/**
 * Keep distant entries so the UI can track when a dismissed animal is left.
 * Distance only, and deliberately camera free so it stays pure and testable.
 * Whether an animal is actually in view is decided by the world, which owns
 * the camera, and added to these entries there.
 */
export function collectSafariEncounters(
  animals: readonly EncounterAnimal[],
  position: GroundPosition,
  loaded: Pick<ReadonlySet<string>, "has">,
): Omit<SafariStatus["encounters"][number], "onScreen">[] {
  return animals
    .filter((animal) => loaded.has(animal.id))
    .map((animal) => ({
      id: animal.id,
      distance: Math.hypot(
        position.x - animal.position[0],
        position.z - animal.position[2],
      ),
      range: safariEncounterRange(animal.height),
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
}
