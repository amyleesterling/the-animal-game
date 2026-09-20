/// <reference types="vite/client" />
import "./animal-lab.css";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { roster } from "./content/species";

interface TestAnimal {
  id: string;
  name: string;
  scientificName: string;
  file: string;
  thumbnail?: string;
  status: "ready";
  bytes?: number;
  sha256?: string;
}

interface ModelViewer {
  load(animal: TestAnimal): Promise<void>;
  turn(direction: number): void;
  zoom(direction: number): void;
  reset(): void;
  dispose(): void;
}

const app = document.querySelector<HTMLDivElement>("#animal-lab")!;
const manifestUrl = new URL(
  "./models/test-animals/manifest.json",
  location.href,
);
const modelFolder = new URL("./", manifestUrl);
const esc = (value: unknown): string =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
const leaf = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M25 6C14 4 6 10 8 19c2 8 15 8 17-13Z" stroke="currentColor" stroke-width="1.8"/><path d="M7 27 21 11M13 21l-1-7m5 3 6-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const arrow = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

app.innerHTML = `
  <header class="lab-header"><a class="lab-brand" href="./">${leaf}<span>Sophia’s <strong>Wild World</strong></span></a><a class="back-link" href="./safari.html">${arrow}<span>Play the story safari</span></a></header>
  <main>
    <section class="lab-intro" aria-labelledby="lab-title"><div><p class="eyebrow">Behind the adventure</p><h1 id="lab-title">Meet the savanna <em>neighbors.</em></h1><p class="intro-copy">Choose an animal, turn it around, and take a closer look. Seven species now have a part in Sophia’s story safari.</p></div><div class="review-note">${leaf}<p><strong>New image-guided models</strong><br>The lion, ostrich, and hippo have been rebuilt from reference images. These are static models; the story safari follows the other seven species.</p></div></section>
    <div class="lab-layout">
      <section class="viewer-card" aria-labelledby="animal-name">
        <div class="viewer-heading"><div><p class="eyebrow" id="model-number">The animal workbench</p><h2 id="animal-name">Room for a new discovery.</h2><p class="scientific-name" id="scientific-name">Our next savanna neighbors are on their way.</p></div><span class="model-badge">Model preview</span></div>
        <div class="viewer-stage" id="viewer-stage"><div id="model-canvas"></div><div class="stage-message" id="stage-message" role="status" aria-live="polite"><div class="stage-emblem">${leaf}</div><h3 id="stage-title">Opening the workbench…</h3><p id="stage-copy">Checking which animals are ready for a closer look.</p><button class="lab-button secondary" id="retry-model" hidden>Try this model again</button></div><div class="stage-caption" id="stage-caption" hidden>Static model · drag to look around</div></div>
        <div class="viewer-tools" aria-label="Model view controls"><div class="tool-group"><button class="lab-button tool" id="turn-left" disabled aria-label="Turn model left">↶ <span>Turn left</span></button><button class="lab-button tool" id="turn-right" disabled aria-label="Turn model right">↷ <span>Turn right</span></button></div><div class="tool-group"><button class="lab-button square" id="zoom-in" disabled aria-label="Zoom in">+</button><button class="lab-button square" id="zoom-out" disabled aria-label="Zoom out">−</button><button class="lab-button secondary" id="reset-view" disabled>Reset view</button></div></div>
        <p class="viewer-help">Drag to orbit. Pinch or scroll to zoom. Keyboard: focus the model, use ← → to turn, + − to zoom, and Home to reset.</p>
      </section>
      <aside class="animal-shelf" aria-labelledby="shelf-title"><div class="shelf-heading"><div><p class="eyebrow">The growing collection</p><h2 id="shelf-title">Savanna neighbors</h2></div><span class="ready-count" id="ready-count">0 ready</span></div><p class="shelf-copy" id="manifest-status" role="status">Checking for new models…</p><div class="animal-list" id="animal-list" aria-label="Choose an animal model"></div><button class="lab-button refresh-button" id="refresh-models">↻ <span>Refresh models</span></button><p class="small-note">Only the selected model loads into the viewer. Refresh to check for newly finished models.</p></aside>
    </div>
    <section class="review-prompt"><span class="review-star" aria-hidden="true">✳</span><div><h2>What do you notice?</h2><p>Look at the legs, face, markings, and overall shape. Your observations help us improve the animals. Turn each one around to check every side.</p></div></section>
  </main>
  <footer class="lab-footer"><span>A world imagined by Sophia.</span><span>Curiosity first. A closer look, always.</span></footer>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;
let animals: TestAnimal[] = [];
let selected: TestAnimal | undefined;
let viewer: ModelViewer | undefined;
let selectionVersion = 0;
let manifestController: AbortController | undefined;
let disposed = false;

function localResource(file: string, kind: "model" | "thumbnail"): URL {
  if (
    !file ||
    file.startsWith("/") ||
    file.includes("\\") ||
    file.split("/").some((part) => part === ".." || part === ".")
  )
    throw new Error("Invalid model file path.");
  const url = new URL(file, modelFolder);
  const allowedExtension =
    kind === "model" ? /\.glb$/i : /\.(png|jpg|jpeg|webp)$/i;
  if (
    url.origin !== modelFolder.origin ||
    !url.pathname.startsWith(modelFolder.pathname) ||
    url.search ||
    url.hash ||
    !allowedExtension.test(url.pathname)
  )
    throw new Error("Invalid model file path.");
  return url;
}

function readManifest(value: unknown): TestAnimal[] {
  if (
    !value ||
    typeof value !== "object" ||
    !("animals" in value) ||
    !Array.isArray(value.animals)
  )
    throw new Error("The model list could not be read.");
  const result: TestAnimal[] = [];
  const ids = new Set<string>();
  for (const entry of value.animals) {
    if (!entry || typeof entry !== "object" || entry.status !== "ready")
      continue;
    if (
      ![entry.id, entry.name, entry.scientificName, entry.file].every(
        (text) => typeof text === "string" && text.trim(),
      )
    )
      throw new Error("A model is missing its name or file.");
    if (ids.has(entry.id))
      throw new Error("The model list contains a duplicate animal.");
    localResource(entry.file, "model");
    ids.add(entry.id);
    let thumbnail: string | undefined;
    if (typeof entry.thumbnail === "string") {
      try {
        localResource(entry.thumbnail, "thumbnail");
        thumbnail = entry.thumbnail;
      } catch {
        /* A missing thumbnail does not block the model. */
      }
    }
    result.push({
      id: entry.id,
      name: entry.name,
      scientificName: entry.scientificName,
      file: entry.file,
      thumbnail,
      status: "ready",
      sha256:
        typeof entry.sha256 === "string" && /^[a-f0-9]{64}$/.test(entry.sha256)
          ? entry.sha256
          : undefined,
      bytes:
        typeof entry.bytes === "number" &&
        Number.isFinite(entry.bytes) &&
        entry.bytes > 0
          ? entry.bytes
          : undefined,
    });
  }
  return result;
}

function renderShelf(): void {
  const focusedId =
    document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.animal
      : undefined;
  const expected = roster.filter((animal) => !animal.available);
  const entries = [
    ...expected.map((animal) => ({ id: animal.id, name: animal.commonName })),
    ...animals.filter(
      (animal) => !expected.some((entry) => entry.id === animal.id),
    ),
  ];
  $("ready-count").textContent = `${animals.length} ready`;
  $("animal-list").innerHTML = entries
    .map((entry, index) => {
      const animal = animals.find((item) => item.id === entry.id);
      const active = animal && selected?.id === animal.id;
      const thumbnail = animal?.thumbnail
        ? `<img src="${esc(localResource(animal.thumbnail, "thumbnail").href)}" alt="" loading="lazy">`
        : `<span>${String(index + 1).padStart(2, "0")}</span>`;
      return `<button class="animal-card ${active ? "selected" : ""}" data-animal="${esc(entry.id)}" aria-pressed="${Boolean(active)}" ${animal ? "" : "disabled"}><span class="animal-thumbnail">${thumbnail}</span><span class="animal-card-text"><strong>${esc(animal?.name ?? entry.name)}</strong><span>${animal ? (active ? "In the viewer" : "Ready to inspect") : "On the way"}</span></span><span class="card-indicator" aria-hidden="true">${animal ? (active ? "✓" : "↗") : "·"}</span></button>`;
    })
    .join("");
  $("animal-list")
    .querySelectorAll<HTMLButtonElement>("[data-animal]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const animal = animals.find(
          (entry) => entry.id === button.dataset.animal,
        );
        if (animal) {
          void selectAnimal(animal);
          if (matchMedia("(max-width: 850px)").matches)
            document
              .querySelector(".viewer-card")
              ?.scrollIntoView({ block: "start", behavior: "instant" });
        }
      }),
    );
  if (focusedId) {
    const matching = [
      ...$("animal-list").querySelectorAll<HTMLButtonElement>("[data-animal]"),
    ].find((button) => button.dataset.animal === focusedId);
    matching?.focus({ preventScroll: true });
  }
  $("animal-list")
    .querySelectorAll("img")
    .forEach((image) =>
      image.addEventListener(
        "error",
        () => {
          image.hidden = true;
        },
        { once: true },
      ),
    );
}

function setStage(title: string, message: string, retry = false): void {
  $("stage-message").hidden = false;
  $("stage-title").textContent = title;
  $("stage-copy").textContent = message;
  $("retry-model").hidden = !retry;
  $("stage-caption").hidden = true;
}

function setTools(enabled: boolean): void {
  ["turn-left", "turn-right", "zoom-in", "zoom-out", "reset-view"].forEach(
    (id) => {
      $<HTMLButtonElement>(id).disabled = !enabled;
    },
  );
}

async function selectAnimal(animal: TestAnimal): Promise<void> {
  const version = ++selectionVersion;
  selected = animal;
  renderShelf();
  $("animal-name").textContent = animal.name;
  $("scientific-name").textContent = animal.scientificName;
  $("model-number").textContent = [
    "lion",
    "common-ostrich",
    "hippopotamus",
  ].includes(animal.id)
    ? "Image-guided animal revision"
    : "A savanna story neighbor";
  setTools(false);
  const size = animal.bytes
    ? ` (${(animal.bytes / 1_000_000).toFixed(1)} MB)`
    : "";
  setStage(
    `Meet the ${animal.name.toLowerCase()}.`,
    `Loading its test model${size}. This may take a moment on a phone.`,
  );
  $("model-canvas").setAttribute("aria-busy", "true");
  try {
    viewer ??= createViewer($("model-canvas"), () => {
      selectionVersion++;
      $("model-canvas").setAttribute("aria-busy", "false");
      setTools(false);
      setStage(
        "The 3D view paused.",
        "Your browser could not keep the model view open. Try this model again, or close other tabs to free up memory.",
        true,
      );
      viewer?.dispose();
      viewer = undefined;
    });
    await viewer.load(animal);
    if (version !== selectionVersion || disposed) return;
    $("stage-message").hidden = true;
    $("stage-caption").hidden = false;
    $("stage-caption").textContent = `${animal.name} · static model`;
    setTools(true);
  } catch (error) {
    if (
      version !== selectionVersion ||
      disposed ||
      (error instanceof DOMException && error.name === "AbortError")
    )
      return;
    const webgl =
      error instanceof Error && /WebGL|context/i.test(error.message);
    $("model-canvas")
      .querySelector("canvas")
      ?.setAttribute("data-model-state", "error");
    setStage(
      webgl
        ? "A 3D view isn’t available here."
        : "This neighbor needs another moment.",
      webgl
        ? "Try a browser with 3D graphics enabled, or another device. The animal list is still available."
        : "The model could not be opened. Try again, refresh the model list, or choose another animal.",
      true,
    );
  } finally {
    if (version === selectionVersion)
      $("model-canvas").setAttribute("aria-busy", "false");
  }
}

async function refreshManifest(): Promise<void> {
  manifestController?.abort();
  const controller = new AbortController();
  manifestController = controller;
  $<HTMLButtonElement>("refresh-models").disabled = true;
  $("manifest-status").textContent = "Checking for new models…";
  try {
    const response = await fetch(manifestUrl, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 404) animals = [];
    else {
      if (!response.ok) throw new Error("The model list is unavailable.");
      animals = readManifest(await response.json());
    }
    if (disposed || controller.signal.aborted) return;
    renderShelf();
    $("manifest-status").textContent = animals.length
      ? "Choose a neighbor for a closer look."
      : "The test models are being prepared. Check back with Refresh models.";
    if (selected && animals.some((animal) => animal.id === selected?.id)) {
      await selectAnimal(animals.find((animal) => animal.id === selected?.id)!);
    } else if (animals[0])
      await selectAnimal(
        animals.find(
          (animal) =>
            animal.id === new URLSearchParams(location.search).get("animal"),
        ) ?? animals[0],
      );
    else if (!selected)
      setStage(
        "Good things take a little growing.",
        "There are no finished models to preview yet. Refresh the collection to check again.",
      );
  } catch (error) {
    if (disposed || controller.signal.aborted) return;
    $("manifest-status").textContent =
      "We couldn’t refresh the collection. Check your connection and try again.";
    if (!selected)
      setStage(
        "The workbench is taking a moment.",
        "The model list could not be opened. Use Refresh models to try again.",
      );
  } finally {
    if (!disposed && manifestController === controller)
      $<HTMLButtonElement>("refresh-models").disabled = false;
  }
}

function disposeObject(root: THREE.Object3D): void {
  const textures = new Set<THREE.Texture>();
  const bitmaps = new Set<ImageBitmap>();
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const entries = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of entries) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  textures.forEach((texture) => {
    const image = texture.source.data;
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap)
      bitmaps.add(image);
    texture.dispose();
  });
  bitmaps.forEach((bitmap) => bitmap.close());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

function createViewer(
  container: HTMLElement,
  onContextLost: () => void,
): ModelViewer {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "3D animal model. Arrow keys turn, plus and minus zoom, Home resets the view.",
  );
  container.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI / 2 + 0.08;
  controls.minDistance = 1.5;
  controls.maxDistance = 16;
  scene.add(new THREE.HemisphereLight(0xfff5df, 0x788565, 3.2));
  const keyLight = new THREE.DirectionalLight(0xffefcd, 3);
  keyLight.position.set(4, 6, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  Object.assign(keyLight.shadow.camera, {
    left: -4,
    right: 4,
    top: 4,
    bottom: -4,
    near: 0.1,
    far: 20,
  });
  keyLight.shadow.camera.updateProjectionMatrix();
  keyLight.shadow.normalBias = 0.015;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xd5e7eb, 1.5);
  fillLight.position.set(-4, 3, -2);
  scene.add(fillLight);
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.65, 1.72, 0.12, 64),
    new THREE.MeshStandardMaterial({ color: 0xd6c397, roughness: 1 }),
  );
  pedestal.position.y = -0.075;
  pedestal.receiveShadow = true;
  scene.add(pedestal);
  const pivot = new THREE.Group();
  scene.add(pivot);
  let model: THREE.Object3D | undefined;
  let modelController: AbortController | undefined;
  let loadVersion = 0;
  let closed = false;
  let frame = 0;
  let fittedDistance = 6;
  let fittedTargetY = 1;

  const render = () => {
    if (closed || frame || document.hidden) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!closed) renderer.render(scene, camera);
    });
  };
  const reset = () => {
    pivot.rotation.y = 0;
    controls.target.set(0, fittedTargetY, 0);
    camera.position.set(
      fittedDistance * 0.65,
      fittedTargetY + fittedDistance * 0.22,
      fittedDistance * 0.8,
    );
    controls.update();
    render();
  };
  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (model) frameModel(true);
    render();
  };
  const frameModel = (resetView: boolean) => {
    if (!model) return;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 0.5);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov =
      2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    fittedDistance =
      (radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)) * 1.12;
    fittedTargetY = center.y;
    controls.minDistance = Math.max(radius * 0.65, 0.8);
    controls.maxDistance = fittedDistance * 2.5;
    if (resetView) reset();
    else {
      controls.target.y = fittedTargetY;
      controls.update();
    }
  };
  const turn = (direction: number) => {
    pivot.rotation.y += (direction * Math.PI) / 8;
    render();
  };
  const zoom = (direction: number) => {
    camera.position
      .sub(controls.target)
      .multiplyScalar(direction > 0 ? 0.85 : 1.18)
      .add(controls.target);
    controls.update();
    render();
  };
  const onKey = (event: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "+", "=", "-", "Home"].includes(event.key))
      return;
    event.preventDefault();
    if (event.key === "ArrowLeft") turn(-1);
    else if (event.key === "ArrowRight") turn(1);
    else if (event.key === "Home") reset();
    else zoom(event.key === "-" ? -1 : 1);
  };
  const onLoss = (event: Event) => {
    event.preventDefault();
    if (!closed) onContextLost();
  };
  controls.addEventListener("change", render);
  canvas.addEventListener("keydown", onKey);
  canvas.addEventListener("webglcontextlost", onLoss);
  document.addEventListener("visibilitychange", render);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  reset();

  return {
    async load(animal) {
      const version = ++loadVersion;
      modelController?.abort();
      const controller = new AbortController();
      modelController = controller;
      if (model) {
        pivot.remove(model);
        disposeObject(model);
        model = undefined;
      }
      pivot.rotation.y = 0;
      canvas.dataset.modelState = "loading";
      render();
      const url = localResource(animal.file, "model");
      if (animal.sha256) url.searchParams.set("v", animal.sha256.slice(0, 16));
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Model download failed.");
      const buffer = await response.arrayBuffer();
      if (controller.signal.aborted || closed) return;
      const blobUrls = new Set<string>();
      const manager = new THREE.LoadingManager();
      let resourceFailed = false;
      manager.setURLModifier((resource) => {
        if (resource.startsWith("blob:")) blobUrls.add(resource);
        return resource;
      });
      manager.onError = () => {
        resourceFailed = true;
      };
      let ownedScene: THREE.Group | undefined;
      try {
        const gltf = await new GLTFLoader(manager).parseAsync(
          buffer,
          new URL("./", url).href,
        );
        ownedScene = gltf.scene;
        if (closed || controller.signal.aborted || version !== loadVersion)
          return;
        // GLTFLoader may resolve an untextured scene after image decoding fails.
        // Treat failed resources as a failed preview, while allowing intentional
        // solid-color materials that never referenced an image in the source.
        if (resourceFailed)
          throw new Error("A model texture could not be decoded.");
        ownedScene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials) {
            for (const texture of Object.values(material)) {
              if (!(texture instanceof THREE.Texture)) continue;
              const image = texture.source.data as
                { width?: number; height?: number } | undefined;
              if (
                !image ||
                !(Number(image.width) > 0) ||
                !(Number(image.height) > 0)
              )
                throw new Error("A model texture could not be decoded.");
            }
          }
        });
        const bounds = new THREE.Box3().setFromObject(ownedScene);
        const size = bounds.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(maxDimension) || maxDimension <= 0)
          throw new Error("Model has no visible geometry.");
        ownedScene.scale.multiplyScalar(2.7 / maxDimension);
        const fitted = new THREE.Box3().setFromObject(ownedScene);
        const center = fitted.getCenter(new THREE.Vector3());
        ownedScene.position.add(
          new THREE.Vector3(-center.x, -fitted.min.y, -center.z),
        );
        ownedScene.traverse((object) => {
          if (object instanceof THREE.Mesh) object.castShadow = true;
        });
        model = ownedScene;
        ownedScene = undefined;
      } finally {
        if (ownedScene) disposeObject(ownedScene);
        // Three revokes image URLs on success; also cover decoder failures and
        // abandoned loads. Repeated revocation is harmless.
        blobUrls.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
      }
      pivot.add(model);
      canvas.dataset.modelState = "ready";
      canvas.dataset.animalId = animal.id;
      canvas.setAttribute(
        "aria-label",
        `${animal.name}, static 3D test model. Arrow keys turn, plus and minus zoom, Home resets the view.`,
      );
      frameModel(true);
      render();
    },
    turn,
    zoom,
    reset,
    dispose() {
      if (closed) return;
      closed = true;
      loadVersion++;
      modelController?.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      canvas.removeEventListener("keydown", onKey);
      canvas.removeEventListener("webglcontextlost", onLoss);
      document.removeEventListener("visibilitychange", render);
      disposeObject(scene);
      keyLight.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

$("refresh-models").addEventListener("click", () => void refreshManifest());
$("retry-model").addEventListener("click", () => {
  if (selected) void selectAnimal(selected);
});
$("turn-left").addEventListener("click", () => viewer?.turn(-1));
$("turn-right").addEventListener("click", () => viewer?.turn(1));
$("zoom-in").addEventListener("click", () => viewer?.zoom(1));
$("zoom-out").addEventListener("click", () => viewer?.zoom(-1));
$("reset-view").addEventListener("click", () => viewer?.reset());
function dispose(): void {
  disposed = true;
  selectionVersion++;
  manifestController?.abort();
  viewer?.dispose();
  viewer = undefined;
}
window.addEventListener("pagehide", dispose);
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  disposed = false;
  if (selected) void selectAnimal(selected);
  void refreshManifest();
});
if (import.meta.hot) import.meta.hot.dispose(dispose);
renderShelf();
void refreshManifest();
