import { expect, test } from "@playwright/test";
import { roster } from "../../src/content/species";

test("Soph's supplied character loads and follows the guided approach", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  await expect(page.locator("#world canvas")).toHaveAttribute(
    "data-player-model-state",
    "loaded",
  );
  await page.locator("#start-button").click();
  await page.locator("#guide-button").click();
  await expect(page.locator("#meet-button")).toBeEnabled({ timeout: 30000 });
  await page.screenshot({ path: testInfo.outputPath("soph-in-savanna.png") });
});

test("a missing character model preserves the playable expedition", async ({
  page,
}) => {
  await page.route("**/models/sophia.glb", (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("#world canvas")).toHaveAttribute(
    "data-player-model-state",
    "fallback",
  );
  await page.locator("#start-button").click();
  await page.locator("#guide-button").click();
  await expect(page.locator("#meet-button")).toBeEnabled();
});

test("all nine generated animals open in one rotatable viewer", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./animal-lab.html");
  await expect(page.locator("#ready-count")).toHaveText("9 ready");
  for (const animal of roster.filter((entry) => !entry.available)) {
    await page.locator(`[data-animal="${animal.id}"]`).click();
    await expect(page.locator("#scientific-name")).toHaveText(
      animal.scientificName,
    );
    await expect(page.locator("#stage-caption")).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator("#model-canvas canvas")).toHaveCount(1);
    await expect(page.locator("#turn-left")).toBeEnabled();
    const before = await page.locator("#model-canvas canvas").screenshot();
    await page.locator("#turn-left").click();
    await expect
      .poll(async () =>
        (await page.locator("#model-canvas canvas").screenshot()).equals(
          before,
        ),
      )
      .toBe(false);
    await page.locator("#reset-view").click();
    await page
      .locator(".viewer-card")
      .screenshot({ path: testInfo.outputPath(`${animal.id}.png`) });
  }
  expect(errors).toEqual([]);
});

test("phone gallery keeps every model and control reachable", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./animal-lab.html");
  await expect(page.locator("#stage-caption")).toBeVisible();
  await page.locator('[data-animal="hippopotamus"]').click();
  await expect(page.locator("#scientific-name")).toHaveText(
    "Hippopotamus amphibius",
  );
  await expect(page.locator("#stage-caption")).toBeVisible();
  await page.locator("#zoom-in").click();
  await page.locator("#reset-view").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const tooSmall = await page
    .locator("button,a,p")
    .evaluateAll((elements) =>
      elements
        .filter(
          (element) =>
            element.getBoundingClientRect().height > 0 &&
            Number.parseFloat(getComputedStyle(element).fontSize) < 12,
        )
        .map((element) => element.textContent),
    );
  expect(tooSmall).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("phone-animal-gallery.png"),
    fullPage: true,
  });
});
