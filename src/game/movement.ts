type GroundPosition = { x: number; z: number };

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
