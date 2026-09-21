import { describe, expect, it } from "vitest";
import {
  ARRIVAL_DURATION,
  ARRIVAL_ROUTE,
  ARRIVAL_STAGES,
  ARRIVAL_TIMING,
  sampleArrival,
} from "../../src/game/arrival-sequence";
import { SAFARI_BOUNDS, vehicleIsClear } from "../../src/game/vehicle";

const driveStart = ARRIVAL_TIMING.walking + ARRIVAL_TIMING.boarding;
const parkStart = driveStart + ARRIVAL_TIMING.driving;
const exitStart = parkStart + ARRIVAL_TIMING.parking;
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);

describe("the park arrival sequence", () => {
  it("walks both characters seven metres beside a stationary jeep", () => {
    const start = sampleArrival(0);
    expect(start.stage).toBe("walking");
    expect(start.sophia).toMatchObject({ x: -7, visible: true, moving: false });
    expect(start.cora).toMatchObject({ x: -7, visible: true, moving: false });
    expect(distance(ARRIVAL_ROUTE.sophiaStart, ARRIVAL_ROUTE.sophiaBoard)).toBe(
      7,
    );
    expect(distance(ARRIVAL_ROUTE.coraStart, ARRIVAL_ROUTE.coraBoard)).toBe(7);
    const middle = sampleArrival(ARRIVAL_TIMING.walking / 2);
    expect(middle.sophia.x).toBe(-3.5);
    expect(middle.cora.x).toBe(-3.5);
    expect(middle.sophia.heading).toBe(-Math.PI / 2);
    expect(middle.sophia.moving && middle.cora.moving).toBe(true);
    expect(middle.jeep).toEqual(start.jeep);
    expect(sampleArrival(ARRIVAL_TIMING.walking).sophia.x).toBe(0);
  });

  it("advances at exact stage boundaries and can jump across missed frames", () => {
    let elapsed = 0;
    for (const stage of ARRIVAL_STAGES) {
      const result = sampleArrival(elapsed);
      expect(result.stage).toBe(stage);
      expect(result.stageProgress).toBe(stage === "complete" ? 1 : 0);
      expect(result.complete).toBe(stage === "complete");
      if (stage === "complete") break;
      expect(sampleArrival(elapsed + ARRIVAL_TIMING[stage] - 1e-6).stage).toBe(
        stage,
      );
      elapsed += ARRIVAL_TIMING[stage];
    }
    expect(sampleArrival(exitStart + 1).stage).toBe("exiting");
    expect(sampleArrival(ARRIVAL_DURATION + 10_000).complete).toBe(true);
    expect(sampleArrival(1e-6).sophia.x).toBeGreaterThan(-7);
    expect(sampleArrival(1e-6).sophia.x).toBeLessThan(-6.99999);
  });

  it("pauses at boarding, hides passengers during travel and parks before exit", () => {
    const boarding = sampleArrival(ARRIVAL_TIMING.walking + 0.1);
    expect(boarding.sophia.visible && boarding.cora.visible).toBe(true);
    expect(boarding.sophia.moving || boarding.cora.moving).toBe(false);
    const boarded = sampleArrival(driveStart - 0.1);
    expect(boarded.sophia.visible || boarded.cora.visible).toBe(false);
    expect(boarded.jeep.speed).toBe(0);
    const driving = sampleArrival(driveStart + ARRIVAL_TIMING.driving / 2);
    expect(driving.sophia.visible || driving.cora.visible).toBe(false);
    expect(driving.jeep.speed).toBeGreaterThan(0);
    expect(driving.jeep.z).toBeLessThan(boarded.jeep.z - 20);
    const parked = sampleArrival(parkStart + 0.1);
    expect(parked.jeep).toEqual({ ...ARRIVAL_ROUTE.jeepEnd, speed: 0 });
    expect(parked.sophia.visible || parked.cora.visible).toBe(false);
    const exiting = sampleArrival(exitStart + 0.1);
    expect(exiting.sophia.visible && exiting.cora.visible).toBe(true);
    expect(exiting.sophia.moving && exiting.cora.moving).toBe(true);
    expect(exiting.jeep).toEqual(parked.jeep);
  });

  it("drives a visible 45–55m curve within bounds with correct model heading", () => {
    let length = 0;
    let previous = sampleArrival(driveStart).jeep;
    expect(previous.heading).toBeCloseTo(Math.PI / 2);
    expect(previous.speed).toBe(0);
    for (let i = 1; i <= 1_000; i++) {
      const time = driveStart + (i / 1_000) * ARRIVAL_TIMING.driving;
      const current = sampleArrival(time).jeep;
      length += distance(previous, current);
      expect(vehicleIsClear(current, [], SAFARI_BOUNDS)).toBe(true);
      expect(current.speed).toBeGreaterThanOrEqual(0);
      expect(current.speed).toBeLessThanOrEqual(10);
      if (i > 1 && i < 1_000) {
        // The Land Cruiser faces +X, unlike the characters' -Z forward axis.
        const heading = Math.atan2(
          -(current.z - previous.z),
          current.x - previous.x,
        );
        expect(Math.abs(heading - current.heading)).toBeLessThan(0.02);
      }
      previous = current;
    }
    expect(length).toBeGreaterThanOrEqual(45);
    expect(length).toBeLessThanOrEqual(55);
    expect(previous).toEqual({ ...ARRIVAL_ROUTE.jeepEnd, speed: 0 });
  });

  it("keeps visible characters separated and outside the parked jeep on exit", () => {
    for (let i = 0; i <= 100; i++) {
      const pose = sampleArrival(
        exitStart + (i / 100) * ARRIVAL_TIMING.exiting,
      );
      expect(distance(pose.sophia, pose.cora)).toBeCloseTo(1.25);
      for (const actor of [pose.sophia, pose.cora]) {
        expect(actor.visible).toBe(true);
        expect(distance(actor, pose.jeep)).toBeGreaterThan(3);
        expect(actor.x).toBeGreaterThanOrEqual(SAFARI_BOUNDS.minX);
        expect(actor.x).toBeLessThanOrEqual(SAFARI_BOUNDS.maxX);
        expect(actor.z).toBeGreaterThanOrEqual(SAFARI_BOUNDS.minZ);
        expect(actor.z).toBeLessThanOrEqual(SAFARI_BOUNDS.maxZ);
      }
    }
    const turning = sampleArrival(exitStart + ARRIVAL_TIMING.exiting * 0.9);
    expect(turning.sophia).toMatchObject({ x: 0, z: 16.5, moving: false });
    expect(turning.sophia.heading).toBeGreaterThan(0);
    expect(turning.sophia.heading).toBeLessThan(Math.PI / 2);
  });

  it("finishes at the existing zebra spawn for normal, skipped and reduced motion", () => {
    const end = sampleArrival(ARRIVAL_DURATION);
    expect(end).toEqual({
      stage: "complete",
      stageProgress: 1,
      complete: true,
      jeep: { x: 5.5, z: 12.5, heading: -0.12, speed: 0 },
      sophia: { x: 0, z: 16.5, heading: 0, visible: true, moving: false },
      cora: { x: 1.25, z: 16.5, heading: 0, visible: true, moving: false },
    });
    for (const time of [-1, 0, 2, driveStart + 1, Infinity, NaN])
      expect(sampleArrival(time, true)).toEqual(end);
    expect(sampleArrival(Infinity)).toEqual(end);
    expect(sampleArrival(ARRIVAL_DURATION + 1)).toEqual(end);
    for (const time of [-Infinity, -1, NaN])
      expect(sampleArrival(time)).toEqual(sampleArrival(0));
  });

  it("keeps the jeep continuous at all transitions and stops smoothly", () => {
    for (const time of [
      ARRIVAL_TIMING.walking,
      driveStart,
      parkStart,
      exitStart,
    ]) {
      const before = sampleArrival(time - 1e-5).jeep;
      const after = sampleArrival(time).jeep;
      expect(distance(before, after)).toBeLessThan(0.0001);
      expect(Math.abs(before.heading - after.heading)).toBeLessThan(0.0001);
      expect(Math.abs(before.speed - after.speed)).toBeLessThan(0.001);
    }
    const beforeEnd = sampleArrival(ARRIVAL_DURATION - 1e-5);
    const end = sampleArrival(ARRIVAL_DURATION);
    expect(distance(beforeEnd.sophia, end.sophia)).toBe(0);
    expect(distance(beforeEnd.cora, end.cora)).toBe(0);
    expect(beforeEnd.sophia.heading).toBeCloseTo(0);
  });

  it("owns no mutable animation state or shared return objects", () => {
    const expected = sampleArrival(driveStart + 1);
    for (const time of [ARRIVAL_DURATION, 0, parkStart, 0.5])
      sampleArrival(time);
    const changed = sampleArrival(driveStart + 1);
    changed.jeep.x = changed.sophia.x = changed.cora.x = 999;
    expect(sampleArrival(driveStart + 1)).toEqual(expected);
    const finished = sampleArrival(ARRIVAL_DURATION);
    finished.jeep.x = 999;
    expect(sampleArrival(ARRIVAL_DURATION).jeep.x).toBe(5.5);
    expect(ARRIVAL_ROUTE.jeepEnd.x).toBe(5.5);
  });
});
