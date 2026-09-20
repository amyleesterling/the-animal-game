import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  createCompanion,
  type CompanionOptions,
} from "../../src/game/companion";
import type { PlayerCharacter } from "../../src/game/player";
import type { GroundPosition } from "../../src/game/movement";
import type { ModelState } from "../../src/game/zebra-model";

const character: PlayerCharacter = {
  id: "companion-fixture",
  name: "Test companion",
  assetPath: "/test/companion.glb",
};
const options: CompanionOptions = {
  visible: true,
  moving: false,
  reducedMotion: false,
};
const clear = () => undefined;

function fixture(ready = true) {
  const visual = {
    root: new THREE.Group(),
    animate: vi.fn(),
    dispose: vi.fn(),
  };
  let reportState!: (state: ModelState) => void;
  const onState = vi.fn();
  const factory = vi.fn(
    (callback?: (state: ModelState) => void, _character?: PlayerCharacter) => {
      reportState = (state) => callback?.(state);
      reportState(ready ? "loaded" : "loading");
      return visual;
    },
  );
  const companion = createCompanion(character, onState, factory);
  return { companion, visual, onState, factory, reportState };
}

function circle(x: number, z: number, radius: number) {
  return (point: GroundPosition) => {
    const dx = point.x - x,
      dz = point.z - z;
    const distance = Math.hypot(dx, dz);
    if (distance < radius) {
      point.x = x + (distance ? dx / distance : 1) * radius;
      point.z = z + (distance ? dz / distance : 0) * radius;
    }
  };
}

