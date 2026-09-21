import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { expansionStops } from "../../src/content/savanna-expansion";
import { safariStops, safariStoryStops } from "../../src/content/safari";
import {
  createSafariModelQueue,
  frameSafariPhoto,
  prioritizeSafariModels,
  safariViewpoints,
} from "../../src/game/safari-world";
import { collectSafariEncounters } from "../../src/game/encounters";
import { SAFARI_BOUNDS, vehicleIsClear } from "../../src/game/vehicle";
import type { SafariStop } from "../../src/safari-contracts";
import type { SafariModel } from "../../src/game/safari-model";

function fixture(): SafariModel {
  return {
    root: new THREE.Group(),
    size: new THREE.Vector3(1, 1, 1),
    dispose: vi.fn(),
  };
}

function deferredLoader() {
  const requests: {
    entry: SafariStop;
    signal: AbortSignal;
    resolve: (model: SafariModel) => void;
    reject: (error: Error) => void;
  }[] = [];
  const load = vi.fn(
    (entry: SafariStop, signal: AbortSignal) =>
      new Promise<SafariModel>((resolve, reject) =>
        requests.push({ entry, signal, resolve, reject }),
      ),
  );
  return { load, requests };
}

describe("savanna discovery clearings", () => {
  it("registers every bonus profile with its own asset and honest small-animal presentation", () => {
    expect(expansionStops).toHaveLength(25);
    expect(safariStoryStops).toHaveLength(7);
    expect(safariStops).toHaveLength(32);
    expect(new Set(safariStops.map((stop) => stop.id)).size).toBe(32);
    for (const stop of expansionStops) {
      expect(stop.profile?.id).toBe(stop.id);
      expect(stop.modelPath).toBe(`/models/savanna-expansion/${stop.id}.glb`);
      expect(stop.height).toBeGreaterThan(0);
      expect(stop.question).toBe(stop.profile?.questions[0]);
      if (stop.profile?.group === "Insect") {
        expect(stop.habitatFeature).toBe("insect");
        expect(stop.viewingNote).toMatch(/Enlarged.*real size/i);
      }
    }
    const underground = expansionStops.find(
      (stop) => stop.id === "naked-mole-rat",
    )!;
    expect(underground.habitatFeature).toBe("burrow");
    expect(underground.viewingNote).toMatch(/burrow cutaway.*underground/i);
  });

  it("keeps every arrival, protected guide endpoint and parked jeep clear of other animals and the pond", () => {
    const obstacles = [
      { x: 59, z: -34, radius: 10.5 },
      ...safariStops.map((stop) => ({
        x: stop.position[0],
        z: stop.position[2],
        radius: Math.max(2.4, stop.height * 1.3 + 0.7),
      })),
    ];
    const loaded = new Set(safariStops.map((stop) => stop.id));
    for (const stop of safariStops) {
      const views = safariViewpoints(stop);
      expect(
        vehicleIsClear(
          { x: views.jeep.x, z: views.jeep.z, heading: -0.12 },
          obstacles,
        ),
      ).toBe(true);
      for (const point of [views.arrival, views.observation]) {
        expect(point.x).toBeGreaterThan(SAFARI_BOUNDS.minX);
        expect(point.x).toBeLessThan(SAFARI_BOUNDS.maxX);
        expect(point.z).toBeGreaterThan(SAFARI_BOUNDS.minZ);
        expect(point.z).toBeLessThan(SAFARI_BOUNDS.maxZ);
        for (const obstacle of obstacles)
          expect(
            Math.hypot(point.x - obstacle.x, point.z - obstacle.z),
          ).toBeGreaterThan(obstacle.radius + 0.3);
      }
      const atArrival = collectSafariEncounters(
        safariStops,
        views.arrival,
        loaded,
      ).filter((animal) => animal.distance <= animal.range);
      expect(
        atArrival,
        `${stop.id} arrival should not trigger another encounter`,
      ).toEqual([]);
      const atObservation = collectSafariEncounters(
        safariStops,
        views.observation,
        loaded,
      ).filter((animal) => animal.distance <= animal.range);
      expect(atObservation.map((animal) => animal.id)).toEqual([stop.id]);
    }
  });

  it("loads a remotely selected discovery first, then only the nearest eight within the streaming radius", () => {
    const selected = expansionStops.find((stop) => stop.id === "aardvark")!;
    const priority = prioritizeSafariModels(safariStops, selected.id, {
      x: 0,
      z: 16.5,
    });
    expect(priority[0]).toBe(selected.id);
    expect(priority[1]).toBe("plains-zebra");
    expect(priority.length).toBeLessThanOrEqual(8);
    for (const id of priority.slice(1)) {
      const stop = safariStops.find((entry) => entry.id === id)!;
      expect(
        Math.hypot(stop.position[0], stop.position[2] - 16.5),
      ).toBeLessThanOrEqual(50);
    }
    expect(priority).not.toContain("naked-mole-rat");
  });

  it.each([0.5, 4 / 3, 3.6])(
    "makes a small animal fill a macro photo at aspect %s without clipping",
    (aspect) => {
      const bounds = new THREE.Box3(
        new THREE.Vector3(-0.25, 0, -0.12),
        new THREE.Vector3(0.25, 0.4, 0.12),
      );
      const camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 320);
      const eye = new THREE.Vector3(0, 1.65, 7.5);
      frameSafariPhoto(camera, bounds, eye, true);
      const projections: THREE.Vector3[] = [];
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const point = new THREE.Vector3(x, y, z).project(camera);
            projections.push(point);
            expect(Math.abs(point.x)).toBeLessThan(0.91);
            expect(Math.abs(point.y)).toBeLessThan(0.91);
            expect(point.z).toBeGreaterThan(-1);
            expect(point.z).toBeLessThan(1);
          }
      const width =
        Math.max(...projections.map((p) => p.x)) -
        Math.min(...projections.map((p) => p.x));
      const height =
        Math.max(...projections.map((p) => p.y)) -
        Math.min(...projections.map((p) => p.y));
      expect(Math.max(width, height)).toBeGreaterThan(1.1);
      expect(
        camera.position.distanceTo(bounds.getCenter(new THREE.Vector3())),
      ).toBeLessThan(2);
    },
  );
});

