import { expect, test, type Locator, type Page } from "@playwright/test";
import { zebra } from "../../src/content/species";
import { saveFieldNotes, startNaming } from "./observation-helpers";

async function loadedCharacter(
  canvas: Locator,
  mode: "welcome" | "explore" | "photo",
) {
  await expect(canvas).toHaveAttribute("data-player-model-state", "loaded", {
    timeout: 30000,
  });
  await expect
    .poll(
      async () =>
        (await canvas.getAttribute("data-companion-model-state")) ??
        (await canvas.getAttribute("data-companion-state")),
      { timeout: 30000 },
    )
    .toBe("loaded");
  await expect(canvas).toHaveAttribute("data-character-count", "2");
  await expect(canvas).toHaveAttribute("data-character-mode", mode);
}

async function position(canvas: Locator) {
  return canvas.evaluate((element) => {
    const data = (element as HTMLCanvasElement).dataset;
    if (
      data.explorerX === undefined ||
      data.explorerZ === undefined ||
      data.companionX === undefined ||
      data.companionZ === undefined
    )
      throw new Error(
        "Character checks require actual world position diagnostics.",
      );
    const point = {
      x: Number(data.explorerX),
      z: Number(data.explorerZ),
      coraX: Number(data.companionX),
      coraZ: Number(data.companionZ),
    };
    if (!Object.values(point).every(Number.isFinite))
      throw new Error("Character world positions must be finite.");
    return point;
  });
}

async function pairVisible(canvas: Locator) {
  await expect(canvas).toHaveAttribute("data-companion-visible", "true");
  await expect
    .poll(async () => {
      const p = await position(canvas);
      return Math.hypot(p.x - p.coraX, p.z - p.coraZ);
    })
    .toBeLessThan(2.8);
  const p = await position(canvas);
  expect(Math.hypot(p.x - p.coraX, p.z - p.coraZ)).toBeGreaterThanOrEqual(0.89);
}

async function pairStill(canvas: Locator) {
  const before = await position(canvas);
  await renderedFrames(canvas);
  const after = await position(canvas);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.05);
  expect(
    Math.hypot(after.coraX - before.coraX, after.coraZ - before.coraZ),
  ).toBeLessThan(0.05);
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

async function move(
  page: Page,
  canvas: Locator,
  key = "s",
  withCompanion = true,
) {
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
  if (withCompanion) {
    await expect
      .poll(
        async () => {
          const after = await position(canvas);
          return Math.hypot(
            after.coraX - before.coraX,
            after.coraZ - before.coraZ,
          );
        },
        { timeout: 8000 },
      )
      .toBeGreaterThan(0.5);
    await pairVisible(canvas);
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
    expect(
      Math.hypot(after.coraX - before.coraX, after.coraZ - before.coraZ),
    ).toBeLessThan(0.001);
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

async function framedWelcome(page: Page, canvas: Locator) {
  await expect(canvas).toHaveAttribute("data-sophia-screen-bounds", /left/);
  await expect(canvas).toHaveAttribute("data-cora-screen-bounds", /left/);
  const geometry = await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const copy = document.querySelector(".welcome")!.getBoundingClientRect();
    const fields = ["left", "top", "right", "bottom"] as const;
    const plainRect = (value: DOMRect) =>
      Object.fromEntries(
        fields.map((field) => [field, value[field]]),
      ) as Record<(typeof fields)[number], number>;
    return {
      canvas: plainRect(rect),
      copy: plainRect(copy),
      figures: ["sophia", "cora"].map((name) => ({
        name,
        bounds: JSON.parse(
          element.getAttribute(`data-${name}-screen-bounds`)!,
        ) as Record<(typeof fields)[number], number>,
      })),
    };
  });
  for (const { name, bounds } of geometry.figures) {
    expect(Object.values(bounds).every(Number.isFinite)).toBe(true);
    expect(
      bounds.right - bounds.left,
      `${name} must have a rendered width`,
    ).toBeGreaterThan(30);
    expect(
      bounds.bottom - bounds.top,
      `${name} must remain recognisable`,
    ).toBeGreaterThan(100);
    expect(
      bounds.left,
      `${name} leaves the left scene edge`,
    ).toBeGreaterThanOrEqual(geometry.canvas.left - 1);
    expect(
      bounds.right,
      `${name} leaves the right scene edge`,
    ).toBeLessThanOrEqual(geometry.canvas.right + 1);
    expect(
      bounds.top,
      `${name} leaves the top scene edge`,
    ).toBeGreaterThanOrEqual(geometry.canvas.top - 1);
    expect(
      bounds.bottom,
      `${name} leaves the bottom scene edge`,
    ).toBeLessThanOrEqual(geometry.canvas.bottom + 1);
    const overlapsCopy =
      bounds.left < geometry.copy.right &&
      bounds.right > geometry.copy.left &&
      bounds.top < geometry.copy.bottom &&
      bounds.bottom > geometry.copy.top;
    expect(
      overlapsCopy,
      `${name}'s real projected bounds overlap welcome text`,
    ).toBe(false);
  }
  await expect(page.locator("#start-button")).toBeVisible();
}

