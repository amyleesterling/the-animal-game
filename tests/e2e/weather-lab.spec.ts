import { expect, test, type Page } from "@playwright/test";

/**
 * Browser evidence for the weather desk. Every assertion is something a child
 * would see: the sky goes dark, rain appears, the grass browns off in the dry
 * season. Screenshots land in docs/evidence/weather for review.
 */

const EVIDENCE = "docs/evidence/weather";

type LabState = {
  clock: { year: number; month: number; day: number; hour: number };
  season: { id: string; name: string };
  weather: string;
  stormIntensity: number;
  greenness: number;
  waterLevel: number;
  temperatureC: number;
  monthRainfallMm: number;
};

async function labState(page: Page): Promise<LabState> {
  return page.evaluate(() => window.weatherLab!.state() as unknown as LabState);
}

async function skyColor(page: Page): Promise<string> {
  return page.evaluate(() => window.weatherLab!.skyColor());
}

async function raindrops(page: Page): Promise<number> {
  return page.evaluate(() => window.weatherLab!.raindrops());
}

/** Perceived lightness of a hex colour, 0 black to 1 white. */
function luminance(hex: string): number {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function openLab(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    // Chrome asks every page for /favicon.ico whether one is linked or not.
    // The repo ships no favicon, so that 404 is the browser's housekeeping
    // rather than anything the page did wrong.
    if (message.location().url.endsWith("/favicon.ico")) return;
    errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/weather-lab.html");
  await page.waitForFunction(() => Boolean(window.weatherLab));
  // Let the first frames render so the scene is lit before anything is judged.
  await page.waitForTimeout(600);
  return errors;
}

test("the savanna starts in the long rains, green and lit", async ({
  page,
}) => {
  const errors = await openLab(page);
  const state = await labState(page);

  expect(state.season.id).toBe("long-rains");
  expect(state.clock.month).toBe(3);
  expect(state.greenness).toBeGreaterThan(0.7);
  expect(await raindrops(page)).toBe(0);

  // The scene must actually be lit: a black sky would mean the sun never moved.
  expect(luminance(await skyColor(page))).toBeGreaterThan(0.25);

  // The readout, not the season button, which carries the same words.
  await expect(page.locator(".weather-desk__season")).toHaveText("Long rains");
  await page.screenshot({ path: `${EVIDENCE}/01-long-rains-morning.png` });
  expect(errors).toEqual([]);
});

test("Make a storm darkens the sky and brings rain a child can see", async ({
  page,
}) => {
  const errors = await openLab(page);
  const before = await skyColor(page);

  await page.getByRole("button", { name: "Make a storm" }).click();
  // Wait for the storm to actually build, not just for the first drops, so the
  // screenshot shows what a child sees at the heart of it.
  await page.waitForFunction(
    () => window.weatherLab!.state().stormIntensity > 0.6,
    null,
    { timeout: 30_000 },
  );

  const during = await labState(page);
  expect(during.weather).toBe("storm");
  expect(during.stormIntensity).toBeGreaterThan(0.1);
  expect(await raindrops(page)).toBeGreaterThan(500);
  expect(luminance(await skyColor(page))).toBeLessThan(luminance(before));

  await page.screenshot({ path: `${EVIDENCE}/02-storm.png` });

  // Clearing the sky stops the rain again.
  await page.getByRole("button", { name: "Clear the sky" }).click();
  await page.waitForFunction(() => window.weatherLab!.raindrops() === 0, null, {
    timeout: 10_000,
  });
  expect((await labState(page)).weather).not.toBe("storm");
  expect(errors).toEqual([]);
});

test("stepping to the dry season browns the grass and empties the waterhole", async ({
  page,
}) => {
  const errors = await openLab(page);
  const wet = await labState(page);

  await page.getByRole("button", { name: "August" }).click();
  await page.waitForTimeout(500);
  const dry = await labState(page);

  expect(dry.clock.month).toBe(7);
  expect(dry.season.id).toBe("dry");
  expect(dry.greenness).toBeLessThan(wet.greenness - 0.4);
  expect(dry.waterLevel).toBeLessThan(wet.waterLevel - 0.4);
  expect(dry.monthRainfallMm).toBeLessThan(wet.monthRainfallMm / 5);

  await expect(page.getByText("Dry straw")).toBeVisible();
  await page.screenshot({ path: `${EVIDENCE}/03-dry-season.png` });
  expect(errors).toEqual([]);
});

test("the year and the hour both move, and night really is dark", async ({
  page,
}) => {
  const errors = await openLab(page);
  const start = await labState(page);

  await page.getByRole("button", { name: "On a year" }).click();
  await page.waitForTimeout(300);
  expect((await labState(page)).clock.year).toBe(start.clock.year + 1);

  await page.getByRole("button", { name: "Back a year" }).click();
  await page.waitForTimeout(300);
  expect((await labState(page)).clock.year).toBe(start.clock.year);

  const daySky = await skyColor(page);
  await page.getByLabel("Time of day").fill("22");
  await page.waitForTimeout(600);
  const nightSky = await skyColor(page);
  expect(luminance(nightSky)).toBeLessThan(luminance(daySky) / 2);
  await page.screenshot({ path: `${EVIDENCE}/04-night.png` });

  await page.getByLabel("Time of day").fill("6.5");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${EVIDENCE}/05-dawn.png` });
  expect(errors).toEqual([]);
});

test("letting time run walks the calendar on its own", async ({ page }) => {
  const errors = await openLab(page);
  const before = await labState(page);

  await page.getByRole("button", { name: "A month a minute" }).click();
  await page.waitForTimeout(4000);

  const after = await labState(page);
  const movedDays =
    (after.clock.year - before.clock.year) * 365 +
    (after.clock.month - before.clock.month) * 30 +
    (after.clock.day - before.clock.day);
  expect(movedDays).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("the panel is usable on a phone, at a readable size", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLab(page);

  const storm = page.getByRole("button", { name: "Make a storm" });
  await expect(storm).toBeVisible();
  const box = await storm.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  // Nothing essential may be shrunk below the project's 16 px floor.
  const fontSize = await storm.evaluate(
    (node) => window.getComputedStyle(node).fontSize,
  );
  expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16);

  // No horizontal overflow on a narrow screen.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await storm.click();
  await page.waitForFunction(() => window.weatherLab!.raindrops() > 100, null, {
    timeout: 10_000,
  });
  await page.screenshot({ path: `${EVIDENCE}/06-phone-storm.png` });
});
