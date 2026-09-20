import * as THREE from "three";
import { createEnvironment } from "./game/environment";
import { createEnvironmentVisuals } from "./game/environment-visuals";
import { createSavannaScene } from "./game/savanna-scene";
import { createEnvironmentControls } from "./ui/environment-controls";
import { narrate, stopNarration } from "./accessibility/narration";
import "./style.css";
import "./weather-lab.css";

/**
 * The weather desk, running over a small savanna. This page exists so the
 * environment simulation can be played with and checked on its own, before it
 * is wired into an expedition. What is worth watching here is the sky, the
 * rain, and the colour of the grass.
 */

const root = document.querySelector<HTMLElement>("#weather-lab");
if (!root) throw new Error("The weather lab needs a #weather-lab element.");

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

const layout = document.createElement("div");
layout.className = "lab";
const stage = document.createElement("div");
stage.className = "lab__stage";
const panel = document.createElement("div");
panel.className = "lab__panel";
layout.append(stage, panel);
root.append(layout);

const environment = createEnvironment({
  start: { year: 2026, month: 3, day: 12, hour: 9 },
  secondsPerDay: 0,
});

const savanna = createSavannaScene();
const { scene, camera } = savanna;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.domElement.setAttribute("role", "img");
renderer.domElement.setAttribute(
  "aria-label",
  "A 3D savanna whose sky, grass and waterhole change with the season and the weather.",
);
renderer.domElement.style.display = "block";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
stage.append(renderer.domElement);

const visuals = createEnvironmentVisuals({
  scene,
  camera,
  sun: savanna.sun,
  hemisphere: savanna.hemisphere,
  grassMaterials: savanna.grassMaterials,
  groundMaterials: [savanna.groundMaterial],
  water: savanna.water,
  sunDisc: savanna.sunDisc,
  reducedMotion,
});

let narrationOn = false;
const controls = createEnvironmentControls({
  environment,
  onChange: (_state, reason) => {
    if (narrationOn) narrate(reason);
  },
});
panel.append(controls.element);

const narrationToggle = document.createElement("button");
narrationToggle.type = "button";
narrationToggle.className = "lab__narration";
narrationToggle.textContent = "Read it aloud: off";
narrationToggle.setAttribute("aria-pressed", "false");
narrationToggle.addEventListener("click", () => {
  narrationOn = !narrationOn;
  narrationToggle.textContent = `Read it aloud: ${narrationOn ? "on" : "off"}`;
  narrationToggle.setAttribute("aria-pressed", String(narrationOn));
  if (!narrationOn) stopNarration();
});
panel.append(narrationToggle);

function resize(): void {
  const width = stage.clientWidth || 1;
  const height = stage.clientHeight || 1;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
const observer = new ResizeObserver(resize);
observer.observe(stage);
resize();

let last = performance.now();
let statusAt = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);
  // The clock runs on real elapsed time, not on the capped animation step, so
  // "a month a minute" means a minute of the child's time on a slow machine
  // as well as a fast one. The cap only stops a jump after a hidden tab.
  const elapsed = Math.min((now - last) / 1000, 2);
  last = now;
  const delta = Math.min(elapsed, 0.1);
  const state = environment.advance(elapsed);
  visuals.apply(state, delta);
  savanna.layGrass(visuals.windSway(), state.greenness);
  renderer.render(scene, camera);
  if (now - statusAt > 200) {
    controls.update(state);
    statusAt = now;
  }
}
requestAnimationFrame(frame);

// A small, stable hook so a test can drive the simulation without the UI.
declare global {
  interface Window {
    weatherLab?: {
      environment: typeof environment;
      state: () => ReturnType<typeof environment.state>;
      skyColor: () => string;
      raindrops: () => number;
      blades: () => number;
    };
  }
}
window.weatherLab = {
  environment,
  state: () => environment.state(),
  skyColor: () =>
    scene.background instanceof THREE.Color
      ? `#${scene.background.getHexString()}`
      : "",
  raindrops: () => visuals.raindrops(),
  blades: () => savanna.bladeCount(),
};
