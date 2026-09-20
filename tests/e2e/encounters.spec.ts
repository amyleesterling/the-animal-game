import { expect, test, type Page } from "@playwright/test";
import { safariStops } from "../../src/content/safari";

const world = (page: Page) => page.locator("#safari-world canvas");
const encounter = (page: Page) => page.locator("#encounter-dialog");
async function position(page: Page) {
  return world(page).evaluate((element) => {
    const d = (element as HTMLCanvasElement).dataset;
    const value = {
      x: Number(d.explorerX),
      z: Number(d.explorerZ),
      vehicleX: Number(d.vehicleX),
      vehicleZ: Number(d.vehicleZ),
      heading: Number(d.vehicleHeading),
      speed: Number(d.vehicleSpeed),
    };
    if (!Object.values(value).every(Number.isFinite))
      throw new Error("Encounter checks need finite scene diagnostics.");
    return value;
  });
}
async function begin(page: Page) {
  await page.goto("./safari.html");
  await page.locator("#begin-safari").click();
  await expect(world(page)).toHaveAttribute("data-animal-state", "loaded", {
    timeout: 30000,
  });
}
async function walkUntil(
  page: Page,
  key: string,
  predicate: (point: Awaited<ReturnType<typeof position>>) => boolean,
  timeout = 15000,
) {
  await page.keyboard.down(key);
  try {
    await expect
      .poll(async () => predicate(await position(page)), { timeout })
      .toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
}
async function assertStill(page: Page) {
  const start = await position(page);
  await world(page).evaluate(async () => {
    const started = performance.now();
    let frames = 0;
    await new Promise<void>((resolve) => {
      const frame = () => {
        if (++frames >= 3 && performance.now() - started > 500) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  });
  const end = await position(page);
  expect(Math.hypot(start.x - end.x, start.z - end.z)).toBeLessThan(0.05);
  expect(
    Math.hypot(start.vehicleX - end.vehicleX, start.vehicleZ - end.vehicleZ),
  ).toBeLessThan(0.05);
  expect(Math.abs(end.speed)).toBeLessThan(0.05);
}
async function finishAnimal(page: Page, id: string) {
  const animal = safariStops.find((stop) => stop.id === id)!;
  await page.locator(`[data-answer="${animal.question.correctId}"]`).click();
  await page.locator("#learn-clue").click();
  await expect(page.locator("#take-photo")).toBeEnabled({ timeout: 15000 });
  await page.locator("#take-photo").click();
  await expect(page.locator(".photo-thumb")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
}

test("walking off route finds the elephant, retries its name and saves its first photograph", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await begin(page);
  await expect(world(page)).toHaveAttribute("data-stop-id", "plains-zebra");
  // Walk east around the zebra, then north into the elephant's actual clearing.
  await walkUntil(page, "d", (p) => p.x >= 40);
  await expect(world(page)).toHaveAttribute("data-stop-id", "plains-zebra");
  await page.keyboard.down("w");
  try {
    await expect(encounter(page)).toHaveAttribute(
      "data-animal-id",
      "african-elephant",
      { timeout: 20000 },
    );
    await expect(encounter(page)).toBeVisible();
  } finally {
    await page.keyboard.up("w");
  }
  await expect(world(page)).toHaveAttribute(
    "data-nearest-animal-id",
    "african-elephant",
  );
  const reached = await position(page);
  expect(Math.hypot(reached.x - 44, reached.z + 24)).toBeLessThanOrEqual(10.6);
  await expect(page.locator("#animal-name")).toBeFocused();
  await page.locator("#animal-name").pressSequentially("wasd", { delay: 80 });
  await assertStill(page);
  await page.locator("#confirm-animal").click();
  await expect(page.locator("#name-feedback")).not.toBeEmpty();
  await expect(encounter(page)).toBeVisible();
  await expect(page.locator("[data-answer]")).toHaveCount(0);
  await page.locator("#animal-name").fill("Elephant");
  await page.locator("#confirm-animal").click();
  await expect(encounter(page)).not.toBeVisible();
  await expect(page.locator("#identified-name")).toContainText(
    "African savanna elephant",
  );
  const identified = await position(page);
  expect(
    Math.hypot(reached.x - identified.x, reached.z - identified.z),
  ).toBeLessThan(0.05);
  await page.screenshot({
    path: info.outputPath("elephant-off-route-question.png"),
  });
  await finishAnimal(page, "african-elephant");
  await expect(page.locator("#clue-count")).toHaveText("1/7");
  const photo = await page.locator(".photo-thumb").getAttribute("src");
  await page.reload();
  await expect(page.locator("#scene-chapter")).toContainText(
    "African savanna elephant",
  );
  await expect(page.locator("#clue-count")).toHaveText("1/7");
  await expect(page.locator(".photo-thumb")).toHaveAttribute("src", photo!);
  await page.locator("#route-button").click();
  await expect(page.locator(".book-page img")).toHaveCount(1);
  await expect(page.locator('[data-visit="african-elephant"]')).toBeEnabled();
});

/** Real keyboard steering toward a scene coordinate; never changes the world state. */
async function driveTowardElephant(page: Page) {
  let steering: "a" | "d" | null = null;
  const deadline = Date.now() + 30000;
  await page.keyboard.down("w");
  try {
    while (!(await encounter(page).isVisible()) && Date.now() < deadline) {
      const p = await position(page);
      const wanted = Math.atan2(p.vehicleZ + 24, 44 - p.vehicleX);
      const error = Math.atan2(
        Math.sin(wanted - p.heading),
        Math.cos(wanted - p.heading),
      );
      const next = error > 0.09 ? "a" : error < -0.09 ? "d" : null;
      if (next !== steering) {
        if (steering) await page.keyboard.up(steering);
        steering = next;
        if (steering) await page.keyboard.down(steering);
      }
      await page.waitForTimeout(120);
    }
  } finally {
    if (steering) await page.keyboard.up(steering);
    await page.keyboard.up("w");
  }
}

test("driving off route stops at the elephant and skip safely exits into its quiz", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("./safari.html");
  await page.locator("#enter-jeep").click();
  await expect(world(page)).toHaveAttribute("data-travel-mode", "driving");
  await expect(world(page)).toHaveAttribute("data-stop-id", "plains-zebra");
  await driveTowardElephant(page);
  await expect(encounter(page)).toBeVisible();
  await expect(encounter(page)).toHaveAttribute(
    "data-animal-id",
    "african-elephant",
  );
  await expect(world(page)).toHaveAttribute("data-travel-mode", "driving");
  const stopped = await position(page);
  expect(
    Math.hypot(stopped.vehicleX - 44, stopped.vehicleZ + 24),
  ).toBeLessThanOrEqual(10.6);
  await page.locator("#animal-name").pressSequentially("wasd", { delay: 80 });
  await assertStill(page);
  await page.locator("#skip-animal").click();
  await expect(encounter(page)).not.toBeVisible();
  await expect(world(page)).toHaveAttribute("data-travel-mode", "walking");
  await expect(page.locator("#identified-name")).toContainText(
    "African savanna elephant",
  );
  await expect(page.locator("[data-answer]")).toHaveCount(3);
  const after = await position(page);
  expect(
    Math.hypot(
      stopped.vehicleX - after.vehicleX,
      stopped.vehicleZ - after.vehicleZ,
    ),
  ).toBeLessThan(0.05);
  expect(
    Math.hypot(after.x - after.vehicleX, after.z - after.vehicleZ),
  ).toBeLessThan(4);
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.reload();
  await expect(page.locator("#identified-name")).toContainText(
    "African savanna elephant",
  );
  await expect(encounter(page)).not.toBeVisible();
});

test("dismissal stays quiet until leaving the animal and a photographed zebra does not interrupt driving", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await begin(page);
  await page.locator("#guide-animal").click();
  await expect(encounter(page)).toHaveAttribute(
    "data-animal-id",
    "plains-zebra",
  );
  await page.locator("#encounter-later").click();
  await expect(encounter(page)).not.toBeVisible();
  await assertStill(page);
  await page.locator("#nearby-encounter").click();
  await expect(encounter(page)).toBeVisible();
  await expect(encounter(page)).toHaveAttribute(
    "data-animal-id",
    "plains-zebra",
  );
  await expect(page.locator("#animal-name")).toBeFocused();
  await page.locator("#encounter-later").click();
  await expect(encounter(page)).not.toBeVisible();
  await walkUntil(page, "s", (p) => p.z > 16);
  await page.locator("#guide-animal").click();
  await expect(encounter(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(encounter(page)).not.toBeVisible();
  await assertStill(page);
  await walkUntil(page, "s", (p) => p.z > 16);
  await page.locator("#guide-animal").click();
  await expect(encounter(page)).toBeVisible();
  await page.locator("#skip-animal").click();
  await expect(page.locator("#identified-name")).toContainText("Plains zebra");
  await page.locator('[data-answer="grass"]').click();
  await page.locator("#learn-clue").click();
  await expect(page.locator("#take-photo")).toBeEnabled();
  await page.locator("#leave-photo").click();
  await walkUntil(page, "s", (p) => p.z > 16);
  await page.locator("#guide-animal").click();
  await expect(encounter(page)).toBeVisible();
  await expect(page.locator("#animal-name")).not.toBeVisible();
  await expect(page.locator("#skip-animal")).not.toBeVisible();
  await expect(page.locator("#confirm-animal")).toHaveText(
    "Continue discovery",
  );
  await page.locator("#confirm-animal").click();
  await expect(encounter(page)).not.toBeVisible();
  await expect(page.locator("#take-photo")).toBeEnabled();
  await page.locator("#take-photo").click();
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.locator("#drive-next-stop").click();
  await expect(world(page)).toHaveAttribute("data-travel-mode", "driving");
  await page.locator("#exit-jeep").click();
  // The new destination is elephant, but Soph walks back into the completed zebra's range.
  // Leaving the jeep keeps its camera heading: Back moves west and Left moves north.
  await walkUntil(page, "s", (p) => p.x < 1);
  await walkUntil(page, "a", (p) => Math.hypot(p.x, p.z) < 10);
  await expect(world(page)).toHaveAttribute(
    "data-nearest-animal-id",
    "plains-zebra",
  );
  await assertStill(page);
  await expect(encounter(page)).not.toBeVisible();
  await expect(page.locator("#clue-count")).toHaveText("1/7");
});

test.describe("phone animal naming", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("portrait and landscape keep the focused name and all actions reachable", async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await begin(page);
    await page.locator("#guide-animal").tap();
    await expect(encounter(page)).toBeVisible();
    await expect(page.locator("#animal-name")).toBeFocused();
    await expect(page.locator("#animal-name")).toHaveAttribute(
      "maxlength",
      "60",
    );
    for (const [name, width, height] of [
      ["portrait", 390, 844],
      ["landscape", 667, 375],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.locator("#animal-name").tap();
      const report = await encounter(page).evaluate((dialog) => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        text: [...dialog.querySelectorAll<HTMLElement>("*")]
          .filter((e) => e.getClientRects().length && e.textContent?.trim())
          .map((e) => parseFloat(getComputedStyle(e).fontSize)),
        controls: [...dialog.querySelectorAll<HTMLElement>("input, button")]
          .filter((e) => e.getClientRects().length)
          .map((e) => ({
            id: e.id,
            font: parseFloat(getComputedStyle(e).fontSize),
            height: e.getBoundingClientRect().height,
          })),
      }));
      expect(report.overflow).toBe(false);
      for (const size of report.text) expect(size).toBeGreaterThanOrEqual(12);
      for (const control of report.controls) {
        expect(control.font, control.id).toBeGreaterThanOrEqual(16);
        expect(control.height, control.id).toBeGreaterThanOrEqual(44);
      }
      // A short landscape dialog may scroll; each essential control must remain reachable.
      for (const id of [
        "animal-name",
        "confirm-animal",
        "skip-animal",
        "encounter-later",
      ]) {
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
        await expect(page.locator(`#${id}`)).toBeInViewport();
      }
      await page.locator("#animal-name").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath(`animal-name-${name}.png`),
      });
    }
    await page.locator("#animal-name").fill("zebra");
    await page.locator("#confirm-animal").tap();
    await expect(encounter(page)).not.toBeVisible();
    await expect(page.locator("[data-answer]")).toHaveCount(3);
  });
});

