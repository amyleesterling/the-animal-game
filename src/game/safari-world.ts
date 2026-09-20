import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type {
  SafariStop,
  SafariStatus,
  SafariWorld,
  SafariWorldOptions,
} from "../safari-contracts";
import { createPlayer } from "./player";
import {
  moveWithCollisions,
  stepToward,
  type GroundPosition,
} from "./movement";
import { disposeModelResources } from "./zebra-model";
import {
  createSafariJeepFallback,
  loadSafariModel,
  type SafariModel,
} from "./safari-model";

type Direction = "forward" | "backward" | "left" | "right";
type Obstacle = { x: number; z: number; radius: number };
const UP = new THREE.Vector3(0, 1, 0);

export function safariViewpoints(
  stop: Pick<SafariStop, "position" | "height">,
) {
  const animal = new THREE.Vector3(...stop.position);
  const range = Math.max(7.5, stop.height * 1.9);
  return {
    observation: animal.clone().add(new THREE.Vector3(0, 0, range)),
    arrival: animal.clone().add(new THREE.Vector3(0, 0, range + 9)),
    jeep: animal.clone().add(new THREE.Vector3(5.5, 0, range + 5)),
    encounterRange: range + 3,
    photoRange: range + 6,
  };
}

/** Fit every bounding-box corner while preserving the photographer's direction. */
export function frameSafariPhoto(
  camera: THREE.PerspectiveCamera,
  bounds: THREE.Box3,
  viewpoint: THREE.Vector3,
) {
  const target = bounds.getCenter(new THREE.Vector3());
  const direction = viewpoint.clone().sub(target).normalize();
  if (direction.lengthSq() === 0) direction.set(0, 0.1, 1).normalize();
  camera.fov = 48;
  camera.zoom = 1;
  camera.position.copy(target).add(direction);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  const inverseRotation = camera.quaternion.clone().invert();
  const halfVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const halfHorizontal = halfVertical * camera.aspect;
  let range = Math.max(1, viewpoint.distanceTo(target));
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z)
          .sub(target)
          .applyQuaternion(inverseRotation);
        range = Math.max(
          range,
          point.z +
            Math.max(
              Math.abs(point.x) / halfHorizontal,
              Math.abs(point.y) / halfVertical,
            ) *
              1.2,
        );
      }
  camera.position.copy(target).addScaledVector(direction, range);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function createLandscape(scene: THREE.Scene, stops: SafariStop[]) {
  let seed = 72931;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const mat = (color: number) =>
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    mat(0xb5ad71),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  scene.add(ground);
  const routePoints = stops.map((stop) => safariViewpoints(stop).arrival);
  const route = new THREE.CatmullRomCurve3(routePoints, true, "centripetal");
  const pathPoints = route.getPoints(300);
  const pathPositions: number[] = [],
    pathIndices: number[] = [];
  for (let i = 0; i < pathPoints.length; i++) {
    const center = pathPoints[i];
    const tangent = route.getTangent(i / (pathPoints.length - 1));
    const perpendicular = new THREE.Vector3(
      -tangent.z,
      0,
      tangent.x,
    ).normalize();
    for (const side of [-1, 1]) {
      const point = center.clone().addScaledVector(perpendicular, side * 2.15);
      pathPositions.push(point.x, 0.006, point.z);
    }
    if (i > 0) {
      const k = i * 2;
      pathIndices.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  }
  const pathGeometry = new THREE.BufferGeometry();
  pathGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(pathPositions, 3),
  );
  pathGeometry.setIndex(pathIndices);
  pathGeometry.computeVertexNormals();
  const path = new THREE.Mesh(
    pathGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xd2b27e,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  path.receiveShadow = true;
  scene.add(path);

  const clearings = stops.map(
    (stop) => new THREE.Vector2(stop.position[0], stop.position[2]),
  );
  stops.forEach((stop, i) => {
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(10.5, 32),
      mat(
        [0xb6aa72, 0xc0ad7b, 0xa6a268, 0xc3ae79, 0xb7af70, 0xbcaa79, 0xb8aa7d][
          i % 7
        ],
      ),
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(stop.position[0], 0.008, stop.position[2]);
    patch.scale.y = 0.78;
    patch.receiveShadow = true;
    scene.add(patch);
  });
  const elephant =
    stops.find((stop) => stop.id === "african-elephant") ?? stops[0];
  const pondCenter = new THREE.Vector2(
    elephant.position[0] + 15,
    elephant.position[2] - 10,
  );
  const ponds = [{ x: pondCenter.x, z: pondCenter.y, radius: 10.5 }];
  const shore = new THREE.Mesh(
    new THREE.CircleGeometry(11.5, 64),
    mat(0xd0bd91),
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(pondCenter.x, 0.016, pondCenter.y);
  scene.add(shore);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(10.4, 64),
    new THREE.MeshStandardMaterial({
      color: 0x6f9d97,
      roughness: 0.26,
      metalness: 0.22,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(pondCenter.x, 0.028, pondCenter.y);
  scene.add(water);
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.6 + i * 1.55, 2.65 + i * 1.55, 60),
      new THREE.MeshBasicMaterial({
        color: 0xc0d2b4,
        transparent: true,
        opacity: 0.27,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pondCenter.x, 0.034 + i * 0.001, pondCenter.y);
    scene.add(ring);
  }
  const hillGeometry = new THREE.IcosahedronGeometry(1, 1);
  const hillMaterials = [mat(0xa4a487), mat(0xb4ae91), mat(0x969f80)];
  for (let i = 0; i < 44; i++) {
    const angle = (i / 44) * Math.PI * 2;
    const hill = new THREE.Mesh(hillGeometry, hillMaterials[i % 3]);
    hill.position.set(Math.cos(angle) * 150, -1, Math.sin(angle) * 150 - 18);
    hill.scale.set(18 + random() * 25, 5 + random() * 16, 18 + random() * 13);
    hill.rotation.y = random() * Math.PI;
    scene.add(hill);
  }
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(7, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe2a4, fog: false }),
  );
  sun.position.set(-88, 40, -156);
  scene.add(sun);

  const treeMaterials = [
    mat(0x6d6044),
    mat(0x607746),
    mat(0x76834b),
    mat(0x849051),
  ];
  const treePieces: THREE.BufferGeometry[][] = treeMaterials.map(() => []);
  const trunkGeometry = new THREE.CylinderGeometry(0.14, 0.28, 1, 7);
  const canopyGeometry = new THREE.IcosahedronGeometry(1, 1);
  const obstacles: Obstacle[] = [...ponds];
  const transform = new THREE.Object3D();
  const cameraCorridors = stops.map((stop) => ({
    x: stop.position[0],
    nearZ: stop.position[2] - 3,
    farZ: safariViewpoints(stop).arrival.z + 16,
  }));
  function tree(x: number, z: number, scale: number) {
    // Keep trunks and wide canopies out of the default arrival/guide views,
    // including the twelve metres behind Soph used by the phone camera.
    // Apply this to deliberately placed trees as well as the random grove.
    if (
      cameraCorridors.some(
        (corridor) =>
          Math.abs(x - corridor.x) < 14 &&
          z > corridor.nearZ &&
          z < corridor.farZ,
      )
    )
      return;
    obstacles.push({ x, z, radius: 0.6 * scale });
    const origin = new THREE.Vector3(x, 0, z);
    const branch = (from: THREE.Vector3, to: THREE.Vector3, width: number) => {
      transform.position
        .copy(from)
        .add(to)
        .multiplyScalar(0.5)
        .multiplyScalar(scale)
        .add(origin);
      transform.quaternion.setFromUnitVectors(
        UP,
        to.clone().sub(from).normalize(),
      );
      transform.scale.set(
        width * scale,
        from.distanceTo(to) * scale,
        width * scale,
      );
      transform.updateMatrix();
      treePieces[0].push(trunkGeometry.clone().applyMatrix4(transform.matrix));
    };
    branch(new THREE.Vector3(), new THREE.Vector3(0.2, 3.8, 0), 1);
    branch(
      new THREE.Vector3(0.1, 2.5, 0),
      new THREE.Vector3(-1.7, 4.3, 0.5),
      0.65,
    );
    branch(
      new THREE.Vector3(0.1, 2.8, 0),
      new THREE.Vector3(1.7, 4.45, -0.4),
      0.6,
    );
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI * 2;
      transform.position
        .set(Math.cos(angle) * 1.25, 4.2 + random() * 0.4, Math.sin(angle))
        .multiplyScalar(scale)
        .add(origin);
      transform.rotation.set(0, random() * Math.PI, 0);
      transform.scale.set(
        2.25 * scale,
        (0.55 + random() * 0.16) * scale,
        1.9 * scale,
      );
      transform.updateMatrix();
      treePieces[1 + (j % 3)].push(
        canopyGeometry.clone().applyMatrix4(transform.matrix),
      );
    }
  }
  stops.forEach((stop, i) => {
    tree(stop.position[0] - 12, stop.position[2] - 7, 1.2 + (i % 3) * 0.15);
    tree(stop.position[0] + 12, stop.position[2] - 11, 1 + (i % 2) * 0.4);
  });
  for (let i = 0; i < 70; i++) {
    const x = (random() - 0.5) * 205,
      z = (random() - 0.5) * 170 - 20;
    if (
      clearings.some((p) => Math.hypot(x - p.x, z - p.y - 6) < 21) ||
      pathPoints.some((p) => Math.hypot(x - p.x, z - p.z) < 6) ||
      Math.hypot(x - pondCenter.x, z - pondCenter.y) < 14
    )
      continue;
    tree(x, z, 0.9 + random() * 0.7);
  }
  const treeMeshes: THREE.Mesh[] = [];
  treePieces.forEach((pieces, index) => {
    const merged = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, treeMaterials[index]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    treeMeshes.push(mesh);
  });
  trunkGeometry.dispose();
  canopyGeometry.dispose();
  const blade = new THREE.BufferGeometry();
  blade.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-0.1, 0, 0, 0.1, 0, 0, 0.02, 0.52, 0], 3),
  );
  blade.computeVertexNormals();
  const grass = new THREE.InstancedMesh(
    blade,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      roughness: 1,
    }),
    15000,
  );
  const color = new THREE.Color();
  let count = 0;
  for (let i = 0; i < 6000; i++) {
    const x = (random() - 0.5) * 180,
      z = (random() - 0.5) * 155 - 16;
    if (
      pathPoints.some((p) => Math.hypot(x - p.x, z - p.z) < 2.5) ||
      Math.hypot(x - pondCenter.x, z - pondCenter.y) < 11.7 ||
      stops.some(
        (stop) =>
          Math.abs(x - stop.position[0]) < 4 &&
          z > stop.position[2] - 3 &&
          z < stop.position[2] + 25,
      )
    )
      continue;
    color.setHSL(
      0.14 + random() * 0.055,
      0.28 + random() * 0.16,
      0.37 + random() * 0.17,
    );
    for (let j = 0; j < 3 && count < 15000; j++) {
      transform.position.set(x + random() * 0.22, 0.013, z + random() * 0.22);
      transform.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.2);
      transform.scale.set(1, 0.5 + random() * 0.8, 1);
      transform.updateMatrix();
      grass.setMatrixAt(count, transform.matrix);
      grass.setColorAt(count++, color);
    }
  }
  grass.count = count;
  grass.receiveShadow = true;
  scene.add(grass);
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeometry, mat(0x928c70), 100);
  for (let i = 0; i < 100; i++) {
    const stop = stops[i % stops.length];
    const angle = random() * Math.PI * 2;
    const radius = 10 + random() * 5;
    transform.position.set(
      stop.position[0] + Math.cos(angle) * radius,
      0,
      stop.position[2] + Math.sin(angle) * radius,
    );
    const scale = 0.14 + random() * 0.43;
    transform.scale.set(scale * 1.5, scale * 0.6, scale);
    transform.rotation.set(random(), random(), random());
    transform.updateMatrix();
    rocks.setMatrixAt(i, transform.matrix);
  }
  rocks.castShadow = true;
  scene.add(rocks);
  return { obstacles, treeMeshes, grass, grassCount: count };
}

