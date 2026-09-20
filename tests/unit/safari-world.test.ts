import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { safariStops } from "../../src/content/safari";
import {
  createSafariJeepFallback,
  loadSafariModel,
} from "../../src/game/safari-model";
import {
  frameSafariPhoto,
  safariViewpoints,
} from "../../src/game/safari-world";
import { disposeModelResources } from "../../src/game/zebra-model";
import { stepToward } from "../../src/game/movement";
import { VEHICLE_ENTRY_RANGE, VEHICLE_FOOTPRINT } from "../../src/game/vehicle";

function assetBytes(path: string) {
  return new Uint8Array(
    readFileSync(new URL(`../../public${path}`, import.meta.url)),
  ).buffer;
}
function decoder() {
  vi.stubGlobal("document", {
    baseURI: "https://example.test/the-animal-game/",
  });
  vi.stubGlobal("self", { URL });
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 1024, height: 1024, close: vi.fn() })),
  );
  const fetchBlob = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("blob:")) return fetchBlob(input, options);
      const path = new URL(url).pathname.replace("/the-animal-game", "");
      return Promise.resolve(new Response(assetBytes(path)));
    }),
  );
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("seven-stop safari world", () => {
  it.each(safariStops)(
    "grounds $name and fits its full real mesh into phone and landscape photos",
    async (stop) => {
      decoder();
      const model = await loadSafariModel(
        stop.modelPath,
        stop.forwardAxis,
        stop.height,
        new AbortController().signal,
      );
      model.root.position.set(...stop.position);
      model.root.rotation.y = -0.12;
      model.root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model.root);
      expect(bounds.min.y).toBeCloseTo(0);
      expect(bounds.max.y).toBeCloseTo(stop.height);
      let meshes = 0;
      model.root.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          meshes++;
          expect(object).not.toBeInstanceOf(THREE.SkinnedMesh);
          expect(object.frustumCulled).toBe(true);
          expect(
            (object.material as THREE.MeshStandardMaterial).map,
          ).toBeTruthy();
        }
      });
      expect(meshes).toBeGreaterThan(0);
      const views = safariViewpoints(stop);
      const eye = views.observation.clone().add(new THREE.Vector3(0, 1.65, 0));
      for (const aspect of [0.5, 4 / 3, 3.6]) {
        const camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 320);
        frameSafariPhoto(camera, bounds, eye);
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z]) {
              const projected = new THREE.Vector3(x, y, z).project(camera);
              expect(Math.abs(projected.x)).toBeLessThan(0.91);
              expect(Math.abs(projected.y)).toBeLessThan(0.91);
              expect(projected.z).toBeGreaterThan(-1);
              expect(projected.z).toBeLessThan(1);
            }
      }
      const geometry = model.root.children[0] as THREE.Mesh;
      const dispose = vi.spyOn(geometry.geometry, "dispose");
      model.dispose();
      model.dispose();
      expect(dispose).toHaveBeenCalledOnce();
    },
  );

  it("keeps every guide approach short, side-on, safe from the jeep, and stable at two FPS", () => {
    for (const stop of safariStops) {
      const views = safariViewpoints(stop);
      const origin = new THREE.Vector3(...stop.position);
      expect(views.arrival.distanceTo(origin)).toBeGreaterThan(
        views.encounterRange,
      );
      expect(views.observation.distanceTo(origin)).toBeLessThan(
        views.encounterRange,
      );
      expect(views.observation.distanceTo(origin)).toBeLessThan(
        views.photoRange,
      );
      expect(views.observation.x).toBe(stop.position[0]);
      expect(Math.abs(views.jeep.x - views.observation.x)).toBeGreaterThan(3);
      expect(views.jeep.distanceTo(views.arrival)).toBeLessThanOrEqual(
        VEHICLE_ENTRY_RANGE,
      );
      expect(views.jeep.distanceTo(views.observation)).toBeLessThanOrEqual(
        VEHICLE_ENTRY_RANGE,
      );
      const player = views.arrival.clone();
      let arrived = false;
      for (let i = 0; i < 5; i++)
        arrived = stepToward(player, views.observation, 0.5, 4.6);
      expect(arrived).toBe(true);
      expect(player.distanceTo(views.observation)).toBe(0);
    }
  });

  it("grounds the imported Land Cruiser with its long axis aligned to the parked fallback", async () => {
    decoder();
    const jeep = await loadSafariModel(
      "/models/safari-jeep.glb",
      "-x",
      2.6,
      new AbortController().signal,
    );
    const bounds = new THREE.Box3().setFromObject(jeep.root);
    expect(bounds.min.y).toBeCloseTo(0);
    expect(jeep.size.y).toBeCloseTo(2.6);
    expect(jeep.size.x).toBeGreaterThan(4.5);
    expect(jeep.size.x).toBeLessThan(5.5);
    expect(jeep.size.z).toBeGreaterThan(1.7);
    expect(jeep.size.z).toBeLessThan(2.2);
    expect(jeep.size.x).toBeLessThanOrEqual(VEHICLE_FOOTPRINT.halfLength * 2);
    expect(jeep.size.z).toBeLessThanOrEqual(VEHICLE_FOOTPRINT.halfWidth * 2);
    jeep.dispose();
  });

  it("resolves model downloads and GLTF resources beneath a Pages deployment subpath", async () => {
    decoder();
    const parse = vi.spyOn(GLTFLoader.prototype, "parseAsync");
    const signal = new AbortController().signal;
    const model = await loadSafariModel(
      "/models/zebra.glb",
      "+z",
      2.25,
      signal,
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://example.test/the-animal-game/models/zebra.glb",
      { signal },
    );
    expect(parse).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      "https://example.test/the-animal-game/models/",
    );
    model.dispose();
  });

  it("rejects missing decoded textures and revokes every temporary image URL", async () => {
    decoder();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("Cannot decode")),
    );
    const create = vi.spyOn(URL, "createObjectURL");
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      loadSafariModel(
        "/models/zebra.glb",
        "+z",
        2.25,
        new AbortController().signal,
      ),
    ).rejects.toThrow("texture could not be decoded");
    expect(create).toHaveBeenCalled();
    create.mock.results.forEach((result) =>
      expect(revoke).toHaveBeenCalledWith(result.value),
    );
  });

  it("releases a parsed model if its safari closes during the load", async () => {
    decoder();
    const scene = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial(),
    );
    scene.add(mesh);
    const dispose = vi.spyOn(mesh.geometry, "dispose");
    let complete!: (gltf: GLTF) => void;
    const parse = vi
      .spyOn(GLTFLoader.prototype, "parseAsync")
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      );
    const controller = new AbortController();
    const loading = loadSafariModel(
      "/models/zebra.glb",
      "+z",
      2.25,
      controller.signal,
    );
    const assertion = expect(loading).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() => expect(parse).toHaveBeenCalledOnce());
    controller.abort();
    complete({ scene } as GLTF);
    await assertion;
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("keeps an independently disposable roof-rack vehicle available while the jeep loads", () => {
    const jeep = createSafariJeepFallback();
    const bounds = new THREE.Box3().setFromObject(jeep);
    const size = bounds.getSize(new THREE.Vector3());
    expect(bounds.min.y).toBeGreaterThanOrEqual(0);
    expect(size.x).toBeGreaterThan(4);
    expect(size.z).toBeGreaterThan(2);
    expect(size.x).toBeLessThanOrEqual(VEHICLE_FOOTPRINT.halfLength * 2);
    expect(size.z).toBeLessThanOrEqual(VEHICLE_FOOTPRINT.halfWidth * 2);
    expect(bounds.max.y).toBeGreaterThan(2.6);
    expect(jeep.children.length).toBeGreaterThan(30);
    disposeModelResources(jeep);
  });
});
