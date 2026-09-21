import { expect, test, type Page } from "@playwright/test";

const canvas = (page: Page) => page.locator("#safari-world canvas");

async function begin(page: Page) {
  await page.goto("./safari.html");
  await page.locator("#begin-safari").click();
  if (await page.locator("#skip-arrival").isVisible())
    await page.locator("#skip-arrival").click();
  await page.locator("#guide-animal").click();
  await expect(page.locator("#encounter-dialog")).toBeVisible();
}

async function lookAround(page: Page) {
  const area = await canvas(page).boundingBox();
  expect(area).not.toBeNull();
  const before = Number(await canvas(page).getAttribute("data-look-yaw"));
  const x = area!.x + area!.width * 0.74;
  const y = area!.y + area!.height * 0.35;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 72, y, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas(page).getAttribute("data-look-yaw")))
    .not.toBe(before);
}

test("a sighting becomes child-authored notes, a quiz, then a taped field-book photo", async ({
  page,
}) => {
  await begin(page);
  await expect(page.locator("#encounter-title")).toHaveText("Animal ahead!");
  await expect(page.locator("#story-panel")).toBeHidden();
  await expect(canvas(page)).toHaveAttribute("data-explorer-visible", "true");
  await expect(canvas(page)).toHaveAttribute("data-companion-visible", "true");
  await lookAround(page);

  await page.locator("#log-animal").click();
  await expect(page.locator("#animal-name")).toBeFocused();
  await page.locator("#animal-name").fill("gerry");
  await page.locator("#confirm-animal").click();
  await expect(page.locator("#encounter-dialog")).toBeHidden();
  await expect(page.locator("#story-title")).toContainText("Plains zebra");
  await expect(page.locator(".guess-note")).toContainText("gerry");
  await expect(canvas(page)).toHaveAttribute("data-explorer-visible", "true");
  await expect(canvas(page)).toHaveAttribute("data-companion-visible", "true");
  await lookAround(page);

  await page.locator("#height-value").fill("1.4");
  await page.locator("#colors-seen").fill("black and white");
  await page.locator("#animal-count").fill("2");
  await page.locator("#field-observations button[type=submit]").click();
  await expect(page.locator("[data-answer]")).toHaveCount(3);
  await expect(page.locator(".recorded-observation")).toContainText(
    "black and white",
  );
  await expect(canvas(page)).toHaveAttribute("data-explorer-visible", "true");
  await lookAround(page);

  await page.locator('[data-answer="grass"]').click();
  await page.locator("#learn-clue").click();
  await expect(page.locator("#take-photo")).toBeEnabled({ timeout: 15000 });
  await page.locator("#take-photo").click();
  await expect(page.locator("#book-dialog")).toBeVisible();
  await expect(page.locator(".field-polaroid img")).toHaveCount(1);
  await expect(page.locator(".field-photo-tape")).toHaveCount(1);
  await expect(page.locator(".field-observation-note")).toContainText("1.4 m");
  await expect(page.locator(".field-observation-note")).toContainText(
    "Animals seen: 2",
  );
  await page.reload();
  await page.locator("#route-button").click();
  await expect(page.locator(".field-polaroid img")).toHaveCount(1);
});

test.describe("phone sighting", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("keeps the animal visible while naming and making notes", async ({
    page,
  }) => {
    await begin(page);
    await expect(page.locator("#encounter-title")).toHaveText("Animal ahead!");
    const scene = await canvas(page).boundingBox();
    const prompt = await page.locator("#encounter-dialog").boundingBox();
    expect(scene).not.toBeNull();
    expect(prompt).not.toBeNull();
    expect(prompt!.y).toBeGreaterThan(scene!.y + 70);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
    ).toBe(false);
    await page.locator("#log-animal").tap();
    await page.locator("#skip-animal").tap();
    await expect(page.locator("#field-observations")).toBeVisible();
    await expect(canvas(page)).toHaveAttribute(
      "data-companion-visible",
      "true",
    );
    await page.locator("#height-value").fill("140");
    await page.locator("#height-unit").selectOption("cm");
    await page.locator("#colors-seen").fill("black and white");
    await page.locator("#field-observations button[type=submit]").tap();
    await expect(page.locator("[data-answer]")).toHaveCount(3);
  });
});
