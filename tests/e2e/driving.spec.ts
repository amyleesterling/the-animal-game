import {
  expect,
  test,
  type CDPSession,
  type Locator,
  type Page,
} from "@playwright/test";
import { safariStops } from "../../src/content/safari";

type Vehicle = {
  x: number;
  z: number;
  heading: number;
  speed: number;
  wheelRoll: number;
  wheelSteer: number;
  explorerX: number;
  explorerZ: number;
};
const canvas = (page: Page) => page.locator("#safari-world canvas");
async function vehicle(page: Page): Promise<Vehicle> {
  return canvas(page).evaluate((element) => {
    const data = (element as HTMLCanvasElement).dataset;
    const state = {
      x: Number(data.vehicleX),
      z: Number(data.vehicleZ),
      heading: Number(data.vehicleHeading),
      speed: Number(data.vehicleSpeed),
      wheelRoll: Number(data.wheelRoll),
      wheelSteer: Number(data.wheelSteer),
      explorerX: Number(data.explorerX),
      explorerZ: Number(data.explorerZ),
    };
    if (!Object.values(state).every(Number.isFinite))
      throw new Error("World driving diagnostics must be finite numbers.");
    return state;
  });
}
const distance = (a: Pick<Vehicle, "x" | "z">, b: Pick<Vehicle, "x" | "z">) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const turn = (a: number, b: number) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

async function openSafari(page: Page) {
  await page.goto("./safari.html");
  await page.locator("#begin-safari").click();
  if (await page.locator("#skip-arrival").isVisible())
    await page.locator("#skip-arrival").click();
  await expect(canvas(page)).toHaveAttribute("data-travel-mode", "walking");
  await expect(page.locator("#enter-jeep")).toBeEnabled();
  await expect(canvas(page)).toHaveAttribute("data-vehicle-x", /-?\d/);
}
async function identifyNearbyAnimal(page: Page) {
  await page.locator("#guide-animal").click();
  await expect(page.locator("#encounter-dialog")).toBeVisible();
  await page.locator("#skip-animal").click();
  await expect(page.locator("#encounter-dialog")).not.toBeVisible();
  await expect(page.locator("[data-answer]")).toHaveCount(3);
}
async function keyboardActivate(page: Page, button: Locator) {
  await expect(button).toBeEnabled();
  for (let step = 0; step < 35; step++) {
    if (await button.evaluate((element) => document.activeElement === element))
      break;
    await page.keyboard.press("Tab");
  }
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
}
async function holdKeys(
  page: Page,
  keys: string[],
  assertion: () => Promise<void>,
) {
  for (const key of keys) await page.keyboard.down(key);
  try {
    await assertion();
  } finally {
    for (const key of [...keys].reverse()) await page.keyboard.up(key);
  }
}
async function brake(page: Page) {
  await holdKeys(page, ["Space"], async () => {
    await expect
      .poll(async () => Math.abs((await vehicle(page)).speed))
      .toBeLessThan(0.05);
  });
  await expect(page.locator("#exit-jeep")).toBeEnabled();
}
async function expectStoppedAcrossFrames(page: Page) {
  const report = await canvas(page).evaluate(async (element) => {
    const data = (element as HTMLCanvasElement).dataset;
    const initial = { x: Number(data.vehicleX), z: Number(data.vehicleZ) };
    let maxDistance = 0,
      maxSpeed = 0,
      maxWheelChange = 0,
      frames = 0;
    const initialWheelRoll = Number(data.wheelRoll);
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const inspect = () => {
        maxDistance = Math.max(
          maxDistance,
          Math.hypot(
            Number(data.vehicleX) - initial.x,
            Number(data.vehicleZ) - initial.z,
          ),
        );
        maxSpeed = Math.max(maxSpeed, Math.abs(Number(data.vehicleSpeed)));
        maxWheelChange = Math.max(
          maxWheelChange,
          Math.abs(
            Math.atan2(
              Math.sin(Number(data.wheelRoll) - initialWheelRoll),
              Math.cos(Number(data.wheelRoll) - initialWheelRoll),
            ),
          ),
        );
        if (++frames >= 3 && performance.now() - start >= 750) resolve();
        else requestAnimationFrame(inspect);
      };
      requestAnimationFrame(inspect);
    });
    return { maxDistance, maxSpeed, maxWheelChange };
  });
  expect(
    report.maxDistance,
    "Paused/released vehicle should remain stopped across rendered frames",
  ).toBeLessThan(0.05);
  expect(report.maxSpeed).toBeLessThan(0.05);
  expect(report.maxWheelChange).toBeLessThan(0.01);
}
async function accelerate(page: Page, minimumDistance = 1) {
  const before = await vehicle(page);
  await holdKeys(page, ["w"], async () => {
    await expect
      .poll(async () => distance(before, await vehicle(page)), {
        timeout: 10000,
      })
      .toBeGreaterThan(minimumDistance);
    await expect
      .poll(async () => (await vehicle(page)).speed)
      .toBeGreaterThan(0.5);
  });
}

