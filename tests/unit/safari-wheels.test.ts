import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createSafariWheelRig } from "../../src/game/safari-wheels";
import { disposeModelResources } from "../../src/game/zebra-model";

describe.each(["imported", "fallback"] as const)("%s jeep wheels", (style) => {
  it("rolls four wheels while steering only the front axle", () => {
    const rig = createSafariWheelRig(style);
    const wheels = rig.root.children as THREE.Group[];
    expect(wheels).toHaveLength(4);
    expect(
      wheels.filter((wheel) => wheel.name.startsWith("front")),
    ).toHaveLength(2);
    rig.setPose(1.4, 0.3);
    for (const wheel of wheels) {
      expect((wheel.children[0] as THREE.Group).rotation.z).toBeCloseTo(1.4);
      expect(wheel.rotation.y).toBeCloseTo(
        wheel.name.startsWith("front") ? 0.3 : 0,
      );
    }
    rig.setPose(-0.8, -0.25);
    for (const wheel of wheels) {
      expect((wheel.children[0] as THREE.Group).rotation.z).toBeCloseTo(-0.8);
      expect(wheel.rotation.y).toBeCloseTo(
        wheel.name.startsWith("front") ? -0.25 : 0,
      );
    }
    disposeModelResources(rig.root);
  });
});
