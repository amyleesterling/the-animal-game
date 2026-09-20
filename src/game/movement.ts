export type GroundPosition = { x: number; z: number };

/** Consume visible elapsed time without stepping over a small solid obstacle. */
export function moveWithCollisions(
  position: GroundPosition,
  velocity: GroundPosition,
  seconds: number,
  resolveCollision: (position: GroundPosition) => void,
): void {
  const distance = Math.hypot(velocity.x, velocity.z) * seconds;
  if (!Number.isFinite(distance) || distance <= 0) return;
  // The smallest tree exclusion radius is greater than 0.6 world units.
  const steps = Math.ceil(distance / 0.2);
  const stepSeconds = seconds / steps;
  for (let step = 0; step < steps; step++) {
    position.x += velocity.x * stepSeconds;
    position.z += velocity.z * stepSeconds;
    resolveCollision(position);
  }
}

/** Advance an assisted walk using visible elapsed time, including slow frames. */
export function stepToward(
  position: GroundPosition,
  destination: GroundPosition,
  seconds: number,
  speed: number,
): boolean {
  const dx = destination.x - position.x;
  const dz = destination.z - position.z;
  const distance = Math.hypot(dx, dz);
  const step = Math.max(0, seconds) * speed;
  if (distance <= step) {
    position.x = destination.x;
    position.z = destination.z;
    return true;
  }
  if (distance > 0) {
    position.x += (dx / distance) * step;
    position.z += (dz / distance) * step;
  }
  return false;
}