test("keyboard entry starts the story and supports driving, steering, reversing, braking and walking", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openSafari(page);
  await expect(canvas(page)).toHaveAttribute("data-jeep-state", "loaded", {
    timeout: 30000,
  });
  await keyboardActivate(page, page.locator("#enter-jeep"));
  await expect(canvas(page)).toHaveAttribute("data-travel-mode", "driving");
  await expect(page.locator("#drive-controls")).toBeVisible();
  await expect(page.locator("#begin-safari")).not.toBeVisible();
  const start = await vehicle(page);
  await holdKeys(page, ["w", "d"], async () => {
    await expect
      .poll(async () => distance(start, await vehicle(page)), {
        timeout: 10000,
      })
      .toBeGreaterThan(1);
    await expect
      .poll(async () => turn(start.heading, (await vehicle(page)).heading))
      .toBeGreaterThan(0.12);
    await expect
      .poll(async () => turn(start.wheelRoll, (await vehicle(page)).wheelRoll))
      .toBeGreaterThan(0.5);
    await expect
      .poll(async () => (await vehicle(page)).wheelSteer)
      .toBeLessThan(-0.1);
    await expect(page.locator("#exit-jeep")).toBeDisabled();
  });
  await brake(page);
  const beforeReverse = await vehicle(page);
  await holdKeys(page, ["s"], async () => {
    await expect
      .poll(async () => (await vehicle(page)).speed)
      .toBeLessThan(-0.5);
    await expect
      .poll(async () => {
        const now = await vehicle(page);
        return (
          (now.x - beforeReverse.x) * Math.cos(beforeReverse.heading) -
          (now.z - beforeReverse.z) * Math.sin(beforeReverse.heading)
        );
      })
      .toBeLessThan(-0.5);
  });
  await brake(page);
  await page.screenshot({ path: info.outputPath("jeep-driving-desktop.png") });
  await keyboardActivate(page, page.locator("#exit-jeep"));
  await expect(canvas(page)).toHaveAttribute("data-travel-mode", "walking");
  const onFoot = await vehicle(page);
  await holdKeys(page, ["s"], async () => {
    await expect
      .poll(async () => {
        const now = await vehicle(page);
        return Math.hypot(
          now.explorerX - onFoot.explorerX,
          now.explorerZ - onFoot.explorerZ,
        );
      })
      .toBeGreaterThan(0.5);
  });
  expect(distance(onFoot, await vehicle(page))).toBeLessThan(0.05);
  await expect(page.locator("#clue-count")).toHaveText("0/32");
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.reload();
  await expect(page.locator("#guide-animal")).toBeVisible();
  expect(errors).toEqual([]);
});

