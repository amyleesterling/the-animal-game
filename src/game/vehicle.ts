import type { GroundPosition } from "./movement";

export interface VehicleState extends GroundPosition {
  /** Three.js Y rotation. The model faces +X at zero. */
  heading: number;
  speed: number;
  steering: number;
}
export interface VehicleInput {
  throttle: number;
  /** Positive steers left; reversing naturally reverses the turn. */
  steer: number;
  brake: boolean;
}
export interface VehicleObstacle extends GroundPosition {
  radius: number;
}
export interface VehicleBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
export const SAFARI_BOUNDS: VehicleBounds = {
  minX: -100,
  maxX: 100,
  minZ: -110,
  maxZ: 85,
};
// Covers both the ~5m imported Land Cruiser and its procedural fallback.
export const VEHICLE_FOOTPRINT = { halfLength: 2.7, halfWidth: 1.25 };
export const VEHICLE_MAX_SPEED = 10;
export const VEHICLE_REVERSE_SPEED = 3.5;
export const VEHICLE_EXIT_SPEED = 0.8;
export const VEHICLE_ENTRY_RANGE = 8;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const toward = (value: number, target: number, amount: number) =>
  value < target
    ? Math.min(target, value + amount)
    : Math.max(target, value - amount);

/** Oriented rectangle versus circles, including all four corners at world edges. */
export function vehicleIsClear(
  state: Pick<VehicleState, "x" | "z" | "heading">,
  obstacles: readonly VehicleObstacle[],
  bounds: VehicleBounds = SAFARI_BOUNDS,
): boolean {
  const cos = Math.cos(state.heading),
    sin = Math.sin(state.heading);
  const { halfLength, halfWidth } = VEHICLE_FOOTPRINT;
  const extentX = Math.abs(cos) * halfLength + Math.abs(sin) * halfWidth;
  const extentZ = Math.abs(sin) * halfLength + Math.abs(cos) * halfWidth;
  if (
    state.x - extentX < bounds.minX ||
    state.x + extentX > bounds.maxX ||
    state.z - extentZ < bounds.minZ ||
    state.z + extentZ > bounds.maxZ
  )
    return false;
  for (const obstacle of obstacles) {
    const dx = obstacle.x - state.x,
      dz = obstacle.z - state.z;
    const along = dx * cos - dz * sin,
      across = dx * sin + dz * cos;
    const gapX = along - clamp(along, -halfLength, halfLength);
    const gapZ = across - clamp(across, -halfWidth, halfWidth);
    if (gapX * gapX + gapZ * gapZ < obstacle.radius * obstacle.radius)
      return false;
  }
  return true;
}

export function stopVehicle(state: VehicleState): void {
  state.speed = 0;
  state.steering = 0;
}

/** Bounded 60Hz simulation: a slow frame is at most 0.5s / 30 small steps. */
export function stepVehicle(
  state: VehicleState,
  input: VehicleInput,
  elapsed: number,
  obstacles: readonly VehicleObstacle[],
  bounds: VehicleBounds = SAFARI_BOUNDS,
): boolean {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return false;
  const duration = Math.min(elapsed, 0.5);
  const steps = Math.ceil(duration * 60);
  const dt = duration / steps;
  const throttle = clamp(input.throttle, -1, 1);
  const steer = clamp(input.steer, -1, 1);
  let collided = false;
  for (let i = 0; i < steps; i++) {
    if (input.brake) state.speed = toward(state.speed, 0, 10 * dt);
    else if (throttle === 0) state.speed = toward(state.speed, 0, 1.6 * dt);
    else if (state.speed * throttle < 0)
      state.speed = toward(state.speed, 0, 7.5 * dt);
    else state.speed += throttle * (throttle > 0 ? 3.8 : 2.8) * dt;
    state.speed = clamp(state.speed, -VEHICLE_REVERSE_SPEED, VEHICLE_MAX_SPEED);
    const steeringTarget = (steer * 0.5) / (1 + Math.abs(state.speed) * 0.035);
    state.steering = toward(state.steering, steeringTarget, 2.8 * dt);
    const turn = (state.speed / 2.9) * Math.tan(state.steering) * dt;
    const middle = state.heading + turn / 2;
    const candidate = {
      x: state.x + Math.cos(middle) * state.speed * dt,
      z: state.z - Math.sin(middle) * state.speed * dt,
      heading: state.heading + turn,
    };
    // Reject translation AND rotation when the swept small step hits an obstacle.
    if (vehicleIsClear(candidate, obstacles, bounds)) {
      state.x = candidate.x;
      state.z = candidate.z;
      state.heading = Math.atan2(
        Math.sin(candidate.heading),
        Math.cos(candidate.heading),
      );
    } else {
      state.speed = 0;
      collided = true;
      break;
    }
  }
  return collided;
}

/** Relative bearing is clockwise-positive for a conventional compass arrow. */
export function vehicleDestination(
  state: VehicleState,
  target: GroundPosition,
) {
  const dx = target.x - state.x,
    dz = target.z - state.z;
  const forward = dx * Math.cos(state.heading) - dz * Math.sin(state.heading);
  const right = dx * Math.sin(state.heading) + dz * Math.cos(state.heading);
  return { distance: Math.hypot(dx, dz), bearing: Math.atan2(right, forward) };
}

/** Find a place outside the parked car and every solid object for Soph's feet. */
export function findVehicleExit(
  state: VehicleState,
  obstacles: readonly VehicleObstacle[],
  bounds: VehicleBounds = SAFARI_BOUNDS,
): GroundPosition | null {
  if (Math.abs(state.speed) >= VEHICLE_EXIT_SPEED) return null;
  const cos = Math.cos(state.heading),
    sin = Math.sin(state.heading);
  // Side exits clear the existing walking controller's 3m parked-car exclusion.
  const candidates = [
    [0, 3.3],
    [0, -3.3],
    [-1.2, 3.3],
    [-1.2, -3.3],
    [-3.7, 0],
    [3.7, 0],
  ];
  const radius = 0.4;
  for (const [along, across] of candidates) {
    const point = {
      x: state.x + cos * along + sin * across,
      z: state.z - sin * along + cos * across,
    };
    if (
      point.x - radius < bounds.minX ||
      point.x + radius > bounds.maxX ||
      point.z - radius < bounds.minZ ||
      point.z + radius > bounds.maxZ
    )
      continue;
    if (
      obstacles.every(
        (obstacle) =>
          Math.hypot(point.x - obstacle.x, point.z - obstacle.z) >=
          obstacle.radius + radius,
      )
    )
      return point;
  }
  return null;
}
