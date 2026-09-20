import * as THREE from "three";

/**
 * A small savanna to show the weather over: rolling ground, instanced grass,
 * acacias, a waterhole and distant hills. It is scenery only. Everything that
 * changes with the season is handed to the environment visual layer, which
 * recolours and resizes these objects.
 */

export interface SavannaScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  hemisphere: THREE.HemisphereLight;
  grassMaterial: THREE.MeshStandardMaterial;
  groundMaterial: THREE.MeshStandardMaterial;
  water: THREE.Mesh;
  sunDisc: THREE.Mesh;
  /** Lay the grass out for this wind and this much growth. */
  layGrass(sway: number, greenness: number): void;
  dispose(): void;
}

/** Gentle rolling ground, so the savanna is not a flat plate. */
export function groundHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.045) * 1.15 +
    Math.cos(z * 0.038) * 0.95 +
    Math.sin((x + z) * 0.021) * 0.75
  );
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const GRASS_COUNT = 14000;
/** The camera sits here, so nothing is allowed to grow through the lens. */
const CAMERA_POSITION = new THREE.Vector3(0, 11.5, 30);
const CAMERA_CLEARANCE = 14;
/** Height of one grass blade at full growth, in metres. */
const BLADE_HEIGHT = 0.8;

export function createSavannaScene(lowQuality = false): SavannaScene {
  const next = seededRandom(20260920);
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 600);
  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(0, 0.5, -40);

  const hemisphere = new THREE.HemisphereLight(0xffead0, 0x767b45, 2.5);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffdf9f, 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowQuality ? 512 : 1024, lowQuality ? 512 : 1024);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.camera.far = 220;
  sun.shadow.normalBias = 0.04;
  sun.target.position.set(0, 0, -20);
  scene.add(sun, sun.target);

  // Ground, displaced so the light has something to model.
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xada96d,
    flatShading: true,
    roughness: 1,
  });
  const groundGeometry = new THREE.PlaneGeometry(320, 320, 64, 64);
  const groundPosition = groundGeometry.attributes.position;
  for (let i = 0; i < groundPosition.count; i++) {
    const x = groundPosition.getX(i);
    const y = groundPosition.getY(i);
    // The plane is still in its own XY space; Z here becomes world height.
    groundPosition.setZ(i, groundHeight(x, -y));
  }
  groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Distant hills, so the sky meets something solid.
  const hillMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d9478,
    flatShading: true,
    roughness: 1,
  });
  const hills = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(16 + next() * 22, 12 + next() * 22, 5),
      hillMaterial,
    );
    hill.position.set((i - 11) * 26 + next() * 14, -2, -180 - next() * 40);
    hill.rotation.y = next() * Math.PI;
    hill.scale.z = 0.55;
    hills.add(hill);
  }
  scene.add(hills);

  // The waterhole, in a shallow bowl so it reads as a low place.
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a7d8a,
    roughness: 0.18,
    metalness: 0.2,
    transparent: true,
    opacity: 0.92,
  });
  const WATER_AT = new THREE.Vector3(-15, 0, -8);
  const water = new THREE.Mesh(new THREE.CircleGeometry(9, 48), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(
    WATER_AT.x,
    groundHeight(WATER_AT.x, WATER_AT.z) + 0.06,
    WATER_AT.z,
  );
  scene.add(water);
  const bed = new THREE.Mesh(
    new THREE.CircleGeometry(10.4, 48),
    new THREE.MeshStandardMaterial({
      color: 0x8a7a52,
      flatShading: true,
      roughness: 1,
    }),
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(
    WATER_AT.x,
    groundHeight(WATER_AT.x, WATER_AT.z) + 0.02,
    WATER_AT.z,
  );
  bed.receiveShadow = true;
  scene.add(bed);

  // Acacias. Kept well clear of the camera so none can clip the lens.
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b5638,
    flatShading: true,
    roughness: 1,
  });
  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: 0x55683e,
    flatShading: true,
    roughness: 1,
  });
  const trees = new THREE.Group();
  let placed = 0;
  let attempts = 0;
  while (placed < 16 && attempts < 400) {
    attempts++;
    const x = (next() * 2 - 1) * 78;
    const z = -6 - next() * 96;
    if (
      Math.hypot(x - CAMERA_POSITION.x, z - CAMERA_POSITION.z) <
      CAMERA_CLEARANCE + 10
    )
      continue;
    // Nothing grows in the waterhole.
    if (Math.hypot(x - WATER_AT.x, z - WATER_AT.z) < 13) continue;
    const tree = new THREE.Group();
    const height = 4.2 + next() * 2.6;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.42, height, 7),
      trunkMaterial,
    );
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    // An acacia's crown is a flat umbrella, which is the savanna silhouette.
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(2.6 + next() * 1.7, 1.5, 9),
      canopyMaterial,
    );
    crown.position.y = height + 0.45;
    crown.scale.y = 0.62;
    crown.castShadow = true;
    const underCrown = new THREE.Mesh(
      new THREE.ConeGeometry(1.9 + next(), 1.1, 9),
      canopyMaterial,
    );
    underCrown.position.y = height - 0.35;
    underCrown.scale.y = 0.55;
    underCrown.castShadow = true;
    tree.add(trunk, crown, underCrown);
    tree.position.set(x, groundHeight(x, z), z);
    tree.rotation.y = next() * Math.PI;
    trees.add(tree);
    placed++;
  }
  scene.add(trees);

  // Instanced grass. One draw call, recoloured by the season.
  //
  // Growth and wind happen in the vertex shader rather than by rewriting the
  // instance matrices each frame. Rebuilding tens of thousands of matrices on
  // the CPU every frame drops the whole page to a few frames a second, which
  // breaks the simulated clock as well as the picture.
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0xc2ad72,
    flatShading: true,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const grassUniforms = {
    uTime: { value: 0 },
    uWind: { value: 0 },
    uGrowth: { value: 1 },
  };
  grassMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = grassUniforms.uTime;
    shader.uniforms.uWind = grassUniforms.uWind;
    shader.uniforms.uGrowth = grassUniforms.uGrowth;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         uniform float uWind;
         uniform float uGrowth;`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(position);
         transformed.y *= uGrowth;
         // Blades bend from the base, so the tip travels furthest.
         float blade = clamp(transformed.y / ${BLADE_HEIGHT.toFixed(2)}, 0.0, 1.0);
         float bend = blade * blade;
         float phase = instanceMatrix[3][0] * 0.7 + instanceMatrix[3][2] * 0.5;
         transformed.x += sin(uTime * 1.7 + phase) * uWind * bend;
         transformed.z += cos(uTime * 1.3 + phase) * uWind * 0.45 * bend;`,
      );
  };
  const count = lowQuality ? Math.floor(GRASS_COUNT * 0.45) : GRASS_COUNT;
  const bladeGeometry = new THREE.PlaneGeometry(0.16, BLADE_HEIGHT);
  // Stand the blade on its base so growing it scales upward from the ground.
  bladeGeometry.translate(0, BLADE_HEIGHT / 2, 0);
  const grass = new THREE.InstancedMesh(bladeGeometry, grassMaterial, count);
  grass.receiveShadow = true;
  grass.frustumCulled = false;
  scene.add(grass);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const tufts: true[] = [];
  const tint = new THREE.Color();
  let guard = 0;
  while (tufts.length < count && guard < count * 12) {
    guard++;
    // Grass is laid out in a wedge in front of the camera, with distance
    // biased towards it. A uniform spread over this much ground leaves the
    // near field almost bare, because the same tufts cover far more pixels
    // close up than they do near the horizon.
    const angle = (next() * 2 - 1) * 1.05;
    const reach = next();
    const radius = CAMERA_CLEARANCE + (170 - CAMERA_CLEARANCE) * reach * reach;
    // Blades grow in clumps rather than standing alone.
    const clumpX = Math.sin(angle) * radius + (next() - 0.5) * 0.9;
    const clumpZ = -Math.cos(angle) * radius + (next() - 0.5) * 0.9;
    const x = CAMERA_POSITION.x + clumpX;
    const z = CAMERA_POSITION.z + clumpZ;
    if (Math.hypot(x - WATER_AT.x, z - WATER_AT.z) < 10.5) continue;
    // Instance colour multiplies the material, so this is a brightness jitter
    // around 1 rather than a colour of its own. The season still sets the hue.
    const shade = 0.78 + next() * 0.42;
    tint.setRGB(shade * (0.94 + next() * 0.1), shade, shade * 0.93);
    grass.setColorAt(tufts.length, tint);
    // Each blade's matrix is written once here and never touched again.
    position.set(x, groundHeight(x, z), z);
    quaternion.setFromEuler(euler.set(0, next() * Math.PI, 0));
    scale.set(1, 0.6 + next() * 0.75, 1);
    matrix.compose(position, quaternion, scale);
    grass.setMatrixAt(tufts.length, matrix);
    tufts.push(true);
  }
  grass.count = tufts.length;
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 24, 14),
    new THREE.MeshBasicMaterial({
      color: 0xffedbd,
      fog: false,
      transparent: true,
    }),
  );
  scene.add(sunDisc);

  return {
    scene,
    camera,
    sun,
    hemisphere,
    grassMaterial,
    groundMaterial,
    water,
    sunDisc,
    layGrass(sway, greenness) {
      // Constant cost, whatever the blade count: three uniforms.
      grassUniforms.uTime.value = performance.now() / 1000;
      grassUniforms.uWind.value = Math.min(Math.abs(sway) * 0.06, 0.4);
      // Grass stands tall in a green season and lies short in a dry one.
      grassUniforms.uGrowth.value = 0.55 + greenness * 0.7;
    },
    dispose() {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      grass.dispose();
    },
  };
}
