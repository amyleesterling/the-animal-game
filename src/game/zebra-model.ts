import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { AnimalBehavior } from "./contracts";

export type ModelState = "loading" | "loaded" | "fallback";
export type ForwardAxis = "+x" | "-x" | "+z" | "-z";
export interface ModelVisual {
  root: THREE.Group;
  animate(time: number, behavior: AnimalBehavior, reducedMotion: boolean): void;
}

/** Geometry, material, textures, and decoded bitmaps belong to one visual only. */
export function disposeModelResources(scene: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const images = new Set<{ close(): void }>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const owned = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of owned) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (!(value instanceof THREE.Texture)) continue;
        textures.add(value);
        const image: unknown = value.source.data;
        if (
          image &&
          typeof image === "object" &&
          "close" in image &&
          typeof image.close === "function"
        )
          images.add(image as { close(): void });
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
  images.forEach((bitmap) => bitmap.close());
}

/** Bake node transforms into independent geometry, +X forward and feet at Y=0. */
export function normalizeZebraModel(
  source: THREE.Group,
  forward: ForwardAxis,
  targetHeight: number,
): THREE.Group {
  const yaw = { "+x": 0, "-x": Math.PI, "+z": Math.PI / 2, "-z": -Math.PI / 2 }[
    forward
  ];
  const orientation = new THREE.Matrix4().makeRotationY(yaw);
  source.updateMatrixWorld(true);
  const orientedBounds = new THREE.Box3()
    .setFromObject(source)
    .applyMatrix4(orientation);
  const size = orientedBounds.getSize(new THREE.Vector3());
  if (
    !Number.isFinite(size.y) ||
    size.y <= 0 ||
    !Number.isFinite(targetHeight) ||
    targetHeight <= 0
  )
    throw new Error("The zebra model has invalid dimensions.");
  const scale = targetHeight / size.y;
  const center = orientedBounds.getCenter(new THREE.Vector3());
  const normalize = new THREE.Matrix4()
    .makeTranslation(
      -center.x * scale,
      -orientedBounds.min.y * scale,
      -center.z * scale,
    )
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(orientation);
  const meshes: THREE.Mesh[] = [];
  source.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  if (meshes.length === 0) throw new Error("The zebra model contains no mesh.");
  const root = new THREE.Group();
  root.name = "meshy-zebra-visual";
  const replacedGeometry = new Set<THREE.BufferGeometry>();
  for (const mesh of meshes) {
    replacedGeometry.add(mesh.geometry);
    mesh.geometry = mesh.geometry
      .clone()
      .applyMatrix4(normalize.clone().multiply(mesh.matrixWorld));
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // Small runtime pose offsets extend the static bounds.
    mesh.updateMatrix();
    root.add(mesh);
  }
  replacedGeometry.forEach((geometry) => geometry.dispose());
  return root;
}

type DeformedMesh = {
  geometry: THREE.BufferGeometry;
  positions: THREE.BufferAttribute;
  normals: THREE.BufferAttribute;
  restPositions: Float32Array;
  restNormals: Float32Array;
  legWeights: Float32Array;
  headWeights: Float32Array;
  legIndices: Uint8Array;
};

