import type { PlayerCharacter } from "../game/player";

// Both authored clips share Cora's supplied mesh and skeleton.
export const CORA_CHARACTER: PlayerCharacter = {
  id: "cora",
  name: "Cora",
  assetPath: "/models/cora.glb",
  walkAnimation: "Walking_Woman",
  greetingAnimation: "Wave_for_Help_4",
  height: 1.8,
};
