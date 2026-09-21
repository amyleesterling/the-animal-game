import { expect, test, type Page } from "@playwright/test";
import { safariStops, safariStoryStops } from "../../src/content/safari";
import type { SafariProgress } from "../../src/state/safari";

const world = (page: Page) => page.locator("#safari-world canvas");
const encounter = (page: Page) => page.locator("#encounter-dialog");
const animal = (id: string) => safariStops.find((stop) => stop.id === id)!;

async function saved(page: Page) {
  await expect(page.locator("#save-status")).toHaveText(
    "Story saved on this device",
  );
}

async function readStored(page: Page) {
  return page.evaluate(
    () =>
      new Promise<SafariProgress>((resolve, reject) => {
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
}

async function ready(page: Page, id: string) {
  await expect(world(page)).toHaveAttribute("data-stop-id", id);
  await expect(world(page)).toHaveAttribute("data-animal-state", "loaded", {
    timeout: 45000,
  });
  const cache = await world(page).evaluate((element) => {
    const data = (element as HTMLCanvasElement).dataset;
    return {
      loaded: Number(data.loadedAnimalCount),
      pending: Number(data.pendingAnimalCount),
      ids: data.loadedAnimalIds?.split(",") ?? [],
    };
  });
  expect(cache.ids).toContain(id);
  expect(cache.loaded).toBeGreaterThan(0);
  expect(cache.loaded).toBeLessThanOrEqual(8);
  expect(cache.pending).toBeGreaterThanOrEqual(0);
  expect(cache.pending).toBeLessThanOrEqual(2);
}

async function visit(page: Page, id: string) {
  await page.locator("#route-button").click();
  await page.locator("#book-group").selectOption("all");
  await page.locator("#book-search").fill("");
  await page.locator(`#route-list [data-visit="${id}"]`).click();
  await expect(page.locator("#book-dialog")).not.toBeVisible();
  await ready(page, id);
}

async function meet(page: Page, id: string, skip = true) {
  const before = await world(page).evaluate((element) => {
    const data = (element as HTMLCanvasElement).dataset;
    return { x: Number(data.explorerX), z: Number(data.explorerZ) };
  });
  await page.locator("#guide-animal").click();
  await expect(encounter(page)).toBeVisible({ timeout: 15000 });
  await expect(encounter(page)).toHaveAttribute("data-animal-id", id);
  const after = await world(page).evaluate((element) => {
    const data = (element as HTMLCanvasElement).dataset;
    return { x: Number(data.explorerX), z: Number(data.explorerZ) };
  });
  expect(Math.hypot(before.x - after.x, before.z - after.z)).toBeGreaterThan(4);
  await expect(world(page)).toHaveAttribute("data-nearest-animal-id", id);
  if (skip) await page.locator("#skip-animal").click();
  else {
    await page.locator("#animal-name").fill(animal(id).name);
    await page.locator("#confirm-animal").click();
  }
  await expect(encounter(page)).not.toBeVisible();
  await expect(page.locator("#identified-name")).toContainText(animal(id).name);
}

async function answerQuestion(page: Page, id: string, index: number) {
  const question = animal(id).profile!.questions[index];
  await expect(page.locator("#story-panel .eyebrow")).toHaveText(
    `Question ${index + 1} of 3`,
  );
  await expect(page.locator("#story-title")).toHaveText(question.prompt);
  await page.locator(`[data-answer="${question.correctId}"]`).click();
  await expect(page.locator("#story-panel")).toContainText(
    question.explanation,
  );
  await page.locator("#learn-clue").click();
}

async function photograph(page: Page, id: string) {
  await expect(page.locator("#take-photo")).toBeEnabled({ timeout: 15000 });
  await expect(world(page)).toHaveAttribute("data-stop-id", id);
  await page.locator("#take-photo").click();
  await expect(page.locator(".photo-thumb")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await saved(page);
  return (await page.locator(".photo-thumb").getAttribute("src"))!;
}

test("a bonus bird keeps three-question progress through retry, reload and its real photograph", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./safari.html");
  await page.locator("#begin-safari").click();
  await visit(page, "secretarybird");
  await meet(page, "secretarybird", false);
  const questions = animal("secretarybird").profile!.questions;
  const wrong = questions[0].choices.find(
    (choice) => choice.id !== questions[0].correctId,
  )!;
  await page.locator(`[data-answer="${wrong.id}"]`).click();
  await expect(page.locator("#retry-answer")).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(page.locator("#retry-answer")).toBeVisible();
  await page.locator("#retry-answer").click();
  await answerQuestion(page, "secretarybird", 0);
  await expect(page.locator("#take-photo")).toHaveCount(0);
  await saved(page);
  await page.reload();
  await expect(page.locator("#story-title")).toHaveText(questions[1].prompt);
  const midway = (await readStored(page)).entries.secretarybird;
  expect(midway.questionIndex).toBe(1);
  expect(midway.quizAnswers).toEqual([questions[0].correctId, null, null]);
  expect(midway.learned).toBe(false);
  await answerQuestion(page, "secretarybird", 1);
  await expect(page.locator("#take-photo")).toHaveCount(0);
  await answerQuestion(page, "secretarybird", 2);
  await ready(page, "secretarybird");
  await expect(page.locator("#take-photo")).toBeEnabled({ timeout: 15000 });
  await page.screenshot({ path: info.outputPath("secretarybird-camera.png") });
  const photo = await photograph(page, "secretarybird");
  await expect(page.locator("#clue-count")).toHaveText("1/32");
  const stored = (await readStored(page)).entries.secretarybird;
  expect(stored.quizAnswers).toEqual(
    questions.map((question) => question.correctId),
  );
  expect(stored.attempts).toBe(4);
  expect(stored.learned).toBe(true);
  expect(stored.identification).toEqual({
    name: animal("secretarybird").name,
    skipped: false,
  });
  await page.reload();
  await expect(page.locator(".photo-thumb")).toHaveAttribute("src", photo);
  // Optional discoveries do not skip the first unfinished story clue.
  await page.locator("#next-stop").click();
  await expect(world(page)).toHaveAttribute("data-stop-id", "plains-zebra");
  await page.locator("#route-button").click();
  await expect(
    page.locator('.book-page[data-animal-id="secretarybird"] img'),
  ).toHaveAttribute("src", photo);
  expect(errors).toEqual([]);
});

test("a completed version-two story survives a new page session and gains empty bonus entries on the next save", async ({
  page,
  context,
}) => {
  await page.goto("./safari.html");
  await expect(page.locator("#begin-safari")).toBeVisible();
  const legacy = await page.evaluate(async (stops) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    const dataUrl = canvas.toDataURL("image/jpeg");
    const capturedAt = "2026-09-20T10:00:00.000Z";
    const value = {
      schemaVersion: 2,
      started: true,
      currentStopId: "spotted-hyena",
      entries: Object.fromEntries(
        stops.map((stop) => [
          stop.id,
          {
            identification: { name: stop.name, skipped: true },
            attempts: 1,
            answer: stop.question.correctId,
            learned: true,
            photo: { dataUrl, capturedAt },
            visits: 1,
          },
        ]),
      ),
      settings: {
        narration: false,
        volume: 0.2,
        reducedMotion: true,
        lowQuality: false,
      },
      completedAt: capturedAt,
    };
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("sophias-wild-world-story-safari", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("journey", "readwrite");
        tx.objectStore("journey").put(value, "current");
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
    return value;
  }, safariStoryStops);
  await page.close();
  const resumed = await context.newPage();
  await resumed.goto("./safari.html");
  await expect(resumed.locator("#clue-count")).toHaveText("7/32");
  await expect(resumed.locator("#finish-safari")).toBeVisible();
  expect(await readStored(resumed)).toEqual(legacy);
  await resumed.locator("#finish-safari").click();
  await expect(resumed.locator("#story-title")).toHaveText(
    "One connected home.",
  );
  await expect(resumed.locator(".clue-pills span")).toHaveCount(7);
  await resumed.locator("#open-finished-book").click();
  await expect(resumed.locator(".book-page img")).toHaveCount(7);
  await expect(
    resumed.locator('#route-list [data-visit="secretarybird"]'),
  ).toBeEnabled();
  await resumed.keyboard.press("Escape");
  await resumed.locator("#settings-button").click();
  await expect(resumed.locator("#volume-setting")).toHaveValue("0.2");
  await expect(resumed.locator("#narration-setting")).not.toBeChecked();
  await resumed.locator("#volume-setting").fill("0.3");
  await resumed.locator("#volume-setting").dispatchEvent("change");
  await saved(resumed);
  const upgraded = await readStored(resumed);
  expect(upgraded.schemaVersion).toBe(3);
  expect(Object.keys(upgraded.entries)).toHaveLength(32);
  expect(upgraded.completedAt).toBe(legacy.completedAt);
  for (const stop of safariStoryStops) {
    expect(upgraded.entries[stop.id]).toEqual({
      ...legacy.entries[stop.id],
      questionIndex: 0,
      quizAnswers: [stop.question.correctId],
    });
  }
  for (const stop of safariStops.filter((stop) => stop.profile)) {
    expect(upgraded.entries[stop.id]).toEqual({
      identification: null,
      answer: null,
      attempts: 0,
      visits: 0,
      learned: false,
      photo: null,
      questionIndex: 0,
      quizAnswers: [null, null, null],
    });
  }
  await resumed.reload();
  await expect(resumed.locator("#clue-count")).toHaveText("7/32");
  await expect(resumed.locator("#finish-safari")).toBeVisible();
  await resumed.close();
});

test("small-animal study displays explain their scale and produce insect and burrow close-up photographs", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("./safari.html");
  await page.locator("#begin-safari").click();
  for (const [id, feature] of [
    ["lamarcks-dung-beetle", "insect"],
    ["naked-mole-rat", "burrow"],
  ] as const) {
    await visit(page, id);
    await expect(world(page)).toHaveAttribute("data-habitat-feature", feature);
    await expect(world(page)).toHaveAttribute("data-viewing-note", /Enlarged/);
    await expect(page.locator("#story-panel .viewing-note")).toContainText(
      "real size",
    );
    await meet(page, id);
    for (let index = 0; index < 3; index++)
      await answerQuestion(page, id, index);
    await expect(page.locator("#take-photo")).toBeEnabled({ timeout: 15000 });
    await page.screenshot({ path: info.outputPath(`${id}-macro-camera.png`) });
    await photograph(page, id);
    const entry = (await readStored(page)).entries[id];
    expect(entry.learned).toBe(true);
    expect(entry.quizAnswers).toHaveLength(3);
  }
  await expect(page.locator("#clue-count")).toHaveText("2/32");
  await page.locator("#route-button").click();
  await expect(page.locator(".book-page img")).toHaveCount(2);
  await page.screenshot({ path: info.outputPath("small-life-field-book.png") });
});

test("evicted animals reload within cache bounds and a dismissed discovery rearms after a distant visit", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("./safari.html");
  await page.locator("#begin-safari").click();
  await ready(page, "plains-zebra");
  await page.locator("#guide-animal").click();
  await expect(encounter(page)).toBeVisible({ timeout: 15000 });
  await page.locator("#encounter-later").click();
  await expect(encounter(page)).not.toBeVisible();
  for (const id of ["secretarybird", "naked-mole-rat", "grey-crowned-crane"]) {
    await visit(page, id);
    await expect(world(page)).not.toHaveAttribute(
      "data-loaded-animal-ids",
      /(?:^|,)plains-zebra(?:,|$)/,
    );
  }
  await visit(page, "plains-zebra");
  await page.locator("#guide-animal").click();
  await expect(encounter(page)).toBeVisible({ timeout: 15000 });
  await expect(encounter(page)).toHaveAttribute(
    "data-animal-id",
    "plains-zebra",
  );
  await expect(page.locator("#animal-name")).toBeFocused();
});

test.describe("phone savanna field guide", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("filters and researched profiles remain legible and reachable in portrait and short landscape", async ({
    page,
  }, info) => {
    await page.goto("./safari.html");
    await page.locator("#route-button").tap();
    await expect(page.locator("#route-list [data-visit]")).toHaveCount(32);
    await expect(page.locator(".book-page")).toHaveCount(0);
    await page.locator("#book-view").tap();
    await expect(page.locator(".book-page")).toHaveCount(32);
    await page.locator("#book-group").selectOption("Bird");
    await expect(page.locator("#route-list [data-visit]")).toHaveCount(8);
    await expect(page.locator(".book-page")).toHaveCount(8);
    await page.locator("#book-search").fill("Sagittarius serpentarius");
    await expect(page.locator(".book-page")).toHaveCount(1);
    const profile = page.locator('.book-page[data-animal-id="secretarybird"]');
    await profile.locator(".animal-profile > summary").tap();
    await expect(profile.locator(".animal-stats dt")).toContainText([
      "Height",
      "Wingspan",
    ]);
    const wiki = profile.getByRole("link", { name: /Read on Wikipedia/ });
    await expect(wiki).toHaveAttribute(
      "href",
      animal("secretarybird").profile!.wikipediaUrl,
    );
    await expect(wiki).toHaveAttribute("rel", /noopener/);
    await profile.locator(".quiz-review > summary").tap();
    await expect(profile.locator(".quiz-review ol > li")).toHaveCount(3);
    await profile
      .getByText("Show answer & explanation", { exact: true })
      .first()
      .tap();
    await expect(profile).toContainText(
      animal("secretarybird").profile!.questions[0].explanation,
    );
    for (const [label, width, height] of [
      ["portrait", 390, 844],
      ["landscape", 667, 375],
    ] as const) {
      await page.setViewportSize({ width, height });
      const layout = await page.locator("#book-dialog").evaluate((dialog) => ({
        documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        dialogOverflow: dialog.scrollWidth > dialog.clientWidth + 1,
        text: [...dialog.querySelectorAll<HTMLElement>("*")]
          .filter((e) => e.getClientRects().length && e.textContent?.trim())
          .map((e) => parseFloat(getComputedStyle(e).fontSize)),
        controls: [
          ...dialog.querySelectorAll<HTMLElement>(
            "button, input, select, summary",
          ),
        ]
          .filter((e) => e.getClientRects().length)
          .map((e) => ({
            text: e.textContent,
            font: parseFloat(getComputedStyle(e).fontSize),
          })),
      }));
      expect(layout.documentOverflow).toBe(false);
      expect(layout.dialogOverflow).toBe(false);
      for (const font of layout.text) expect(font).toBeGreaterThanOrEqual(12);
      for (const control of layout.controls)
        expect(control.font, control.text ?? "control").toBeGreaterThanOrEqual(
          16,
        );
      for (const locator of [
        page.locator("#book-search"),
        page.locator("#book-group"),
        page.locator("#book-view"),
        wiki,
        profile.locator("[data-visit]"),
      ]) {
        await locator.scrollIntoViewIfNeeded();
        await expect(locator).toBeInViewport();
      }
      await profile
        .locator(".animal-profile > summary")
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath(`bird-profile-${label}.png`),
      });
    }
    await page.locator("#book-search").fill("no matching savanna animal");
    await expect(page.locator("#route-list [data-visit]")).toHaveCount(0);
    await expect(page.locator("#book-pages")).toContainText("No animals match");
    await page.locator("#book-search").fill("");
    await page.locator("#book-group").selectOption("Insect");
    await expect(page.locator(".book-page")).toHaveCount(5);
    await page.locator("#book-view").tap();
    await expect(page.locator(".book-page")).toHaveCount(0);
    await expect(page.locator("#route-list [data-visit]")).toHaveCount(5);
  });
});
