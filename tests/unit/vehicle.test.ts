import { describe, expect, it } from "vitest";
import {
  findVehicleExit,
  SAFARI_BOUNDS,
  stepVehicle,
  stopVehicle,
  vehicleDestination,
  vehicleIsClear,
  VEHICLE_MAX_SPEED,
  VEHICLE_REVERSE_SPEED,
  type VehicleInput,
  type VehicleState,
} from "../../src/game/vehicle";

const parked = (): VehicleState => ({
  x: 0,
  z: 0,
  heading: 0,
  speed: 0,
  steering: 0,
});
const forward: VehicleInput = { throttle: 1, steer: 0, brake: false };
const coast: VehicleInput = { throttle: 0, steer: 0, brake: false };

describe("safari jeep driving", () => {
  it("accelerates along the model's +X nose and caps forward/reverse speed", () => {
    const car = parked();
    stepVehicle(car, forward, 0.5, []);
    expect(car.speed).toBeCloseTo(1.9);
    expect(car.x).toBeGreaterThan(0);
    expect(car.z).toBe(0);
    for (let i = 0; i < 12; i++) stepVehicle(car, forward, 0.5, []);
    expect(car.speed).toBe(VEHICLE_MAX_SPEED);
    const reversed = parked();
    for (let i = 0; i < 8; i++)
      stepVehicle(reversed, { ...forward, throttle: -1 }, 0.5, []);
    expect(reversed.speed).toBe(-VEHICLE_REVERSE_SPEED);
    expect(reversed.x).toBeLessThan(0);
  });

  it("brakes before reversing and stops more quickly with the handbrake than coasting", () => {
    const moving = { ...parked(), speed: 6 };
    const rolling = { ...moving };
    const braking = { ...moving };
    stepVehicle(moving, { ...forward, throttle: -1 }, 0.5, []);
    expect(moving.speed).toBeGreaterThan(0);
    stepVehicle(moving, { ...forward, throttle: -1 }, 0.5, []);
    expect(moving.speed).toBeLessThanOrEqual(0);
    stepVehicle(rolling, coast, 0.5, []);
    stepVehicle(braking, { ...forward, brake: true }, 0.5, []);
    expect(braking.speed).toBeLessThan(rolling.speed);
    stepVehicle(braking, { ...forward, brake: true }, 0.5, []);
    expect(braking.speed).toBe(0);
  });

  it("turns naturally while moving, reverses steering in reverse, and cannot pivot while stopped", () => {
    const left = { ...parked(), speed: 4 };
    stepVehicle(left, { ...forward, steer: 1 }, 0.5, []);
    expect(left.heading).toBeGreaterThan(0);
    expect(left.z).toBeLessThan(0);
    const reverse = { ...parked(), speed: -2 };
    stepVehicle(reverse, { throttle: -1, steer: 1, brake: false }, 0.5, []);
    expect(reverse.heading).toBeLessThan(0);
    const still = parked();
    stepVehicle(still, { ...coast, steer: 1 }, 0.5, []);
    expect(still.heading).toBe(0);
    expect(still.x).toBe(0);
  });

  it("covers the same curved route at 60FPS and 2FPS", () => {
    const smooth = parked(),
      slow = parked();
    const turning = { ...forward, steer: -0.6 };
    for (let i = 0; i < 120; i++) stepVehicle(smooth, turning, 1 / 60, []);
    for (let i = 0; i < 4; i++) stepVehicle(slow, turning, 0.5, []);
    expect(slow.x).toBeCloseTo(smooth.x, 8);
    expect(slow.z).toBeCloseTo(smooth.z, 8);
    expect(slow.heading).toBeCloseTo(smooth.heading, 8);
    expect(slow.speed).toBeCloseTo(smooth.speed, 8);
  });

  it("caps a long suspended frame and ignores invalid elapsed time", () => {
    const car = { ...parked(), speed: 10 };
    stepVehicle(car, forward, 300, []);
    expect(car.x).toBeCloseTo(5);
    const snapshot = { ...car };
    for (const elapsed of [NaN, Infinity, -1, 0])
      stepVehicle(car, forward, elapsed, []);
    expect(car).toEqual(snapshot);
  });

  it("stops the full bumper before a tree even at two FPS, and can reverse away", () => {
    const car = { ...parked(), speed: 10 };
    const tree = [{ x: 7, z: 0, radius: 0.6 }];
    expect(stepVehicle(car, forward, 0.5, tree)).toBe(true);
    expect(car.x).toBeLessThanOrEqual(3.7);
    expect(car.speed).toBe(0);
    expect(vehicleIsClear(car, tree)).toBe(true);
    const before = car.x;
    stepVehicle(car, { ...forward, throttle: -1 }, 0.5, tree);
    expect(car.x).toBeLessThan(before);
  });

  it("checks the whole rotating footprint, not just the vehicle center", () => {
    const obstacle = [{ x: 0, z: 2.6, radius: 0.2 }];
    expect(vehicleIsClear(parked(), obstacle)).toBe(true);
    expect(
      vehicleIsClear({ ...parked(), heading: Math.PI / 2 }, obstacle),
    ).toBe(false);
    const car = { ...parked(), speed: 4 };
    const tree = [{ x: 3, z: -2.7, radius: 0.8 }];
    for (let i = 0; i < 40; i++) {
      stepVehicle(car, { ...forward, steer: 1 }, 1 / 60, tree);
      expect(vehicleIsClear(car, tree)).toBe(true);
    }
  });

  it("keeps every corner within world bounds and stops before water and animal exclusion circles", () => {
    const car = { ...parked(), x: 96, speed: 10, heading: 0.3 };
    stepVehicle(car, forward, 0.5, []);
    expect(vehicleIsClear(car, [])).toBe(true);
    expect(car.speed).toBe(0);
    expect(car.x).toBeLessThan(SAFARI_BOUNDS.maxX - 2.7);
    for (const radius of [2.8, 10.5]) {
      const animalOrPond = [{ x: radius + 7, z: 0, radius }];
      const approaching = { ...parked(), speed: 10 };
      stepVehicle(approaching, forward, 0.5, animalOrPond);
      expect(approaching.x).toBeLessThanOrEqual(4.3);
      expect(vehicleIsClear(approaching, animalOrPond)).toBe(true);
    }
  });

  it("finds a free side exit, refuses moving/enclosed exits, and respects boundaries", () => {
    expect(findVehicleExit(parked(), [])).toEqual({ x: 0, z: 3.3 });
    expect(findVehicleExit(parked(), [{ x: 0, z: 3.3, radius: 1 }])).toEqual({
      x: 0,
      z: -3.3,
    });
    expect(findVehicleExit({ ...parked(), speed: 0.8 }, [])).toBeNull();
    expect(findVehicleExit({ ...parked(), speed: -0.8 }, [])).toBeNull();
    expect(findVehicleExit(parked(), [{ x: 0, z: 0, radius: 5 }])).toBeNull();
    const exit = findVehicleExit(
      { ...parked(), z: SAFARI_BOUNDS.maxZ - 1.3 },
      [],
    );
    expect(exit!.z).toBeLessThan(SAFARI_BOUNDS.maxZ - 1.3);
  });

  it("reports clockwise-positive compass bearings relative to the model heading", () => {
    expect(vehicleDestination(parked(), { x: 10, z: 0 })).toEqual({
      distance: 10,
      bearing: 0,
    });
    expect(vehicleDestination(parked(), { x: 0, z: 10 }).bearing).toBeCloseTo(
      Math.PI / 2,
    );
    expect(vehicleDestination(parked(), { x: 0, z: -10 }).bearing).toBeCloseTo(
      -Math.PI / 2,
    );
    expect(
      vehicleDestination(
        { ...parked(), heading: Math.PI / 2 },
        { x: 0, z: -10 },
      ).bearing,
    ).toBeCloseTo(0);
  });

  it("clears speed and steering immediately when the world pauses", () => {
    const car = { ...parked(), speed: 9, steering: 0.3 };
    stopVehicle(car);
    expect(car.speed).toBe(0);
    expect(car.steering).toBe(0);
    const snapshot = { ...car };
    stepVehicle(car, coast, 0.5, []);
    expect(car).toEqual(snapshot);
  });
});
