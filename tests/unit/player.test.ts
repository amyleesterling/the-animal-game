import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import {
  createPlayer,
  createPlayerModel,
  loadPlayerVisual,
  makeInPlaceClip,
  PLAYER_ASSET_PATH,
  PLAYER_WALK_ANIMATION,
} from "../../src/game/player";

const assetBytes = readFileSync(
  new URL("../../public/models/soph-walking.glb", import.meta.url),
);

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

async function parseAsset() {
  return new GLTFLoader().parseAsync(
    new Uint8Array(assetBytes).buffer,
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Soph's supplied walking character", () => {
  it("preserves the real skeleton and clip, grounds its pose, and animates its joints", async () => {
    mockImageDecoder();
    const gltf = await parseAsset();
    const sourceSkin = skinOf(gltf.scene);
    expect(sourceSkin.skeleton.bones).toHaveLength(23);
    expect(gltf.animations.map((clip) => clip.name)).toEqual([
      PLAYER_WALK_ANIMATION,
    ]);
    expect(gltf.animations[0].duration).toBe(1);
    expect(gltf.animations[0].tracks).toHaveLength(46);
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
    const original = gltf.animations[0];
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
    await vi.waitFor(() => expect(state).toHaveBeenLastCalledWith("loaded"));
    expect(player.root.children).toHaveLength(1);
    expect(player.root.children[0]).not.toBe(fallback);
    expect(player.root.position.toArray()).toEqual([2, 0, -6]);
    expect(skinOf(player.root).skeleton.bones).toHaveLength(23);
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
      "https://amyleesterling.github.io/the-animal-game/models/soph-walking.glb",
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
    ).rejects.toThrow("Soph's texture could not be decoded");
    expect(urls).toHaveBeenCalled();
    for (const result of urls.mock.results)
      expect(revoke).toHaveBeenCalledWith(result.value);
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
