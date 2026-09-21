import * as THREE from "three";

export interface SafariWheelRig {
  root: THREE.Group;
  setPose(roll: number, steering: number): void;
}

/** The supplied jeep is one baked mesh, so its visible wheel faces need their own pivots. */
export function createSafariWheelRig(
  style: "imported" | "fallback",
): SafariWheelRig {
  const root = new THREE.Group();
  root.name = "safari-driving-wheels";
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x242622,
    roughness: 0.96,
  });
  const rim = new THREE.MeshStandardMaterial({
    color: style === "imported" ? 0x787969 : 0xa3a99b,
    metalness: 0.38,
    roughness: 0.58,
  });
  const darkRim = new THREE.MeshStandardMaterial({
    color: 0x3b3d35,
    metalness: 0.3,
    roughness: 0.72,
  });
  const radius = style === "imported" ? 0.45 : 0.46;
  const wheelX = style === "imported" ? [-1.18, 1.68] : [-1.42, 1.42];
  const wheelZ = style === "imported" ? 0.94 : 0.98;
  const rolling: THREE.Group[] = [];
  const front: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    for (const [axle, x] of wheelX.entries()) {
      const steeringPivot = new THREE.Group();
      steeringPivot.name = `${axle === 1 ? "front" : "rear"}-${side < 0 ? "left" : "right"}-steering`;
      steeringPivot.position.set(x, radius + 0.02, side * wheelZ);
      root.add(steeringPivot);
      if (axle === 1) front.push(steeringPivot);

      const spin = new THREE.Group();
      spin.name = `${axle === 1 ? "front" : "rear"}-${side < 0 ? "left" : "right"}-rolling`;
      steeringPivot.add(spin);
      rolling.push(spin);

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.2, 24),
        rubber,
      );
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;
      tire.receiveShadow = true;
      spin.add(tire);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.245, 0.245, 0.215, 12),
        darkRim,
      );
      hub.rotation.x = Math.PI / 2;
      spin.add(hub);

      // The uneven spoke and lug pattern makes rotation readable at safari scale.
      for (let spoke = 0; spoke < 5; spoke++) {
        const angle = (spoke * Math.PI * 2) / 5;
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.063, 0.025),
          rim,
        );
        arm.position.set(
          Math.cos(angle) * 0.126,
          Math.sin(angle) * 0.126,
          side * 0.12,
        );
        arm.rotation.z = angle;
        spin.add(arm);
      }
      const lug = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 6), rim);
      lug.position.set(0.065, 0.205, side * 0.131);
      spin.add(lug);
    }
  }
  return {
    root,
    setPose(roll, steering) {
      for (const spin of rolling) spin.rotation.z = roll;
      for (const pivot of front) pivot.rotation.y = steering;
    },
  };
}
