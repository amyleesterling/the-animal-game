import * as THREE from "three";
import { ARRIVAL_TIMING, sampleArrival } from "./arrival-sequence";

/** An imagined final approach, with a clear road into the existing study loop. */
export function inArrivalCorridor(x: number, z: number) {
  if (z < 11 || z > 78) return false;
  const roadX = 5.5 + ((z - 12.5) / (64 - 12.5)) * (1.75 - 5.5);
  return Math.abs(x - roadX) < 11;
}

export function addTarangireScenery(scene: THREE.Scene) {
  const sand = new THREE.MeshStandardMaterial({
    color: 0xc8ad78,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const road = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= 36; index++) {
    const { x, z, heading } = sampleArrival(
      ARRIVAL_TIMING.walking +
        ARRIVAL_TIMING.boarding +
        (ARRIVAL_TIMING.driving * index) / 36,
    ).jeep;
    const sideX = Math.sin(heading) * 3.3;
    const sideZ = Math.cos(heading) * 3.3;
    positions.push(x - sideX, 0.012, z - sideZ, x + sideX, 0.012, z + sideZ);
    if (index > 0) {
      const at = index * 2;
      indices.push(at - 2, at - 1, at, at - 1, at + 1, at);
    }
  }
  road.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  road.setIndex(indices);
  road.computeVertexNormals();
  const roadMesh = new THREE.Mesh(road, sand);
  roadMesh.name = "imagined-tarangire-approach-road";
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  const camp = new THREE.Mesh(
    new THREE.CircleGeometry(11, 40),
    new THREE.MeshStandardMaterial({ color: 0xd7bf90, roughness: 1 }),
  );
  camp.rotation.x = -Math.PI / 2;
  camp.position.set(1.75, 0.008, 65);
  camp.receiveShadow = true;
  camp.name = "imagined-base-camp";
  scene.add(camp);

  const bark = new THREE.MeshStandardMaterial({
    color: 0x806547,
    roughness: 1,
    flatShading: true,
  });
  const leaves = new THREE.MeshStandardMaterial({
    color: 0x617849,
    roughness: 1,
    flatShading: true,
  });
  for (const [x, z, scale] of [
    [-20, 58, 1.25],
    [22, 54, 1.05],
    [-19, 21, 0.95],
    [22, 15, 1.15],
  ]) {
    const baobab = new THREE.Group();
    baobab.name = "tarangire-inspired-baobab";
    baobab.position.set(x, 0, z);
    baobab.scale.setScalar(scale);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.75, 8.7, 9),
      bark,
    );
    trunk.position.y = 4.35;
    trunk.castShadow = true;
    baobab.add(trunk);
    for (let arm = 0; arm < 6; arm++) {
      const angle = (arm / 6) * Math.PI * 2;
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.48, 4.2, 6),
        bark,
      );
      branch.position.set(Math.cos(angle) * 1.3, 8.2, Math.sin(angle) * 1.3);
      branch.rotation.z = Math.cos(angle) * -0.55;
      branch.rotation.x = Math.sin(angle) * 0.55;
      branch.castShadow = true;
      baobab.add(branch);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), leaves);
      crown.position.set(Math.cos(angle) * 2.9, 9.6, Math.sin(angle) * 2.9);
      crown.scale.set(2.0, 0.72, 1.5);
      crown.castShadow = true;
      baobab.add(crown);
    }
    scene.add(baobab);
  }

  const label = document.createElement("canvas");
  label.width = 1024;
  label.height = 350;
  const ink = label.getContext("2d");
  if (ink) {
    ink.fillStyle = "#f5e9cc";
    ink.fillRect(0, 0, label.width, label.height);
    ink.strokeStyle = "#5b6543";
    ink.lineWidth = 20;
    ink.strokeRect(12, 12, 1000, 326);
    ink.fillStyle = "#2d503b";
    ink.textAlign = "center";
    ink.font = "bold 70px Georgia";
    ink.fillText("TARANGIRE-INSPIRED", 512, 150);
    ink.font = "bold 48px sans-serif";
    ink.fillText("WILDLIFE STUDY TRAIL", 512, 238);
  }
  const texture = new THREE.CanvasTexture(label);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2.7),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  sign.name = "imagined-park-arrival-sign";
  sign.position.set(-6.8, 4.2, 30);
  scene.add(sign);
  for (const x of [-10.1, -3.5]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.18, 5.8, 6),
      bark,
    );
    post.position.set(x, 2.9, 30);
    post.castShadow = true;
    scene.add(post);
  }
}
