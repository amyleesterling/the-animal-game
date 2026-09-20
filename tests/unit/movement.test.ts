import { describe, expect, it } from "vitest";
import { moveWithCollisions, stepToward } from "../../src/game/movement";

describe("manual walking", () => {
  it("covers the same distance at 60 FPS, 2 FPS, and after a long visible frame", () => {
    for (const frameSeconds of [1 / 60, 0.5, 2]) {
      const position = { x: 0, z: 5 };
      for (let frame = 0; frame < Math.round(2 / frameSeconds); frame++)
        moveWithCollisions(position, { x: 0, z: -4.2 }, frameSeconds, () => {});
      expect(position.x).toBe(0);
      expect(position.z).toBeCloseTo(-3.4);
    }
  });

  it("cannot tunnel through a narrow tree exclusion circle during a long frame", () => {
    const position = { x: -3, z: 0 };
    moveWithCollisions(position, { x: 4.2, z: 0 }, 2, (point) => {
      const distance = Math.hypot(point.x, point.z);
      if (distance < 0.7 && distance > 0) {
        point.x *= 0.7 / distance;
        point.z *= 0.7 / distance;
      }
    });
    expect(position.x).toBeCloseTo(-0.7);
    expect(position.z).toBe(0);
  });

  it("cannot cross an elliptical watering hole between two distant frames", () => {
    const position = { x: -15, z: 0 };
    moveWithCollisions(position, { x: 4.2, z: 0 }, 8, (point) => {
      const distance = Math.sqrt((point.x / 10.3) ** 2 + (point.z / 7.5) ** 2);
      if (distance < 1 && distance > 0) {
        point.x /= distance;
        point.z /= distance;
      }
    });
    expect(position.x).toBeCloseTo(-10.3);
    expect(position.z).toBe(0);
  });

  it("preserves world bounds and does not move while paused", () => {
    const position = { x: 0, z: 5 };
    const constrain = (point: { x: number; z: number }) => {
      point.z = Math.max(-55, Math.min(20, point.z));
    };
    moveWithCollisions(position, { x: 0, z: -4.2 }, 0, constrain);
    expect(position).toEqual({ x: 0, z: 5 });
    moveWithCollisions(position, { x: 0, z: -4.2 }, 20, constrain);
    expect(position.z).toBe(-55);
  });
});

describe("guided walking", () => {
  it("covers the same ground at 60 FPS, 2 FPS, and after one long frame", () => {
    const destination = { x: 0, z: -10 };
    const positions = [1 / 60, 0.5, 2].map((frameSeconds) => {
      const position = { x: 0, z: 5 };
      for (let frame = 0; frame < Math.round(2 / frameSeconds); frame++)
        stepToward(position, destination, frameSeconds, 4.8);
      return position;
    });
    for (const position of positions) {
      expect(position.x).toBe(0);
      expect(position.z).toBeCloseTo(-4.6);
    }
  });

  it("stops at its destination without overshooting on a slow frame", () => {
    const position = { x: 1, z: 5 };
    const destination = { x: 4, z: -10 };
    expect(stepToward(position, destination, 10, 4.8)).toBe(true);
    expect(position).toEqual(destination);
    expect(stepToward(position, destination, 0.5, 4.8)).toBe(true);
    expect(position).toEqual(destination);
  });

  it("does not advance during a paused interval", () => {
    const position = { x: 0, z: 5 };
    const destination = { x: 0, z: -10 };
    expect(stepToward(position, destination, 0, 4.8)).toBe(false);
    expect(position).toEqual({ x: 0, z: 5 });
    stepToward(position, destination, 0.5, 4.8);
    expect(position.z).toBeCloseTo(2.6);
  });
});
