import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { zebra } from "../content/species";
import type {
  AnimalBehavior,
  World,
  WorldOptions,
  WorldStatus,
} from "./contracts";
import { createZebra, disposeScene } from "./zebra";
import { createPlayer } from "./player";
import { createCompanion } from "./companion";
import { CORA_CHARACTER } from "../content/characters";
import {
  moveWithCollisions,
  stepToward,
  type GroundPosition,
} from "./movement";

type Direction = "forward" | "backward" | "left" | "right";
const UP = new THREE.Vector3(0, 1, 0);

function randomGenerator(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Small original savanna, with instanced vegetation and a reusable content-driven animal rig. */
export function createWorld(
  container: HTMLElement,
  options: WorldOptions,
): World {
  const settings = { ...options };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xead7b6);
  scene.fog = new THREE.Fog(0xead7b6, 32, 115);
  const renderer = new THREE.WebGLRenderer({
    antialias: !options.lowQuality,
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !options.lowQuality;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, options.lowQuality ? 1 : 1.75),
  );
  renderer.domElement.setAttribute(
    "aria-label",
    "A 3D African savanna. Use W A S D or arrow keys to walk; drag to look around.",
  );
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";
  container.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffead0, 0x767b45, 2.5));
  const sun = new THREE.DirectionalLight(0xffdf9f, 3.1);
  sun.position.set(-22, 35, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 110;
  sun.shadow.normalBias = 0.035;
  sun.target.position.set(0, 0, -13);
  scene.add(sun, sun.target);
  const random = randomGenerator(2026);
  const mat = (color: number) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
  const earth = mat(0xada96d);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), earth);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.035;
  ground.receiveShadow = true;
  scene.add(ground);

  // Layered distant hills give depth without expensive geometry or textures.
  const hillColors = [0xb5b397, 0xa9ae8f, 0x99a080];
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 14; i++) {
      const radius = 10 + random() * 14;
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(radius, 9 + random() * 17, 5),
        mat(hillColors[layer]),
      );
      hill.position.set(
        (i - 7) * 18 + random() * 8,
        0,
        -95 + layer * 13 - random() * 10,
      );
      hill.rotation.y = random() * Math.PI;
      hill.scale.z = 0.65;
      scene.add(hill);
    }
  }
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(7, 28, 16),
    new THREE.MeshBasicMaterial({ color: 0xffedbd, fog: false }),
  );
  sunDisc.position.set(-48, 29, -105);
  scene.add(sunDisc);

  const pathVertices: number[] = [];
  const pathIndices: number[] = [];
  const pathCenter = (z: number) => Math.sin((z + 5) * 0.11) * 2.6;
  for (let i = 0; i <= 60; i++) {
    const z = 22 - i * 1.2;
    const width = 1.6 + Math.sin(i * 0.17) * 0.3;
    pathVertices.push(
      pathCenter(z) - width,
      0.008,
      z,
      pathCenter(z) + width,
      0.008,
      z,
    );
    if (i > 0) {
      const k = i * 2;
      pathIndices.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  }
  const pathGeometry = new THREE.BufferGeometry();
  pathGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(pathVertices, 3),
  );
  pathGeometry.setIndex(pathIndices);
  pathGeometry.computeVertexNormals();
  const path = new THREE.Mesh(
    pathGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xd4bb80,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  path.receiveShadow = true;
  scene.add(path);

  const pondCenter = new THREE.Vector2(20, -26);
  const shore = new THREE.Mesh(new THREE.CircleGeometry(11, 50), mat(0xc7b68a));
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(pondCenter.x, 0.013, pondCenter.y);
  shore.scale.y = 0.72;
  scene.add(shore);
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(9.9, 50),
    new THREE.MeshStandardMaterial({
      color: 0x7ca6a0,
      roughness: 0.28,
      metalness: 0.15,
    }),
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(pondCenter.x, 0.025, pondCenter.y);
  pond.scale.y = 0.72;
  scene.add(pond);
  const ripples: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.4 + i * 1.55, 1.425 + i * 1.55, 48),
      new THREE.MeshBasicMaterial({
        color: 0xc4d6ba,
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(20, 0.04 + i * 0.001, -26);
    ring.scale.y = 0.65;
    scene.add(ring);
    ripples.push(ring);
  }

  const obstacleMeshes: THREE.Mesh[] = [];
  const treeRoots: THREE.Group[] = [];
  const trees: { x: number; z: number; radius: number }[] = [];
  const trunkMaterial = mat(0x73694c);
  const canopyMaterials = [mat(0x687b45), mat(0x7a864a), mat(0x8b9254)];
  const trunkGeometry = new THREE.CylinderGeometry(0.16, 0.3, 1, 7);
  const canopyGeometry = new THREE.IcosahedronGeometry(1, 1);
  function branch(
    parent: THREE.Group,
    a: THREE.Vector3,
    b: THREE.Vector3,
    width: number,
  ) {
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.copy(a).add(b).multiplyScalar(0.5);
    trunk.scale.set(width, a.distanceTo(b), width);
    trunk.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
    trunk.castShadow = true;
    parent.add(trunk);
    obstacleMeshes.push(trunk);
  }
  function acacia(x: number, z: number, scale: number) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    scene.add(tree);
    treeRoots.push(tree);
    trees.push({ x, z, radius: 0.55 * scale });
    branch(tree, new THREE.Vector3(), new THREE.Vector3(0.15, 3.2, 0), 1);
    branch(
      tree,
      new THREE.Vector3(0.12, 2.1, 0),
      new THREE.Vector3(-1.7, 4.1, 0.4),
      0.65,
    );
    branch(
      tree,
      new THREE.Vector3(0.12, 2.35, 0),
      new THREE.Vector3(1.7, 4.35, -0.5),
      0.6,
    );
    branch(
      tree,
      new THREE.Vector3(0.15, 2.65, 0),
      new THREE.Vector3(0.1, 4.55, 1.3),
      0.58,
    );
    for (let i = 0; i < 6; i++) {
      const canopy = new THREE.Mesh(canopyGeometry, canopyMaterials[i % 3]);
      const angle = (i / 6) * Math.PI * 2;
      canopy.position.set(
        Math.cos(angle) * 1.3,
        4.15 + random() * 0.6,
        Math.sin(angle) * 1.05,
      );
      canopy.scale.set(
        2.1 + random() * 0.4,
        0.55 + random() * 0.18,
        1.7 + random() * 0.45,
      );
      canopy.rotation.y = random() * Math.PI;
      canopy.castShadow = true;
      tree.add(canopy);
      obstacleMeshes.push(canopy);
    }
  }
  acacia(-10, -11, 1.65);
  acacia(13, -37, 1.45);
  acacia(-18, -36, 1.25);
  acacia(27, -12, 1.7);
  acacia(-24, 6, 1.7);
  acacia(18, 12, 1.4);
  for (let i = 0; i < 18; i++)
    acacia(-48 + random() * 95, -48 - random() * 22, 0.75 + random() * 0.7);
  // Static vegetation is four draw calls, rather than one call per branch and leaf cluster.
  scene.updateMatrixWorld(true);
  const treeMaterials = [trunkMaterial, ...canopyMaterials];
  const mergedTrees: THREE.Mesh[] = [];
  for (const material of treeMaterials) {
    const pieces = obstacleMeshes
      .filter((mesh) => mesh.material === material)
      .map((mesh) => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    const geometry = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    mergedTrees.push(mesh);
  }
  treeRoots.forEach((tree) => scene.remove(tree));
  obstacleMeshes.splice(0, obstacleMeshes.length, ...mergedTrees);
  trunkGeometry.dispose();
  canopyGeometry.dispose();

  const bladeGeometry = new THREE.BufferGeometry();
  bladeGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-0.1, 0, 0, 0.1, 0, 0, 0.045, 0.6, 0], 3),
  );
  bladeGeometry.computeVertexNormals();
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    flatShading: true,
    roughness: 1,
  });
  const grass = new THREE.InstancedMesh(bladeGeometry, grassMaterial, 8500);
  const transform = new THREE.Object3D();
  const grassColor = new THREE.Color();
  let grassCount = 0;
  for (let i = 0; i < 3000; i++) {
    const x = (random() - 0.5) * 125;
    const z = 28 - random() * 110;
    if (
      Math.abs(x - pathCenter(z)) < 2 ||
      ((x - 20) / 11.3) ** 2 + ((z + 26) / 8.3) ** 2 < 1
    )
      continue;
    const height = 0.4 + random() * 0.9;
    grassColor.setHSL(
      0.15 + random() * 0.055,
      0.31 + random() * 0.13,
      0.39 + random() * 0.17,
    );
    for (let blade = 0; blade < 3 && grassCount < 8500; blade++) {
      transform.position.set(x + random() * 0.24, 0.015, z + random() * 0.24);
      transform.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.3);
      transform.scale.set(1, height, 1);
      transform.updateMatrix();
      grass.setMatrixAt(grassCount, transform.matrix);
      grass.setColorAt(grassCount++, grassColor);
    }
  }
  grass.count = settings.lowQuality
    ? Math.floor(grassCount * 0.55)
    : grassCount;
  grass.receiveShadow = true;
  scene.add(grass);
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockMaterial = mat(0x97917a);
  for (let i = 0; i < 65; i++) {
    const x = (random() - 0.5) * 85;
    const z = 15 - random() * 78;
    if (Math.abs(x - pathCenter(z)) < 3) continue;
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    const size = 0.15 + random() * 0.6;
    rock.scale.set(size * 1.4, size * 0.6, size);
    rock.position.set(x, 0.03, z);
    rock.rotation.set(random(), random(), random());
    rock.castShadow = true;
    scene.add(rock);
  }
  // Animal footprints guide the first approach along the path.
  const printMaterial = new THREE.MeshStandardMaterial({
    color: 0x9d885e,
    roughness: 1,
  });
  const printGeometry = new THREE.CircleGeometry(0.075, 7);
  for (let i = 0; i < 16; i++) {
    const z = 3 - i * 1.08;
    for (const side of [-1, 1]) {
      const print = new THREE.Mesh(printGeometry, printMaterial);
      print.rotation.x = -Math.PI / 2;
      print.position.set(
        pathCenter(z) + side * 0.25,
        0.014,
        z + (side > 0 ? 0.28 : 0),
      );
      print.scale.y = 1.4;
      scene.add(print);
    }
  }

  const animal = createZebra(0, (state) => {
    renderer.domElement.dataset.modelState = state;
  });
  const spawn = new THREE.Vector3(...zebra.spawn.position);
  animal.root.position.copy(spawn);
  animal.root.rotation.y = -0.12;
  scene.add(animal.root);
  const companions = zebra.spawn.herdOffsets.map((offset, i) => {
    const rig = createZebra(i + 1);
    rig.root.position.copy(spawn).add(new THREE.Vector3(...offset));
    rig.root.position.z -= 5;
    rig.root.rotation.y = i % 2 === 0 ? 0.7 : 2.9;
    rig.root.scale.multiplyScalar(0.88 + i * 0.08);
    scene.add(rig.root);
    return rig;
  });

  const explorer = createPlayer((state) => {
    renderer.domElement.dataset.playerModelState = state;
  });
  const player = explorer.root;
  player.position.set(0, 0, 5);
  scene.add(player);
  const characterCompanion = CORA_CHARACTER
    ? createCompanion(CORA_CHARACTER, (state) => {
        renderer.domElement.dataset.companionModelState = state;
      })
    : null;
  if (characterCompanion) scene.add(characterCompanion.root);
  renderer.domElement.dataset.characterCount = characterCompanion ? "2" : "1";
  const welcomeRay = new THREE.Vector3();

  let active = false;
  let hasExplored = false;
  let photoMode = false;
  let zoom = 1;
  let yaw = 0;
  let pitch = 0.34;
  let disposed = false;
  let contextLost = false;
  let companionPaused = false;
  let frame = 0;
  let elapsed = 0;
  let lastTime = performance.now();
  let lastStatusTime = 0;
  let fps = 60;
  let behavior: AnimalBehavior = "grazing";
  let walkDirection = 0.5;
  let guideDestination: THREE.Vector3 | null = null;
  const movement: Record<Direction, boolean> = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };
  const velocity = new THREE.Vector3();
  const cameraDestination = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const photoTarget = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  let status: WorldStatus = {
    distance: 23,
    nearby: false,
    behavior: "grazing",
    photoReady: false,
    fps: 60,
  };
  const clearMovement = () => {
    lastTime = performance.now();
    Object.keys(movement).forEach((key) => {
      movement[key as Direction] = false;
    });
    dragging = false;
  };
  const keys: Record<string, Direction> = {
    KeyW: "forward",
    ArrowUp: "forward",
    KeyS: "backward",
    ArrowDown: "backward",
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right",
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!active || photoMode || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]'))
      return;
    const direction = keys[event.code];
    if (!direction) return;
    event.preventDefault();
    if (!Object.values(movement).some(Boolean)) lastTime = performance.now();
    movement[direction] = true;
    guideDestination = null;
  };
  const onKeyUp = (event: KeyboardEvent) => {
    const direction = keys[event.code];
    if (direction) movement[direction] = false;
  };
  let dragging = false;
  let pointerX = 0;
  let pointerY = 0;
  const onPointerDown = (event: PointerEvent) => {
    if (!active || photoMode) return;
    dragging = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging || !active || photoMode) return;
    yaw -= (event.clientX - pointerX) * 0.006;
    pitch = THREE.MathUtils.clamp(
      pitch + (event.clientY - pointerY) * 0.003,
      0.12,
      0.8,
    );
    pointerX = event.clientX;
    pointerY = event.clientY;
  };
  const onPointerUp = () => {
    dragging = false;
  };
  const onVisibility = () => {
    companionPaused = document.hidden || !document.hasFocus();
    clearMovement();
    lastTime = performance.now();
  };
  const onBlur = () => {
    companionPaused = true;
    clearMovement();
  };
  const onFocus = () => {
    companionPaused = false;
    lastTime = performance.now();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    clearMovement();
    settings.onError(
      "The 3D view paused. Refresh to return to the savanna; your saved discoveries are safe.",
    );
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerUp);
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);

  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function updateCamera(snap = false) {
    if (!hasExplored) {
      const narrow = container.clientWidth <= 760;
      cameraDestination
        .copy(spawn)
        .add(new THREE.Vector3(4.5, narrow ? 1.45 : 1.7, 8.5));
      cameraTarget
        .copy(spawn)
        .add(new THREE.Vector3(-3, narrow ? 0.9 : 1.1, 0));
      camera.fov = 48;
      camera.zoom = 1;
    } else if (photoMode) {
      cameraDestination.copy(player.position).add(new THREE.Vector3(0, 1.7, 0));
      cameraTarget.copy(animal.root.position).add(new THREE.Vector3(0, 1.1, 0));
      // Preserve a useful horizontal field of view on portrait screens.
      camera.fov = THREE.MathUtils.radToDeg(
        2 *
          Math.atan(
            Math.tan((22 * Math.PI) / 180) / Math.min(camera.aspect, 1),
          ),
      );
      // Keep the whole animal in frame on narrow phones, even at maximum zoom.
      const range = cameraDestination.distanceTo(cameraTarget);
      const safeZoom = Math.max(
        1,
        (range *
          Math.tan((camera.fov * Math.PI) / 360) *
          Math.min(camera.aspect, 1.8)) /
          1.9,
      );
      camera.zoom = Math.min(zoom, safeZoom);
    } else {
      const orbitDistance = camera.aspect < 0.85 ? 11 : 8.8;
      cameraDestination
        .copy(player.position)
        .add(
          new THREE.Vector3(
            Math.sin(yaw) * orbitDistance,
            2.1 + Math.sin(pitch) * orbitDistance,
            Math.cos(yaw) * orbitDistance,
          ),
        );
      cameraTarget
        .copy(player.position)
        .add(new THREE.Vector3(-Math.sin(yaw) * 3, 1.1, -Math.cos(yaw) * 3));
      camera.fov = 48;
      camera.zoom = 1;
    }
    camera.position.lerp(
      cameraDestination,
      snap || settings.reducedMotion ? 1 : 0.11,
    );
    camera.lookAt(cameraTarget);
    camera.updateProjectionMatrix();
  }

  function placeWelcomeCharacters() {
    const narrow = container.clientWidth <= 760;
    // Keep the welcome figures in the clear part of the scene, above the
    // mobile introduction and to the right of the desktop reading column.
    camera.updateMatrixWorld();
    welcomeRay
      .set(
        narrow
          ? characterCompanion
            ? 0.35
            : 0
          : characterCompanion
            ? 0.5
            : 0.45,
        narrow ? -0.75 : -0.45,
        0.5,
      )
      .unproject(camera)
      .sub(camera.position)
      .normalize();
    const distance = -camera.position.y / welcomeRay.y;
    player.position.copy(camera.position).addScaledVector(welcomeRay, distance);
    player.position.y = 0;
    player.rotation.y = Math.atan2(
      player.position.x - camera.position.x,
      player.position.z - camera.position.z,
    );
    player.visible = true;
  }

  function updateStatus() {
    const distance = player.position.distanceTo(animal.root.position);
    let photoReady =
      distance >= zebra.behaviors.comfortRadius + 0.4 &&
      distance <= zebra.behaviors.photoMaxDistance;
    if (photoReady && photoMode) {
      photoTarget.copy(animal.root.position).add(new THREE.Vector3(0, 1, 0));
      const direction = photoTarget.clone().sub(camera.position);
      raycaster.set(camera.position, direction.clone().normalize());
      raycaster.far = direction.length() - 0.8;
      photoReady =
        raycaster.intersectObjects(obstacleMeshes, false).length === 0;
    }
    status = {
      distance,
      nearby: distance <= zebra.behaviors.encounterRadius,
      behavior,
      photoReady,
      fps: Math.round(fps),
    };
    settings.onStatus(status);
  }

  function resolvePlayerCollisions(position: GroundPosition) {
    position.x = THREE.MathUtils.clamp(position.x, -38, 38);
    position.z = THREE.MathUtils.clamp(position.z, -55, 20);
    for (const tree of trees) {
      const dx = position.x - tree.x;
      const dz = position.z - tree.z;
      const distance = Math.hypot(dx, dz);
      if (distance < tree.radius + 0.25 && distance > 0.001) {
        position.x = tree.x + (dx / distance) * (tree.radius + 0.25);
        position.z = tree.z + (dz / distance) * (tree.radius + 0.25);
      }
    }
    // The water has a gentle shore boundary; the child stays on dry land.
    const px = position.x - pondCenter.x;
    const pz = position.z - pondCenter.y;
    const pondDistance = Math.sqrt((px / 10.3) ** 2 + (pz / 7.5) ** 2);
    if (pondDistance < 1 && pondDistance > 0) {
      position.x = pondCenter.x + px / pondDistance;
      position.z = pondCenter.y + pz / pondDistance;
    }
  }

  function animate(time: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const frameDuration = Math.max(0, (time - lastTime) / 1000);
    const delta = Math.min(frameDuration, 0.05);
    lastTime = time;
    if (document.hidden || contextLost) return;
    elapsed += delta;
    if (frameDuration > 0)
      fps = THREE.MathUtils.lerp(fps, Math.min(120, 1 / frameDuration), 0.02);
    const previousPlayerX = player.position.x;
    const previousPlayerZ = player.position.z;
    velocity.set(0, 0, 0);
    if (active && !photoMode) {
      if (guideDestination) {
        velocity.copy(guideDestination).sub(player.position);
        velocity.y = 0;
        velocity.normalize().multiplyScalar(4.8);
        // Assisted walking follows elapsed visible time rather than the capped
        // animation step, so slow graphics cannot trap a child on the approach.
        if (stepToward(player.position, guideDestination, frameDuration, 4.8)) {
          guideDestination = null;
          velocity.set(0, 0, 0);
        }
        resolvePlayerCollisions(player.position);
      } else {
        const forward = Number(movement.forward) - Number(movement.backward);
        const right = Number(movement.right) - Number(movement.left);
        velocity.set(
          -Math.sin(yaw) * forward + Math.cos(yaw) * right,
          0,
          -Math.cos(yaw) * forward - Math.sin(yaw) * right,
        );
        if (velocity.lengthSq() > 0) velocity.normalize().multiplyScalar(4.2);
        moveWithCollisions(
          player.position,
          velocity,
          frameDuration,
          resolvePlayerCollisions,
        );
      }
      if (velocity.lengthSq() > 0)
        player.rotation.y = Math.atan2(-velocity.x, -velocity.z);
    }
    const playerMoved =
      Math.hypot(
        player.position.x - previousPlayerX,
        player.position.z - previousPlayerZ,
      ) > 0.00001;
    explorer.animate(
      companionPaused ? 0 : frameDuration,
      playerMoved,
      settings.reducedMotion,
      !hasExplored,
    );

    const distance = player.position.distanceTo(animal.root.position);
    if (active && !photoMode && !guideDestination) {
      if (distance < zebra.behaviors.comfortRadius) {
        behavior = "retreating";
        const away = animal.root.position
          .clone()
          .sub(player.position)
          .setY(0)
          .normalize();
        animal.root.position.addScaledVector(
          away,
          delta * zebra.behaviors.retreatSpeed,
        );
        animal.root.rotation.y = Math.atan2(-away.z, away.x);
      } else if (
        distance < zebra.behaviors.alertRadius &&
        velocity.lengthSq() > 0
      ) {
        behavior = "alert";
      } else {
        const cycle =
          zebra.behaviors.grazeSeconds + zebra.behaviors.walkSeconds;
        const phase = elapsed % cycle;
        behavior = phase < zebra.behaviors.grazeSeconds ? "grazing" : "walking";
        if (behavior === "walking") {
          const roamAngle = Math.floor(elapsed / cycle) * 1.8;
          const nextGrazingPatch = spawn
            .clone()
            .add(
              new THREE.Vector3(
                Math.cos(roamAngle) * zebra.spawn.roamRadius * 0.55,
                0,
                Math.sin(roamAngle) * zebra.spawn.roamRadius * 0.55,
              ),
            );
          const travel = nextGrazingPatch.sub(animal.root.position).setY(0);
          walkDirection = Math.atan2(-travel.z, travel.x);
          const pace = settings.reducedMotion
            ? zebra.behaviors.walkSpeed * 0.5
            : zebra.behaviors.walkSpeed;
          animal.root.position.x += Math.cos(walkDirection) * delta * pace;
          animal.root.position.z -= Math.sin(walkDirection) * delta * pace;
          animal.root.rotation.y = walkDirection;
        }
      }
    } else behavior = photoMode ? "alert" : "grazing";
    animal.animate(elapsed, behavior, settings.reducedMotion);
    companions.forEach((rig, i) =>
      rig.animate(elapsed + i, "grazing", settings.reducedMotion),
    );
    if (!settings.reducedMotion)
      ripples.forEach((ring, i) => {
        const pulse = 1 + Math.sin(elapsed * 0.45 + i) * 0.035;
        ring.scale.set(pulse, pulse * 0.65, 1);
      });
    updateCamera();
    if (!hasExplored) placeWelcomeCharacters();
    characterCompanion?.update(
      frameDuration,
      player.position,
      player.rotation.y,
      {
        visible: !photoMode,
        moving: playerMoved,
        reducedMotion: settings.reducedMotion,
        greeting: !hasExplored,
        teleport: !hasExplored,
        paused: companionPaused || (hasExplored && !active),
      },
      hasExplored ? resolvePlayerCollisions : () => undefined,
    );
    renderer.domElement.dataset.characterMode = !hasExplored
      ? "welcome"
      : photoMode
        ? "photo"
        : "explore";
    renderer.domElement.dataset.explorerX = String(player.position.x);
    renderer.domElement.dataset.explorerZ = String(player.position.z);
    renderer.render(scene, camera);
    if (time - lastStatusTime > 180) {
      updateStatus();
      lastStatusTime = time;
    }
  }
  updateCamera(true);
  updateStatus();
  frame = requestAnimationFrame(animate);

  return {
    setActive(value) {
      if (active !== value) lastTime = performance.now();
      active = value;
      const entering = value && !hasExplored;
      if (entering) {
        player.position.set(0, 0, 5);
        player.rotation.y = 0;
        characterCompanion?.update(
          0,
          player.position,
          0,
          {
            visible: true,
            moving: false,
            reducedMotion: settings.reducedMotion,
            teleport: true,
          },
          resolvePlayerCollisions,
        );
      }
      if (value) hasExplored = true;
      if (entering) updateCamera(true);
      player.visible = !photoMode;
      if (!value) {
        clearMovement();
        guideDestination = null;
      }
    },
    setPhotoMode(value) {
      photoMode = value;
      player.visible = !value;
      if (value && characterCompanion) characterCompanion.root.visible = false;
      clearMovement();
      guideDestination = null;
      updateCamera(true);
      renderer.render(scene, camera);
      updateStatus();
    },
    setZoom(value) {
      zoom = THREE.MathUtils.clamp(value, 1, 2);
      updateCamera(true);
      updateStatus();
    },
    setMovement(direction, pressed) {
      if (active && !photoMode) {
        if (pressed && !Object.values(movement).some(Boolean))
          lastTime = performance.now();
        movement[direction] = pressed;
        if (pressed) guideDestination = null;
      }
    },
    setOptions(value) {
      Object.assign(settings, value);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, settings.lowQuality ? 1 : 1.75),
      );
      renderer.shadowMap.enabled = !settings.lowQuality;
      grass.count = settings.lowQuality
        ? Math.floor(grassCount * 0.55)
        : grassCount;
      resize();
    },
    guideToAnimal() {
      clearMovement();
      lastTime = performance.now();
      yaw = 0;
      pitch = 0.34;
      guideDestination = animal.root.position
        .clone()
        .add(new THREE.Vector3(0, 0, 8));
      if (settings.reducedMotion) {
        player.position.copy(guideDestination);
        guideDestination = null;
        updateCamera(true);
        updateStatus();
      }
    },
    capture() {
      updateStatus();
      if (!photoMode || !status.photoReady || contextLost) return null;
      const originalSize = renderer.getSize(new THREE.Vector2());
      const originalPixelRatio = renderer.getPixelRatio();
      try {
        // A consistent photograph shape avoids cutting off heads when a portrait
        // device's image is displayed in the field book. This is the actual scene
        // rendered from the same position, with the same horizontal composition.
        const photoCamera = camera.clone();
        photoCamera.aspect = 4 / 3;
        photoCamera.fov = THREE.MathUtils.radToDeg(
          2 *
            Math.atan(
              (Math.tan((camera.fov * Math.PI) / 360) * camera.aspect) /
                photoCamera.aspect,
            ),
        );
        photoCamera.updateProjectionMatrix();
        renderer.setPixelRatio(1);
        renderer.setSize(960, 720, false);
        renderer.render(scene, photoCamera);
        return renderer.domElement.toDataURL("image/jpeg", 0.82);
      } catch {
        settings.onError(
          "The camera could not save that picture. Try taking it once more.",
        );
        return null;
      } finally {
        renderer.setPixelRatio(originalPixelRatio);
        renderer.setSize(originalSize.x, originalSize.y, false);
        renderer.render(scene, camera);
      }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost,
      );
      explorer.dispose();
      characterCompanion?.dispose();
      animal.dispose();
      companions.forEach((rig) => rig.dispose());
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
