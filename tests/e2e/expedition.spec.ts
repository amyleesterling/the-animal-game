import { expect, test, type Locator, type Page } from "@playwright/test";
import { zebra } from "../../src/content/species";

test.describe("phone touch controls", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("a touch expedition supports landscape quizzes and scrolling over the model", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await page.locator("#start-button").tap();
    await expect(page.locator("#world canvas")).toHaveAttribute(
      "data-model-state",
      "loaded",
    );
    await page.locator("#guide-button").tap();
    await expect(page.locator("#meet-button")).toBeEnabled();

    const touch = await page.context().newCDPSession(page);
    const back = await page
      .getByRole("button", { name: "Walk backward" })
      .boundingBox();
    expect(back).not.toBeNull();
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: back!.x + back!.width / 2, y: back!.y + back!.height / 2 },
      ],
    });
    try {
      await expect(page.locator("#meet-button")).toBeDisabled({
        timeout: 8_000,
      });
    } finally {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
    await page.locator("#guide-button").tap();
    await page.locator("#meet-button").tap();
    await page.setViewportSize({ width: 667, height: 375 });
    await expect
      .poll(async () => (await page.locator("#mission").boundingBox())!.height)
      .toBeGreaterThan(150);
    await expectReadableLayout(page);
    await page.screenshot({
      path: testInfo.outputPath("phone-landscape-quiz.png"),
      fullPage: true,
    });
    for (const question of zebra.quizzes) {
      await page.locator(`[data-answer="${question.correctChoiceId}"]`).tap();
      await page.locator("#next-question").tap();
    }

    await page.locator("#guide-button").tap();
    await page.locator("#camera-button").tap();
    await expect(page.locator("#shutter")).toBeEnabled();
    for (const viewport of [
      { width: 667, height: 375 },
      { width: 568, height: 320 },
    ]) {
      await page.setViewportSize(viewport);
      const frame = await page.locator(".viewfinder").boundingBox();
      const controls = await page.locator(".photo-controls").boundingBox();
      expect(frame!.height).toBeGreaterThan(140);
      expect(frame!.x + frame!.width).toBeLessThanOrEqual(controls!.x);
      await expectReadableLayout(page);
    }
    await page.screenshot({
      path: testInfo.outputPath("phone-landscape-photo.png"),
      fullPage: true,
    });
    await page.locator("#shutter").tap();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("#specimen canvas")).toHaveAttribute(
      "data-model-state",
      "loaded",
    );
    await expect(page.locator("#book-count")).toHaveText("1 / 1");
    await page.locator("#specimen canvas").scrollIntoViewIfNeeded();
    const model = await page.locator("#specimen canvas").boundingBox();
    expect(model).not.toBeNull();
    const scrollBefore = await page
      .locator("#dialog")
      .evaluate((element) => element.scrollTop);
    const x = model!.x + model!.width / 2;
    const y = model!.y + model!.height * 0.8;
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 6; step++) {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - step * 18 }],
      });
      await page.waitForTimeout(40);
    }
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() =>
        page.locator("#dialog").evaluate((element) => element.scrollTop),
      )
      .toBeGreaterThan(scrollBefore + 20);
    await expectReadableLayout(page);
    await page.screenshot({
      path: testInfo.outputPath("phone-touch-field-book.png"),
      fullPage: true,
    });
    await touch.detach();
    await page.reload();
    await expect(page.locator("#book-count")).toHaveText("1 / 1");
  });
});

test("the guide reaches the zebra even at two frames per second", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    // A slow-rendering browser must preserve walking speed in real seconds.
    // Keep normal graphics and motion settings so they cannot hide the bug.
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      window.setTimeout(() => callback(performance.now()), 500);
    window.cancelAnimationFrame = (id: number): void => window.clearTimeout(id);
  });
  await page.goto("./");
  await expect(page.locator("#start-button")).toBeEnabled({ timeout: 15_000 });
  await expect(page.locator("html")).not.toHaveClass(/reduce-motion/);
  await page.locator("#start-button").click();
  await page.locator("#guide-button").click();
  await expect(page.locator("#meet-button")).toBeEnabled({ timeout: 8_000 });
  await page.locator("#meet-button").click();
  await expect(
    page.getByRole("heading", { name: zebra.quizzes[0].prompt }),
  ).toBeVisible();
});

