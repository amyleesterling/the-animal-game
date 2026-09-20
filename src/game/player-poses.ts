import * as THREE from "three";

function capturePose(source: THREE.Group): () => void {
  const transforms: {
    object: THREE.Object3D;
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    scale: THREE.Vector3;
  }[] = [];
  source.traverse((object) => {
    transforms.push({
      object,
      position: object.position.clone(),
      quaternion: object.quaternion.clone(),
      scale: object.scale.clone(),
    });
  });
  return () => {
    for (const transform of transforms) {
      transform.object.position.copy(transform.position);
      transform.object.quaternion.copy(transform.quaternion);
      transform.object.scale.copy(transform.scale);
    }
  };
}

/** Pose the supplied Mixamo rig in model space; never alter root travel. */
export function createPlayerPoses(source: THREE.Group) {
  // Keep the imported local transforms. Skeleton.pose() applies world-space
  // bind inverses to Sophia's scaled armature and shrinks it by another 100x.
  const restoreImported = capturePose(source);
  const bone = (name: string) => {
    let found: THREE.Bone | undefined;
    source.traverse((object) => {
      if (
        object instanceof THREE.Bone &&
        object.name.replace(/[^a-z]/gi, "").toLowerCase() ===
          `mixamorig${name}`.toLowerCase()
      )
        found = object;
    });
    return found;
  };
  const aim = (
    joint: THREE.Bone | undefined,
    end: THREE.Bone | undefined,
    direction: THREE.Vector3,
    twist = 0,
  ) => {
    if (!joint || !end || !joint.parent) return;
    source.updateWorldMatrix(true, true);
    const current = end
      .getWorldPosition(new THREE.Vector3())
      .sub(joint.getWorldPosition(new THREE.Vector3()))
      .normalize();
    const target = direction.clone().transformDirection(source.matrixWorld);
    const rotation = new THREE.Quaternion().setFromUnitVectors(current, target);
    const world = rotation.multiply(
      joint.getWorldQuaternion(new THREE.Quaternion()),
    );
    if (twist)
      world.premultiply(new THREE.Quaternion().setFromAxisAngle(target, twist));
    joint.quaternion.copy(
      joint.parent
        .getWorldQuaternion(new THREE.Quaternion())
        .invert()
        .multiply(world),
    );
  };

  for (const [side, sign] of [
    ["Left", 1],
    ["Right", -1],
  ] as const) {
    aim(
      bone(`${side}Arm`),
      bone(`${side}ForeArm`),
      new THREE.Vector3(sign * 0.18, -0.98, 0),
    );
    aim(
      bone(`${side}ForeArm`),
      bone(`${side}Hand`),
      new THREE.Vector3(sign * 0.1, -0.99, 0.1),
    );
  }
  const restoreStanding = capturePose(source);

  // Elbow beside the shoulder, forearm upright, palm facing the viewer.
  aim(
    bone("RightArm"),
    bone("RightForeArm"),
    new THREE.Vector3(-0.9, 0.4, 0.13),
  );
  aim(
    bone("RightForeArm"),
    bone("RightHand"),
    new THREE.Vector3(0.05, 0.98, 0.19),
    Math.PI / 2,
  );
  const restoreGreeting = capturePose(source);
  const hand = bone("RightHand");
  source.updateWorldMatrix(true, true);
  const waveAxis = hand?.parent
    ? new THREE.Vector3(0, 0, 1)
        .transformDirection(source.matrixWorld)
        .applyQuaternion(
          hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),
        )
    : new THREE.Vector3(0, 0, 1);
  const waveRotation = new THREE.Quaternion();
  restoreStanding();
  return {
    restoreImported,
    stand: restoreStanding,
    greet(elapsed: number, reducedMotion: boolean) {
      restoreGreeting();
      if (hand && !reducedMotion) {
        waveRotation.setFromAxisAngle(waveAxis, Math.sin(elapsed * 5) * 0.22);
        hand.quaternion.premultiply(waveRotation);
      }
    },
  };
}
