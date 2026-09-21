/** Pure opening choreography. The world reserves this corridor from obstacles. */
export const ARRIVAL_STAGES = [
  "walking",
  "boarding",
  "driving",
  "parking",
  "exiting",
  "complete",
] as const;

export type ArrivalStage = (typeof ARRIVAL_STAGES)[number];
type Point = { readonly x: number; readonly z: number };

/** Durations in visible, unpaused seconds; never add time spent in a modal/tab. */
export const ARRIVAL_TIMING = {
  walking: 3.2,
  boarding: 0.8,
  driving: 10.2,
  parking: 0.6,
  exiting: 2.7,
} as const;
export const ARRIVAL_DURATION = Object.values(ARRIVAL_TIMING).reduce(
  (sum, seconds) => sum + seconds,
  0,
);

const parkedHeading = -0.12;

/**
 * The ~54m road ends at the existing zebra stop, not a new exploration spawn.
 * The cubic's endpoint tangents match the jeep's initial and parked headings.
 * Reserve the whole curve plus the vehicle footprint, and both walking paths.
 */
export const ARRIVAL_ROUTE = {
  jeepStart: { x: 1.75, z: 64, heading: Math.PI / 2 },
  roadControl1: { x: 1.75, z: 43 },
  roadControl2: {
    x: 5.5 - 10 * Math.cos(parkedHeading),
    z: 12.5 + 10 * Math.sin(parkedHeading),
  },
  jeepEnd: { x: 5.5, z: 12.5, heading: parkedHeading },
  sophiaStart: { x: -7, z: 63.3 },
  coraStart: { x: -7, z: 64.7 },
  sophiaBoard: { x: 0, z: 63.3 },
  coraBoard: { x: 0, z: 64.7 },
  // Both exits clear the walking controller's parked-jeep exclusion circle.
  sophiaExit: { x: 3.5, z: 16.5 },
  coraExit: { x: 4.75, z: 16.5 },
  sophiaEnd: { x: 0, z: 16.5, heading: 0 },
  coraEnd: { x: 1.25, z: 16.5, heading: 0 },
} as const;

export interface ArrivalCharacterPose {
  x: number;
  z: number;
  /** Three.js Y rotation; characters face -Z at zero. */
  heading: number;
  visible: boolean;
  moving: boolean;
}

export interface ArrivalSample {
  stage: ArrivalStage;
  stageProgress: number;
  complete: boolean;
  jeep: {
    x: number;
    z: number;
    /** Three.js Y rotation; the Land Cruiser faces +X at zero. */
    heading: number;
    /** Instantaneous forward speed in world units per second. */
    speed: number;
  };
  sophia: ArrivalCharacterPose;
  cora: ArrivalCharacterPose;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function character(
  point: Point,
  heading: number,
  visible = true,
  moving = false,
): ArrivalCharacterPose {
  return { x: point.x, z: point.z, heading, visible, moving };
}

function walk(from: Point, to: Point, progress: number): ArrivalCharacterPose {
  const t = smooth(progress);
  return character(
    { x: mix(from.x, to.x, t), z: mix(from.z, to.z, t) },
    Math.atan2(from.x - to.x, from.z - to.z),
    true,
    progress > 0 && progress < 1,
  );
}

function road(progress: number): ArrivalSample["jeep"] {
  const p = ARRIVAL_ROUTE;
  const t = smooth(progress);
  const u = 1 - t;
  const component = (axis: "x" | "z") =>
    u ** 3 * p.jeepStart[axis] +
    3 * u * u * t * p.roadControl1[axis] +
    3 * u * t * t * p.roadControl2[axis] +
    t ** 3 * p.jeepEnd[axis];
  const tangent = (axis: "x" | "z") =>
    3 * u * u * (p.roadControl1[axis] - p.jeepStart[axis]) +
    6 * u * t * (p.roadControl2[axis] - p.roadControl1[axis]) +
    3 * t * t * (p.jeepEnd[axis] - p.roadControl2[axis]);
  const dx = tangent("x");
  const dz = tangent("z");
  return {
    x: component("x"),
    z: component("z"),
    heading: Math.atan2(-dz, dx),
    speed:
      (Math.hypot(dx, dz) * 6 * progress * (1 - progress)) /
      ARRIVAL_TIMING.driving,
  };
}

function exit(from: Point, to: Point, progress: number): ArrivalCharacterPose {
  // Reach the standing place before turning toward the zebra. Do not moonwalk.
  const walkingProgress = Math.min(1, progress / 0.8);
  const pose = walk(from, to, walkingProgress);
  if (progress >= 0.8)
    pose.heading = mix(pose.heading, 0, smooth((progress - 0.8) / 0.2));
  return pose;
}

/**
 * Stateless sampling makes low frame rates, pause/resume and skip deterministic.
 * Skip by sampling ARRIVAL_DURATION. Reduced motion always returns that same
 * finished pose. NaN/negative time means start; positive infinity means finish.
 * Hidden passengers need no visible seating/boarding rig or walking animation.
 */
export function sampleArrival(
  elapsedSeconds: number,
  reducedMotion = false,
): ArrivalSample {
  const elapsed = Number.isNaN(elapsedSeconds)
    ? 0
    : Math.max(0, elapsedSeconds);
  const p = ARRIVAL_ROUTE;
  if (reducedMotion || elapsed >= ARRIVAL_DURATION)
    return {
      stage: "complete",
      stageProgress: 1,
      complete: true,
      jeep: { ...p.jeepEnd, speed: 0 },
      sophia: character(p.sophiaEnd, p.sophiaEnd.heading),
      cora: character(p.coraEnd, p.coraEnd.heading),
    };

  let stage: Exclude<ArrivalStage, "complete"> = "exiting";
  let start = 0;
  for (const candidate of ARRIVAL_STAGES) {
    if (candidate === "complete") break;
    const end = start + ARRIVAL_TIMING[candidate];
    if (elapsed < end) {
      stage = candidate;
      break;
    }
    start = end;
  }
  const progress = Math.min(
    1,
    Math.max(0, (elapsed - start) / ARRIVAL_TIMING[stage]),
  );
  let jeep: ArrivalSample["jeep"] = { ...p.jeepStart, speed: 0 };
  let sophia = character(p.sophiaBoard, -Math.PI / 2);
  let cora = character(p.coraBoard, -Math.PI / 2);

  if (stage === "walking") {
    sophia = walk(p.sophiaStart, p.sophiaBoard, progress);
    cora = walk(p.coraStart, p.coraBoard, progress);
  } else if (stage === "boarding") {
    // Pause at the doors, then hide both before the vehicle starts moving.
    sophia.visible = cora.visible = progress < 0.5;
  } else if (stage === "driving" || stage === "parking") {
    jeep = stage === "driving" ? road(progress) : { ...p.jeepEnd, speed: 0 };
    sophia = character(jeep, jeep.heading - Math.PI / 2, false);
    cora = character(jeep, jeep.heading - Math.PI / 2, false);
  } else {
    jeep = { ...p.jeepEnd, speed: 0 };
    sophia = exit(p.sophiaExit, p.sophiaEnd, progress);
    cora = exit(p.coraExit, p.coraEnd, progress);
  }

  return {
    stage,
    stageProgress: progress,
    complete: false,
    jeep,
    sophia,
    cora,
  };
}
