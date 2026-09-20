import * as THREE from "three";
import type { EnvironmentState } from "./environment";

/**
 * Turns an EnvironmentState into what the savanna looks like. The simulation
 * owns the numbers; this file owns the sky, the sun, the rain and the colour
 * of the grass. Nothing here decides what the weather is.
 */

export interface EnvironmentVisualsOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  /** The sun, moved and recoloured to match the real solar position. */
  sun: THREE.DirectionalLight;
  /** Sky and bounce light, dimmed at night and under cloud. */
  hemisphere: THREE.HemisphereLight;
  /** Materials that dry to straw and green up after rain. */
  grassMaterials?: THREE.MeshStandardMaterial[];
  /** Ground materials, which darken when wet. */
  groundMaterials?: THREE.MeshStandardMaterial[];
  /** The waterhole surface, scaled by how full it is. */
  water?: THREE.Mesh;
  /** The painted sun disc on the horizon, hidden after dark. */
  sunDisc?: THREE.Mesh;
  reducedMotion?: boolean;
  lowQuality?: boolean;
}

export interface EnvironmentVisuals {
  /** Apply a state. Call every frame; it is cheap and idempotent. */
  apply(state: EnvironmentState, deltaSeconds: number): void;
  /** How hard the grass should be leaning right now, for other systems. */
  windSway(): number;
  /** Raindrops currently being drawn. 0 when it is not raining. */
  raindrops(): number;
  setOptions(options: { reducedMotion?: boolean; lowQuality?: boolean }): void;
  dispose(): void;
}

const MAX_RAINDROPS = 7000;

/** Sky colours through the day, before cloud is mixed in. */
const NIGHT_SKY = new THREE.Color(0x121a2e);
const DAWN_SKY = new THREE.Color(0xe8a473);
const DAY_SKY = new THREE.Color(0x8fb7dd);
const STORM_SKY = new THREE.Color(0x3d4450);

const NIGHT_SUN = new THREE.Color(0x24304a);
const LOW_SUN = new THREE.Color(0xffb257);
const HIGH_SUN = new THREE.Color(0xfff0cf);

const DRY_GRASS = new THREE.Color(0xc2ad72);
const LUSH_GRASS = new THREE.Color(0x5f8f3f);
const DRY_EARTH = new THREE.Color(0xada96d);
const WET_EARTH = new THREE.Color(0x6f6845);

function lerpColor(
  out: THREE.Color,
  a: THREE.Color,
  b: THREE.Color,
  t: number,
): THREE.Color {
  return out.copy(a).lerp(b, THREE.MathUtils.clamp(t, 0, 1));
}

