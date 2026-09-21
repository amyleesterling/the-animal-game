import { expect, type Page } from "@playwright/test";

export async function startNaming(page: Page) {
  await expect(page.locator("#encounter-dialog")).toBeVisible();
  await page.locator("#log-animal").click();
  await expect(page.locator("#animal-name")).toBeFocused();
}

export async function saveFieldNotes(page: Page) {
  await expect(page.locator("#field-observations")).toBeVisible();
  await page.locator("#height-value").fill("1.4");
  await page.locator("#colors-seen").fill("brown and cream");
  await page.locator("#animal-count").fill("1");
  await page.locator("#field-observations button[type=submit]").click();
  await expect(page.locator("[data-answer]")).toHaveCount(3);
}

export async function closePhotoBook(page: Page) {
  await expect(page.locator("#book-dialog")).toBeVisible();
  await page.locator("#book-dialog [data-close]").first().click();
  await expect(page.locator("#book-dialog")).toBeHidden();
}