export function createSafariWorld(
  container: HTMLElement,
  options: SafariWorldOptions,
): SafariWorld {
  if (!options.stops.length)
    throw new Error("The safari needs at least one stop.");
  const settings = { ...options };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xead7b6);
  scene.fog = new THREE.Fog(0xead7b6, 55, 180);
  const renderer = new THREE.WebGLRenderer({
    antialias: !settings.lowQuality,
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = !settings.lowQuality;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, settings.lowQuality ? 1 : 1.6),
  );
  const canvas = renderer.domElement;
  canvas.style.cssText =
    "width:100%;height:100%;display:block;touch-action:none";
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "Soph's safari. Use W A S D or arrow keys to walk. Drag to look around.",
  );
  container.append(canvas);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 320);
  scene.add(new THREE.HemisphereLight(0xffe9c7, 0x737a45, 2.4));
  const sun = new THREE.DirectionalLight(0xffd99f, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -30,
    right: 30,
    top: 28,
    bottom: -28,
    near: 1,
    far: 120,
  });
  sun.shadow.normalBias = 0.035;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);
  const landscape = createLandscape(scene, options.stops);
  landscape.grass.count = settings.lowQuality
    ? Math.floor(landscape.grassCount * 0.55)
    : landscape.grassCount;
  const explorer = createPlayer((state) => {
    canvas.dataset.playerModelState = state;
  });
  scene.add(explorer.root);
  const jeep = new THREE.Group();
  let fallbackJeep: THREE.Group | undefined = createSafariJeepFallback();
  jeep.add(fallbackJeep);
  scene.add(jeep);
  const controller = new AbortController();
  const animals = new Map<string, SafariModel>();
  const failedAnimals = new Set<string>();
  let jeepModel: SafariModel | undefined;
  let disposed = false;
  let active = false;
  let photoMode = false;
  let contextLost = false;
  let stop = options.stops[0];
  let views = safariViewpoints(stop);
  let guide: THREE.Vector3 | null = null;
  let yaw = 0;
  let pitch = 0.3;
  let previousTime = performance.now();
  let statusTime = 0;
  let frame = 0;
  let dragging = false;
  let pointerX = 0,
    pointerY = 0;
  const movement: Record<Direction, boolean> = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };
  const velocity = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const fallbackBounds = () =>
    new THREE.Box3(
      new THREE.Vector3(
        stop.position[0] - stop.height * 0.7,
        0,
        stop.position[2] - 0.6,
      ),
      new THREE.Vector3(
        stop.position[0] + stop.height * 0.7,
        stop.height,
        stop.position[2] + 0.6,
      ),
    );
  const currentBounds = () => {
    const model = animals.get(stop.id);
    return model
      ? new THREE.Box3().setFromObject(model.root)
      : fallbackBounds();
  };
  const safeRadius = () =>
    Math.max(2.4, (animals.get(stop.id)?.size.x ?? stop.height * 1.4) * 0.45);
  function updateStatus() {
    if (disposed) return;
    const distance = explorer.root.position.distanceTo(
      new THREE.Vector3(...stop.position),
    );
    const animalLoaded = animals.has(stop.id);
    let photoReady =
      animalLoaded &&
      distance >= safeRadius() + 0.4 &&
      distance <= views.photoRange;
    if (photoReady && photoMode) {
      const target = currentBounds().getCenter(new THREE.Vector3());
      const direction = target.sub(camera.position);
      raycaster.set(camera.position, direction.clone().normalize());
      raycaster.far = Math.max(0, direction.length() - 1);
      photoReady =
        raycaster.intersectObjects([...landscape.treeMeshes, jeep], true)
          .length === 0;
    }
    canvas.dataset.animalState = animalLoaded
      ? "loaded"
      : failedAnimals.has(stop.id)
        ? "error"
        : "loading";
    const status: SafariStatus = {
      distance,
      nearby: animalLoaded && distance <= views.encounterRange,
      photoReady,
      animalLoaded,
      jeepLoaded: Boolean(jeepModel),
    };
    settings.onStatus(status);
    return status;
  }
  function updateCamera(snap = false) {
    if (photoMode) {
      frameSafariPhoto(
        camera,
        currentBounds(),
        explorer.root.position.clone().add(new THREE.Vector3(0, 1.65, 0)),
      );
      return;
    }
    const distance = camera.aspect < 0.8 ? 12 : 9;
    desiredCamera
      .copy(explorer.root.position)
      .add(
        new THREE.Vector3(
          Math.sin(yaw) * distance,
          2 + Math.sin(pitch) * distance,
          Math.cos(yaw) * distance,
        ),
      );
    cameraTarget
      .copy(explorer.root.position)
      .add(new THREE.Vector3(-Math.sin(yaw) * 4, 1.5, -Math.cos(yaw) * 4));
    camera.position.lerp(
      desiredCamera,
      snap || settings.reducedMotion ? 1 : 0.15,
    );
    camera.fov = 48;
    camera.lookAt(cameraTarget);
    camera.updateProjectionMatrix();
  }
  function clearMovement() {
    Object.keys(movement).forEach((key) => {
      movement[key as Direction] = false;
    });
    dragging = false;
    previousTime = performance.now();
  }
  function selectStop(id: string) {
    const next = options.stops.find((entry) => entry.id === id);
    if (!next || disposed) return;
    stop = next;
    views = safariViewpoints(stop);
    clearMovement();
    guide = null;
    photoMode = false;
    yaw = 0;
    pitch = 0.3;
    explorer.root.position.copy(views.arrival);
    explorer.root.rotation.y = 0;
    explorer.root.visible = active;
    jeep.position.copy(views.jeep);
    jeep.rotation.y = -0.12;
    sun.position.set(stop.position[0] - 26, 37, stop.position[2] + 20);
    sun.target.position.set(...stop.position);
    canvas.dataset.stopId = stop.id;
    updateCamera(true);
    updateStatus();
    if (failedAnimals.has(stop.id))
      settings.onError(`${stop.name} could not load. Refresh to try again.`);
  }
  function resolveCollisions(position: GroundPosition) {
    position.x = THREE.MathUtils.clamp(position.x, -100, 100);
    position.z = THREE.MathUtils.clamp(position.z, -110, 85);
    const obstacles = [
      ...landscape.obstacles,
      { x: jeep.position.x, z: jeep.position.z, radius: 2.7 },
    ];
    for (const animal of options.stops) {
      const size = animals.get(animal.id)?.size.x ?? animal.height * 1.4;
      obstacles.push({
        x: animal.position[0],
        z: animal.position[2],
        radius: Math.max(2.4, size * 0.45),
      });
    }
    for (const obstacle of obstacles) {
      const dx = position.x - obstacle.x,
        dz = position.z - obstacle.z;
      const range = Math.hypot(dx, dz);
      if (range < obstacle.radius + 0.3) {
        const angle = range === 0 ? 0 : Math.atan2(dz, dx);
        position.x = obstacle.x + Math.cos(angle) * (obstacle.radius + 0.3);
        position.z = obstacle.z + Math.sin(angle) * (obstacle.radius + 0.3);
      }
    }
  }
  function setMovement(direction: Direction, pressed: boolean) {
    if (disposed || (!active && pressed) || (photoMode && pressed)) return;
    if (pressed && !Object.values(movement).some(Boolean))
      previousTime = performance.now();
    movement[direction] = pressed;
    if (pressed) guide = null;
  }
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
    if (
      !active ||
      photoMode ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.target as HTMLElement | null)?.closest(
        'input, textarea, select, [contenteditable="true"]',
      )
    )
      return;
    if (keys[event.code]) {
      event.preventDefault();
      setMovement(keys[event.code], true);
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (keys[event.code]) setMovement(keys[event.code], false);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (!active || photoMode) return;
    dragging = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging || !active || photoMode) return;
    yaw -= (event.clientX - pointerX) * 0.006;
    pitch = THREE.MathUtils.clamp(
      pitch + (event.clientY - pointerY) * 0.003,
      0.12,
      0.75,
    );
    pointerX = event.clientX;
    pointerY = event.clientY;
  };
  const onPointerUp = () => {
    dragging = false;
  };
  const onVisibility = () => {
    clearMovement();
  };
  const onBlur = () => {
    clearMovement();
    guide = null;
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    clearMovement();
    guide = null;
    settings.onError(
      "The 3D safari paused. Refresh to return; your saved discoveries are safe.",
    );
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("webglcontextlost", onContextLost);
  const resize = () => {
    renderer.setSize(
      Math.max(1, container.clientWidth),
      Math.max(1, container.clientHeight),
      false,
    );
    camera.aspect =
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
    updateCamera(true);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  selectStop(stop.id);
  resize();

  for (const entry of options.stops) {
    void loadSafariModel(
      entry.modelPath,
      entry.forwardAxis,
      entry.height,
      controller.signal,
    )
      .then((model) => {
        if (disposed) {
          model.dispose();
          return;
        }
        model.root.position.set(...entry.position);
        model.root.rotation.y = -0.12;
        animals.set(entry.id, model);
        scene.add(model.root);
        if (stop.id === entry.id) {
          updateCamera(true);
          updateStatus();
        }
      })
      .catch(() => {
        if (disposed) return;
        failedAnimals.add(entry.id);
        if (stop.id === entry.id) {
          updateStatus();
          settings.onError(
            `${entry.name} could not load. Refresh to try again.`,
          );
        }
      });
  }
  canvas.dataset.jeepState = "loading";
  void loadSafariModel("/models/safari-jeep.glb", "-x", 2.6, controller.signal)
    .then((model) => {
      if (disposed) {
        model.dispose();
        return;
      }
      if (fallbackJeep) {
        fallbackJeep.removeFromParent();
        disposeModelResources(fallbackJeep);
        fallbackJeep = undefined;
      }
      jeepModel = model;
      jeep.add(model.root);
      canvas.dataset.jeepState = "loaded";
      updateStatus();
    })
    .catch(() => {
      if (!disposed) {
        canvas.dataset.jeepState = "fallback";
        updateStatus();
      }
    });

  function animate(time: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const seconds = Math.max(0, (time - previousTime) / 1000);
    previousTime = time;
    if (document.hidden || contextLost) return;
    const oldX = explorer.root.position.x,
      oldZ = explorer.root.position.z;
    velocity.set(0, 0, 0);
    if (active && !photoMode) {
      if (guide) {
        velocity
          .copy(guide)
          .sub(explorer.root.position)
          .setY(0)
          .normalize()
          .multiplyScalar(4.6);
        if (stepToward(explorer.root.position, guide, seconds, 4.6))
          guide = null;
        resolveCollisions(explorer.root.position);
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
          explorer.root.position,
          velocity,
          seconds,
          resolveCollisions,
        );
      }
      if (velocity.lengthSq() > 0)
        explorer.root.rotation.y = Math.atan2(-velocity.x, -velocity.z);
    }
    explorer.animate(
      seconds,
      Math.hypot(
        explorer.root.position.x - oldX,
        explorer.root.position.z - oldZ,
      ) > 0.00001,
      settings.reducedMotion,
    );
    updateCamera();
    renderer.render(scene, camera);
    if (time - statusTime > 150) {
      updateStatus();
      statusTime = time;
    }
  }
  frame = requestAnimationFrame(animate);
  return {
    setStop: selectStop,
    guideToAnimal() {
      if (disposed) return;
      clearMovement();
      yaw = 0;
      pitch = 0.3;
      // The accessible guide returns a wanderer to the clear approach corridor.
      // This keeps it dependable without walking through trees or the waterhole.
      if (
        Math.abs(explorer.root.position.x - views.observation.x) > 2 ||
        explorer.root.position.z < views.observation.z ||
        explorer.root.position.z > views.arrival.z + 2
      )
        explorer.root.position.copy(views.arrival);
      guide = views.observation.clone();
      if (settings.reducedMotion || photoMode) {
        explorer.root.position.copy(guide);
        guide = null;
        updateCamera(true);
        updateStatus();
      }
    },
    setActive(value) {
      if (disposed) return;
      if (active !== value) previousTime = performance.now();
      active = value;
      explorer.root.visible = value && !photoMode;
      if (!value) {
        clearMovement();
        guide = null;
      }
    },
    setPhotoMode(value) {
      if (disposed) return;
      photoMode = value;
      clearMovement();
      guide = null;
      explorer.root.visible = active && !photoMode;
      updateCamera(true);
      updateStatus();
    },
    setMovement,
    setOptions(next) {
      Object.assign(settings, next);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, settings.lowQuality ? 1 : 1.6),
      );
      renderer.shadowMap.enabled = !settings.lowQuality;
      landscape.grass.count = settings.lowQuality
        ? Math.floor(landscape.grassCount * 0.55)
        : landscape.grassCount;
      resize();
    },
    capture() {
      if (disposed || !photoMode || contextLost || !updateStatus()?.photoReady)
        return null;
      const size = renderer.getSize(new THREE.Vector2());
      const ratio = renderer.getPixelRatio();
      try {
        const photoCamera = camera.clone();
        photoCamera.aspect = 4 / 3;
        frameSafariPhoto(
          photoCamera,
          currentBounds(),
          explorer.root.position.clone().add(new THREE.Vector3(0, 1.65, 0)),
        );
        renderer.setPixelRatio(1);
        renderer.setSize(960, 720, false);
        renderer.render(scene, photoCamera);
        return canvas.toDataURL("image/jpeg", 0.86);
      } catch {
        settings.onError(
          "The photograph could not be saved. Try the shutter once more.",
        );
        return null;
      } finally {
        renderer.setPixelRatio(ratio);
        renderer.setSize(size.x, size.y, false);
        renderer.render(scene, camera);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      explorer.dispose();
      animals.forEach((model) => model.dispose());
      jeepModel?.dispose();
      disposeModelResources(scene);
      scene.clear();
      sun.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