/** A small runtime pose system for this static mesh; the asset has no animation clips. */
export function createModelMotion(root: THREE.Group): ModelVisual {
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const pivots = [
    new THREE.Vector3(-size.x * 0.27, size.y * 0.44, -size.z * 0.3),
    new THREE.Vector3(-size.x * 0.27, size.y * 0.44, size.z * 0.3),
    new THREE.Vector3(size.x * 0.16, size.y * 0.44, -size.z * 0.3),
    new THREE.Vector3(size.x * 0.16, size.y * 0.44, size.z * 0.3),
  ];
  const headPivot = new THREE.Vector3(size.x * 0.1, size.y * 0.53, 0);
  const deformed: DeformedMesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry;
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const positions = geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
    const restPositions = new Float32Array(positions.count * 3);
    const restNormals = new Float32Array(normals.count * 3);
    const legWeights = new Float32Array(positions.count);
    const headWeights = new Float32Array(positions.count);
    const legIndices = new Uint8Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i),
        z = positions.getZ(i);
      restPositions.set([x, y, z], i * 3);
      restNormals.set(
        [normals.getX(i), normals.getY(i), normals.getZ(i)],
        i * 3,
      );
      // Exclude the tail at the rear midline. Smooth falloff keeps the torso still.
      if (
        Math.abs(z) > size.z * 0.1 &&
        x > bounds.min.x + size.x * 0.13 &&
        x < bounds.max.x - size.x * 0.2
      ) {
        legWeights[i] =
          1 - THREE.MathUtils.smoothstep(y, size.y * 0.25, size.y * 0.48);
        legIndices[i] = (x > 0 ? 2 : 0) + (z > 0 ? 1 : 0);
      }
      headWeights[i] =
        THREE.MathUtils.smoothstep(x, size.x * 0.09, size.x * 0.28) *
        THREE.MathUtils.smoothstep(y, size.y * 0.4, size.y * 0.6);
    }
    positions.setUsage(THREE.DynamicDrawUsage);
    normals.setUsage(THREE.DynamicDrawUsage);
    deformed.push({
      geometry,
      positions,
      normals,
      restPositions,
      restNormals,
      legWeights,
      headWeights,
      legIndices,
    });
  });
  let headAngle = 0;
  let previousHeadAngle = Number.NaN;
  let previousStride = Number.NaN;
  let lastTime: number | undefined;
  return {
    root,
    animate(time, behavior, reducedMotion) {
      const walking = behavior === "walking" || behavior === "retreating";
      const pace = behavior === "retreating" ? 9 : 5;
      const amplitude = behavior === "retreating" ? 0.28 : 0.2;
      const targetHead =
        behavior === "grazing" ? -0.48 : behavior === "alert" ? 0.05 : -0.04;
      const delta =
        lastTime === undefined
          ? 1 / 60
          : Math.max(0, Math.min(time - lastTime, 1));
      lastTime = time;
      headAngle = reducedMotion
        ? targetHead
        : THREE.MathUtils.lerp(headAngle, targetHead, 1 - Math.exp(-5 * delta));
      if (Math.abs(headAngle - targetHead) < 0.0001) headAngle = targetHead;
      const stride =
        walking && !reducedMotion ? Math.sin(time * pace) * amplitude : 0;
      if (headAngle === previousHeadAngle && stride === previousStride) return;
      previousHeadAngle = headAngle;
      previousStride = stride;
      for (const mesh of deformed) {
        for (let i = 0; i < mesh.positions.count; i++) {
          const offset = i * 3;
          let x = mesh.restPositions[offset],
            y = mesh.restPositions[offset + 1];
          let nx = mesh.restNormals[offset],
            ny = mesh.restNormals[offset + 1];
          const leg = mesh.legIndices[i];
          const legAngle =
            stride * (leg === 0 || leg === 3 ? 1 : -1) * mesh.legWeights[i];
          for (let joint = 0; joint < 2; joint++) {
            const angle =
              joint === 0 ? legAngle : headAngle * mesh.headWeights[i];
            const pivot = joint === 0 ? pivots[leg] : headPivot;
            if (angle === 0) continue;
            const sin = Math.sin(angle),
              cos = Math.cos(angle);
            const dx = x - pivot.x,
              dy = y - pivot.y;
            x = pivot.x + dx * cos - dy * sin;
            y = Math.max(0, pivot.y + dx * sin + dy * cos);
            const rotatedNX = nx * cos - ny * sin;
            ny = nx * sin + ny * cos;
            nx = rotatedNX;
          }
          mesh.positions.setXYZ(i, x, y, mesh.restPositions[offset + 2]);
          mesh.normals.setXYZ(i, nx, ny, mesh.restNormals[offset + 2]);
        }
        mesh.positions.needsUpdate = true;
        mesh.normals.needsUpdate = true;
      }
    },
  };
}

export async function loadZebraVisual(
  assetPath: string,
  forward: ForwardAxis,
  targetHeight: number,
  signal: AbortSignal,
): Promise<ModelVisual> {
  // Each parse owns its textures and geometry. The browser can cache the GLB bytes,
  // but closing a field-book renderer cannot dispose the herd's GPU resources.
  const response = await fetch(assetPath, { signal });
  if (!response.ok)
    throw new Error(`Zebra asset could not load (${response.status}).`);
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  const basePath = new URL(".", new URL(assetPath, document.baseURI)).href;
  const blobUrls = new Set<string>();
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (url.startsWith("blob:")) blobUrls.add(url);
    return url;
  });
  let ownedScene: THREE.Group | undefined;
  try {
    const gltf = await new GLTFLoader(manager).parseAsync(bytes, basePath);
    ownedScene = gltf.scene;
    signal.throwIfAborted();
    // GLTFLoader tolerates failed image decoding by resolving without a map.
    // A zebra without its stripe texture is not a successful imported visual.
    ownedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        const image = (material as THREE.MeshStandardMaterial).map?.source
          .data as { width?: number; height?: number } | undefined;
        if (!image || !(Number(image.width) > 0) || !(Number(image.height) > 0))
          throw new Error("The zebra's stripe texture could not be decoded.");
      }
    });
    ownedScene = normalizeZebraModel(ownedScene, forward, targetHeight);
    return createModelMotion(ownedScene);
  } catch (error) {
    if (ownedScene) disposeModelResources(ownedScene);
    throw error;
  } finally {
    // Three revokes its temporary image URLs on success; also cover decode
    // failure and aborted owners. Revoking an already revoked URL is harmless.
    blobUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}