/** Use actual Tab/Space input so this also checks reachability, not just click handlers. */
async function keyboardActivate(page: Page, target: Locator): Promise<void> {
  await expect(target).toBeEnabled();
  for (let attempt = 0; attempt < 40; attempt++) {
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      await page.keyboard.press("Space");
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error(`Keyboard could not reach ${await target.textContent()}`);
}

async function meetZebra(
  page: Page,
  keyboardOnly = false,
  modelState = "loaded",
): Promise<void> {
  const activate = (target: Locator) =>
    keyboardOnly ? keyboardActivate(page, target) : target.click();
  await activate(page.locator("#start-button"));
  await expect(page.locator("#world canvas")).toHaveAttribute(
    "data-model-state",
    modelState,
  );
  await activate(page.locator("#guide-button"));
  await expect(page.locator("#meet-button")).toBeEnabled({ timeout: 20_000 });
  await activate(page.locator("#meet-button"));
  await expect(
    page.getByRole("heading", { name: zebra.quizzes[0].prompt }),
  ).toBeVisible();
}

async function finishQuiz(page: Page, keyboardOnly = false): Promise<void> {
  const activate = (target: Locator) =>
    keyboardOnly ? keyboardActivate(page, target) : target.click();
  for (const question of zebra.quizzes) {
    await expect(
      page.getByRole("heading", { name: question.prompt }),
    ).toBeVisible();
    await activate(page.locator(`[data-answer="${question.correctChoiceId}"]`));
    await expect(page.locator(".feedback")).toContainText("You spotted it!");
    await activate(page.locator("#next-question"));
  }
  await expect(page.locator("#camera-button")).toBeVisible();
}

async function takePhoto(
  page: Page,
  keyboardOnly = false,
  modelState = "loaded",
): Promise<void> {
  const activate = (target: Locator) =>
    keyboardOnly ? keyboardActivate(page, target) : target.click();
  await activate(page.locator("#guide-button"));
  await activate(page.locator("#camera-button"));
  await expect(page.locator("#shutter")).toBeEnabled({ timeout: 20_000 });
  await activate(page.locator("#shutter"));
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Plains zebra", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#specimen canvas")).toHaveAttribute(
    "data-model-state",
    modelState,
  );
  const photo = page.getByRole("img", {
    name: "Your in-game photograph of the plains zebra in the savanna",
  });
  await expect(photo).toBeVisible();
  await expect
    .poll(() =>
      photo.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
}

test("failed texture decoding keeps the visible striped fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.createImageBitmap = async () => {
      throw new Error("Simulated texture decode failure");
    };
  });
  await page.goto("./");
  await meetZebra(page, false, "fallback");
  await finishQuiz(page);
  await takePhoto(page, false, "fallback");
  await expect(page.locator("#book-count")).toHaveText("1 / 1");
});

test("an unavailable zebra GLB still permits the whole discovery loop", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/models/zebra.glb", (route) =>
    route.fulfill({ status: 503, body: "Asset unavailable" }),
  );
  await page.goto("./");
  await meetZebra(page, false, "fallback");
  await finishQuiz(page);
  await takePhoto(page, false, "fallback");
  await expect(page.locator("#book-count")).toHaveText("1 / 1");
  await page.reload();
  await page.locator("#book-button").click();
  await expect(page.locator("#specimen canvas")).toHaveAttribute(
    "data-model-state",
    "fallback",
  );
  expect(errors).toEqual([]);
});

