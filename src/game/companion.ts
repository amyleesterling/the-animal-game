import * as THREE from "three";
import { createPlayer, type PlayerCharacter } from "./player";
import { moveWithCollisions, type GroundPosition } from "./movement";
import type { ModelState } from "./zebra-model";

export type CompanionOptions = {
  visible: boolean;
  moving: boolean;
  reducedMotion: boolean;
  greeting?: boolean;
  teleport?: boolean;
  paused?: boolean;
};

const SPACING = 1.25;
const PERSONAL_SPACE = 0.9;
const SLOTS = [
  [SPACING, 0],
  [-SPACING, 0],
  [SPACING, 0.8],
  [-SPACING, 0.8],
  [0, 1.5],
  [1.8, 0],
  [-1.8, 0],
] as const;

/** An optional, independently owned character; the leader and camera never move. */
export function createCompanion(
  character: PlayerCharacter,
  onState?: (state: ModelState) => void,
  createVisual: typeof createPlayer = createPlayer,
) {
  let loaded = false;
  let disposed = false;
  let placed = false;
  let previousLeader: GroundPosition | undefined;
  const visual = createVisual((state) => {
    if (disposed) return;
    loaded = state === "loaded";
    onState?.(state);
  }, character);
  const root = visual.root;
  root.visible = false;

  return {
    root,
    update(
      delta: number,
      leader: GroundPosition & { y?: number },
      leaderYaw: number,
      options: CompanionOptions,
      resolveCollisions: (position: GroundPosition) => void,
    ) {
      if (disposed) return;
      const leaderJumped =
        previousLeader !== undefined &&
        Math.hypot(leader.x - previousLeader.x, leader.z - previousLeader.z) >
          8;
      previousLeader = { x: leader.x, z: leader.z };
      if (!loaded || !options.visible) {
        root.visible = false;
        placed = false;
        visual.animate(0, false, options.reducedMotion, false);
        return;
      }
      if (options.paused) {
        visual.animate(0, false, options.reducedMotion, false);
        return;
      }

      const right = { x: Math.cos(leaderYaw), z: -Math.sin(leaderYaw) };
      const behind = { x: Math.sin(leaderYaw), z: Math.cos(leaderYaw) };
      const clear = (point: GroundPosition) => {
        const probe = { ...point };
        resolveCollisions(probe);
        return (
          Number.isFinite(probe.x) &&
          Number.isFinite(probe.z) &&
          Math.hypot(probe.x - point.x, probe.z - point.z) < 0.001 &&
          Math.hypot(point.x - leader.x, point.z - leader.z) >=
            PERSONAL_SPACE - 0.001
        );
      };
      const target = SLOTS.map(([side, back]) => ({
        x: leader.x + right.x * side + behind.x * back,
        z: leader.z + right.z * side + behind.z * back,
      })).find(clear);
      if (!target) {
        root.visible = placed && clear(root.position);
        if (!root.visible) placed = false;
        visual.animate(0, false, options.reducedMotion, false);
        return;
      }

      const old = { x: root.position.x, z: root.position.z };
      const reset = !placed || options.teleport || leaderJumped;
      if (reset) {
        root.position.set(target.x, leader.y ?? 0, target.z);
        root.rotation.y = leaderYaw;
        placed = true;
      } else {
        let destination = target;
        // When switching sides, go behind the leader instead of walking through
        // their personal space. The same world collision checks apply to this leg.
        const tx = target.x - old.x,
          tz = target.z - old.z;
        const lengthSquared = tx * tx + tz * tz;
        const along =
          lengthSquared > 0
            ? THREE.MathUtils.clamp(
                ((leader.x - old.x) * tx + (leader.z - old.z) * tz) /
                  lengthSquared,
                0,
                1,
              )
            : 0;
        if (
          Math.hypot(
            old.x + tx * along - leader.x,
            old.z + tz * along - leader.z,
          ) < PERSONAL_SPACE
        ) {
          const detour = {
            x: leader.x + behind.x * 1.5,
            z: leader.z + behind.z * 1.5,
          };
          if (clear(detour)) destination = detour;
        }
        const dx = destination.x - old.x,
          dz = destination.z - old.z;
        const distance = Math.hypot(dx, dz);
        const seconds = Number.isFinite(delta)
          ? THREE.MathUtils.clamp(delta, 0, 0.5)
          : 0;
        if (distance > 0.025 && seconds > 0) {
          moveWithCollisions(
            root.position,
            { x: (dx / distance) * 6, z: (dz / distance) * 6 },
            Math.min(seconds, distance / 6),
            (position) => {
              // Bounded alternating projections retain world clearance even
              // when the moving leader temporarily crowds the follower.
              for (let attempt = 0; attempt < 3; attempt++) {
                resolveCollisions(position);
                const sx = position.x - leader.x,
                  sz = position.z - leader.z;
                const separation = Math.hypot(sx, sz);
                if (separation >= PERSONAL_SPACE) break;
                position.x =
                  leader.x +
                  (separation > 0 ? sx / separation : right.x) * PERSONAL_SPACE;
                position.z =
                  leader.z +
                  (separation > 0 ? sz / separation : right.z) * PERSONAL_SPACE;
              }
            },
          );
        }
        if (!clear(root.position)) {
          root.position.x = old.x;
          root.position.z = old.z;
          if (!clear(root.position)) {
            root.visible = false;
            placed = false;
            visual.animate(0, false, options.reducedMotion, false);
            return;
          }
        }
        root.position.y = leader.y ?? 0;
      }
      root.visible = true;
      const moved =
        !reset &&
        Math.hypot(root.position.x - old.x, root.position.z - old.z) > 0.001;
      root.rotation.y = moved
        ? Math.atan2(old.x - root.position.x, old.z - root.position.z)
        : leaderYaw;
      visual.animate(
        Number.isFinite(delta) ? THREE.MathUtils.clamp(delta, 0, 0.5) : 0,
        moved,
        options.reducedMotion,
        Boolean(options.greeting && !options.moving && !moved),
      );
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      visual.dispose();
    },
  };
}
