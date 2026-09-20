import type { PlayerCharacter } from "../game/player";

// Enable the companion when Amy supplies Cora's own rigged character asset.
// A missing model must not silently turn Cora into a second copy of Sophia.
export const CORA_CHARACTER: PlayerCharacter | null = null;