async function expectReadableLayout(page: Page): Promise<void> {
  const report = await page.evaluate(() => {
    const tooSmall: string[] = [];
    const smallActions: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>("body *")) {
      if (
        !element.getClientRects().length ||
        getComputedStyle(element).visibility === "hidden"
      )
        continue;
      const ownText = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join("")
        .trim();
      if (ownText && Number.parseFloat(getComputedStyle(element).fontSize) < 12)
        tooSmall.push(`${element.tagName}: ${ownText.slice(0, 80)}`);
      if (
        ownText &&
        element.closest("button") &&
        !element.matches(".answer-letter, .book-count") &&
        Number.parseFloat(getComputedStyle(element).fontSize) < 16
      )
        smallActions.push(ownText);
    }
    return {
      tooSmall,
      smallActions,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  expect(
    report.tooSmall,
    "Visible text must stay at or above 12 CSS px",
  ).toEqual([]);
  expect(
    report.smallActions,
    "Functional button labels must stay at or above 16 CSS px",
  ).toEqual([]);
  expect(
    report.horizontalOverflow,
    "Essential layouts must reflow without horizontal overflow",
  ).toBe(false);
}

test("wrong answers stay friendly, the photo survives refresh, and reset needs confirmation", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: /A world of.*little wonders/ }),
  ).toBeVisible();
  await meetZebra(page);

  const first = zebra.quizzes[0];
  const wrongChoice = first.choices.find(
    (choice) => choice.id !== first.correctChoiceId,
  )!;
  await page.locator(`[data-answer="${wrongChoice.id}"]`).click();
  await expect(page.locator(".feedback")).toContainText(
    "A little clue for you",
  );
  await expect(page.locator(".feedback")).toContainText(first.explanation);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator("[data-answer]")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: first.prompt })).toBeVisible();
  await page.locator(`[data-answer="${first.correctChoiceId}"]`).click();
  await page.locator("#next-question").click();

  const second = zebra.quizzes[1];
  const secondWrong = second.choices.find(
    (choice) => choice.id !== second.correctChoiceId,
  )!;
  await page.locator(`[data-answer="${secondWrong.id}"]`).click();
  await page.locator("#next-question").click();
  await expect(
    page.getByRole("heading", { name: zebra.quizzes[2].prompt }),
  ).toBeVisible();
  await page
    .locator(`[data-answer="${zebra.quizzes[2].correctChoiceId}"]`)
    .click();
  await page.locator("#next-question").click();
  await takePhoto(page);
  await expect(page.locator("#book-count")).toHaveText("1 / 1");
  const photoBeforeReload = await page
    .getByRole("img", {
      name: "Your in-game photograph of the plains zebra in the savanna",
    })
    .getAttribute("src");
  await page.screenshot({
    path: testInfo.outputPath("desktop-field-book.png"),
    fullPage: true,
  });

  await page.reload();
  await expect(page.locator("#book-count")).toHaveText("1 / 1");
  await page.locator("#book-button").click();
  await expect(
    page.getByRole("img", {
      name: "Your in-game photograph of the plains zebra in the savanna",
    }),
  ).toHaveAttribute("src", photoBeforeReload!);
  await page.keyboard.press("Escape");

  await page.locator("#grownups-button").click();
  await page.locator("#reset-confirm").click();
  await page.locator("#keep-book").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#book-count")).toHaveText("1 / 1");
  await page.locator("#grownups-button").click();
  await page.locator("#reset-confirm").click();
  await page.locator("#reset-now").click();
  await expect(page.locator("#book-count")).toHaveText("0 / 1");
  await page.reload();
  await expect(page.locator("#start-button")).toBeEnabled();
  await page.locator("#book-button").click();
  await expect(
    page.getByRole("heading", { name: "Your first page is waiting." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the essential expedition can be completed with keyboard input", async ({
  page,
}) => {
  await page.goto("./");
  await meetZebra(page, true);
  await finishQuiz(page, true);
  await takePhoto(page, true);
  for (let visit = 0; visit < 3; visit++) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await keyboardActivate(page, page.locator("#book-button"));
    await expect(
      page.getByRole("heading", { name: "Plains zebra", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#specimen canvas")).toHaveAttribute(
      "data-model-state",
      "loaded",
    );
  }
});

test("resetting during a quiz resumes movement in the savanna", async ({
  page,
}) => {
  // Reduced motion makes the guide arrive at its fixed observation spot before
  // the quiz opens, so the retreat starts at the same distance on every device.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    // Manual walking must remain useful on the same slow devices as the guide.
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      window.setTimeout(() => callback(performance.now()), 500);
    window.cancelAnimationFrame = (id: number): void => window.clearTimeout(id);
  });
  await page.goto("./");
  await meetZebra(page);
  await page.locator("#grownups-button").click();
  await page.locator("#reset-confirm").click();
  await page.locator("#reset-now").click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("#meet-button")).toBeEnabled();
  await page.keyboard.down("s");
  try {
    await expect(page.locator("#meet-button")).toBeDisabled({ timeout: 8_000 });
  } finally {
    await page.keyboard.up("s");
  }
  await page.locator("#guide-button").click();
  await expect(page.locator("#meet-button")).toBeEnabled({ timeout: 8_000 });
});

