import { describe, expect, it } from "vitest";
import { stepToward } from "../../src/game/movement";

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