describe("bounded animal model streaming", () => {
  it("limits parsing/downloads to two and selects the next job from the latest priorities", async () => {
    const loader = deferredLoader();
    const loaded = vi.fn();
    const queue = createSafariModelQueue(safariStops, {
      load: loader.load,
      loaded,
      failed: vi.fn(),
    });
    const ids = safariStops.slice(0, 8).map((stop) => stop.id);
    queue.update(ids);
    await vi.waitFor(() => expect(loader.requests).toHaveLength(2));
    expect(queue.pendingCount).toBe(2);
    expect(loader.requests.map((request) => request.entry.id)).toEqual(
      ids.slice(0, 2),
    );
    queue.update([ids[5], ...ids]);
    loader.requests[0].resolve(fixture());
    await vi.waitFor(() => expect(loader.requests).toHaveLength(3));
    expect(loader.requests[2].entry.id).toBe(ids[5]);
    expect(queue.pendingCount).toBe(2);
    queue.dispose();
    loader.requests[1].resolve(fixture());
    loader.requests[2].resolve(fixture());
    await vi.waitFor(() => expect(queue.pendingCount).toBe(0));
    expect(loaded).toHaveBeenCalledOnce();
  });

  it("aborts obsolete jobs, disposes late parsed models and releases evicted textures", async () => {
    const loader = deferredLoader();
    const loaded = vi.fn(),
      failed = vi.fn();
    const queue = createSafariModelQueue(safariStops, {
      load: loader.load,
      loaded,
      failed,
    });
    queue.update(safariStops.slice(0, 2).map((stop) => stop.id));
    await vi.waitFor(() => expect(loader.requests).toHaveLength(2));
    const obsolete = fixture(),
      kept = fixture(),
      next = fixture();
    loader.requests[0].resolve(kept);
    await vi.waitFor(() => expect(queue.models.size).toBe(1));
    queue.update([expansionStops[0].id]);
    expect(kept.dispose).toHaveBeenCalledOnce();
    expect(loader.requests[1].signal.aborted).toBe(true);
    await vi.waitFor(() => expect(loader.requests).toHaveLength(3));
    loader.requests[1].resolve(obsolete);
    loader.requests[2].resolve(next);
    await vi.waitFor(() =>
      expect(queue.models.has(expansionStops[0].id)).toBe(true),
    );
    expect(obsolete.dispose).toHaveBeenCalledOnce();
    expect(failed).not.toHaveBeenCalled();
    queue.dispose();
    queue.dispose();
    expect(next.dispose).toHaveBeenCalledOnce();
    expect(queue.models.size).toBe(0);
  });

  it("does not retry broken assets on every status tick, while continuing other jobs", async () => {
    const failed = vi.fn();
    const load = vi.fn(async (stop: SafariStop) => {
      if (stop.id === safariStops[0].id) throw new Error("Missing asset");
      return fixture();
    });
    const queue = createSafariModelQueue(safariStops, {
      load,
      loaded: vi.fn(),
      failed,
    });
    const ids = safariStops.slice(0, 4).map((stop) => stop.id);
    queue.update(ids);
    await vi.waitFor(() => expect(queue.models.size).toBe(3));
    for (let i = 0; i < 20; i++) queue.update(ids);
    expect(load).toHaveBeenCalledTimes(4);
    expect(failed).toHaveBeenCalledOnce();
    queue.dispose();
  });

  it("caps retained models at eight even when the caller supplies all 32", async () => {
    const models: SafariModel[] = [];
    const queue = createSafariModelQueue(safariStops, {
      load: async () => {
        const model = fixture();
        models.push(model);
        return model;
      },
      loaded: vi.fn(),
      failed: vi.fn(),
    });
    queue.update(safariStops.map((stop) => stop.id));
    await vi.waitFor(() => expect(queue.models.size).toBe(8));
    expect(models).toHaveLength(8);
    queue.dispose();
    models.forEach((model) => expect(model.dispose).toHaveBeenCalledOnce());
  });
});