test("narrow layouts remain legible and accessibility preferences survive reload", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.locator("#start-button")).toBeEnabled();
  await expectReadableLayout(page);
  await page.screenshot({
    path: testInfo.outputPath("mobile-welcome.png"),
    fullPage: true,
  });

  await page.locator("#settings-button").click();
  await page.locator("#narration-toggle").uncheck();
  await page.locator("#motion-toggle").check();
  await page.locator("#quality-toggle").check();
  await expectReadableLayout(page);
  await page.getByRole("button", { name: "Ready to explore" }).click();
  await page.reload();
  await expect(page.locator("#start-button")).toBeEnabled();
  await page.locator("#settings-button").click();
  await expect(page.locator("#narration-toggle")).not.toBeChecked();
  await expect(page.locator("#motion-toggle")).toBeChecked();
  await expect(page.locator("#quality-toggle")).toBeChecked();
  await page.keyboard.press("Escape");

  await meetZebra(page);
  await expectReadableLayout(page);
  await page.screenshot({
    path: testInfo.outputPath("mobile-quiz.png"),
    fullPage: true,
  });
  await finishQuiz(page);
  await takePhoto(page);
  await expectReadableLayout(page);
  await page.screenshot({
    path: testInfo.outputPath("mobile-field-book.png"),
    fullPage: true,
  });
});

test("an unsupported save is preserved until a grown-up explicitly replaces it", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator("#start-button")).toBeEnabled();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("sophias-wild-world", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("progress", "readwrite");
        transaction
          .objectStore("progress")
          .put(
            { schemaVersion: 99, futureDiscovery: "preserve-me" },
            "current",
          );
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error);
        };
      };
    });
  });
  const savedValue = () =>
    page.evaluate(
      async () =>
        new Promise<unknown>((resolve, reject) => {
          const request = indexedDB.open("sophias-wild-world", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction("progress", "readonly");
            const read = transaction.objectStore("progress").get("current");
            transaction.oncomplete = () => {
              database.close();
              resolve(read.result);
            };
            transaction.onabort = () => {
              database.close();
              reject(transaction.error);
            };
          };
        }),
    );

  await page.reload();
  await expect(page.locator("#notice")).toContainText("left untouched");
  await page.locator("#settings-button").click();
  await page.locator("#motion-toggle").check();
  await page.keyboard.press("Escape");
  await expect(page.locator("#notice")).toContainText("temporary");
  expect(await savedValue()).toEqual({
    schemaVersion: 99,
    futureDiscovery: "preserve-me",
  });

  await page.locator("#grownups-button").click();
  await page.locator("#reset-confirm").click();
  await page.locator("#reset-now").click();
  await expect
    .poll(savedValue)
    .toMatchObject({ schemaVersion: 1, photo: null, discoveredAt: null });
  await page.reload();
  await expect(page.locator("#start-button")).toBeEnabled();
  await expect(page.locator("#notice")).not.toBeVisible();
});
