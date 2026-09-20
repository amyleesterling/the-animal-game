import * as THREE from "three";
import { zebra } from "../content/species";
import type { AnimalBehavior } from "./contracts";
import {
  disposeModelResources,
  loadZebraVisual,
  type ModelState,
  type ModelVisual,
} from "./zebra-model";

export interface AnimalRig {
  root: THREE.Group;
  animate(time: number, behavior: AnimalBehavior, reducedMotion: boolean): void;
  dispose(): void;
}

/** Immediate fallback plus independently owned imported visual in every renderer. */
export function createZebra(
  seed = 0,
  onModelState?: (state: ModelState) => void,
): AnimalRig {
  const root = new THREE.Group();
  root.name = "plains-zebra";
  let visual: ModelVisual = createProceduralZebra(seed);
  root.add(visual.root);
  const controller = new AbortController();
  let disposed = false;
  let lastPose: [number, AnimalBehavior, boolean] = [0, "alert", false];
  const setState = (state: ModelState) => {
    root.userData.modelState = state;
    onModelState?.(state);
  };
  setState("loading");
  void loadZebraVisual(
    new URL(`.${zebra.model.assetPath}`, document.baseURI).href,
    zebra.model.assetForwardAxis,
    zebra.model.targetHeight * zebra.model.scale,
    controller.signal,
  )
    .then((loaded) => {
      if (disposed) {
        disposeModelResources(loaded.root);
        return;
      }
      try {
        loaded.animate(...lastPose);
      } catch (error) {
        disposeModelResources(loaded.root);
        throw error;
      }
      const fallback = visual;
      visual = loaded;
      root.add(visual.root);
      root.remove(fallback.root);
      disposeModelResources(fallback.root);
      setState("loaded");
    })
    .catch(() => {
      if (!disposed) setState("fallback");
    });
  return {
    root,
    animate(time, behavior, reducedMotion) {
      if (disposed) return;
      lastPose = [time, behavior, reducedMotion];
      visual.animate(time, behavior, reducedMotion);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      root.removeFromParent();
      disposeModelResources(root);
      root.clear();
    },
  };
}