test("a version-one save keeps its photo, settings and pending feedback through migration", async ({
  page,
}) => {
  await page.goto("./safari.html");
  await expect(page.locator("#begin-safari")).toBeVisible();
  const photo = await page.evaluate(async (stops) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    const dataUrl = canvas.toDataURL("image/jpeg");
    const entries = Object.fromEntries(
      stops.map((stop) => [
        stop.id,
        {
          attempts: 0,
          answer: null as string | null,
          learned: false,
          photo: null as { dataUrl: string; capturedAt: string } | null,
          visits: 0,
        },
      ]),
    );
    entries["plains-zebra"] = {
      attempts: 1,
      answer: "grass",
      learned: true,
      photo: { dataUrl, capturedAt: "2026-09-20T10:00:00.000Z" },
      visits: 1,
    };
    entries["african-elephant"] = {
      attempts: 1,
      answer: "ears",
      learned: false,
      photo: null,
      visits: 1,
    };
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("sophias-wild-world-story-safari", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("journey", "readwrite");
        tx.objectStore("journey").put(
          {
            schemaVersion: 1,
            started: true,
            currentStopId: "african-elephant",
            entries,
            settings: {
              narration: false,
              volume: 0.2,
              reducedMotion: true,
              lowQuality: false,
            },
            completedAt: null,
          },
          "current",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
    return dataUrl;
  }, safariStops);
  await page.reload();
  await expect(page.locator("#retry-answer")).toBeVisible();
  await expect(page.locator("#scene-chapter")).toContainText(
    "African savanna elephant",
  );
  await expect(page.locator("#clue-count")).toHaveText("1/7");
  await page.locator("#route-button").click();
  await expect(page.locator(".book-page img")).toHaveAttribute("src", photo);
  await page.keyboard.press("Escape");
  await page.locator("#settings-button").click();
  await expect(page.locator("#narration-setting")).not.toBeChecked();
  await expect(page.locator("#volume-setting")).toHaveValue("0.2");
  await page.locator("#volume-setting").fill("0.25");
  await page.locator("#volume-setting").dispatchEvent("change");
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  const saved = await page.evaluate(
    async () =>
      new Promise<{
        schemaVersion: number;
        entries: Record<
          string,
          {
            identification: { name: string; skipped: boolean } | null;
            photo: { dataUrl: string } | null;
          }
        >;
      }>((resolve, reject) => {
        const request = indexedDB.open("sophias-wild-world-story-safari", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("journey", "readonly");
          const read = tx.objectStore("journey").get("current");
          tx.oncomplete = () => {
            db.close();
            resolve(read.result);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
  );
  expect(saved.schemaVersion).toBe(2);
  expect(saved.entries["plains-zebra"].photo!.dataUrl).toBe(photo);
  expect(saved.entries["african-elephant"].identification).toEqual({
    name: "African savanna elephant",
    skipped: true,
  });
  expect(saved.entries.giraffe.identification).toBeNull();
  await page.reload();
  await expect(page.locator("#retry-answer")).toBeVisible();
});
