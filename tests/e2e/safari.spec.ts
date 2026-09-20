import { expect, test, type Page } from "@playwright/test";
import { safariStops } from "../../src/content/safari";
async function ready(page: Page) {
  await expect(page.locator("#safari-world canvas")).toHaveAttribute(
    "data-animal-state",
    "loaded",
    { timeout: 30000 },
  );
}
async function meet(page: Page) {
  await ready(page);
  await page.locator("#guide-animal").click();
  await expect(page.locator("#discover-clue")).toBeEnabled({ timeout: 15000 });
  await page.locator("#discover-clue").click();
}
test("seven-stop story saves real photographs, resumes feedback, finishes and revisits", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./safari.html");
  await expect(page.locator("#safari-world canvas")).toHaveAttribute(
    "data-jeep-state",
    "loaded",
    { timeout: 30000 },
  );
  await page.locator("#begin-safari").click();
  for (const [index, animal] of safariStops.entries()) {
    await meet(page);
    if (index === 0) {
      const wrong = animal.question.choices.find(
        (c) => c.id !== animal.question.correctId,
      )!;
      await page.locator(`[data-answer="${wrong.id}"]`).click();
      await expect(page.locator("#story-panel")).toContainText(
        "Let’s discover it together",
      );
      await expect(page.locator("#save-status")).toHaveText(
        "Story saved on this device",
      );
      await page.reload();
      await expect(page.locator("#retry-answer")).toBeVisible();
      await page.locator("#retry-answer").click();
    }
    await page.locator(`[data-answer="${animal.question.correctId}"]`).click();
    await page.locator("#learn-clue").click();
    await expect(page.locator("#take-photo")).toBeEnabled({ timeout: 30000 });
    await page.locator("#take-photo").click();
    await expect(page.locator(".photo-thumb")).toHaveAttribute(
      "src",
      /^data:image\/jpeg;base64,/,
    );
    await expect(page.locator("#clue-count")).toHaveText(`${index + 1}/7`);
    await expect(page.locator("#save-status")).toHaveText(
      "Story saved on this device",
    );
    if (index === 2) {
      await page.reload();
      await expect(page.locator("#clue-count")).toHaveText("3/7");
      await expect(page.locator(".photo-thumb")).toBeVisible();
    }
    if (index < 6) await page.locator("#next-stop").click();
  }
  await page.locator("#finish-safari").click();
  await expect(page.locator("#story-title")).toHaveText("One connected home.");
  await page.screenshot({ path: info.outputPath("safari-ending-desktop.png") });
  await page.locator("#open-finished-book").click();
  await expect(page.locator(".book-page img")).toHaveCount(7);
  await page.locator('[data-visit="plains-zebra"]').click();
  await expect(page.locator("#scene-chapter")).toContainText("Plains zebra");
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.reload();
  await expect(page.locator("#scene-chapter")).toContainText("Plains zebra");
  await expect(page.locator("#clue-count")).toHaveText("7/7");
  expect(errors).toEqual([]);
});

test("phone story keeps the scene, choices, camera and field book reachable", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./safari.html");
  await ready(page);
  await page.screenshot({ path: info.outputPath("safari-welcome-phone.png") });
  await page.locator("#begin-safari").click();
  await meet(page);
  await page.screenshot({ path: info.outputPath("safari-question-phone.png") });
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    scene: document.querySelector(".scene-area")!.getBoundingClientRect()
      .height,
    buttons: [
      ...document.querySelectorAll<HTMLButtonElement>("#story-panel button"),
    ].map((b) => ({
      height: b.getBoundingClientRect().height,
      font: parseFloat(getComputedStyle(b).fontSize),
    })),
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.scene).toBeGreaterThanOrEqual(280);
  for (const b of dimensions.buttons) {
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.font).toBeGreaterThanOrEqual(16);
  }
  await page.locator('[data-answer="grass"]').click();
  await page.locator("#learn-clue").click();
  await expect(page.locator("#take-photo")).toBeEnabled();
  await page.screenshot({ path: info.outputPath("safari-camera-phone.png") });
  await page.locator("#take-photo").click();
  await page.locator("#route-button").click();
  await expect(page.locator(".book-page img")).toHaveCount(1);
  await expect(page.locator('[data-visit="african-elephant"]')).toBeEnabled();
  await expect(page.locator('[data-visit="giraffe"]')).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.locator("#book-dialog")).not.toBeVisible();
});

