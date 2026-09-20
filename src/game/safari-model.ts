import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  disposeModelResources,
  normalizeZebraModel,
  type ForwardAxis,
} from "./zebra-model";

export interface SafariModel {
  root: THREE.Group;
  size: THREE.Vector3;
  dispose(): void;
}

/** Static animals keep their authored pose; only Soph has a walking animation. */
export async function loadSafariModel(
  path: string,
  forward: ForwardAxis,
  height: number,
  signal: AbortSignal,
): Promise<SafariModel> {
  const url = new URL(
    path.startsWith("/") ? `.${path}` : path,
    document.baseURI,
  );
  const response = await fetch(url.href, { signal });
  if (!response.ok)
    throw new Error(`The safari model could not load (${response.status}).`);
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  const temporaryUrls = new Set<string>();
  const manager = new THREE.LoadingManager();
  let textureFailed = false;
  manager.onError = () => {
    textureFailed = true;
  };
  manager.setURLModifier((resource) => {
    if (resource.startsWith("blob:")) temporaryUrls.add(resource);
    return resource;
  });
  let owned: THREE.Group | undefined;
  try {
    const gltf = await new GLTFLoader(manager).parseAsync(
      bytes,
      new URL(".", url).href,
    );
    owned = gltf.scene;
    signal.throwIfAborted();
    if (textureFailed)
      throw new Error("A safari texture could not be decoded.");
    owned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object instanceof THREE.SkinnedMesh)
        throw new Error("This safari display expects a static model.");
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        const image = (material as THREE.MeshStandardMaterial).map?.source
          .data as { width?: number; height?: number } | undefined;
        if (!image || !(Number(image.width) > 0) || !(Number(image.height) > 0))
          throw new Error("A safari texture could not be decoded.");
      }
    });
    owned = normalizeZebraModel(owned, forward, height);
    owned.name = "safari-imported-model";
    owned.traverse((object) => {
      // Unlike the classic zebra's deformed poses, these static meshes keep
      // their normalized bounds and can be culled outside the current view.
      if (object instanceof THREE.Mesh) object.frustumCulled = true;
    });
    const root = owned;
    const size = new THREE.Box3()
      .setFromObject(root)
      .getSize(new THREE.Vector3());
    let disposed = false;
    return {
      root,
      size,
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        disposeModelResources(root);
        root.clear();
      },
    };
  } catch (error) {
    if (owned) disposeModelResources(owned);
    throw error;
  } finally {
    temporaryUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}

/** A recognizable roof-rack safari vehicle while the generated GLB loads. */
export function createSafariJeepFallback(): THREE.Group {
  const root = new THREE.Group();
  root.name = "safari-jeep-fallback";
  const paint = new THREE.MeshStandardMaterial({
    color: 0xc6bc88,
    roughness: 0.74,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0x3e473d,
    roughness: 0.7,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x272c29,
    roughness: 1,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x719a99,
    metalness: 0.28,
    roughness: 0.2,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xaab0a5,
    metalness: 0.5,
    roughness: 0.38,
  });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffedb6,
    emissive: 0xffd47d,
    emissiveIntensity: 0.12,
  });
  const box = (size: number[], at: number[], material: THREE.Material) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...(size as [number, number, number])),
      material,
    );
    mesh.position.set(...(at as [number, number, number]));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  // Long axis +X, matching the loaded model convention.
  box([4.4, 0.65, 1.8], [0, 0.9, 0], paint);
  box([2.8, 1.1, 1.74], [-0.5, 1.7, 0], paint);
  box([1.3, 0.38, 1.76], [1.55, 1.35, 0], paint);
  box([2.95, 0.1, 1.9], [-0.5, 2.29, 0], paint);
  for (const side of [-1, 1]) {
    box([2.4, 0.68, 0.024], [-0.55, 1.86, side * 0.88], glass);
    for (const x of [-1.64, -0.5, 0.63])
      box([0.085, 0.86, 0.05], [x, 1.83, side * 0.9], paint);
    box([3.4, 0.13, 0.22], [-0.05, 0.64, side * 0.98], trim);
    box([0.26, 0.07, 0.06], [-0.25, 1.4, side * 0.94], trim);
    box([0.16, 0.22, 0.18], [0.8, 1.88, side * 1.03], trim);
    for (const x of [-1.42, 1.42]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.46, 0.25, 18),
        rubber,
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.48, side * 0.97);
      wheel.castShadow = true;
      root.add(wheel);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.26, 12),
        chrome,
      );
      hub.rotation.x = Math.PI / 2;
      hub.position.copy(wheel.position);
      root.add(hub);
    }
    box([3.0, 0.08, 0.075], [-0.5, 2.53, side * 0.88], trim);
    for (const x of [-1.8, 0.8])
      box([0.065, 0.26, 0.065], [x, 2.41, side * 0.88], trim);
  }
  box([0.025, 0.76, 1.54], [0.92, 1.84, 0], glass);
  box([0.14, 0.33, 1.7], [2.25, 0.83, 0], trim);
  box([0.04, 0.38, 0.86], [2.23, 1.2, 0], trim);
  for (const z of [-0.63, 0.63]) box([0.06, 0.27, 0.31], [2.25, 1.25, z], lamp);
  for (const x of [-1.9, -1.3, -0.7, -0.1, 0.5, 0.95])
    box([0.055, 0.065, 1.82], [x, 2.41, 0], trim);
  box([0.85, 0.32, 0.68], [-1.02, 2.6, 0], trim);
  box([0.58, 0.24, 0.62], [0.06, 2.56, 0.1], paint);
  return root;
}