/** Original placeholder remains playable while loading and on asset failure. */
function createProceduralZebra(seed: number): ModelVisual {
  const root = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({
    color: zebra.model.bodyColor,
    roughness: 0.9,
    flatShading: true,
  });
  const charcoal = new THREE.MeshStandardMaterial({
    color: zebra.model.stripeColor,
    roughness: 0.88,
    flatShading: true,
  });
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `#${new THREE.Color(zebra.model.bodyColor).getHexString()}`;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = `#${new THREE.Color(zebra.model.stripeColor).getHexString()}`;
  for (let stripe = 0; stripe < 22; stripe++) {
    const origin = stripe * 25 + seed * 3;
    ctx.beginPath();
    for (let y = 0; y <= 256; y += 8) {
      const x =
        origin +
        Math.sin(y * 0.024 + stripe * 1.7 + seed) * 6 +
        Math.sin(y * 0.067 + stripe) * 2;
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let y = 256; y >= 0; y -= 8) {
      const x =
        origin +
        8 +
        Math.sin(y * 0.024 + stripe * 1.7 + seed) * 6 +
        Math.sin(y * 0.038 + stripe) * 3;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  const stripes = new THREE.CanvasTexture(canvas);
  stripes.colorSpace = THREE.SRGBColorSpace;
  stripes.anisotropy = 4;
  const striped = new THREE.MeshStandardMaterial({
    map: stripes,
    roughness: 0.92,
    flatShading: true,
  });
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  function ellipsoid(
    parent: THREE.Object3D,
    position: number[],
    scale: number[],
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function bone(
    parent: THREE.Object3D,
    from: number[],
    to: number[],
    radius: number,
    material: THREE.Material,
  ) {
    const start = new THREE.Vector3(...(from as [number, number, number]));
    const end = new THREE.Vector3(...(to as [number, number, number]));
    const mesh = new THREE.Mesh(cylinder, material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.scale.set(radius, start.distanceTo(end), radius);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  ellipsoid(root, [0, 1.12, 0], [0.98, 0.47, 0.39], striped);
  ellipsoid(root, [-0.63, 1.15, 0], [0.4, 0.43, 0.36], striped);
  ellipsoid(root, [0.58, 1.14, 0], [0.42, 0.5, 0.34], striped);
  const legs: THREE.Group[] = [];
  for (const x of [-0.66, 0.63])
    for (const z of [-0.25, 0.25]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.96, z);
      root.add(leg);
      ellipsoid(leg, [0, -0.2, 0], [0.115, 0.31, 0.11], striped);
      bone(leg, [0, -0.38, 0], [0.02, -0.83, 0], 0.056, cream);
      for (let i = 0; i < 4; i++) {
        bone(
          leg,
          [0.008, -0.43 - i * 0.086, 0],
          [0.009, -0.46 - i * 0.086, 0],
          0.061,
          charcoal,
        );
      }
      ellipsoid(leg, [0.04, -0.86, 0], [0.105, 0.08, 0.09], charcoal);
      legs.push(leg);
    }
  const head = new THREE.Group();
  head.position.set(0.66, 1.25, 0);
  root.add(head);
  const neck = ellipsoid(head, [0.08, 0.3, 0], [0.26, 0.55, 0.24], striped);
  neck.rotation.z = -0.28;
  ellipsoid(head, [0.36, 0.65, 0], [0.44, 0.205, 0.215], striped);
  ellipsoid(head, [0.68, 0.58, 0], [0.22, 0.16, 0.185], charcoal);
  ellipsoid(head, [0.75, 0.55, 0], [0.12, 0.04, 0.15], charcoal);
  // Short, upright mane follows the back edge of the neck.
  for (let i = 0; i < 9; i++) {
    const tuft = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.16, 0.075),
      charcoal,
    );
    tuft.position.set(-0.14 + i * 0.017, 0.05 + i * 0.079, 0);
    tuft.rotation.z = -0.26;
    head.add(tuft);
  }
  for (const side of [-1, 1]) {
    const ear = ellipsoid(
      head,
      [0.16, 0.98, side * 0.13],
      [0.078, 0.22, 0.061],
      cream,
    );
    ear.rotation.x = side * 0.22;
    const inside = ellipsoid(
      head,
      [0.19, 0.99, side * 0.138],
      [0.034, 0.145, 0.046],
      charcoal,
    );
    inside.rotation.x = side * 0.22;
    ellipsoid(
      head,
      [0.39, 0.726, side * 0.196],
      [0.042, 0.04, 0.026],
      charcoal,
    );
    ellipsoid(head, [0.399, 0.738, side * 0.216], [0.011, 0.012, 0.007], cream);
    ellipsoid(
      head,
      [0.792, 0.636, side * 0.116],
      [0.028, 0.02, 0.019],
      charcoal,
    );
  }
  const tail = new THREE.Group();
  tail.position.set(-0.9, 1.27, 0);
  root.add(tail);
  bone(tail, [0, 0, 0], [-0.28, -0.39, 0], 0.032, cream);
  const tuft = ellipsoid(
    tail,
    [-0.3, -0.48, 0],
    [0.055, 0.16, 0.055],
    charcoal,
  );
  tuft.rotation.z = -0.2;
  root.scale.set(
    (zebra.model.bodyLength / 1.9) * zebra.model.scale,
    (zebra.model.bodyHeight / 0.86) * zebra.model.scale,
    (zebra.model.bodyWidth / 0.7) * zebra.model.scale,
  );
  return {
    root,
    animate(time, behavior, reducedMotion) {
      const walk = behavior === "walking" || behavior === "retreating";
      const motionTime = reducedMotion ? 0 : time;
      const pace = behavior === "retreating" ? 10 : 6;
      legs.forEach((leg, index) => {
        leg.rotation.z =
          walk && !reducedMotion
            ? Math.sin(
                motionTime * pace + (index === 0 || index === 3 ? 0 : Math.PI),
              ) * 0.42
            : 0;
      });
      const targetHead =
        behavior === "grazing"
          ? -1.46 + Math.sin(motionTime * 1.6) * 0.045
          : behavior === "alert"
            ? 0.12
            : -0.1;
      head.rotation.z = reducedMotion
        ? targetHead
        : THREE.MathUtils.lerp(head.rotation.z, targetHead, 0.09);
      tail.rotation.x = Math.sin(motionTime * 2.2 + seed) * 0.22;
      root.position.y =
        walk && !reducedMotion
          ? Math.abs(Math.sin(motionTime * pace)) * 0.025
          : 0;
    },
  };
}

export { disposeModelResources as disposeScene } from "./zebra-model";
