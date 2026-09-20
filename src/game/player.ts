import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { disposeModelResources, type ModelState } from "./zebra-model";

export const PLAYER_ASSET_PATH = "/models/soph-walking.glb";
export const PLAYER_WALK_ANIMATION = "Walking_Woman";

export interface PlayerVisual {
  root: THREE.Group;
  animate(delta: number, moving: boolean, reducedMotion: boolean): void;
  dispose(): void;
}

/** Keep authored joint motion, but let the collision controller own travel. */
export function makeInPlaceClip(
  source: THREE.Group,
  animation: THREE.AnimationClip,
): THREE.AnimationClip {
  const clip = animation.clone();
  for (const track of clip.tracks) {
    const binding = THREE.PropertyBinding.parseTrackName(track.name);
    if (binding.propertyName !== "position" || track.getValueSize() !== 3)
      continue;
    const node = THREE.PropertyBinding.findNode(source, binding.nodeName);
    if (!(node instanceof THREE.Object3D) || node.parent instanceof THREE.Bone)
      continue;
    // Only the skeleton root or scene nodes can translate the whole character.
    // Preserve vertical body bounce and translations within the bone hierarchy.
    for (let index = 0; index < track.values.length; index += 3) {
      track.values[index] = track.values[0];
      track.values[index + 2] = track.values[2];
    }
  }
  return clip;
}

function disposePlayerResources(root: THREE.Group): void {
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
  });
  skeletons.forEach((skeleton) => skeleton.dispose());
  disposeModelResources(root);
}

/** Normalize a posed hierarchy without baking or detaching the skinned mesh. */
export function createPlayerModel(
  source: THREE.Group,
  animations: THREE.AnimationClip[],
): PlayerVisual {
  const animation = animations.find(
    (clip) => clip.name === PLAYER_WALK_ANIMATION,
  );
  if (!animation || animation.duration <= 0)
    throw new Error("Soph's walking animation is missing.");
  let hasSkeleton = false;
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object instanceof THREE.SkinnedMesh && object.skeleton.bones.length)
      hasSkeleton = true;
    object.castShadow = true;
    object.receiveShadow = true;
    // The skeleton moves outside the mesh's static bind-pose bounds.
    object.frustumCulled = false;
  });
  if (!hasSkeleton) throw new Error("Soph's skeleton is missing.");

  const root = new THREE.Group();
  root.name = "soph-walking-visual";
  const oriented = new THREE.Group();
  oriented.rotation.y = Math.PI; // Authored +Z faces the controller's -Z.
  oriented.add(source);
  root.add(oriented);
  const mixer = new THREE.AnimationMixer(source);
  const action = mixer.clipAction(makeInPlaceClip(source, animation));
  action.play();
  mixer.update(0);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root, true);
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) {
    mixer.stopAllAction();
    mixer.uncacheRoot(source);
    throw new Error("Soph's model dimensions are invalid.");
  }
  const scale = 1.8 / height;
  const center = bounds.getCenter(new THREE.Vector3());
  oriented.scale.setScalar(scale);
  oriented.position.set(
    -center.x * scale,
    -bounds.min.y * scale,
    -center.z * scale,
  );

  let walking = false;
  let disposed = false;
  return {
    root,
    animate(delta, moving, reducedMotion) {
      if (disposed) return;
      const shouldWalk = moving && !reducedMotion;
      if (shouldWalk && Number.isFinite(delta) && delta > 0) {
        mixer.update(delta);
      } else if (walking && !shouldWalk) {
        // Stationary and reduced-motion characters use a consistent resting pose.
        mixer.setTime(0);
      }
      walking = shouldWalk;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(source);
      root.removeFromParent();
      disposePlayerResources(root);
      root.clear();
    },
  };
}

export async function loadPlayerVisual(
  signal: AbortSignal,
): Promise<PlayerVisual> {
  const assetUrl = new URL(`.${PLAYER_ASSET_PATH}`, document.baseURI).href;
  const response = await fetch(assetUrl, { signal });
  if (!response.ok) throw new Error("Soph's model could not be downloaded.");
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  const basePath = new URL(".", assetUrl).href;
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
    // GLTFLoader can resolve after a decoder failure with an untextured mesh.
    ownedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        const image = (material as THREE.MeshStandardMaterial).map?.source
          .data as { width?: number; height?: number } | undefined;
        if (!image || !(Number(image.width) > 0) || !(Number(image.height) > 0))
          throw new Error("Soph's texture could not be decoded.");
      }
    });
    return createPlayerModel(ownedScene, gltf.animations);
  } catch (error) {
    if (ownedScene) disposePlayerResources(ownedScene);
    throw error;
  } finally {
    blobUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}