async function observedWelcomeCycle(canvas: Locator) {
  return canvas.evaluate(async (element) => {
    const canvas = element as HTMLCanvasElement;
    const phases = { sophia: [] as string[], cora: [] as string[] };
    const start = performance.now();
    const origin = {
      x: Number(canvas.dataset.explorerX),
      z: Number(canvas.dataset.explorerZ),
      coraX: Number(canvas.dataset.companionX),
      coraZ: Number(canvas.dataset.companionZ),
    };
    let staggered = false;
    let maximumTravel = 0;
    return new Promise<{
      phases: typeof phases;
      staggered: boolean;
      maximumTravel: number;
    }>((resolve) => {
      const sample = () => {
        const current = {
          sophia: canvas.dataset.sophiaWelcomePhase ?? "missing",
          cora: canvas.dataset.coraWelcomePhase ?? "missing",
        };
        for (const name of ["sophia", "cora"] as const) {
          if (phases[name].at(-1) !== current[name])
            phases[name].push(current[name]);
        }
        staggered ||= current.sophia !== current.cora;
        maximumTravel = Math.max(
          maximumTravel,
          Math.hypot(
            Number(canvas.dataset.explorerX) - origin.x,
            Number(canvas.dataset.explorerZ) - origin.z,
          ),
          Math.hypot(
            Number(canvas.dataset.companionX) - origin.coraX,
            Number(canvas.dataset.companionZ) - origin.coraZ,
          ),
        );
        if (
          (phases.sophia.length >= 3 && phases.cora.length >= 3 && staggered) ||
          performance.now() - start >= 25000
        ) {
          resolve({ phases, staggered, maximumTravel });
          return;
        }
        setTimeout(sample, 50);
      };
      sample();
    });
  });
}

test("the centered welcome pair repeats staggered standing and waving across desktop sizes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 2048, height: 1169 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./?characterBounds=1");
  const canvas = page.locator("#world canvas");
  await loadedCharacter(canvas, "welcome");
  await pairVisible(canvas);
  await renderedFrames(canvas);
  await expect(canvas).toHaveAttribute(
    "data-sophia-welcome-phase",
    /^(standing|waving)$/,
  );
  await expect(canvas).toHaveAttribute(
    "data-cora-welcome-phase",
    /^(standing|waving)$/,
  );
  const cycle = await observedWelcomeCycle(canvas);
  for (const phases of Object.values(cycle.phases)) {
    expect(phases.length).toBeGreaterThanOrEqual(3);
    expect(
      phases.every((phase) => phase === "standing" || phase === "waving"),
    ).toBe(true);
    expect(phases[0]).toBe(phases[2]);
    expect(phases[0]).not.toBe(phases[1]);
  }
  expect(cycle.staggered, "The girls should greet on different phases").toBe(
    true,
  );
  expect(
    cycle.maximumTravel,
    "Welcome animation must not move either world root",
  ).toBeLessThan(0.001);
  for (const [width, height] of [
    [2048, 1169],
    [1440, 960],
    [1280, 720],
  ] as const) {
    await page.setViewportSize({ width, height });
    await renderedFrames(canvas);
    await readableWelcome(page);
    await expect(canvas).toHaveAttribute(
      "data-sophia-welcome-phase",
      "standing",
      { timeout: 15000 },
    );
    await framedWelcome(page, canvas);
    await page.screenshot({
      path: info.outputPath(`welcome-${width}-standing.png`),
    });
    await expect(canvas).toHaveAttribute(
      "data-sophia-welcome-phase",
      "waving",
      { timeout: 15000 },
    );
    await renderedFrames(canvas);
    await framedWelcome(page, canvas);
    await welcomeDoesNotWalk(page, canvas);
    await page.screenshot({
      path: info.outputPath(`welcome-${width}-waving.png`),
    });
  }
});

