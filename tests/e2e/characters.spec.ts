import { expect, test, type Locator, type Page } from "@playwright/test";
import { zebra } from "../../src/content/species";

async function loadedCharacter(
  canvas: Locator,
  mode: "welcome" | "explore" | "photo",
) {
  await expect(canvas).toHaveAttribute("data-player-model-state", "loaded", {
    timeout: 30000,
  });
  await expect(canvas).toHaveAttribute("data-character-count", "1");
  await expect(canvas).toHaveAttribute("data-character-mode", mode);
}

async function position(canvas: Locator) {
  return canvas.evaluate((element) => {
    const data = (element as HTMLCanvasElement).dataset;
    if (data.explorerX === undefined || data.explorerZ === undefined)
      throw new Error(
        "Character checks require actual world position diagnostics.",
      );
    const point = { x: Number(data.explorerX), z: Number(data.explorerZ) };
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
      throw new Error("Character world positions must be finite.");
    return point;
  });
}

async function renderedFrames(canvas: Locator) {
  await canvas.evaluate(async () => {
    const started = performance.now();
    let frames = 0;
    await new Promise<void>((resolve) => {
      const next = () => {
        if (++frames >= 3 && performance.now() - started >= 500) resolve();
        else requestAnimationFrame(next);
      };
      requestAnimationFrame(next);
    });
  });
}

async function move(page: Page, canvas: Locator, key = "s") {
  const before = await position(canvas);
  await page.keyboard.down(key);
  try {
    await expect
      .poll(
        async () => {
          const after = await position(canvas);
          return Math.hypot(after.x - before.x, after.z - before.z);
        },
        { timeout: 8000 },
      )
      .toBeGreaterThan(1);
  } finally {
    await page.keyboard.up(key);
  }
}

async function welcomeDoesNotWalk(page: Page, canvas: Locator) {
  const before = await position(canvas);
  await page.keyboard.down("w");
  try {
    await renderedFrames(canvas);
    const after = await position(canvas);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(
      0.001,
    );
  } finally {
    await page.keyboard.up("w");
  }
  await expect(canvas).toHaveAttribute("data-character-mode", "welcome");
}

async function readableWelcome(page: Page) {
  const report = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    tiny: [...document.querySelectorAll<HTMLElement>("body *")]
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
      .map((element) => element.textContent?.slice(0, 60)),
  }));
  expect(report.overflow).toBe(false);
  expect(report.tiny).toEqual([]);
  for (const locator of [
    page.locator(".safari-entry"),
    page.locator("#start-button"),
    page.locator("#settings-button"),
  ]) {
    await locator.scrollIntoViewIfNeeded();
    await expect(locator).toBeInViewport();
    const metrics = await locator.evaluate((element) => ({
      font: parseFloat(getComputedStyle(element).fontSize),
      height: element.getBoundingClientRect().height,
    }));
    expect(metrics.font).toBeGreaterThanOrEqual(16);
    expect(metrics.height).toBeGreaterThanOrEqual(44);
    const unblocked = await locator.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      return hit === element || (hit !== null && element.contains(hit));
    });
    expect(
      unblocked,
      "The 3D scene must not intercept the welcome controls",
    ).toBe(true);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

test("Sophia welcomes without walking, then classic exploration and photo controls still work", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  const canvas = page.locator("#world canvas");
  await loadedCharacter(canvas, "welcome");
  await expect(page.locator("#start-button")).toBeEnabled();
  await welcomeDoesNotWalk(page, canvas);
  await readableWelcome(page);
  await renderedFrames(canvas);
  await page.screenshot({
    path: info.outputPath("sophia-welcome-desktop.png"),
  });
  await page.locator("#start-button").click();
  await loadedCharacter(canvas, "explore");
  await move(page, canvas);
  await renderedFrames(canvas);
  await page.screenshot({
    path: info.outputPath("sophia-classic-explore.png"),
  });
  await page.locator("#guide-button").click();
  await expect(page.locator("#meet-button")).toBeEnabled({ timeout: 15000 });
  await page.locator("#meet-button").click();
  for (const question of zebra.quizzes) {
    await page.locator(`[data-answer="${question.correctChoiceId}"]`).click();
    await page.locator("#next-question").click();
  }
  await page.locator("#guide-button").click();
  await page.locator("#camera-button").click();
  await loadedCharacter(canvas, "photo");
  await expect(page.locator("#shutter")).toBeEnabled({ timeout: 15000 });
  await page.locator("#leave-photo").click();
  await loadedCharacter(canvas, "explore");
  await move(page, canvas);
  expect(errors).toEqual([]);
});

test.describe("phone welcome character", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("reduced-motion welcome remains stationary with reachable portrait and short landscape actions", async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const canvas = page.locator("#world canvas");
    await loadedCharacter(canvas, "welcome");
    await expect(page.locator("html")).toHaveClass(/reduce-motion/);
    for (const [name, width, height] of [
      ["portrait", 390, 844],
      ["landscape", 667, 375],
    ] as const) {
      await page.setViewportSize({ width, height });
      await renderedFrames(canvas);
      await welcomeDoesNotWalk(page, canvas);
      await readableWelcome(page);
      await renderedFrames(canvas);
      await page.screenshot({
        path: info.outputPath(`sophia-welcome-${name}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#settings-button").tap();
    await expect(page.locator("#motion-toggle")).toBeChecked();
    await page.locator("#dialog [data-close]").last().tap();
    await loadedCharacter(canvas, "welcome");
    await page.locator("#start-button").tap();
    await loadedCharacter(canvas, "explore");
    const touch = await page.context().newCDPSession(page);
    const backward = page.getByRole("button", { name: "Walk backward" });
    const rect = await backward.boundingBox();
    expect(rect).not.toBeNull();
    const before = await position(canvas);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: rect!.x + rect!.width / 2, y: rect!.y + rect!.height / 2 },
      ],
    });
    try {
      await expect
        .poll(
          async () => {
            const after = await position(canvas);
            return Math.hypot(after.x - before.x, after.z - before.z);
          },
          { timeout: 8000 },
        )
        .toBeGreaterThan(1);
    } finally {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await touch.detach();
    }
    await loadedCharacter(canvas, "explore");
  });
});

test("the landing safari link keeps Sophia's walking, pause and jeep transitions functional", async ({
  page,
}, info) => {
  await page.goto("./");
  await loadedCharacter(page.locator("#world canvas"), "welcome");
  await page.locator(".safari-entry").click();
  await expect(page).toHaveURL(/\/safari\.html$/);
  const canvas = page.locator("#safari-world canvas");
  await loadedCharacter(canvas, "explore");
  await expect(canvas).toHaveAttribute("data-companion-state", "absent");
  await page.locator("#begin-safari").click();
  await move(page, canvas);
  const before = await position(canvas);
  await page.locator("#settings-button").click();
  await page.keyboard.down("w");
  try {
    await renderedFrames(canvas);
    const after = await position(canvas);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(
      0.05,
    );
  } finally {
    await page.keyboard.up("w");
  }
  await page.keyboard.press("Escape");
  await move(page, canvas, "w");
  await renderedFrames(canvas);
  await page.screenshot({ path: info.outputPath("sophia-safari-explore.png") });
  if (await page.locator("#return-jeep").isVisible())
    await page.locator("#return-jeep").click();
  await page.locator("#enter-jeep").click();
  await expect(canvas).toHaveAttribute("data-travel-mode", "driving");
  await page.locator("#exit-jeep").click();
  await expect(canvas).toHaveAttribute("data-travel-mode", "walking");
  await loadedCharacter(canvas, "explore");
  await move(page, canvas, "s");
});
