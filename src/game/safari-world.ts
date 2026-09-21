import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type {
  SafariStop,
  SafariStatus,
  SafariWorld,
  SafariWorldOptions,
} from "../safari-contracts";
import { createPlayer } from "./player";
import { CORA_CHARACTER } from "../content/characters";
import { createCompanion } from "./companion";
import { collectSafariEncounters, safariEncounterRange } from "./encounters";
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
import {
  findVehicleExit,
  SAFARI_BOUNDS,
  stepVehicle,
  stopVehicle,
  vehicleDestination,
  VEHICLE_ENTRY_RANGE,
  type VehicleState,
} from "./vehicle";

type Direction = "forward" | "backward" | "left" | "right";
type Obstacle = { x: number; z: number; radius: number };
const UP = new THREE.Vector3(0, 1, 0);

/** Selected discoveries always load, even when selected from across the map. */
export function prioritizeSafariModels(
  stops: readonly SafariStop[],
  selectedId: string,
  position: GroundPosition,
): string[] {
  const nearby = stops
    .map((entry) => ({
      id: entry.id,
      distance: Math.hypot(
        entry.position[0] - position.x,
        entry.position[2] - position.z,
      ),
    }))
    .filter((entry) => entry.id === selectedId || entry.distance <= 50)
    .sort((a, b) =>
      a.id === selectedId
        ? -1
        : b.id === selectedId
          ? 1
          : a.distance - b.distance || a.id.localeCompare(b.id),
    );
  return nearby.slice(0, 8).map((entry) => entry.id);
}

/** Own parsed resources and keep both downloads and retained textures bounded. */
export function createSafariModelQueue(
  stops: readonly SafariStop[],
  callbacks: {
    load(entry: SafariStop, signal: AbortSignal): Promise<SafariModel>;
    loaded(entry: SafariStop, model: SafariModel): void;
    failed(entry: SafariStop): void;
  },
) {
  const entries = new Map(stops.map((entry) => [entry.id, entry]));
  const models = new Map<string, SafariModel>();
  const failed = new Set<string>();
  const pending = new Map<string, AbortController>();
  let desired: string[] = [];
  let disposed = false;
  function pump() {
    if (disposed) return;
    for (const id of desired) {
      if (pending.size >= 2) break;
      if (models.has(id) || pending.has(id) || failed.has(id)) continue;
      const entry = entries.get(id);
      if (!entry) continue;
      const controller = new AbortController();
      pending.set(id, controller);
      void Promise.resolve()
        .then(() => {
          controller.signal.throwIfAborted();
          return callbacks.load(entry, controller.signal);
        })
        .then((model) => {
          if (disposed || controller.signal.aborted || !desired.includes(id)) {
            model.dispose();
            return;
          }
          models.set(id, model);
          callbacks.loaded(entry, model);
        })
        .catch(() => {
          if (disposed || controller.signal.aborted) return;
          failed.add(id);
          callbacks.failed(entry);
        })
        .finally(() => {
          pending.delete(id);
          pump();
        });
    }
  }
  return {
    models,
    failed,
    get pendingCount() {
      return pending.size;
    },
    update(ids: readonly string[]) {
      if (disposed) return;
      desired = [...new Set(ids)].filter((id) => entries.has(id)).slice(0, 8);
      for (const [id, controller] of pending)
        if (!desired.includes(id)) controller.abort();
      for (const [id, model] of models)
        if (!desired.includes(id)) {
          models.delete(id);
          model.dispose();
        }
      pump();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      desired = [];
      pending.forEach((controller) => controller.abort());
      models.forEach((model) => model.dispose());
      models.clear();
    },
  };
}

export function safariViewpoints(
  stop: Pick<SafariStop, "position" | "height">,
) {
  const animal = new THREE.Vector3(...stop.position);
  const range = Math.max(7.5, stop.height * 1.9);
  return {
    observation: animal.clone().add(new THREE.Vector3(0, 0, range)),
    arrival: animal.clone().add(new THREE.Vector3(0, 0, range + 9)),
    jeep: animal.clone().add(new THREE.Vector3(5.5, 0, range + 5)),
    encounterRange: safariEncounterRange(stop.height),
    photoRange: range + 6,
  };
}