test("modal and blur pauses stop the jeep and clear held controls", async ({
  page,
}) => {
  await openSafari(page);
  await page.keyboard.press("e");
  await expect(canvas(page)).toHaveAttribute("data-travel-mode", "driving");
  await page.keyboard.down("w");
  try {
    await expect
      .poll(async () => (await vehicle(page)).speed)
      .toBeGreaterThan(1);
    await page.locator("#settings-button").click();
    await expect(page.locator("#settings-dialog")).toBeVisible();
    await expect
      .poll(async () => Math.abs((await vehicle(page)).speed))
      .toBeLessThan(0.05);
    await expectStoppedAcrossFrames(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("#settings-dialog")).not.toBeVisible();
    // A physical key held through the dialog emits repeated keydowns on return.
    await page.keyboard.down("w");
    await expectStoppedAcrossFrames(page);
  } finally {
    await page.keyboard.up("w");
  }
  await page.keyboard.down("w");
  try {
    await expect
      .poll(async () => (await vehicle(page)).speed)
      .toBeGreaterThan(1);
    // Exercise the actual browser blur handler; vehicle motion remains real Three.js state.
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect
      .poll(async () => Math.abs((await vehicle(page)).speed))
      .toBeLessThan(0.05);
    await page.keyboard.down("w");
    await expectStoppedAcrossFrames(page);
  } finally {
    await page.keyboard.up("w");
  }
  await page.keyboard.press("e");
  await expect(canvas(page)).toHaveAttribute("data-travel-mode", "walking");
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.reload();
  await expect(page.locator("#guide-animal")).toBeVisible();
});

test("a missing jeep GLB keeps the procedural roof-rack jeep drivable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/models/safari-jeep.glb", (route) => route.abort());
  await openSafari(page);
  await expect(canvas(page)).toHaveAttribute("data-jeep-state", "fallback");
  await page.locator("#enter-jeep").click();
  await expect(canvas(page)).toHaveAttribute("data-travel-mode", "driving");
  const start = await vehicle(page);
  await accelerate(page);
  expect(
    turn(start.wheelRoll, (await vehicle(page)).wheelRoll),
  ).toBeGreaterThan(0.5);
  await brake(page);
  await page.locator("#exit-jeep").click();
  await expect(canvas(page)).toHaveAttribute("data-travel-mode", "walking");
  expect(errors).toEqual([]);
});

test("choosing the next driving destination preserves the parked jeep and saved photograph", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSafari(page);
  await expect(canvas(page)).toHaveAttribute("data-animal-state", "loaded", {
    timeout: 30000,
  });
  await identifyNearbyAnimal(page);
  await page.locator('[data-answer="grass"]').click();
  await page.locator("#learn-clue").click();
  await expect(page.locator("#take-photo")).toBeEnabled();
  await page.locator("#leave-photo").click();
  await expect(page.locator("#resume-photo")).toBeVisible();
  await expect(page.locator("#enter-jeep")).toBeEnabled();
  await expect(page.locator("#clue-count")).toHaveText("0/32");
  await page.locator("#resume-photo").click();
  await expect(page.locator("#take-photo")).toBeEnabled();
  await page.locator("#take-photo").click();
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  const photo = await page.locator(".photo-thumb").getAttribute("src");
  const parked = await vehicle(page);
  await page.locator("#drive-next-stop").click();
  await expect(canvas(page)).toHaveAttribute("data-travel-mode", "driving");
  await expect(canvas(page)).toHaveAttribute(
    "data-stop-id",
    "african-elephant",
  );
  expect(
    distance(parked, await vehicle(page)),
    "Selecting a driving destination must not teleport the jeep",
  ).toBeLessThan(0.05);
  const destinationName = safariStops.find(
    (stop) => stop.id === "african-elephant",
  )!.name;
  await expect(page.locator("#drive-destination")).toContainText(
    destinationName,
  );
  await accelerate(page);
  await page.locator("#route-button").click();
  await expect(page.locator(".book-page img")).toHaveAttribute("src", photo!);
  await expectStoppedAcrossFrames(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.reload();
  await expect(page.locator("#scene-chapter")).toContainText(destinationName);
  await expect(page.locator("#clue-count")).toHaveText("1/32");
  await page.locator("#route-button").click();
  await expect(page.locator(".book-page img")).toHaveAttribute("src", photo!);
});