describe("optional character companion", () => {
  it("uses the supplied character and stands to the leader's right without moving the leader", () => {
    const { companion, factory } = fixture();
    const leader = { x: 4, y: 2, z: 7 };
    companion.update(0, leader, Math.PI / 2, options, clear);
    expect(factory).toHaveBeenCalledWith(expect.any(Function), character);
    expect(companion.root.position.x).toBeCloseTo(4);
    expect(companion.root.position.y).toBe(2);
    expect(companion.root.position.z).toBeCloseTo(5.75);
    expect(companion.root.rotation.y).toBe(Math.PI / 2);
    expect(leader).toEqual({ x: 4, y: 2, z: 7 });
    expect(companion.root.visible).toBe(true);
  });

  it("does not show a substitute while the real character loads or after it fails", () => {
    const { companion, reportState, onState } = fixture(false);
    companion.update(0, { x: 0, z: 0 }, 0, options, clear);
    expect(companion.root.visible).toBe(false);
    reportState("fallback");
    companion.update(0.1, { x: 0, z: 0 }, 0, options, clear);
    expect(companion.root.visible).toBe(false);
    reportState("loaded");
    companion.update(0.1, { x: 0, z: 0 }, 0, options, clear);
    expect(companion.root.visible).toBe(true);
    expect(onState.mock.calls.map(([state]) => state)).toEqual([
      "loading",
      "fallback",
      "loaded",
    ]);
  });

  it("keeps pace at 60, two, and one frame per second and animates only actual travel", () => {
    for (const fps of [60, 2, 1]) {
      const { companion, visual } = fixture();
      companion.update(0, { x: 0, z: 0 }, 0, options, clear);
      for (let frame = 1; frame <= fps * 5; frame++) {
        companion.update(
          1 / fps,
          { x: 0, z: (-4.2 * frame) / fps },
          0,
          { ...options, moving: true },
          clear,
        );
      }
      expect(companion.root.position.x).toBeCloseTo(1.25);
      expect(companion.root.position.z).toBeCloseTo(-21);
      expect(visual.animate).toHaveBeenLastCalledWith(
        Math.min(1 / fps, 0.5),
        true,
        false,
        false,
      );
      companion.update(0.1, { x: 0, z: -21 }, 0, options, clear);
      expect(visual.animate).toHaveBeenLastCalledWith(0.1, false, false, false);
    }
  });

  it("keeps collision substeps at one FPS rather than snapping through an obstacle to catch up", () => {
    const { companion, visual } = fixture();
    companion.update(0, { x: 0, z: 0 }, 0, options, clear);
    const obstacle = circle(1.25, -2, 0.6);
    for (let frame = 1; frame <= 5; frame++) {
      companion.update(
        1,
        { x: 0, z: -4.2 * frame },
        0,
        { ...options, moving: true },
        obstacle,
      );
      expect(companion.root.visible).toBe(true);
      expect(companion.root.position.z).toBeGreaterThanOrEqual(-1.4 - 1e-9);
    }
    expect(visual.animate.mock.calls.some(([, moving]) => moving)).toBe(true);
  });

  it("picks the other side when the preferred formation slot is blocked", () => {
    const { companion } = fixture();
    companion.update(0, { x: 0, z: 0 }, 0, options, circle(1.25, 0, 0.7));
    expect(companion.root.position.x).toBeCloseTo(-1.25);
    expect(companion.root.position.z).toBe(0);
  });

  it("checks every movement substep and caps work after a long stall", () => {
    const { companion } = fixture();
    companion.update(0, { x: 0, z: 0 }, 0, options, clear);
    const obstacle = circle(1.25, -2, 0.6);
    const resolve = vi.fn(obstacle);
    companion.update(
      90,
      { x: 0, z: -6 },
      0,
      { ...options, moving: true },
      resolve,
    );
    expect(companion.root.position.z).toBeGreaterThanOrEqual(-1.4 - 1e-9);
    expect(
      Math.hypot(
        companion.root.position.x - 1.25,
        companion.root.position.z + 2,
      ),
    ).toBeGreaterThanOrEqual(0.6 - 1e-9);
    expect(resolve.mock.calls.length).toBeLessThan(60);
    const position = companion.root.position.clone();
    companion.update(Infinity, { x: 0, z: -6 }, 0, options, resolve);
    expect(companion.root.position).toEqual(position);
  });

  it("keeps personal space when the leader approaches and turns across its path", () => {
    const { companion } = fixture();
    companion.update(0, { x: 0, z: 0 }, 0, options, clear);
    for (let step = 1; step <= 20; step++) {
      const leader = { x: step * 0.06, z: 0 };
      companion.update(
        1 / 30,
        leader,
        Math.PI,
        { ...options, moving: true },
        clear,
      );
      if (companion.root.visible)
        expect(
          Math.hypot(
            companion.root.position.x - leader.x,
            companion.root.position.z - leader.z,
          ),
        ).toBeGreaterThanOrEqual(0.9 - 0.001);
    }
    expect(companion.root.visible).toBe(true);
  });

  it("resets beside the leader after explicit travel or returning from a hidden mode", () => {
    const { companion, visual } = fixture();
    companion.update(0, { x: 0, z: 0 }, 0, options, clear);
    companion.update(
      0.1,
      { x: 40, z: -20 },
      0,
      { ...options, teleport: true },
      clear,
    );
    expect(companion.root.position.toArray()).toEqual([41.25, 0, -20]);
    expect(visual.animate).toHaveBeenLastCalledWith(0.1, false, false, false);
    companion.update(
      0.1,
      { x: 42, z: -18 },
      0,
      { ...options, visible: false },
      clear,
    );
    expect(companion.root.visible).toBe(false);
    companion.update(0.1, { x: 42, z: -18 }, 0, options, clear);
    expect(companion.root.position.toArray()).toEqual([43.25, 0, -18]);
    companion.update(0.1, { x: -40, z: 20 }, 0, options, clear);
    expect(companion.root.position.toArray()).toEqual([-38.75, 0, 20]);
  });

  it("pauses catch-up and greetings and forwards reduced motion to the visual", () => {
    const { companion, visual } = fixture();
    companion.update(
      0.1,
      { x: 0, z: 0 },
      0,
      { ...options, greeting: true, reducedMotion: true },
      clear,
    );
    expect(visual.animate).toHaveBeenLastCalledWith(0.1, false, true, true);
    const position = companion.root.position.clone();
    companion.update(
      0.5,
      { x: 0, z: -3 },
      0,
      { ...options, paused: true, greeting: true },
      clear,
    );
    expect(companion.root.position).toEqual(position);
    expect(visual.animate).toHaveBeenLastCalledWith(0, false, false, false);
    companion.update(
      0.5,
      { x: 0, z: -3 },
      0,
      { ...options, greeting: true },
      clear,
    );
    expect(visual.animate).toHaveBeenLastCalledWith(0.5, true, false, false);
  });

  it("waits invisibly when every safe slot is blocked and recovers when space clears", () => {
    const { companion } = fixture();
    companion.update(0, { x: 0, z: 0 }, 0, options, circle(0, 0, 5));
    expect(companion.root.visible).toBe(false);
    companion.update(0.1, { x: 0, z: 0 }, 0, options, clear);
    expect(companion.root.visible).toBe(true);
    expect(companion.root.position.x).toBe(1.25);
  });

  it("disposes its visual once and ignores late load reports and later updates", () => {
    const { companion, visual, reportState, onState } = fixture(false);
    const scene = new THREE.Scene();
    scene.add(companion.root);
    companion.dispose();
    companion.dispose();
    reportState("loaded");
    companion.update(1, { x: 0, z: 0 }, 0, options, clear);
    expect(visual.dispose).toHaveBeenCalledOnce();
    expect(visual.animate).not.toHaveBeenCalled();
    expect(companion.root.parent).toBeNull();
    expect(onState).toHaveBeenCalledOnce();
    expect(companion.root.visible).toBe(false);
  });
});