/** Each world owns its parse, mixer, textures, skeleton, and late-load cleanup. */
export function createPlayer(
  onState?: (state: ModelState) => void,
): PlayerVisual {
  const root = new THREE.Group();
  root.name = "player";
  let visual = createFallbackPlayer();
  root.add(visual.root);
  const controller = new AbortController();
  let disposed = false;
  let lastMoving = false;
  let lastReducedMotion = false;
  onState?.("loading");
  void loadPlayerVisual(controller.signal)
    .then((loaded) => {
      if (disposed) {
        loaded.dispose();
        return;
      }
      loaded.animate(0, lastMoving, lastReducedMotion);
      visual.dispose();
      visual = loaded;
      root.add(visual.root);
      onState?.("loaded");
    })
    .catch(() => {
      if (!disposed) onState?.("fallback");
    });
  return {
    root,
    animate(delta, moving, reducedMotion) {
      if (disposed) return;
      lastMoving = moving;
      lastReducedMotion = reducedMotion;
      visual.animate(delta, moving, reducedMotion);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      root.removeFromParent();
      visual.dispose();
      root.clear();
    },
  };
}

function createFallbackPlayer(): PlayerVisual {
  const player = new THREE.Group();
  player.name = "procedural-explorer-fallback";
  const mat = (color: number) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
  const explorerMaterials = {
    skin: mat(0xaf7955),
    shirt: mat(0xd89045),
    pants: mat(0x5c7068),
    hat: mat(0xe5d2a2),
    boots: mat(0x67583e),
    bag: mat(0x536e61),
  };
  function explorerPart(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    player.add(mesh);
    return mesh;
  }
  explorerPart(
    new THREE.CylinderGeometry(0.21, 0.24, 0.55, 8),
    explorerMaterials.shirt,
    0,
    1.01,
    0,
  );
  explorerPart(
    new THREE.SphereGeometry(0.2, 12, 10),
    explorerMaterials.skin,
    0,
    1.47,
    0,
  );
  explorerPart(
    new THREE.CylinderGeometry(0.34, 0.34, 0.055, 18),
    explorerMaterials.hat,
    0,
    1.62,
    0,
  );
  explorerPart(
    new THREE.CylinderGeometry(0.22, 0.25, 0.18, 12),
    explorerMaterials.hat,
    0,
    1.71,
    0,
  );
  explorerPart(
    new THREE.BoxGeometry(0.34, 0.38, 0.16),
    explorerMaterials.bag,
    0,
    1.05,
    0.24,
  );
  const explorerLegs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.115, 0.75, 0);
    player.add(leg);
    const pants = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.08, 0.35, 6),
      explorerMaterials.pants,
    );
    pants.position.y = -0.15;
    leg.add(pants);
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.055, 0.25, 6),
      explorerMaterials.skin,
    );
    shin.position.y = -0.43;
    leg.add(shin);
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.12, 0.25),
      explorerMaterials.boots,
    );
    shoe.position.set(0, -0.64, -0.035);
    leg.add(shoe);
    return leg;
  });
  for (const side of [-1, 1]) {
    const arm = explorerPart(
      new THREE.CylinderGeometry(0.065, 0.07, 0.48, 7),
      explorerMaterials.skin,
      side * 0.29,
      1,
      0,
    );
    arm.rotation.z = side * 0.12;
    explorerPart(
      new THREE.CylinderGeometry(0.085, 0.09, 0.22, 7),
      explorerMaterials.shirt,
      side * 0.265,
      1.18,
      0,
    );
  }

  let elapsed = 0;
  let disposed = false;
  return {
    root: player,
    animate(delta, moving, reducedMotion) {
      if (disposed) return;
      elapsed += delta;
      explorerLegs.forEach((leg, i) => {
        leg.rotation.x =
          moving && !reducedMotion
            ? Math.sin(elapsed * 9 + i * Math.PI) * 0.4
            : 0;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      player.removeFromParent();
      disposeModelResources(player);
      player.clear();
    },
  };
}