export function createEnvironmentVisuals(
  options: EnvironmentVisualsOptions,
): EnvironmentVisuals {
  const {
    scene,
    camera,
    sun,
    hemisphere,
    grassMaterials = [],
    groundMaterials = [],
    water,
    sunDisc,
  } = options;
  const settings = {
    reducedMotion: options.reducedMotion ?? false,
    lowQuality: options.lowQuality ?? false,
  };

  const skyColor = new THREE.Color();
  const sunColor = new THREE.Color();
  const grassColor = new THREE.Color();
  const groundColor = new THREE.Color();
  const fog = new THREE.Fog(0xead7b6, 32, 115);
  scene.fog = fog;

  // Rain is one instanced streak mesh that follows the camera inside a column,
  // so a storm costs one draw call however hard it is raining.
  const dropGeometry = new THREE.PlaneGeometry(0.035, 0.9);
  const dropMaterial = new THREE.MeshBasicMaterial({
    color: 0xdce8f2,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const rain = new THREE.InstancedMesh(
    dropGeometry,
    dropMaterial,
    MAX_RAINDROPS,
  );
  rain.frustumCulled = false;
  rain.visible = false;
  rain.count = 0;
  rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(rain);

  const COLUMN_RADIUS = 26;
  const COLUMN_HEIGHT = 20;
  const drops = new Array(MAX_RAINDROPS).fill(0).map(() => ({
    x: (Math.random() * 2 - 1) * COLUMN_RADIUS,
    y: Math.random() * COLUMN_HEIGHT,
    z: (Math.random() * 2 - 1) * COLUMN_RADIUS,
    speed: 16 + Math.random() * 10,
  }));
  const dropMatrix = new THREE.Matrix4();
  const dropPosition = new THREE.Vector3();
  const dropQuaternion = new THREE.Quaternion();
  const dropScale = new THREE.Vector3(1, 1, 1);
  const cameraPosition = new THREE.Vector3();

  // Lightning is a brief lift in the ambient light rather than a flash sprite,
  // so it lights the whole savanna the way a real strike does.
  const lightning = new THREE.AmbientLight(0xdfe8ff, 0);
  scene.add(lightning);
  let flash = 0;
  let nextFlashIn = 4;
  let sway = 0;
  let elapsed = 0;

  function applyRain(state: EnvironmentState, delta: number): void {
    const target = settings.lowQuality ? MAX_RAINDROPS * 0.4 : MAX_RAINDROPS;
    const count = Math.floor(target * state.stormIntensity);
    rain.count = count;
    rain.visible = count > 0;
    if (count === 0) return;
    camera.getWorldPosition(cameraPosition);
    // Rain slants downwind, and harder rain slants further.
    const slant = THREE.MathUtils.clamp(state.windSpeed / 26, 0, 0.55);
    dropQuaternion.setFromEuler(new THREE.Euler(0, 0, slant));
    dropScale.set(1, 0.7 + state.stormIntensity * 0.8, 1);
    for (let i = 0; i < count; i++) {
      const drop = drops[i];
      if (!settings.reducedMotion) {
        drop.y -= drop.speed * state.stormIntensity * delta;
        drop.x += state.windSpeed * 0.35 * delta;
      }
      if (drop.y < 0 || drop.x > COLUMN_RADIUS) {
        drop.y = COLUMN_HEIGHT;
        drop.x = (Math.random() * 2 - 1) * COLUMN_RADIUS;
        drop.z = (Math.random() * 2 - 1) * COLUMN_RADIUS;
      }
      dropPosition.set(
        cameraPosition.x + drop.x,
        drop.y,
        cameraPosition.z + drop.z,
      );
      dropMatrix.compose(dropPosition, dropQuaternion, dropScale);
      rain.setMatrixAt(i, dropMatrix);
    }
    rain.instanceMatrix.needsUpdate = true;
  }

  function applyLightning(state: EnvironmentState, delta: number): void {
    if (settings.reducedMotion || state.stormIntensity < 0.45) {
      flash = 0;
      lightning.intensity = 0;
      return;
    }
    nextFlashIn -= delta;
    if (nextFlashIn <= 0) {
      flash = 1;
      // Strikes come closer together at the heart of the storm.
      nextFlashIn = 2.5 + Math.random() * 9 * (1.2 - state.stormIntensity);
    }
    flash = Math.max(0, flash - delta * 5.5);
    lightning.intensity = Math.pow(flash, 2.2) * 2.4;
  }

  return {
    apply(state, delta) {
      const step = Math.min(delta, 0.05);
      elapsed += step;

      // Sky. Dawn and dusk colour comes from how low the sun is; cloud and
      // storm then drain the colour out of whatever is left.
      const dayness = THREE.MathUtils.clamp(state.daylight * 2.2, 0, 1);
      const horizon = THREE.MathUtils.clamp(1 - state.daylight * 4, 0, 1);
      lerpColor(skyColor, NIGHT_SKY, DAY_SKY, dayness);
      if (state.sunAltitude > -0.12)
        skyColor.lerp(DAWN_SKY, horizon * 0.75 * dayness);
      skyColor.lerp(STORM_SKY, state.stormIntensity * 0.85);
      skyColor.lerp(
        STORM_SKY,
        Math.max(0, state.cloudCover - 0.45) * 0.5 * dayness,
      );
      scene.background = skyColor;

      // Fog closes in during a storm and opens up on a clear dry day.
      fog.color.copy(skyColor);
      fog.near = THREE.MathUtils.lerp(34, 6, state.stormIntensity);
      fog.far = THREE.MathUtils.lerp(125, 46, state.stormIntensity);

      // Sun, placed by the real solar position for this date and latitude.
      const altitude = state.sunAltitude;
      const azimuth = state.sunAzimuth;
      const radius = 70;
      sun.position.set(
        radius * Math.cos(altitude) * Math.sin(azimuth),
        radius * Math.sin(altitude),
        radius * Math.cos(altitude) * Math.cos(azimuth),
      );
      const height = THREE.MathUtils.clamp(
        Math.sin(Math.max(0, altitude)),
        0,
        1,
      );
      lerpColor(
        sunColor,
        NIGHT_SUN,
        LOW_SUN,
        THREE.MathUtils.clamp(height * 6, 0, 1),
      );
      sunColor.lerp(
        HIGH_SUN,
        THREE.MathUtils.clamp((height - 0.2) / 0.6, 0, 1),
      );
      sun.color.copy(sunColor);
      sun.intensity = 3.1 * height * (1 - state.cloudCover * 0.72);
      sun.castShadow = !settings.lowQuality && sun.intensity > 0.35;
      if (sunDisc) {
        sunDisc.visible = altitude > -0.05;
        sunDisc.position.copy(sun.position).multiplyScalar(1.35);
        (sunDisc.material as THREE.MeshBasicMaterial).color
          .copy(sunColor)
          .lerp(new THREE.Color(0xffffff), 0.3);
        (sunDisc.material as THREE.MeshBasicMaterial).opacity =
          1 - state.cloudCover * 0.9;
      }

      // Sky light keeps the scene readable at night and under heavy cloud,
      // because a child should always be able to see where they are walking.
      hemisphere.intensity =
        0.45 + height * 2.1 * (1 - state.cloudCover * 0.45);
      hemisphere.color.copy(skyColor).lerp(new THREE.Color(0xffffff), 0.35);

      // The savanna's own colour: grass answers the rain, ground darkens wet.
      lerpColor(grassColor, DRY_GRASS, LUSH_GRASS, state.greenness);
      for (const material of grassMaterials) material.color.copy(grassColor);
      lerpColor(
        groundColor,
        DRY_EARTH,
        WET_EARTH,
        Math.max(state.waterLevel * 0.55, state.stormIntensity * 0.8),
      );
      for (const material of groundMaterials) material.color.copy(groundColor);

      if (water) {
        // A waterhole shrinks from its edges as it dries, and can vanish.
        const fullness = 0.18 + state.waterLevel * 0.82;
        water.scale.set(fullness, fullness, 1);
        water.visible = state.waterLevel > 0.04;
        const material = water.material as THREE.MeshStandardMaterial;
        material.opacity = 0.55 + state.waterLevel * 0.4;
        material.roughness = 0.12 + state.stormIntensity * 0.5;
      }

      applyRain(state, step);
      applyLightning(state, step);
      // Grass leans on the wind, hard enough to read during a storm.
      sway = settings.reducedMotion
        ? 0
        : Math.sin(elapsed * 1.7) * 0.04 * state.windSpeed;
    },
    windSway: () => sway,
    raindrops: () => rain.count,
    setOptions(value) {
      Object.assign(settings, value);
    },
    dispose() {
      scene.remove(rain, lightning);
      dropGeometry.dispose();
      dropMaterial.dispose();
      rain.dispose();
    },
  };
}