test("driving to a revisited unfinished stop keeps controls active and resumes its saved clue on exit", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSafari(page);
  await expect(canvas(page)).toHaveAttribute("data-animal-state", "loaded", {
    timeout: 30000,
  });
  await identifyNearbyAnimal(page);
  await page.locator('[data-answer="grass"]').click();
  await page.locator("#learn-clue").click();
  await page.locator("#take-photo").click();
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.locator("#next-stop").click();
  await expect(canvas(page)).toHaveAttribute("data-animal-state", "loaded", {
    timeout: 30000,
  });
  await identifyNearbyAnimal(page);
  const elephant = safariStops.find((stop) => stop.id === "african-elephant")!;
  await page.locator(`[data-answer="${elephant.question.correctId}"]`).click();
  await expect(page.locator("#learn-clue")).toBeVisible();

  async function revisitThenDrive() {
    await expect(page.locator("#save-status")).toHaveText(
      "Story saved on this device",
    );
    await page.locator("#route-button").click();
    await page.locator('#route-list [data-visit="plains-zebra"]').click();
    await page.locator("#drive-next-stop").click();
    await expect(canvas(page)).toHaveAttribute("data-travel-mode", "driving");
    await expect(page.locator("#drive-controls")).toBeVisible();
    await expect(page.locator("#exit-jeep")).toBeVisible();
    await expect(page.locator("#story-panel")).not.toBeVisible();
    await accelerate(page);
    await brake(page);
    await page.locator("#exit-jeep").click();
    await expect(canvas(page)).toHaveAttribute("data-travel-mode", "walking");
  }

  // A saved answer must not pause the driving world as if its quiz were open.
  await revisitThenDrive();
  await expect(page.locator("#story-panel")).toContainText(
    elephant.question.explanation,
  );
  await expect(page.locator("#learn-clue")).toBeVisible();
  await page.locator("#learn-clue").click();
  await expect(page.locator("#take-photo")).toBeVisible();
  // A learned, unphotographed clue must not put the driving UI in camera mode.
  await revisitThenDrive();
  await expect(page.locator("#take-photo")).toBeVisible();
  await expect(page.locator("#learn-clue")).not.toBeVisible();
  await page.locator("#frame-animal").click();
  await expect(page.locator("#take-photo")).toBeEnabled();
  await page.locator("#take-photo").click();
  await expect(page.locator("#clue-count")).toHaveText("2/32");
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.reload();
  await expect(page.locator("#clue-count")).toHaveText("2/32");
});