/** Fit every bounding-box corner while preserving the photographer's direction. */
export function frameSafariPhoto(
  camera: THREE.PerspectiveCamera,
  bounds: THREE.Box3,
  viewpoint: THREE.Vector3,
  closeUp = false,
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
  // A virtual macro lens can frame a small animal without moving the explorer
  // inside its protected space. Normal large-animal photography stays intact.
  let range = closeUp ? 0.35 : Math.max(1, viewpoint.distanceTo(target));
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
  const storyStops = stops.filter((stop) => !stop.profile);
  const routePoints = (storyStops.length ? storyStops : stops).map(
    (stop) => safariViewpoints(stop).arrival,
  );
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
      new THREE.CircleGeometry(stop.profile ? 6.5 : 10.5, 32),
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

  // The displays are marked as study views in both the world and DOM content.
  // Reuse a handful of textures/geometries rather than one label per animal.
  const postGeometry = new THREE.CylinderGeometry(0.055, 0.07, 1.45, 6);
  const signGeometry = new THREE.PlaneGeometry(1.75, 0.7);
  const postMaterial = mat(0x65543d);
  const soilMaterial = mat(0x92714d);
  const labels = new Map<string, THREE.MeshBasicMaterial>();
  const soilPieces: THREE.BufferGeometry[] = [];
  const posts: THREE.BufferGeometry[] = [];
  for (const stop of stops.filter((entry) => entry.profile)) {
    const marker = new THREE.Group();
    marker.name = `habitat-station-${stop.id}`;
    marker.position.set(...stop.position);
    const kind =
      stop.habitatFeature === "burrow"
        ? "BURROW CUTAWAY"
        : stop.viewingNote
          ? "ENLARGED STUDY"
          : "WILDLIFE CLEARING";
    if (!labels.has(kind)) {
      const label = document.createElement("canvas");
      label.width = 512;
      label.height = 208;
      const context = label.getContext("2d");
      if (context) {
        context.fillStyle = "#f2e5c9";
        context.fillRect(0, 0, 512, 208);
        context.strokeStyle = "#827555";
        context.lineWidth = 12;
        context.strokeRect(8, 8, 496, 192);
        context.fillStyle = "#334b3a";
        context.textAlign = "center";
        context.font = "bold 37px sans-serif";
        context.fillText(kind, 256, 87);
        context.font = "30px sans-serif";
        context.fillText(
          stop.viewingNote
            ? "Real size in field book"
            : "Observe from the trail",
          256,
          145,
        );
      }
      const texture = new THREE.CanvasTexture(label);
      texture.colorSpace = THREE.SRGBColorSpace;
      labels.set(
        kind,
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
      );
    }
    const sign = new THREE.Mesh(signGeometry, labels.get(kind));
    sign.position.set(-3.2, 1.28, 1.7);
    marker.add(sign);
    posts.push(
      postGeometry
        .clone()
        .translate(stop.position[0] - 3.2, 0.725, stop.position[2] + 1.7),
    );
    if (stop.habitatFeature === "burrow") {
      // A section through the soil, open toward the visitor. The animal stays
      // above the ground plane so the actual mesh remains visible and grounded.
      for (const [x, z, width, depth] of [
        [0, -1, 3.5, 0.4],
        [-1.55, -0.2, 0.4, 1.6],
        [1.55, -0.2, 0.4, 1.6],
      ])
        soilPieces.push(
          new THREE.BoxGeometry(width, 0.55, depth).translate(
            stop.position[0] + x,
            0.275,
            stop.position[2] + z,
          ),
        );
    } else if (stop.habitatFeature === "insect") {
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(1.45, 1.56, 32),
        soilMaterial,
      );
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = 0.017;
      marker.add(rim);
    }
    scene.add(marker);
  }
  for (const [pieces, material] of [
    [posts, postMaterial],
    [soilPieces, soilMaterial],
  ] as const) {
    if (!pieces.length) continue;
    const geometry = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      scene.add(mesh);
    }
  }
  postGeometry.dispose();
  if (!labels.size) {
    signGeometry.dispose();
    postMaterial.dispose();
  }
  if (
    !soilPieces.length &&
    !stops.some((entry) => entry.habitatFeature === "insect")
  )
    soilMaterial.dispose();
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
    "Soph's safari. Use W A S D or arrow keys to walk or drive. Hold Space to brake the jeep. Drag to look around.",
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
  canvas.dataset.companionState = CORA_CHARACTER ? "loading" : "absent";
  canvas.dataset.characterCount = CORA_CHARACTER ? "2" : "1";
  const companion = CORA_CHARACTER
    ? createCompanion(CORA_CHARACTER, (state) => {
        canvas.dataset.companionState = state;
      })
    : null;
  if (companion) scene.add(companion.root);
  const jeep = new THREE.Group();
  let fallbackJeep: THREE.Group | undefined = createSafariJeepFallback();
  jeep.add(fallbackJeep);
  scene.add(jeep);
  const controller = new AbortController();
  const modelQueue = createSafariModelQueue(options.stops, {
    load: (entry, signal) =>
      loadSafariModel(entry.modelPath, entry.forwardAxis, entry.height, signal),
    loaded(entry, model) {
      model.root.position.set(...entry.position);
      model.root.rotation.y = -0.12;
      scene.add(model.root);
      if (stop.id === entry.id) updateCamera(true);
      updateStatus();
    },
    failed(entry) {
      if (stop.id !== entry.id) return;
      updateStatus();
      settings.onError(`${entry.name} could not load. Refresh to try again.`);
    },
  });
  const animals = modelQueue.models;
  const failedAnimals = modelQueue.failed;
  let jeepModel: SafariModel | undefined;
  let disposed = false;
  let active = false;
  let photoMode = false;
  let driving = false;
  let braking = false;
  let companionNeedsReset = true;
  let companionPaused = false;
  const vehicle: VehicleState = {
    x: 0,
    z: 0,
    heading: -0.12,
    speed: 0,
    steering: 0,
  };
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
  const chaseAnchor = new THREE.Vector3();
  const chaseDirection = new THREE.Vector3();
  const chaseRayOrigin = new THREE.Vector3();
  const chaseSide = new THREE.Vector3();
  const chaseHits: THREE.Intersection[] = [];
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
  function vehicleObstacles() {
    return [
      ...landscape.obstacles,
      ...options.stops.map((animal) => {
        const size = animals.get(animal.id)?.size;
        return {
          x: animal.position[0],
          z: animal.position[2],
          radius: Math.max(
            2.4,
            size
              ? Math.hypot(size.x, size.z) / 2 + 0.7
              : animal.height * 1.3 + 0.7,
          ),
        };
      }),
    ];
  }
  function interactionAllowed() {
    return (
      !disposed && active && !photoMode && !contextLost && !document.hidden
    );
  }
  function jeepDistance() {
    return Math.hypot(
      explorer.root.position.x - vehicle.x,
      explorer.root.position.z - vehicle.z,
    );
  }
  function diagnosticState() {
    canvas.dataset.characterMode = photoMode ? "photo" : "explore";
    canvas.dataset.companionVisible = String(companion?.root.visible ?? false);
    canvas.dataset.companionX = String(companion?.root.position.x ?? 0);
    canvas.dataset.companionZ = String(companion?.root.position.z ?? 0);
    canvas.dataset.travelMode = driving ? "driving" : "walking";
    canvas.dataset.vehicleX = String(vehicle.x);
    canvas.dataset.vehicleZ = String(vehicle.z);
    canvas.dataset.vehicleHeading = String(vehicle.heading);
    canvas.dataset.vehicleSpeed = String(vehicle.speed);
    canvas.dataset.explorerX = String(explorer.root.position.x);
    canvas.dataset.explorerZ = String(explorer.root.position.z);
    canvas.dataset.loadedAnimalCount = String(animals.size);
    canvas.dataset.pendingAnimalCount = String(modelQueue.pendingCount);
    canvas.dataset.loadedAnimalIds = [...animals.keys()].join(",");
    canvas.dataset.habitatFeature = stop.habitatFeature ?? "clearing";
    canvas.dataset.viewingNote = stop.viewingNote ?? "";
  }
  function syncVehicle() {
    jeep.position.set(vehicle.x, 0, vehicle.z);
    jeep.rotation.y = vehicle.heading;
    if (driving) explorer.root.position.copy(jeep.position);
  }
  function updateStatus() {
    if (disposed) return;
    modelQueue.update(
      prioritizeSafariModels(options.stops, stop.id, explorer.root.position),
    );
    diagnosticState();
    const encounters = collectSafariEncounters(
      options.stops,
      explorer.root.position,
      animals,
    );
    // Diagnostics identify an actionable encounter, not a distant route goal.
    const nearest = encounters.find(
      (animal) => animal.distance <= animal.range,
    );
    if (nearest) {
      canvas.dataset.nearestAnimalId = nearest.id;
      canvas.dataset.nearestAnimalDistance = String(nearest.distance);
    } else {
      delete canvas.dataset.nearestAnimalId;
      delete canvas.dataset.nearestAnimalDistance;
    }
    const distance = explorer.root.position.distanceTo(
      new THREE.Vector3(...stop.position),
    );
    const animalLoaded = animals.has(stop.id);
    let photoReady =
      !driving &&
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
      explorerPosition: {
        x: explorer.root.position.x,
        z: explorer.root.position.z,
      },
      encounters,
      distance,
      nearby: !driving && animalLoaded && distance <= views.encounterRange,
      photoReady,
      animalLoaded,
      jeepLoaded: Boolean(jeepModel),
      driving,
      canEnterJeep:
        interactionAllowed() &&
        !driving &&
        jeepDistance() <= VEHICLE_ENTRY_RANGE,
      canExitJeep:
        interactionAllowed() &&
        driving &&
        findVehicleExit(vehicle, vehicleObstacles()) !== null,
      speedKph: vehicle.speed * 3.6,
      jeepDistance: jeepDistance(),
      destinationDistance: vehicleDestination(vehicle, views.arrival).distance,
      destinationBearing: vehicleDestination(vehicle, views.arrival).bearing,
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
        Boolean(stop.profile),
      );
      return;
    }
    if (driving) {
      const distance = camera.aspect < 0.8 ? 14 : 11;
      const orbit = vehicle.heading + yaw;
      desiredCamera.set(
        vehicle.x - Math.cos(orbit) * distance,
        3.1 + Math.sin(pitch) * distance,
        vehicle.z + Math.sin(orbit) * distance,
      );
      camera.position.lerp(
        desiredCamera,
        snap || settings.reducedMotion ? 1 : 0.15,
      );
      // Check the smoothed position too: an unobstructed destination can still
      // leave the easing camera inside a canopy for several frames. Side and
      // roof rays protect the jeep's silhouette as well as the centre line.
      chaseAnchor.set(vehicle.x, 1.6, vehicle.z);
      chaseDirection.copy(camera.position).sub(chaseAnchor);
      const fullRange = chaseDirection.length();
      chaseDirection.normalize();
      chaseSide.crossVectors(chaseDirection, UP).normalize();
      let clearRange = fullRange;
      raycaster.far = fullRange;
      for (let sample = 0; sample < 4; sample++) {
        chaseRayOrigin.copy(chaseAnchor);
        if (sample === 1) chaseRayOrigin.addScaledVector(chaseSide, 1.1);
        if (sample === 2) chaseRayOrigin.addScaledVector(chaseSide, -1.1);
        if (sample === 3) chaseRayOrigin.y += 0.9;
        raycaster.set(chaseRayOrigin, chaseDirection);
        chaseHits.length = 0;
        raycaster.intersectObjects(landscape.treeMeshes, false, chaseHits);
        if (chaseHits.length)
          clearRange = Math.min(clearRange, chaseHits[0].distance - 0.7);
      }
      const chaseRange = Math.max(4.2, clearRange);
      if (chaseRange < fullRange)
        camera.position
          .copy(chaseAnchor)
          .addScaledVector(chaseDirection, chaseRange);
      // Closer views look at the vehicle itself, keeping its roof and body in
      // frame rather than continuing to aim four metres down the road.
      const openView = THREE.MathUtils.clamp((chaseRange - 4.2) / 6, 0, 1);
      cameraTarget.set(
        vehicle.x + Math.cos(vehicle.heading) * 4 * openView,
        1.5 - 0.25 * openView,
        vehicle.z - Math.sin(vehicle.heading) * 4 * openView,
      );
      camera.fov = 68 - 16 * openView;
      camera.lookAt(cameraTarget);
      camera.updateProjectionMatrix();
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
    braking = false;
    previousTime = performance.now();
  }
  function pauseTravel() {
    clearMovement();
    stopVehicle(vehicle);
    guide = null;
    syncCompanion();
    diagnosticState();
  }
  function selectStop(id: string, keepPosition = false) {
    const next = options.stops.find((entry) => entry.id === id);
    if (!next || disposed) return;
    stop = next;
    views = safariViewpoints(stop);
    guide = null;
    if (!keepPosition) {
      pauseTravel();
      driving = false;
      photoMode = false;
      yaw = 0;
      pitch = 0.3;
      explorer.root.position.copy(views.arrival);
      explorer.root.rotation.y = 0;
      explorer.root.visible = active;
      vehicle.x = views.jeep.x;
      vehicle.z = views.jeep.z;
      vehicle.heading = -0.12;
      syncVehicle();
      companionNeedsReset = true;
    }
    syncCompanion();
    canvas.dataset.stopId = stop.id;
    updateCamera(!keepPosition);
    updateStatus();
    if (failedAnimals.has(stop.id))
      settings.onError(`${stop.name} could not load. Refresh to try again.`);
  }
  function resolveCollisions(position: GroundPosition) {
    position.x = THREE.MathUtils.clamp(
      position.x,
      SAFARI_BOUNDS.minX,
      SAFARI_BOUNDS.maxX,
    );
    position.z = THREE.MathUtils.clamp(
      position.z,
      SAFARI_BOUNDS.minZ,
      SAFARI_BOUNDS.maxZ,
    );
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
  function syncCompanion(seconds = 0, moving = false) {
    companion?.update(
      seconds,
      explorer.root.position,
      explorer.root.rotation.y,
      {
        visible:
          active && !photoMode && !driving && !document.hidden && !contextLost,
        moving,
        reducedMotion: settings.reducedMotion,
        teleport: companionNeedsReset,
        paused: companionPaused,
      },
      resolveCollisions,
    );
    if (!companionPaused) companionNeedsReset = false;
  }
  function setMovement(direction: Direction, pressed: boolean) {
    if (disposed || (!active && pressed) || (photoMode && pressed)) return;
    if (pressed && !Object.values(movement).some(Boolean))
      previousTime = performance.now();
    movement[direction] = pressed;
    if (pressed) guide = null;
  }
  function setBrake(pressed: boolean) {
    if (disposed || (pressed && (!interactionAllowed() || !driving))) return;
    braking = pressed;
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
      event.defaultPrevented ||
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
      if (event.repeat && !movement[keys[event.code]]) return;
      setMovement(keys[event.code], true);
    } else if (event.code === "Space" && driving) {
      event.preventDefault();
      if (event.repeat && !braking) return;
      setBrake(true);
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (keys[event.code]) setMovement(keys[event.code], false);
    if (event.code === "Space") setBrake(false);
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
    if (driving) yaw = THREE.MathUtils.clamp(yaw, -1.1, 1.1);
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
    companionPaused = document.hidden || !document.hasFocus();
    pauseTravel();
    updateStatus();
  };
  const onBlur = () => {
    companionPaused = true;
    pauseTravel();
    updateStatus();
  };
  const onFocus = () => {
    companionPaused = false;
    syncCompanion();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    pauseTravel();
    updateStatus();
    settings.onError(
      "The 3D safari paused. Refresh to return; your saved discoveries are safe.",
    );
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
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
      if (driving) {
        stepVehicle(
          vehicle,
          {
            throttle: Number(movement.forward) - Number(movement.backward),
            steer: Number(movement.left) - Number(movement.right),
            brake: braking,
          },
          seconds,
          vehicleObstacles(),
        );
        syncVehicle();
      } else if (guide) {
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
      if (!driving && velocity.lengthSq() > 0)
        explorer.root.rotation.y = Math.atan2(-velocity.x, -velocity.z);
    }
    const explorerMoving =
      !driving &&
      Math.hypot(
        explorer.root.position.x - oldX,
        explorer.root.position.z - oldZ,
      ) > 0.00001;
    explorer.animate(seconds, explorerMoving, settings.reducedMotion);
    syncCompanion(seconds, explorerMoving);
    sun.position.set(
      explorer.root.position.x - 26,
      37,
      explorer.root.position.z + 20,
    );
    sun.target.position.copy(explorer.root.position);
    diagnosticState();
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
    enterJeep() {
      if (
        !interactionAllowed() ||
        driving ||
        jeepDistance() > VEHICLE_ENTRY_RANGE
      )
        return false;
      pauseTravel();
      driving = true;
      explorer.root.visible = false;
      syncVehicle();
      syncCompanion();
      yaw = 0;
      pitch = 0.28;
      updateCamera(true);
      updateStatus();
      return true;
    },
    exitJeep() {
      if (!interactionAllowed() || !driving) return false;
      const exit = findVehicleExit(vehicle, vehicleObstacles());
      if (!exit) return false;
      pauseTravel();
      driving = false;
      explorer.root.position.set(exit.x, 0, exit.z);
      explorer.root.rotation.y = vehicle.heading - Math.PI / 2;
      explorer.root.visible = active;
      companionNeedsReset = true;
      syncCompanion();
      yaw = vehicle.heading - Math.PI / 2;
      pitch = 0.3;
      updateCamera(true);
      updateStatus();
      return true;
    },
    returnToJeep() {
      if (!interactionAllowed() || driving) return;
      const exit = findVehicleExit(vehicle, vehicleObstacles());
      if (!exit) {
        settings.onError(
          "There is not enough clear space beside the jeep. Try walking to its other side.",
        );
        return;
      }
      pauseTravel();
      explorer.root.position.set(exit.x, 0, exit.z);
      explorer.root.rotation.y = vehicle.heading - Math.PI / 2;
      companionNeedsReset = true;
      syncCompanion();
      yaw = vehicle.heading - Math.PI / 2;
      updateCamera(true);
      updateStatus();
    },
    setBrake,
    guideToAnimal() {
      if (disposed || driving) return;
      clearMovement();
      yaw = 0;
      pitch = 0.3;
      // The accessible guide returns a wanderer to the clear approach corridor.
      // This keeps it dependable without walking through trees or the waterhole.
      if (
        Math.abs(explorer.root.position.x - views.observation.x) > 2 ||
        explorer.root.position.z < views.observation.z ||
        explorer.root.position.z > views.arrival.z + 2
      ) {
        explorer.root.position.copy(views.arrival);
        companionNeedsReset = true;
      }
      guide = views.observation.clone();
      if (settings.reducedMotion || photoMode) {
        explorer.root.position.copy(guide);
        companionNeedsReset = true;
        guide = null;
        updateCamera(true);
        updateStatus();
      }
      syncCompanion();
    },
    setActive(value) {
      if (disposed) return;
      if (active !== value) previousTime = performance.now();
      active = value;
      explorer.root.visible = value && !photoMode && !driving;
      if (!value) {
        pauseTravel();
      }
      syncCompanion();
      updateStatus();
    },
    setPhotoMode(value) {
      if (disposed || photoMode === value || (value && driving)) return;
      photoMode = value;
      clearMovement();
      guide = null;
      explorer.root.visible = active && !photoMode && !driving;
      syncCompanion();
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
      if (
        disposed ||
        driving ||
        !photoMode ||
        contextLost ||
        !updateStatus()?.photoReady
      )
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
          Boolean(stop.profile),
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
      modelQueue.dispose();
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      explorer.dispose();
      companion?.dispose();
      jeepModel?.dispose();
      disposeModelResources(scene);
      scene.clear();
      sun.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
