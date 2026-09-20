import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { CORA_CHARACTER } from "../../src/content/characters";
import {
  createPlayer,
  createPlayerModel,
  DEFAULT_PLAYER_CHARACTER,
  loadPlayerVisual,
  makeInPlaceClip,
  PLAYER_ASSET_PATH,
  PLAYER_WALK_ANIMATION,
  type PlayerCharacter,
} from "../../src/game/player";

const assetBytes = readFileSync(
  new URL("../../public/models/sophia.glb", import.meta.url),
);

const proceduralGreetingCharacter: PlayerCharacter = {
  ...DEFAULT_PLAYER_CHARACTER,
  greetingAnimation: undefined,
};

function mockImageDecoder() {
  vi.stubGlobal("self", { URL });
  vi.stubGlobal("document", { baseURI: "http://localhost/" });
  const bitmap = { width: 1024, height: 1024, close: vi.fn() };
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
  return bitmap;
}

function mockAssetFetch() {
  const fetchBlob = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      String(input).endsWith(PLAYER_ASSET_PATH)
        ? Promise.resolve(new Response(new Uint8Array(assetBytes).buffer))
        : fetchBlob(input, init),
    ),
  );
}

async function parseAsset(
  character: PlayerCharacter = DEFAULT_PLAYER_CHARACTER,
) {
  const bytes =
    character.assetPath === PLAYER_ASSET_PATH
      ? assetBytes
      : readFileSync(
          new URL(`../../public${character.assetPath}`, import.meta.url),
        );
  return new GLTFLoader().parseAsync(
    new Uint8Array(bytes).buffer,
    "http://localhost/models/",
  );
}

function skinOf(root: THREE.Object3D): THREE.SkinnedMesh {
  let skin: THREE.SkinnedMesh | undefined;
  root.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) skin = object;
  });
  if (!skin) throw new Error("Expected the shipped skinned character.");
  return skin;
}

function bonePose(root: THREE.Object3D): number[] {
  return skinOf(root).skeleton.bones.flatMap((bone) => [
    ...bone.position.toArray(),
    ...bone.quaternion.toArray(),
  ]);
}