async function touchPoint(locator: Locator, id: number) {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  return {
    id,
    x: bounds!.x + bounds!.width / 2,
    y: bounds!.y + bounds!.height / 2,
  };
}
async function touchEnd(touch: CDPSession) {
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}
async function expectPhoneControls(page: Page) {
  const report = await page.evaluate(() => {
    const controls = [
      ...document.querySelectorAll<HTMLElement>(
        "#drive-controls button, #brake-jeep, #exit-jeep",
      ),
    ]
      .filter((element) => element.getClientRects().length)
      .map((element) => {
        const r = element.getBoundingClientRect();
        return {
          name: element.getAttribute("aria-label") || element.textContent,
          x: r.x,
          y: r.y,
          right: r.right,
          bottom: r.bottom,
          height: r.height,
          width: r.width,
          font: parseFloat(getComputedStyle(element).fontSize),
        };
      });
    const tinyText = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter(
        (element) =>
          element.getClientRects().length &&
          getComputedStyle(element).visibility !== "hidden" &&
          [...element.childNodes].some(
            (node) =>
              node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
          ) &&
          parseFloat(getComputedStyle(element).fontSize) < 12,
      )
      .map((element) => element.textContent?.slice(0, 60));
    return {
      controls,
      tinyText,
      width: innerWidth,
      height: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  expect(report.controls.length).toBeGreaterThanOrEqual(6);
  expect(report.tinyText).toEqual([]);
  expect(report.overflow).toBe(false);
  for (const control of report.controls) {
    expect(control.font, `${control.name} text size`).toBeGreaterThanOrEqual(
      16,
    );
    expect(
      control.height,
      `${control.name} touch height`,
    ).toBeGreaterThanOrEqual(44);
    expect(control.width, `${control.name} touch width`).toBeGreaterThanOrEqual(
      44,
    );
    expect(control.x, `${control.name} left`).toBeGreaterThanOrEqual(0);
    expect(control.y, `${control.name} top`).toBeGreaterThanOrEqual(0);
    expect(control.right, `${control.name} right`).toBeLessThanOrEqual(
      report.width + 1,
    );
    expect(control.bottom, `${control.name} bottom`).toBeLessThanOrEqual(
      report.height + 1,
    );
  }
}

test.describe("phone driving", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("held touch pedals steer, release, reverse and brake with reachable portrait and landscape controls", async ({
    page,
  }, info) => {
    await openSafari(page);
    await expect(canvas(page)).toHaveAttribute("data-jeep-state", "loaded", {
      timeout: 30000,
    });
    await page.locator("#enter-jeep").tap();
    await expect(canvas(page)).toHaveAttribute("data-travel-mode", "driving");
    await expectPhoneControls(page);
    // Model-ready can precede the first render after the driving layout resizes.
    await expectStoppedAcrossFrames(page);
    await page.screenshot({
      path: info.outputPath("jeep-driving-phone-portrait.png"),
    });
    const touch = await page.context().newCDPSession(page);
    const forward = await touchPoint(page.locator('[data-drive="forward"]'), 1);
    const right = await touchPoint(page.locator('[data-drive="right"]'), 2);
    const origin = await vehicle(page);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [forward],
    });
    try {
      await expect
        .poll(async () => distance(origin, await vehicle(page)), {
          timeout: 10000,
        })
        .toBeGreaterThan(0.75);
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [forward, right],
      });
      await expect
        .poll(async () => turn(origin.heading, (await vehicle(page)).heading))
        .toBeGreaterThan(0.12);
    } finally {
      await touchEnd(touch);
    }
    await expect
      .poll(async () => Math.abs((await vehicle(page)).speed), {
        timeout: 10000,
      })
      .toBeLessThan(0.05);
    await expectStoppedAcrossFrames(page);
    // This real steering path can enter a neighbor's range. Continue exploring
    // after the new automatic encounter pause before testing the remaining pedals.
    if (await page.locator("#encounter-dialog").isVisible()) {
      await page.locator("#encounter-later").tap();
      await expect(page.locator("#encounter-dialog")).not.toBeVisible();
      await expect(canvas(page)).toHaveAttribute("data-travel-mode", "driving");
      await expectStoppedAcrossFrames(page);
    }
    await page.setViewportSize({ width: 667, height: 375 });
    await expectPhoneControls(page);
    await expectStoppedAcrossFrames(page);
    await page.screenshot({
      path: info.outputPath("jeep-driving-phone-landscape.png"),
    });
    const reverse = await touchPoint(
      page.locator('[data-drive="backward"]'),
      3,
    );
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [reverse],
    });
    try {
      await expect
        .poll(async () => (await vehicle(page)).speed)
        .toBeLessThan(-0.5);
    } finally {
      await touchEnd(touch);
    }
    const brakeButton = await touchPoint(page.locator("#brake-jeep"), 4);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [brakeButton],
    });
    try {
      await expect
        .poll(async () => Math.abs((await vehicle(page)).speed))
        .toBeLessThan(0.05);
    } finally {
      await touchEnd(touch);
    }
    await page.locator("#exit-jeep").tap();
    await expect(canvas(page)).toHaveAttribute("data-travel-mode", "walking");
    await touch.detach();
  });
});