test("Sophia and Cora welcome without walking, then explore, pause and leave the photograph clear", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./?characterBounds=1");
  const canvas = page.locator("#world canvas");
  await loadedCharacter(canvas, "welcome");
  await pairVisible(canvas);
  await expect(page.locator("#start-button")).toBeEnabled();
  await welcomeDoesNotWalk(page, canvas);
  await readableWelcome(page);
  await renderedFrames(canvas);
  await framedWelcome(page, canvas);
  await page.screenshot({
    path: info.outputPath("sophia-cora-welcome-desktop.png"),
  });
  await page.locator("#start-button").click();
  await loadedCharacter(canvas, "explore");
  await pairVisible(canvas);
  await move(page, canvas);
  await page.locator("#settings-button").click();
  await page.keyboard.down("w");
  try {
    await pairStill(canvas);
  } finally {
    await page.keyboard.up("w");
  }
  await page.keyboard.press("Escape");
  await pairVisible(canvas);
  await move(page, canvas, "w");
  await renderedFrames(canvas);
  await page.screenshot({
    path: info.outputPath("sophia-cora-classic-explore.png"),
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
  await expect(canvas).toHaveAttribute("data-companion-visible", "false");
  await expect(page.locator("#shutter")).toBeEnabled({ timeout: 15000 });
  await page.screenshot({
    path: info.outputPath("classic-photo-without-companion.png"),
  });
  await page.locator("#leave-photo").click();
  await loadedCharacter(canvas, "explore");
  await pairVisible(canvas);
  await move(page, canvas);
  expect(errors).toEqual([]);
});

test.describe("phone welcome pair", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("reduced-motion pair stays stationary with reachable phone, tablet and short landscape actions", async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./?characterBounds=1");
    const canvas = page.locator("#world canvas");
    await loadedCharacter(canvas, "welcome");
    await pairVisible(canvas);
    await expect(page.locator("html")).toHaveClass(/reduce-motion/);
    await expect(canvas).toHaveAttribute("data-sophia-welcome-phase", "still");
    await expect(canvas).toHaveAttribute("data-cora-welcome-phase", "still");
    for (const [name, width, height] of [
      ["portrait", 390, 844],
      ["portrait-tablet", 820, 1180],
      ["landscape", 667, 375],
    ] as const) {
      await page.setViewportSize({ width, height });
      await renderedFrames(canvas);
      await welcomeDoesNotWalk(page, canvas);
      await readableWelcome(page);
      await renderedFrames(canvas);
      await framedWelcome(page, canvas);
      await expect(canvas).toHaveAttribute(
        "data-sophia-welcome-phase",
        "still",
      );
      await expect(canvas).toHaveAttribute("data-cora-welcome-phase", "still");
      await page.screenshot({
        path: info.outputPath(`sophia-cora-welcome-${name}.png`),
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
    await pairVisible(canvas);
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
    await expect
      .poll(
        async () => {
          const after = await position(canvas);
          return Math.hypot(
            after.coraX - before.coraX,
            after.coraZ - before.coraZ,
          );
        },
        { timeout: 8000 },
      )
      .toBeGreaterThan(0.5);
    await pairVisible(canvas);
    await renderedFrames(canvas);
    await page.screenshot({
      path: info.outputPath("sophia-cora-phone-explore.png"),
    });
  });
});

test("the safari pair walks together, pauses, rides the jeep and stays out of the photo", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("./?characterBounds=1");
  await loadedCharacter(page.locator("#world canvas"), "welcome");
  await page.locator(".safari-entry").click();
  await expect(page).toHaveURL(/\/safari\.html$/);
  const canvas = page.locator("#safari-world canvas");
  await loadedCharacter(canvas, "explore");
  await page.locator("#begin-safari").click();
  if (await page.locator("#skip-arrival").isVisible())
    await page.locator("#skip-arrival").click();
  await pairVisible(canvas);
  await move(page, canvas);
  await page.locator("#settings-button").click();
  const before = await position(canvas);
  await page.keyboard.down("w");
  try {
    await renderedFrames(canvas);
    const after = await position(canvas);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(
      0.05,
    );
    expect(
      Math.hypot(after.coraX - before.coraX, after.coraZ - before.coraZ),
    ).toBeLessThan(0.05);
  } finally {
    await page.keyboard.up("w");
  }
  await page.keyboard.press("Escape");
  await pairVisible(canvas);
  await move(page, canvas, "w");
  await renderedFrames(canvas);
  await page.screenshot({
    path: info.outputPath("sophia-cora-safari-explore.png"),
  });
  if (await page.locator("#return-jeep").isVisible())
    await page.locator("#return-jeep").click();
  await page.locator("#enter-jeep").click();
  await expect(canvas).toHaveAttribute("data-travel-mode", "driving");
  await expect(canvas).toHaveAttribute("data-companion-visible", "false");
  await move(page, canvas, "w", false);
  await page.keyboard.down("Space");
  try {
    await expect
      .poll(async () =>
        Math.abs(Number(await canvas.getAttribute("data-vehicle-speed"))),
      )
      .toBeLessThan(0.05);
  } finally {
    await page.keyboard.up("Space");
  }
  await expect(canvas).toHaveAttribute("data-companion-visible", "false");
  await expect(page.locator("#exit-jeep")).toBeEnabled();
  await page.locator("#exit-jeep").click();
  await expect(canvas).toHaveAttribute("data-travel-mode", "walking");
  await loadedCharacter(canvas, "explore");
  await pairVisible(canvas);
  await move(page, canvas, "s");
  await page.locator("#guide-animal").click();
  await expect(page.locator("#encounter-dialog")).toBeVisible({
    timeout: 20000,
  });
  await startNaming(page);
  await page.locator("#skip-animal").click();
  await saveFieldNotes(page);
  await page.locator('[data-answer="grass"]').click();
  await page.locator("#learn-clue").click();
  await loadedCharacter(canvas, "photo");
  await expect(canvas).toHaveAttribute("data-companion-visible", "false");
  await expect(page.locator("#take-photo")).toBeEnabled({ timeout: 15000 });
  await page.screenshot({
    path: info.outputPath("safari-photo-without-companion.png"),
  });
  await page.locator("#leave-photo").click();
  await loadedCharacter(canvas, "explore");
  await pairVisible(canvas);
});

test("an unavailable Cora model remains hidden while Sophia can still explore", async ({
  page,
}) => {
  await page.route("**/models/cora.glb", (route) => route.abort());
  for (const safari of [false, true]) {
    await page.goto(safari ? "./safari.html" : "./?characterBounds=1");
    const canvas = page.locator(
      safari ? "#safari-world canvas" : "#world canvas",
    );
    await expect(canvas).toHaveAttribute("data-player-model-state", "loaded", {
      timeout: 30000,
    });
    await expect
      .poll(
        async () =>
          (await canvas.getAttribute("data-companion-model-state")) ??
          (await canvas.getAttribute("data-companion-state")),
        { timeout: 30000 },
      )
      .toBe("fallback");
    await expect(canvas).toHaveAttribute("data-companion-visible", "false");
    await page.locator(safari ? "#begin-safari" : "#start-button").click();
    if (safari && (await page.locator("#skip-arrival").isVisible()))
      await page.locator("#skip-arrival").click();
    await move(page, canvas, "s", false);
    await expect(canvas).toHaveAttribute("data-companion-visible", "false");
  }
});