test("corrupt story save stays protected until an explicit restart", async ({
  page,
}) => {
  await page.goto("./safari.html");
  await expect(page.locator("#begin-safari")).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("sophias-wild-world-story-safari", 1);
      r.onsuccess = () => {
        const db = r.result;
        const tx = db.transaction("journey", "readwrite");
        tx.objectStore("journey").put(
          { schemaVersion: 1, broken: true },
          "current",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => reject(tx.error);
      };
      r.onerror = () => reject(r.error);
    });
  });
  await page.reload();
  await expect(page.locator("#save-banner")).toContainText("left untouched");
  await page.locator("#begin-safari").click();
  await expect(page.locator("#save-banner")).toContainText("protected");
  await page.reload();
  await expect(page.locator("#save-banner")).toContainText("left untouched");
  await page.locator("#settings-button").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#restart-button").click();
  await expect(page.locator("#save-banner")).not.toBeVisible();
  await expect(page.locator("#begin-safari")).toBeVisible();
});

test("an unavailable animal cannot unlock a clue or photograph", async ({
  page,
}) => {
  await page.route("**/models/zebra.glb", (route) => route.abort());
  await page.goto("./safari.html");
  await page.locator("#begin-safari").click();
  await expect(page.locator("#safari-world canvas")).toHaveAttribute(
    "data-animal-state",
    "error",
  );
  await expect(page.locator("#world-banner")).toBeVisible();
  await page.locator("#guide-animal").click();
  await expect(page.locator("#discover-clue")).toBeDisabled();
  await expect(page.locator("#clue-count")).toHaveText("0/7");
});

/** Hold the next open success until the test releases it, without changing stored values. */
function delayNextStoryOpen() {
  const original = indexedDB.open.bind(indexedDB);
  let delayNext = true;
  indexedDB.open = ((name: string, version?: number) => {
    const request = original(name, version);
    if (!delayNext || name !== "sophias-wild-world-story-safari")
      return request;
    delayNext = false;
    return new Proxy(request, {
      get(target, key) {
        return Reflect.get(target, key, target);
      },
      set(target, key, value) {
        if (key === "onsuccess") {
          target.onsuccess = (event) => {
            (
              window as unknown as { releaseStoryOpen: () => void }
            ).releaseStoryOpen = () => value.call(target, event);
          };
          return true;
        }
        return Reflect.set(target, key, value, target);
      },
    });
  }) as typeof indexedDB.open;
}

test("a delayed initial save read cannot be overwritten through settings", async ({
  page,
}) => {
  await page.goto("./safari.html");
  await expect(page.locator("#begin-safari")).toBeVisible();
  await page.locator("#settings-button").click();
  await page.locator("#volume-setting").fill("0.2");
  await page.locator("#volume-setting").dispatchEvent("change");
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.addInitScript(delayNextStoryOpen);
  await page.reload();
  await expect(page.locator("#story-panel")).toContainText(
    "Loading your saved story",
  );
  await expect(page.locator("#settings-button")).toBeDisabled();
  await expect(page.locator("#route-button")).toBeDisabled();
  await expect(page.locator("#restart-button")).toBeDisabled();
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { releaseStoryOpen?: unknown })
        .releaseStoryOpen === "function",
  );
  await page.evaluate(() =>
    (window as unknown as { releaseStoryOpen: () => void }).releaseStoryOpen(),
  );
  await expect(page.locator("#settings-button")).toBeEnabled();
  await page.locator("#settings-button").click();
  await expect(page.locator("#volume-setting")).toHaveValue("0.2");
});

test("a delayed restart blocks old settings writes until replacement commits", async ({
  page,
}) => {
  await page.goto("./safari.html");
  await page.locator("#begin-safari").click();
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
  await page.locator("#settings-button").click();
  await page.evaluate(delayNextStoryOpen);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#restart-button").click();
  await expect(page.locator("#narration-setting")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Close settings" }),
  ).toBeDisabled();
  await expect(page.locator("#restart-button")).toBeDisabled();
  // A queued change event from before reset must also be ignored by the busy guard.
  await page.locator("#volume-setting").evaluate((element) => {
    (element as HTMLInputElement).value = "0.1";
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { releaseStoryOpen?: unknown })
        .releaseStoryOpen === "function",
  );
  await page.evaluate(() =>
    (window as unknown as { releaseStoryOpen: () => void }).releaseStoryOpen(),
  );
  await expect(page.locator("#begin-safari")).toBeVisible();
  await expect(page.locator("#save-status")).toHaveText(
    "New story saved on this device",
  );
  await page.reload();
  await expect(page.locator("#begin-safari")).toBeVisible();
  await page.locator("#settings-button").click();
  await expect(page.locator("#volume-setting")).toHaveValue("0.75");
});
