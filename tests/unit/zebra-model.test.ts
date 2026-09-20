import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import {
  createModelMotion,
  disposeModelResources,
  loadZebraVisual,
  normalizeZebraModel,
} from "../../src/game/zebra-model";

function sourceMesh(): THREE.Group {
  // Use the shipped animal's actual positions to exercise anatomical regions.
  const file = readFileSync(
    new URL("../../public/models/zebra.glb", import.meta.url),
  );
  const jsonLength = file.readUInt32LE(12);
  const data = JSON.parse(file.toString("utf8", 20, 20 + jsonLength));
  const binaryOffset = 28 + jsonLength;
  const position =
    data.accessors[data.meshes[0].primitives[0].attributes.POSITION];
  const view = data.bufferViews[position.bufferView];
  const positions = new Float32Array(position.count * 3);
  for (let vertex = 0; vertex < position.count; vertex++) {
    const offset =
      binaryOffset +
      (view.byteOffset ?? 0) +
      (position.byteOffset ?? 0) +
      vertex * (view.byteStride ?? 12);
    for (let axis = 0; axis < 3; axis++)
      positions[vertex * 3 + axis] = file.readFloatLE(offset + axis * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const normals = new Float32Array(positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
  return group;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("imported zebra appearance", () => {
  it("grounds the shipped geometry at the configured height with its long axis facing X", () => {
    const root = normalizeZebraModel(sourceMesh(), "+z", 2.25);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    expect(bounds.min.y).toBeCloseTo(0);
    expect(size.y).toBeCloseTo(2.25);
    expect(size.x).toBeGreaterThan(2.8);
    expect(size.z).toBeLessThan(0.8);
    expect(bounds.min.x).toBeCloseTo(-bounds.max.x);
    disposeModelResources(root);
  });

  it("moves the lower legs while leaving the torso stable and feet above ground", () => {
    const root = normalizeZebraModel(sourceMesh(), "+z", 2.25);
    const mesh = root.children[0] as THREE.Mesh;
    const positions = mesh.geometry.getAttribute("position");
    const rest = Array.from(positions.array);
    const motion = createModelMotion(root);
    motion.animate(0.25, "walking", false);
    let movingLegVertices = 0;
    let stableTorsoVertices = 0;
    for (let i = 0; i < positions.count; i++) {
      const x = rest[i * 3],
        y = rest[i * 3 + 1];
      const change =
        Math.abs(positions.getX(i) - x) + Math.abs(positions.getY(i) - y);
      if (y < 0.5 && change > 0.01) movingLegVertices++;
      if (Math.abs(x) < 0.2 && y > 1.15) {
        expect(change).toBeLessThan(0.00001);
        stableTorsoVertices++;
      }
      expect(positions.getY(i)).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(positions.getX(i))).toBe(true);
    }
    expect(movingLegVertices).toBeGreaterThan(50);
    expect(stableTorsoVertices).toBeGreaterThan(20);
    disposeModelResources(root);
  });

  it("keeps a reduced-motion pose unchanged as time advances", () => {
    const root = normalizeZebraModel(sourceMesh(), "+z", 2.25);
    const mesh = root.children[0] as THREE.Mesh;
    const motion = createModelMotion(root);
    motion.animate(1, "walking", true);
    const firstPose = Array.from(mesh.geometry.getAttribute("position").array);
    motion.animate(9, "walking", true);
    expect(Array.from(mesh.geometry.getAttribute("position").array)).toEqual(
      firstPose,
    );
    disposeModelResources(root);
  });
});

describe("model resource lifetime", () => {
  it("rejects a textureless parsed mesh and disposes it instead of replacing the striped fallback", async () => {
    const source = sourceMesh();
    const mesh = source.children[0] as THREE.Mesh;
    const disposeGeometry = vi.spyOn(mesh.geometry, "dispose");
    const disposeMaterial = vi.spyOn(
      mesh.material as THREE.Material,
      "dispose",
    );
    vi.stubGlobal("document", { baseURI: "http://localhost/" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(new ArrayBuffer(32))),
    );
    vi.spyOn(GLTFLoader.prototype, "parseAsync").mockResolvedValue({
      scene: source,
    } as GLTF);
    await expect(
      loadZebraVisual(
        "/models/zebra.glb",
        "+z",
        2.25,
        new AbortController().signal,
      ),
    ).rejects.toThrow("stripe texture could not be decoded");
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
  });

  it("rejects real GLB texture-decoder failures and releases every embedded image URL", async () => {
    const bytes = readFileSync(
      new URL("../../public/models/zebra.glb", import.meta.url),
    );
    const fetchBlob = globalThis.fetch;
    vi.stubGlobal("document", { baseURI: "http://localhost/" });
    vi.stubGlobal("self", { URL });
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
        String(input) === "/models/zebra.glb"
          ? Promise.resolve(new Response(new Uint8Array(bytes).buffer))
          : fetchBlob(input, init),
      ),
    );
    const decode = vi
      .fn()
      .mockRejectedValue(new Error("Image decoding unavailable"));
    vi.stubGlobal("createImageBitmap", decode);
    const createUrl = vi.spyOn(URL, "createObjectURL");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      loadZebraVisual(
        "/models/zebra.glb",
        "+z",
        2.25,
        new AbortController().signal,
      ),
    ).rejects.toThrow("stripe texture could not be decoded");
    expect(decode).toHaveBeenCalledTimes(3);
    expect(createUrl).toHaveBeenCalledTimes(3);
    for (const result of createUrl.mock.results)
      expect(revokeUrl).toHaveBeenCalledWith(result.value);
  });

  it("disposes every texture role and closes each owned bitmap only once", () => {
    const source = sourceMesh();
    const mesh = source.children[0] as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    const close = vi.fn();
    const texture = new THREE.Texture({ close } as unknown as HTMLImageElement);
    material.map = texture;
    material.normalMap = texture;
    material.roughnessMap = texture;
    material.metalnessMap = texture;
    const disposeTexture = vi.spyOn(texture, "dispose");
    const disposeGeometry = vi.spyOn(mesh.geometry, "dispose");
    const disposeMaterial = vi.spyOn(material, "dispose");
    disposeModelResources(source);
    expect(disposeTexture).toHaveBeenCalledTimes(1);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("disposes a parse that finishes after its owning view closes", async () => {
    const source = sourceMesh();
    const mesh = source.children[0] as THREE.Mesh;
    const disposeGeometry = vi.spyOn(mesh.geometry, "dispose");
    const disposeMaterial = vi.spyOn(
      mesh.material as THREE.Material,
      "dispose",
    );
    vi.stubGlobal("document", { baseURI: "http://localhost/" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(new ArrayBuffer(32))),
    );
    let completeParse!: (asset: GLTF) => void;
    const parse = vi
      .spyOn(GLTFLoader.prototype, "parseAsync")
      .mockImplementation(
        () =>
          new Promise<GLTF>((resolve) => {
            completeParse = resolve;
          }),
      );
    const controller = new AbortController();
    const loading = loadZebraVisual(
      "/models/zebra.glb",
      "+z",
      2.25,
      controller.signal,
    );
    const rejected = expect(loading).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() => expect(parse).toHaveBeenCalledOnce());
    controller.abort();
    completeParse({ scene: source } as GLTF);
    await rejected;
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
  });

  it("does not start parsing when the request was cancelled while downloading", async () => {
    vi.stubGlobal("document", { baseURI: "http://localhost/" });
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        controller.abort();
        return new Response(new ArrayBuffer(32));
      }),
    );
    const parse = vi.spyOn(GLTFLoader.prototype, "parseAsync");
    await expect(
      loadZebraVisual("/models/zebra.glb", "+z", 2.25, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(parse).not.toHaveBeenCalled();
  });
});