function bonePosition(root: THREE.Object3D, name: string): THREE.Vector3 {
  root.updateMatrixWorld(true);
  const bone = skinOf(root).skeleton.bones.find(
    (joint) => joint.name === `mixamorig${name}`,
  );
  if (!bone) throw new Error(`Missing joint ${name}`);
  return bone.getWorldPosition(new THREE.Vector3());
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each([DEFAULT_PLAYER_CHARACTER, CORA_CHARACTER])(
  "$name's supplied walking and greeting clips",
  (character) => {
    it("plays the authored greeting in place without modifying the supplied tracks", async () => {
      mockImageDecoder();
      const [gltf, reference] = await Promise.all([
        parseAsset(character),
        parseAsset(character),
      ]);
      expect(gltf.animations.map((clip) => clip.name).sort()).toEqual([
        "Walking_Woman",
        "Wave_for_Help_4",
      ]);
      const clip = gltf.animations.find(
        (item) => item.name === character.greetingAnimation,
      )!;
      expect(clip.duration).toBeGreaterThan(4);
      expect(clip.tracks).toHaveLength(46);
      const values = clip.tracks.map((track) => [...track.values]);
      const player = createPlayerModel(gltf.scene, gltf.animations, character);
      const referenceMixer = new THREE.AnimationMixer(reference.scene);
      referenceMixer
        .clipAction(
          makeInPlaceClip(
            reference.scene,
            reference.animations.find(
              (item) => item.name === character.greetingAnimation,
            )!,
          ),
        )
        .play();
      referenceMixer.update(0.75);
      player.root.position.set(3, 0, -4);
      player.animate(0.75, false, false, true);
      expect(bonePose(player.root)).toEqual(bonePose(reference.scene));
      const hips = bonePosition(player.root, "Hips");
      for (let frame = 0; frame < 30; frame++) {
        player.animate(0.2, false, false, true);
        const floor = new THREE.Box3().setFromObject(player.root, true).min.y;
        expect(floor).toBeGreaterThan(-0.025);
        expect(floor).toBeLessThan(0.05);
        expect(bonePosition(player.root, "Hips").x).toBeCloseTo(hips.x);
        expect(bonePosition(player.root, "Hips").z).toBeCloseTo(hips.z);
      }
      expect(player.root.position.toArray()).toEqual([3, 0, -4]);
      expect(clip.tracks.map((track) => [...track.values])).toEqual(values);
      player.dispose();
      referenceMixer.stopAllAction();
      referenceMixer.uncacheRoot(reference.scene);
      createPlayerModel(
        reference.scene,
        reference.animations,
        character,
      ).dispose();
    });

    it("freezes a raised-hand authored frame and restores idle and clean walking with movement precedence", async () => {
      mockImageDecoder();
      const [a, b] = await Promise.all([
        parseAsset(character),
        parseAsset(character),
      ]);
      const player = createPlayerModel(a.scene, a.animations, character);
      const clean = createPlayerModel(b.scene, b.animations, character);
      const standing = bonePose(player.root);
      player.animate(0, false, true, true);
      const greeting = bonePose(player.root);
      expect(greeting).not.toEqual(standing);
      expect(bonePosition(player.root, "RightHand").y).toBeGreaterThan(
        bonePosition(player.root, "Head").y,
      );
      expect(
        new THREE.Box3().setFromObject(player.root, true).min.y,
      ).toBeCloseTo(0);
      player.animate(25, false, true, true);
      expect(bonePose(player.root)).toEqual(greeting);
      player.animate(0.25, true, false, true);
      clean.animate(0.25, true, false);
      expect(bonePose(player.root)).toEqual(bonePose(clean.root));
      player.animate(1.2, false, false, true);
      player.animate(0, false, false);
      expect(bonePose(player.root)).toEqual(standing);
      player.animate(0, false, true, true);
      expect(bonePose(player.root)).toEqual(greeting);
      player.animate(5, true, true, true);
      expect(bonePose(player.root)).toEqual(standing);
      player.dispose();
      clean.dispose();
    });

    it("advances authored waves by elapsed time and disposes both animation actions and resources", async () => {
      const bitmap = mockImageDecoder();
      const [a, b] = await Promise.all([
        parseAsset(character),
        parseAsset(character),
      ]);
      const smooth = createPlayerModel(a.scene, a.animations, character);
      const slow = createPlayerModel(b.scene, b.animations, character);
      for (let frame = 0; frame < 45; frame++)
        smooth.animate(1 / 60, false, false, true);
      slow.animate(0.75, false, false, true);
      const slowPose = bonePose(slow.root);
      bonePose(smooth.root).forEach((value, index) =>
        expect(value).toBeCloseTo(slowPose[index], 5),
      );
      const skin = skinOf(smooth.root);
      const skeleton = vi.spyOn(skin.skeleton, "dispose");
      const geometry = vi.spyOn(skin.geometry, "dispose");
      const stopActions = vi.spyOn(
        THREE.AnimationMixer.prototype,
        "stopAllAction",
      );
      const uncache = vi.spyOn(THREE.AnimationMixer.prototype, "uncacheRoot");
      smooth.dispose();
      smooth.dispose();
      expect(skeleton).toHaveBeenCalledOnce();
      expect(geometry).toHaveBeenCalledOnce();
      expect(stopActions).toHaveBeenCalledOnce();
      expect(uncache).toHaveBeenCalledExactlyOnceWith(a.scene);
      expect(bitmap.close).toHaveBeenCalledOnce();
      expect(() => smooth.animate(0.2, false, false, true)).not.toThrow();
      slow.dispose();
    });

    it("rejects a configured greeting that is absent from the supplied model", async () => {
      mockImageDecoder();
      const gltf = await parseAsset(character);
      expect(() =>
        createPlayerModel(gltf.scene, gltf.animations, {
          ...character,
          greetingAnimation: "Missing wave",
        }),
      ).toThrow(`${character.name}'s greeting animation is missing.`);
      createPlayerModel(gltf.scene, gltf.animations, character).dispose();
    });

    it("cycles through the full wave and ambient standing, repeats, and keeps idle feet planted", async () => {
      mockImageDecoder();
      const gltf = await parseAsset(character);
      const duration = gltf.animations.find(
        (clip) => clip.name === character.greetingAnimation,
      )!.duration;
      const player = createPlayerModel(gltf.scene, gltf.animations, {
        ...character,
        welcomeCycle: { idleSeconds: 5, phaseSeconds: 0 },
      });
      player.root.position.set(3, 0, -4);
      const feet = [
        bonePosition(player.root, "LeftFoot"),
        bonePosition(player.root, "RightFoot"),
      ];
      const hips = bonePosition(player.root, "Hips");
      let time = 0;
      const advanceTo = (next: number) => {
        player.animate(next - time, false, false, true);
        time = next;
      };
      advanceTo(1.25);
      expect(player.root.userData.welcomePhase).toBe("waving");
      const firstWave = bonePose(player.root);
      advanceTo(duration + 1);
      expect(player.root.userData.welcomePhase).toBe("standing");
      const firstIdle = bonePose(player.root);
      const head = bonePosition(player.root, "Head");
      player.animate(0, false, false, true);
      expect(bonePose(player.root)).toEqual(firstIdle);
      advanceTo(duration + 1.75);
      expect(bonePose(player.root)).not.toEqual(firstIdle);
      const headMovement = bonePosition(player.root, "Head").distanceTo(head);
      expect(headMovement).toBeGreaterThan(0.00001);
      expect(headMovement).toBeLessThan(0.03);
      expect(
        bonePosition(player.root, "LeftFoot").distanceTo(feet[0]),
      ).toBeLessThan(0.000001);
      expect(
        bonePosition(player.root, "RightFoot").distanceTo(feet[1]),
      ).toBeLessThan(0.000001);
      expect(bonePosition(player.root, "Hips").distanceTo(hips)).toBeLessThan(
        0.000001,
      );
      expect(
        new THREE.Box3().setFromObject(player.root, true).min.y,
      ).toBeCloseTo(0);
      advanceTo(duration + 5 + 1.25);
      expect(player.root.userData.welcomePhase).toBe("waving");
      bonePose(player.root).forEach((value, index) =>
        expect(value).toBeCloseTo(firstWave[index], 6),
      );
      advanceTo(2 * duration + 6);
      expect(player.root.userData.welcomePhase).toBe("standing");
      expect(player.root.position.toArray()).toEqual([3, 0, -4]);
      player.dispose();
    });

    it("blends both welcome boundaries without jumps or pose accumulation on paused frames", async () => {
      mockImageDecoder();
      const gltf = await parseAsset(character);
      const duration = gltf.animations.find(
        (clip) => clip.name === character.greetingAnimation,
      )!.duration;
      const player = createPlayerModel(gltf.scene, gltf.animations, {
        ...character,
        welcomeCycle: { idleSeconds: 5, phaseSeconds: 0 },
      });
      let time = 0;
      for (const boundary of [duration, duration + 5]) {
        player.animate(boundary - 0.001 - time, false, false, true);
        const paused = bonePose(player.root);
        for (let frame = 0; frame < 10; frame++)
          player.animate(0, false, false, true);
        expect(bonePose(player.root)).toEqual(paused);
        const before = skinOf(player.root).skeleton.bones.map((bone) =>
          bone.quaternion.clone(),
        );
        const hand = bonePosition(player.root, "RightHand");
        const feet = [
          bonePosition(player.root, "LeftFoot"),
          bonePosition(player.root, "RightFoot"),
        ];
        player.animate(0.002, false, false, true);
        skinOf(player.root).skeleton.bones.forEach((bone, index) =>
          expect(bone.quaternion.angleTo(before[index])).toBeLessThan(0.002),
        );
        expect(
          bonePosition(player.root, "RightHand").distanceTo(hand),
        ).toBeLessThan(0.001);
        expect(
          bonePosition(player.root, "LeftFoot").distanceTo(feet[0]),
        ).toBeLessThan(0.001);
        expect(
          bonePosition(player.root, "RightFoot").distanceTo(feet[1]),
        ).toBeLessThan(0.001);
        time = boundary + 0.001;
      }
      player.dispose();
    });

    it("freezes the cycle on paused frames and reduced motion, with movement and exploration taking precedence", async () => {
      mockImageDecoder();
      const [gltf, reference] = await Promise.all([
        parseAsset(character),
        parseAsset(character),
      ]);
      const player = createPlayerModel(gltf.scene, gltf.animations, {
        ...character,
        welcomeCycle: { idleSeconds: 5, phaseSeconds: 2.4 },
      });
      const clean = createPlayerModel(
        reference.scene,
        reference.animations,
        character,
      );
      player.animate(4, false, false, true);
      const paused = bonePose(player.root);
      expect(player.root.userData.welcomePhase).toBe("standing");
      for (let frame = 0; frame < 20; frame++)
        player.animate(0, false, false, true);
      expect(bonePose(player.root)).toEqual(paused);
      player.animate(0, false, true, true);
      expect(player.root.userData.welcomePhase).toBe("still");
      const still = bonePose(player.root);
      expect(bonePosition(player.root, "RightHand").y).toBeGreaterThan(
        bonePosition(player.root, "Head").y,
      );
      player.animate(20, false, true, true);
      expect(bonePose(player.root)).toEqual(still);
      player.animate(0, false, false, true);
      expect(player.root.userData.welcomePhase).toBe("standing");
      expect(bonePose(player.root)).toEqual(paused);
      player.animate(0.25, true, false, true);
      clean.animate(0.25, true, false);
      expect(player.root.userData.welcomePhase).toBe("inactive");
      expect(bonePose(player.root)).toEqual(bonePose(clean.root));
      player.animate(4, false, false, false);
      clean.animate(4, false, false, false);
      expect(bonePose(player.root)).toEqual(bonePose(clean.root));
      expect(player.root.userData.welcomePhase).toBe("inactive");
      player.dispose();
      clean.dispose();
    });
  },
);

it("staggers Sophia and Cora through their actual welcome cycles", async () => {
  mockImageDecoder();
  const [a, b] = await Promise.all([parseAsset(), parseAsset(CORA_CHARACTER)]);
  const sophia = createPlayerModel(a.scene, a.animations, {
    ...DEFAULT_PLAYER_CHARACTER,
    welcomeCycle: { idleSeconds: 5, phaseSeconds: 0 },
  });
  const cora = createPlayerModel(b.scene, b.animations, {
    ...CORA_CHARACTER,
    welcomeCycle: { idleSeconds: 5, phaseSeconds: 2.4 },
  });
  sophia.animate(3, false, false, true);
  cora.animate(3, false, false, true);
  expect(sophia.root.userData.welcomePhase).toBe("waving");
  expect(cora.root.userData.welcomePhase).toBe("standing");
  sophia.animate(5.5, false, false, true);
  cora.animate(5.5, false, false, true);
  expect(sophia.root.userData.welcomePhase).toBe("standing");
  expect(cora.root.userData.welcomePhase).toBe("waving");
  expect(sophia.root.position.toArray()).toEqual([0, 0, 0]);
  expect(cora.root.position.toArray()).toEqual([0, 0, 0]);
  sophia.dispose();
  cora.dispose();
});

it("forwards welcome phases through the asynchronous player wrapper", async () => {
  mockImageDecoder();
  mockAssetFetch();
  const state = vi.fn();
  const player = createPlayer(state, {
    ...DEFAULT_PLAYER_CHARACTER,
    welcomeCycle: { idleSeconds: 5, phaseSeconds: 6 },
  });
  player.animate(0, false, false, true);
  expect(player.root.userData.welcomePhase).toBe("standing");
  await vi.waitFor(() => expect(state).toHaveBeenLastCalledWith("loaded"));
  expect(player.root.userData.welcomePhase).toBe("standing");
  player.animate(5, false, false, true);
  expect(player.root.userData.welcomePhase).toBe("waving");
  player.animate(0, false, true, true);
  expect(player.root.userData.welcomePhase).toBe("still");
  player.animate(0, false, false, false);
  expect(player.root.userData.welcomePhase).toBe("inactive");
  player.dispose();
});

describe("Sophia's default character and procedural fallback", () => {
  it("preserves the real skeleton and clip, grounds its pose, and animates its joints", async () => {
    mockImageDecoder();
    const gltf = await parseAsset();
    const sourceSkin = skinOf(gltf.scene);
    expect(sourceSkin.skeleton.bones).toHaveLength(23);
    expect(PLAYER_ASSET_PATH).toBe("/models/sophia.glb");
    expect(DEFAULT_PLAYER_CHARACTER.greetingAnimation).toBe("Wave_for_Help_4");
    expect(gltf.animations.map((clip) => clip.name).sort()).toEqual([
      PLAYER_WALK_ANIMATION,
      "Wave_for_Help_4",
    ]);
    const walking = gltf.animations.find(
      (clip) => clip.name === PLAYER_WALK_ANIMATION,
    )!;
    expect(walking.duration).toBe(1);
    expect(walking.tracks).toHaveLength(46);
    const player = createPlayerModel(gltf.scene, gltf.animations);
    expect(skinOf(player.root)).toBe(sourceSkin);
    player.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(player.root, true);
    expect(bounds.min.y).toBeCloseTo(0);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(1.8);
    const initial = bonePose(player.root);
    player.root.position.set(4, 0, -8);
    player.animate(0.25, true, false);
    expect(bonePose(player.root)).not.toEqual(initial);
    expect(player.root.position.toArray()).toEqual([4, 0, -8]);
    player.dispose();
  });

  it("removes horizontal root travel from a copy while retaining vertical and child joint motion", async () => {
    mockImageDecoder();
    const gltf = await parseAsset();
    const original = gltf.animations.find(
      (clip) => clip.name === PLAYER_WALK_ANIMATION,
    )!;
    const originalValues = original.tracks.map((track) => [...track.values]);
    const clip = makeInPlaceClip(gltf.scene, original);
    const hips = clip.tracks.find(
      (track) => track.name === "mixamorigHips.position",
    )!;
    expect(hips).toBeDefined();
    const rootX = [],
      rootY = [],
      rootZ = [];
    for (let i = 0; i < hips.values.length; i += 3) {
      rootX.push(hips.values[i]);
      rootY.push(hips.values[i + 1]);
      rootZ.push(hips.values[i + 2]);
    }
    expect(new Set(rootX).size).toBe(1);
    expect(new Set(rootZ).size).toBe(1);
    expect(new Set(rootY).size).toBeGreaterThan(1);
    expect(original.tracks.map((track) => [...track.values])).toEqual(
      originalValues,
    );
    const child = clip.tracks.find(
      (track) => track.name === "mixamorigLeftLeg.position",
    )!;
    expect([...child.values]).toEqual([
      ...original.tracks.find((track) => track.name === child.name)!.values,
    ]);
    createPlayerModel(gltf.scene, gltf.animations).dispose();
  });

  it("stops at rest and with reduced motion, then resumes the real walking cycle", async () => {
    mockImageDecoder();
    const gltf = await parseAsset();
    const player = createPlayerModel(gltf.scene, gltf.animations);
    const restingPose = bonePose(player.root);
    player.animate(0.25, true, false);
    player.animate(0.2, false, false);
    expect(bonePose(player.root)).toEqual(restingPose);
    player.animate(12, false, false);
    expect(bonePose(player.root)).toEqual(restingPose);
    player.animate(0.25, true, false);
    player.animate(5, true, true);
    expect(bonePose(player.root)).toEqual(restingPose);
    player.animate(20, true, true);
    expect(bonePose(player.root)).toEqual(restingPose);
    player.animate(0.25, true, false);
    expect(bonePose(player.root)).not.toEqual(restingPose);
    player.dispose();
  });

  it("advances equally by elapsed time at 60 FPS and 2 FPS", async () => {
    mockImageDecoder();
    const [a, b] = await Promise.all([parseAsset(), parseAsset()]);
    const smooth = createPlayerModel(a.scene, a.animations);
    const slow = createPlayerModel(b.scene, b.animations);
    for (let i = 0; i < 30; i++) smooth.animate(1 / 60, true, false);
    slow.animate(0.5, true, false);
    bonePose(smooth.root).forEach((value, index) => {
      expect(value).toBeCloseTo(bonePose(slow.root)[index], 5);
    });
    smooth.dispose();
    slow.dispose();
  });

  it("uses a procedural greeting with planted feet when no authored greeting is configured", async () => {
    mockImageDecoder();
    const gltf = await parseAsset();
    const player = createPlayerModel(
      gltf.scene,
      gltf.animations,
      proceduralGreetingCharacter,
    );
    const feet = [
      bonePosition(player.root, "LeftFoot"),
      bonePosition(player.root, "RightFoot"),
    ];
    expect(Math.abs(feet[0].y - feet[1].y)).toBeLessThan(0.01);
    for (const side of ["Left", "Right"])
      expect(
        bonePosition(player.root, `${side}Arm`).y -
          bonePosition(player.root, `${side}Hand`).y,
      ).toBeGreaterThan(0.4);
    const hips = bonePosition(player.root, "Hips");
    const head = bonePosition(player.root, "Head");
    player.animate(0.2, false, false, true);
    expect(bonePosition(player.root, "RightHand").y).toBeGreaterThan(
      head.y + 0.15,
    );
    expect(bonePosition(player.root, "RightForeArm").y).toBeGreaterThan(
      bonePosition(player.root, "RightArm").y,
    );
    expect(
      bonePosition(player.root, "RightHand").y -
        bonePosition(player.root, "RightForeArm").y,
    ).toBeGreaterThan(0.2);
    expect(bonePosition(player.root, "Hips").distanceTo(hips)).toBeLessThan(
      0.000001,
    );
    expect(bonePosition(player.root, "Head").distanceTo(head)).toBeLessThan(
      0.000001,
    );
    expect(
      bonePosition(player.root, "LeftFoot").distanceTo(feet[0]),
    ).toBeLessThan(0.000001);
    expect(
      bonePosition(player.root, "RightFoot").distanceTo(feet[1]),
    ).toBeLessThan(0.000001);
    const greeting = bonePose(player.root);
    player.animate(0.2, false, false, true);
    expect(bonePose(player.root)).not.toEqual(greeting);
    expect(player.root.position.toArray()).toEqual([0, 0, 0]);
    expect(new THREE.Box3().setFromObject(player.root, true).min.y).toBeCloseTo(
      0,
    );
    player.dispose();
  });

  it("freezes the procedural greeting for reduced motion and restores a clean standing or walking pose", async () => {
    mockImageDecoder();
    const [a, b] = await Promise.all([parseAsset(), parseAsset()]);
    const player = createPlayerModel(
      a.scene,
      a.animations,
      proceduralGreetingCharacter,
    );
    const clean = createPlayerModel(
      b.scene,
      b.animations,
      proceduralGreetingCharacter,
    );
    const standing = bonePose(player.root);
    player.animate(0.3, false, false, true);
    player.animate(10, false, true, true);
    const frozenGreeting = bonePose(player.root);
    expect(frozenGreeting).not.toEqual(standing);
    player.animate(50, false, true, true);
    expect(bonePose(player.root)).toEqual(frozenGreeting);
    player.animate(0, false, true, false);
    expect(bonePose(player.root)).toEqual(standing);
    player.animate(0.4, false, false, true);
    player.animate(0.25, true, false, true);
    clean.animate(0.25, true, false);
    expect(bonePose(player.root)).toEqual(bonePose(clean.root));
    player.animate(0.2, false, false, true);
    player.animate(0, false, false);
    expect(bonePose(player.root)).toEqual(standing);
    player.animate(Number.NaN, false, false, true);
    player.animate(Number.POSITIVE_INFINITY, true, false);
    expect(bonePose(player.root).every(Number.isFinite)).toBe(true);
    player.dispose();
    clean.dispose();
  });

  it("uses an explicit character's animation, height, and independent skeleton", async () => {
    mockImageDecoder();
    const [a, b] = await Promise.all([parseAsset(), parseAsset()]);
    const fixture = {
      id: "fixture",
      name: "Fixture",
      assetPath: "/models/fixture.glb",
      walkAnimation: "Fixture walk",
      height: 1.45,
    };
    a.animations.find((clip) => clip.name === PLAYER_WALK_ANIMATION)!.name =
      "Fixture walk";
    const custom = createPlayerModel(a.scene, a.animations, fixture);
    const defaultPlayer = createPlayerModel(b.scene, b.animations);
    expect(custom.root.name).toBe("fixture-walking-visual");
    custom.root.updateMatrixWorld(true);
    expect(
      new THREE.Box3()
        .setFromObject(custom.root, true)
        .getSize(new THREE.Vector3()).y,
    ).toBeCloseTo(1.45);
    expect(skinOf(custom.root).skeleton).not.toBe(
      skinOf(defaultPlayer.root).skeleton,
    );
    const before = bonePose(defaultPlayer.root);
    custom.animate(0.3, false, false, true);
    expect(bonePose(defaultPlayer.root)).toEqual(before);
    custom.dispose();
    defaultPlayer.animate(0.2, true, false);
    expect(bonePose(defaultPlayer.root)).not.toEqual(before);
    defaultPlayer.dispose();
  });

  it("releases its skeleton, mesh, textures, and decoded image exactly once", async () => {
    const bitmap = mockImageDecoder();
    const gltf = await parseAsset();
    const player = createPlayerModel(gltf.scene, gltf.animations);
    const mesh = skinOf(player.root);
    mesh.skeleton.computeBoneTexture();
    const boneTexture = vi.spyOn(mesh.skeleton.boneTexture!, "dispose");
    const skeleton = vi.spyOn(mesh.skeleton, "dispose");
    const geometry = vi.spyOn(mesh.geometry, "dispose");
    const material = mesh.material as THREE.MeshStandardMaterial;
    const texture = vi.spyOn(material.map!, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    player.dispose();
    player.dispose();
    expect(skeleton).toHaveBeenCalledOnce();
    expect(boneTexture).toHaveBeenCalledOnce();
    expect(geometry).toHaveBeenCalledOnce();
    expect(texture).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("replaces the fallback only after a complete textured, animated load", async () => {
    mockImageDecoder();
    mockAssetFetch();
    const state = vi.fn();
    const player = createPlayer(state);
    const fallback = player.root.children[0];
    expect(state).toHaveBeenLastCalledWith("loading");
    player.root.position.set(2, 0, -6);
    player.animate(0, false, true, true);
    await vi.waitFor(() => expect(state).toHaveBeenLastCalledWith("loaded"));
    expect(player.root.children).toHaveLength(1);
    expect(player.root.children[0]).not.toBe(fallback);
    expect(player.root.position.toArray()).toEqual([2, 0, -6]);
    expect(skinOf(player.root).skeleton.bones).toHaveLength(23);
    expect(bonePosition(player.root, "RightHand").y).toBeGreaterThan(
      bonePosition(player.root, "Head").y,
    );
    player.dispose();
  });

  it("keeps a usable fallback when the download fails", async () => {
    vi.stubGlobal("document", { baseURI: "http://localhost/" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
    const state = vi.fn();
    const player = createPlayer(state);
    const fallback = player.root.children[0];
    await vi.waitFor(() => expect(state).toHaveBeenLastCalledWith("fallback"));
    expect(player.root.children[0]).toBe(fallback);
    expect(() => player.animate(0.2, true, false)).not.toThrow();
    player.animate(0.3, false, false, true);
    const arm = player.root.getObjectByName("fallback-right-arm")!;
    expect(arm.rotation.z).toBeLessThan(-2);
    player.animate(0, false, true, true);
    const frozen = arm.quaternion.clone();
    player.animate(15, false, true, true);
    expect(arm.quaternion.toArray()).toEqual(frozen.toArray());
    player.animate(0, true, false);
    expect(arm.rotation.z).toBeCloseTo(-0.12);
    player.dispose();
  });

  it("loads the avatar beneath the deployed project subpath", async () => {
    mockImageDecoder();
    vi.stubGlobal("document", {
      baseURI: "https://amyleesterling.github.io/the-animal-game/",
    });
    mockAssetFetch();
    const parse = vi.spyOn(GLTFLoader.prototype, "parseAsync");
    const signal = new AbortController().signal;
    const player = await loadPlayerVisual(signal);
    expect(fetch).toHaveBeenCalledWith(
      "https://amyleesterling.github.io/the-animal-game/models/sophia.glb",
      { signal },
    );
    expect(parse).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      "https://amyleesterling.github.io/the-animal-game/models/",
    );
    player.dispose();
  });

  it("rejects a decoded model with missing textures and revokes temporary image URLs", async () => {
    mockImageDecoder();
    mockAssetFetch();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("Decoder unavailable")),
    );
    const urls = vi.spyOn(URL, "createObjectURL");
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      loadPlayerVisual(new AbortController().signal),
    ).rejects.toThrow("Sophia's texture could not be decoded");
    expect(urls).toHaveBeenCalled();
    for (const result of urls.mock.results)
      expect(revoke).toHaveBeenCalledWith(result.value);
  });

  it("fetches a configured character's own project-relative asset and reports its failed load", async () => {
    vi.stubGlobal("document", { baseURI: "https://example.test/animal-game/" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );
    const character = {
      ...DEFAULT_PLAYER_CHARACTER,
      id: "fixture",
      name: "Fixture",
      assetPath: "/models/fixture.glb",
    };
    const state = vi.fn();
    const player = createPlayer(state, character);
    await vi.waitFor(() => expect(state).toHaveBeenLastCalledWith("fallback"));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.test/animal-game/models/fixture.glb",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(state.mock.calls).toEqual([["loading"], ["fallback"]]);
    player.dispose();
  });

  it("disposes a parse completed after its owner closes, without replacing the fallback", async () => {
    mockImageDecoder();
    const gltf = await parseAsset();
    const mesh = skinOf(gltf.scene);
    const geometry = vi.spyOn(mesh.geometry, "dispose");
    const skeleton = vi.spyOn(mesh.skeleton, "dispose");
    mockAssetFetch();
    let finishParse!: (result: GLTF) => void;
    const parse = vi
      .spyOn(GLTFLoader.prototype, "parseAsync")
      .mockImplementation(
        () =>
          new Promise<GLTF>((resolve) => {
            finishParse = resolve;
          }),
      );
    const state = vi.fn();
    const player = createPlayer(state);
    await vi.waitFor(() => expect(parse).toHaveBeenCalledOnce());
    player.dispose();
    finishParse(gltf);
    await vi.waitFor(() => expect(geometry).toHaveBeenCalledOnce());
    expect(skeleton).toHaveBeenCalledOnce();
    expect(player.root.children).toHaveLength(0);
    expect(state.mock.calls).toEqual([["loading"]]);
  });
});
