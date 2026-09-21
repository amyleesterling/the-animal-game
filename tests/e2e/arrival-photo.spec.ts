import { expect, test, type Page } from "@playwright/test";
import { closePhotoBook, saveFieldNotes, startNaming } from "./observation-helpers";

const canvas = (page: Page) => page.locator("#safari-world canvas");

test("Sophia and Cora board, travel the Tarangire-inspired approach, and step out at the study trail", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./safari.html");
  await expect(canvas(page)).toHaveAttribute("data-arrival-stage", "walking");
  await expect(page.locator("#story-panel")).toContainText(
    "The real journey takes much longer",
  );
  await expect(page.locator("#story-panel a")).toHaveAttribute(
    "href",
    /tanzaniaparks\.go\.tz\/tarangire/,
  );
  const before = await canvas(page).evaluate((element) => ({
    x: Number((element as HTMLCanvasElement).dataset.vehicleX),
    z: Number((element as HTMLCanvasElement).dataset.vehicleZ),
  }));
  await page.screenshot({ path: info.outputPath("arrival-camp-desktop.png") });
  await page.locator("#begin-safari").click();
  await expect(page.locator("#skip-arrival")).toBeVisible();
  await expect(canvas(page)).toHaveAttribute("data-arrival-stage", "driving", {
    timeout: 12000,
  });
  await expect
    .poll(
      async () => Number(await canvas(page).getAttribute("data-vehicle-z")),
      { timeout: 12000 },
    )
    .toBeLessThan(before.z - 12);
  await expect(canvas(page)).toHaveAttribute("data-companion-visible", "false");
  await page.screenshot({ path: info.outputPath("arrival-road-desktop.png") });
  await expect(canvas(page)).toHaveAttribute("data-arrival-stage", "none", {
    timeout: 25000,
  });
  await expect(page.locator("#guide-animal")).toBeVisible();
  await expect
    .poll(async () => Number(await canvas(page).getAttribute("data-vehicle-z")))
    .toBeCloseTo(12.5, 1);
  await expect(canvas(page)).toHaveAttribute("data-travel-mode", "walking");
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  expect(errors).toEqual([]);
});

test("the opening can be skipped and a saved safari resumes at the trail", async ({
  page,
}) => {
  await page.goto("./safari.html");
  await page.locator("#begin-safari").click();
  await page.locator("#skip-arrival").click();
  await expect(page.locator("#guide-animal")).toBeVisible();
  await expect(canvas(page)).toHaveAttribute("data-arrival-stage", "none");
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.reload();
  await expect(page.locator("#guide-animal")).toBeVisible();
  await expect(page.locator("#begin-safari")).toHaveCount(0);
});

test("the student can compose a 4:3 photo by dragging, zooming, and using buttons", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./safari.html");
  await page.locator("#begin-safari").click();
  await expect(page.locator("#guide-animal")).toBeVisible();
  await page.locator("#guide-animal").click();
  await expect(page.locator("#encounter-dialog")).toBeVisible();
  await startNaming(page);
  await page.locator("#skip-animal").click();
  await saveFieldNotes(page);
  await page.locator('[data-answer="grass"]').click();
  await page.locator("#learn-clue").click();
  await expect(page.locator("#take-photo")).toBeEnabled({ timeout: 15000 });
  await expect
    .poll(async () => {
      const frame = await page.locator("#photo-frame").boundingBox();
      return frame?.height ? frame.width / frame.height : 0;
    })
    .toBeCloseTo(4 / 3, 1);
  const oldOrbit = Number(await canvas(page).getAttribute("data-photo-orbit"));
  const scene = await canvas(page).boundingBox();
  await page.mouse.move(
    scene!.x + scene!.width * 0.65,
    scene!.y + scene!.height * 0.55,
  );
  await page.mouse.down();
  await page.mouse.move(
    scene!.x + scene!.width * 0.55,
    scene!.y + scene!.height * 0.54,
    { steps: 5 },
  );
  await page.mouse.up();
  expect(
    Number(await canvas(page).getAttribute("data-photo-orbit")),
  ).not.toBeCloseTo(oldOrbit, 2);
  const oldZoom = Number(await canvas(page).getAttribute("data-photo-zoom"));
  await page.locator('[data-photo-adjust="zoom-in"]').click();
  expect(
    Number(await canvas(page).getAttribute("data-photo-zoom")),
  ).toBeGreaterThan(oldZoom);
  await page.screenshot({
    path: info.outputPath("student-composed-photo-phone.png"),
  });
  await page.locator("#frame-animal").click();
  await expect(page.locator("#take-photo")).toBeEnabled();
  await page.locator("#take-photo").click();
  await closePhotoBook(page);
  const first = await page.locator(".photo-thumb").getAttribute("src");
  await page.locator("#retake-photo").click();
  await page.locator('[data-photo-adjust="orbit-right"]').click();
  await expect(page.locator("#take-photo")).toBeEnabled();
  await page.locator("#take-photo").click();
  await closePhotoBook(page);
  const second = await page.locator(".photo-thumb").getAttribute("src");
  expect(second).toMatch(/^data:image\/jpeg;base64,/);
  expect(second).not.toBe(first);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  const sizes = await page
    .locator(".photo-controls button")
    .evaluateAll((buttons) =>
      buttons.map((button) => parseFloat(getComputedStyle(button).fontSize)),
    );
  expect(sizes.every((size) => size >= 16)).toBe(true);
});
