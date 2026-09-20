import * as THREE from "three";

/**
 * A small savanna to show the weather over: rolling ground, grass, acacias, a
 * waterhole and distant hills. It is scenery only. Everything that changes
 * with the season is handed to the environment visual layer, which recolours
 * and resizes these objects.
 *
 * The grass follows the technique the Ghost of Tsushima GDC talk made
 * standard: curved tapered blades rather than flat quads, blue-noise
 * placement rather than uniform random, a root to tip gradient with the base
 * in shadow, wind from a travelling flow field rather than one global sine,
 * and two levels of detail so distant blades cost almost nothing.
 */

export interface SavannaScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  hemisphere: THREE.HemisphereLight;
  grassMaterials: THREE.MeshStandardMaterial[];
  groundMaterial: THREE.MeshStandardMaterial;
  water: THREE.Mesh;
  sunDisc: THREE.Mesh;
  /** Blades drawn right now, near plus far. */
  bladeCount(): number;
  /** Set the wind and how much the grass has grown. Constant cost. */
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

/**
 * Where grass grows thickly and where it thins out. Real grassland is patchy,
 * and an even carpet is one of the things that makes a scene read as computer
 * generated.
 */
function grassDensity(x: number, z: number): number {
  const broad = Math.sin(x * 0.035) * Math.cos(z * 0.029);
  const fine = Math.sin((x + z * 0.6) * 0.11) * Math.cos((x * 0.7 - z) * 0.09);
  return THREE.MathUtils.clamp(0.62 + broad * 0.3 + fine * 0.18, 0.05, 1);
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const CAMERA_POSITION = new THREE.Vector3(0, 11.5, 30);
const CAMERA_CLEARANCE = 13;
const WATER_AT = new THREE.Vector3(-15, 0, -8);
/** Blades closer than this get the detailed geometry. */
const NEAR_DISTANCE = 78;
const FAR_DISTANCE = 150;
const BLADE_HEIGHT = 0.9;

/**
 * One grass blade: a tapered ribbon that curves away from its root. The
 * bladeT attribute runs 0 at the base to 1 at the tip, which drives both the
 * bend and the shading.
 */
function createBladeGeometry(segments: number, width: number, curve: number) {
  const positions: number[] = [];
  const bladeT: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // The blade narrows towards the tip and finishes at a point.
    const halfWidth = (width / 2) * Math.pow(1 - t, 0.65);
    positions.push(
      -halfWidth,
      t * BLADE_HEIGHT,
      curve * t * t,
      halfWidth,
      t * BLADE_HEIGHT,
      curve * t * t,
    );
    bladeT.push(t, t);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("bladeT", new THREE.Float32BufferAttribute(bladeT, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // A thin ribbon's true normals point sideways, which makes a field of grass
  // go black whenever the sun is not behind the camera. Leaning them upward
  // lets the sward catch the sky the way real grass does.
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  const up = new THREE.Vector3(0, 1, 0);
  const n = new THREE.Vector3();
  for (let i = 0; i < normal.count; i++) {
    n.fromBufferAttribute(normal, i).lerp(up, 0.62).normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
  }
  return geometry;
}

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

  // Ground. Vertex colours mottle it so it is not one flat slab; the seasonal
  // tint multiplies over the top.
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xada96d,
    vertexColors: true,
    roughness: 1,
  });
  const groundGeometry = new THREE.PlaneGeometry(320, 320, 72, 72);
  const groundPosition = groundGeometry.attributes.position;
  const groundColors: number[] = [];
  for (let i = 0; i < groundPosition.count; i++) {
    const x = groundPosition.getX(i);
    const y = groundPosition.getY(i);
    // The plane is still in its own XY space; Z here becomes world height.
    groundPosition.setZ(i, groundHeight(x, -y));
    const patch =
      0.86 +
      Math.sin(x * 0.08) * 0.05 +
      Math.cos(-y * 0.07) * 0.05 +
      Math.sin((x - y) * 0.03) * 0.06;
    groundColors.push(patch, patch * 0.99, patch * 0.93);
  }
  groundGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(groundColors, 3),
  );
  groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Distant hills, so the sky meets something solid.
  const hillMaterial = new THREE.MeshStandardMaterial({
    color: 0x9c9a7a,
    flatShading: true,
    roughness: 1,
  });
  const hills = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(26 + next() * 30, 9 + next() * 11, 7),
      hillMaterial,
    );
    hill.position.set((i - 11) * 26 + next() * 14, -2, -180 - next() * 40);
    hill.rotation.y = next() * Math.PI;
    hill.scale.z = 0.5;
    hills.add(hill);
  }
  scene.add(hills);

  // The waterhole, sitting in its own bare pan.
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48),
    new THREE.MeshStandardMaterial({
      color: 0x4a7d8a,
      roughness: 0.18,
      metalness: 0.2,
      transparent: true,
      opacity: 0.92,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(
    WATER_AT.x,
    groundHeight(WATER_AT.x, WATER_AT.z) + 0.06,
    WATER_AT.z,
  );
  scene.add(water);
  const bed = new THREE.Mesh(
    new THREE.CircleGeometry(10.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x8a7a52, roughness: 1 }),
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(
    WATER_AT.x,
    groundHeight(WATER_AT.x, WATER_AT.z) + 0.02,
    WATER_AT.z,
  );
  bed.receiveShadow = true;
  scene.add(bed);

  function clearOfCamera(x: number, z: number, margin = 0): boolean {
    return (
      Math.hypot(x - CAMERA_POSITION.x, z - CAMERA_POSITION.z) >
      CAMERA_CLEARANCE + margin
    );
  }
  function clearOfWater(x: number, z: number, margin = 0): boolean {
    return Math.hypot(x - WATER_AT.x, z - WATER_AT.z) > 10.5 + margin;
  }

  // Acacias. The trunk forks and the crown is built from layered discs, which
  // gives the flat umbrella silhouette the savanna is known for.
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f5a3c,
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
  while (placed < 20 && attempts < 600) {
    attempts++;
    const x = (next() * 2 - 1) * 82;
    const z = -6 - next() * 100;
    if (!clearOfCamera(x, z, 12) || !clearOfWater(x, z, 3)) continue;
    const tree = new THREE.Group();
    const height = 4.4 + next() * 2.8;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.46, height, 7),
      trunkMaterial,
    );
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    tree.add(trunk);
    // Two limbs forking out towards the crown.
    for (let limb = 0; limb < 2; limb++) {
      const lean = (limb === 0 ? 1 : -1) * (0.3 + next() * 0.2);
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.2, height * 0.5, 5),
        trunkMaterial,
      );
      branch.position.set(
        Math.sin(lean) * height * 0.22,
        height * 0.82,
        Math.cos(lean) * height * 0.06,
      );
      branch.rotation.z = -lean;
      branch.castShadow = true;
      tree.add(branch);
    }
    // A crown of three flattened discs at slightly different heights.
    const spread = 2.9 + next() * 1.6;
    for (let layer = 0; layer < 3; layer++) {
      const radius = spread * (1 - layer * 0.22) + next() * 0.3;
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.72, radius, 0.5, 9),
        canopyMaterial,
      );
      disc.position.set(
        (next() - 0.5) * 0.7,
        height + 0.3 + layer * 0.42,
        (next() - 0.5) * 0.7,
      );
      disc.rotation.y = next() * Math.PI;
      disc.castShadow = true;
      tree.add(disc);
    }
    tree.position.set(x, groundHeight(x, z), z);
    tree.rotation.y = next() * Math.PI;
    trees.add(tree);
    placed++;
  }
  scene.add(trees);

  // Rocks and termite mounds, which give the eye something to judge scale by.
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d8778,
    flatShading: true,
    roughness: 1,
  });
  const moundMaterial = new THREE.MeshStandardMaterial({
    color: 0x9c7450,
    flatShading: true,
    roughness: 1,
  });
  const props = new THREE.Group();
  for (let i = 0; i < 46; i++) {
    const x = (next() * 2 - 1) * 70;
    const z = 14 - next() * 110;
    if (!clearOfCamera(x, z, 2) || !clearOfWater(x, z, -4)) continue;
    const isMound = next() > 0.62;
    const size = isMound ? 0.9 + next() * 1.5 : 0.35 + next() * 0.8;
    const prop = new THREE.Mesh(
      isMound
        ? new THREE.ConeGeometry(size * 0.6, size * 2.1, 6)
        : new THREE.IcosahedronGeometry(size, 0),
      isMound ? moundMaterial : rockMaterial,
    );
    prop.position.set(
      x,
      groundHeight(x, z) + (isMound ? size * 0.9 : size * 0.3),
      z,
    );
    prop.rotation.set(next(), next() * Math.PI, next() * 0.3);
    prop.scale.y = isMound ? 1 : 0.7 + next() * 0.4;
    prop.castShadow = true;
    prop.receiveShadow = true;
    props.add(prop);
  }
  scene.add(props);

  // Grass.
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0xc2ad72,
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
         attribute float bladeT;
         varying float vBladeT;
         uniform float uTime;
         uniform float uWind;
         uniform float uGrowth;`,
      )
      .replace(
        "#include <begin_vertex>",
        `vBladeT = bladeT;
         vec3 transformed = vec3(position);
         transformed.y *= uGrowth;
         transformed.z *= uGrowth;
         // Wind is a flow field sampled at the blade's own place in the world,
         // so gusts travel across the field instead of every blade moving
         // together.
         float wx = instanceMatrix[3][0];
         float wz = instanceMatrix[3][2];
         float gust =
           sin(wx * 0.11 + uTime * 1.2) * 0.62 +
           sin(wz * 0.085 - uTime * 0.9) * 0.38;
         // The blade pivots from its root, so the tip travels furthest.
         float bend = bladeT * bladeT * uWind * gust;
         transformed.x += bend;
         transformed.z += bend * 0.35;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying float vBladeT;`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         // Dark at the root where light does not reach, bright at the tip.
         diffuseColor.rgb *= mix(0.72, 1.1, vBladeT);`,
      );
  };

  const nearGeometry = createBladeGeometry(3, 0.14, 0.3);
  const farGeometry = createBladeGeometry(1, 0.18, 0);

  /**
   * Blue-noise placement from a jittered grid. Uniform random scatter leaves
   * clumps and bald patches at random, which reads as noise; a jittered grid
   * keeps blades evenly spaced while still looking unplanned.
   */
  function scatter(
    spacing: number,
    minDistance: number,
    maxDistance: number,
    perPoint: number,
  ) {
    const found: { x: number; z: number }[] = [];
    for (let gx = -110; gx <= 110; gx += spacing) {
      for (let gz = 26; gz >= -150; gz -= spacing) {
        const x = gx + (next() - 0.5) * spacing;
        const z = gz + (next() - 0.5) * spacing;
        const distance = Math.hypot(
          x - CAMERA_POSITION.x,
          z - CAMERA_POSITION.z,
        );
        if (distance < minDistance || distance >= maxDistance) continue;
        // The camera looks down -z and never turns, so blades behind it are
        // pure cost. Dropping them doubles the density in shot for free.
        if ((CAMERA_POSITION.z - z) / distance < 0.26) continue;
        if (!clearOfCamera(x, z) || !clearOfWater(x, z)) continue;
        if (next() > grassDensity(x, z)) continue;
        for (let i = 0; i < perPoint; i++) found.push({ x, z });
      }
    }
    return found;
  }

  const quality = lowQuality ? 1.45 : 1;
  const nearPoints = scatter(
    0.72 * quality,
    CAMERA_CLEARANCE,
    NEAR_DISTANCE,
    2,
  );
  const farPoints = scatter(1.25 * quality, NEAR_DISTANCE, FAR_DISTANCE, 2);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const tint = new THREE.Color();

  function buildGrass(
    geometry: THREE.BufferGeometry,
    points: { x: number; z: number }[],
    spread: number,
    sizeRange: [number, number],
  ) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      grassMaterial,
      Math.max(points.length, 1),
    );
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    points.forEach((point, index) => {
      const x = point.x + (next() - 0.5) * spread;
      const z = point.z + (next() - 0.5) * spread;
      position.set(x, groundHeight(x, z), z);
      quaternion.setFromEuler(
        euler.set((next() - 0.5) * 0.25, next() * Math.PI * 2, 0),
      );
      const size = sizeRange[0] + next() * (sizeRange[1] - sizeRange[0]);
      scale.set(0.8 + next() * 0.5, size, size);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      // Instance colour multiplies the material, so this is a brightness
      // jitter around 1. The season still sets the hue.
      const shade = 0.76 + next() * 0.46;
      tint.setRGB(shade * (0.93 + next() * 0.12), shade, shade * 0.9);
      mesh.setColorAt(index, tint);
    });
    mesh.count = points.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  }

  const nearGrass = buildGrass(nearGeometry, nearPoints, 0.42, [0.75, 1.35]);
  const farGrass = buildGrass(farGeometry, farPoints, 1.1, [1.0, 1.7]);

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
    grassMaterials: [grassMaterial],
    groundMaterial,
    water,
    sunDisc,
    bladeCount: () => nearGrass.count + farGrass.count,
    layGrass(sway, greenness) {
      grassUniforms.uTime.value = performance.now() / 1000;
      grassUniforms.uWind.value = Math.min(Math.abs(sway) * 0.05, 0.5);
      // Grass stands tall in a green season and lies short in a dry one.
      grassUniforms.uGrowth.value = 0.5 + greenness * 0.75;
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
      nearGrass.dispose();
      farGrass.dispose();
    },
  };
}
