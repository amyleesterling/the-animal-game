import { expect, test, type Page } from "@playwright/test";
import {
  classicQuestionNarration,
  narratorSample,
} from "../../src/content/narration";
import { zebra } from "../../src/content/species";

test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "These fixtures intercept local Vite source modules; hosted voice packs need separate playback verification.",
);

declare global {
  interface Window {
    __voiceTest: {
      spoken: string[];
      cancels: number;
      mode: "ready" | "missing" | "error";
    };
  }
}

/** Exercise app callers independently of whether a generated voice pack has been installed. */
async function deviceVoiceFixture(page: Page) {
  await page.route("**/src/content/narration-manifest.json*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'export default {version:1,voice:"en-TZ-ElimuNeural",locale:"en-TZ",generatedAt:null,clips:[]};',
    }),
  );
  await page.addInitScript(() => {
    window.__voiceTest = { spoken: [], cancels: 0, mode: "ready" };
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        constructor(public text: string) {}
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel() {
          window.__voiceTest.cancels++;
        },
        getVoices() {
          return window.__voiceTest.mode === "missing"
            ? []
            : [
                {
                  name: "Test device voice",
                  localService: true,
                  lang: "en-US",
                },
              ];
        },
        speak(utterance: SpeechSynthesisUtterance) {
          window.__voiceTest.spoken.push(utterance.text);
          if (window.__voiceTest.mode === "error")
            setTimeout(
              () =>
                utterance.onerror?.({
                  error: "audio-busy",
                } as SpeechSynthesisErrorEvent),
              0,
            );
        },
      },
    });
  });
}

async function clickWithChoiceShuffle(page: Page, id: string) {
  await page.evaluate((id) => {
    const original = Math.random;
    try {
      // Only the synchronous UI transition is deterministic; Three.js keeps its RNG.
      Math.random = () => 0;
      (document.getElementById(id) as HTMLButtonElement).click();
    } finally {
      Math.random = original;
    }
  }, id);
}

test("classic automatic and repeated questions read the actual shuffled answer order", async ({
  page,
}) => {
  await deviceVoiceFixture(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.locator("#start-button").click();
  await page.locator("#guide-button").click();
  await expect(page.locator("#meet-button")).toBeEnabled();
  await clickWithChoiceShuffle(page, "meet-button");
  for (const question of zebra.quizzes) {
    const ids = await page
      .locator("[data-answer]")
      .evaluateAll((choices) =>
        choices.map((choice) => (choice as HTMLElement).dataset.answer!),
      );
    expect(ids).not.toEqual(question.choices.map((choice) => choice.id));
    const expected = classicQuestionNarration(question.id, ids);
    expect(await page.evaluate(() => window.__voiceTest.spoken.at(-1))).toBe(
      expected,
    );
    await page.locator("#repeat").click();
    expect(await page.evaluate(() => window.__voiceTest.spoken.at(-1))).toBe(
      expected,
    );
    await page.locator(`[data-answer="${question.correctChoiceId}"]`).click();
    await clickWithChoiceShuffle(page, "next-question");
  }
  await page.locator("#camera-button").click();
  const before = await page.evaluate(() => window.__voiceTest.cancels);
  await page.locator("#leave-photo").click();
  expect(await page.evaluate(() => window.__voiceTest.cancels)).toBeGreaterThan(
    before,
  );
});

test("classic settings preview and field-book playback errors stay visible in their dialogs", async ({
  page,
}) => {
  await deviceVoiceFixture(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.locator("#settings-button").click();
  await expect(page.locator("#narrator-description")).toContainText(
    "Device voice",
  );
  await page.locator("#hear-guide").click();
  expect(await page.evaluate(() => window.__voiceTest.spoken.at(-1))).toBe(
    narratorSample,
  );
  await page.evaluate(() => {
    window.__voiceTest.mode = "error";
  });
  await page.locator("#hear-guide").click();
  await expect(page.locator("#dialog #narration-feedback")).toContainText(
    "could not play",
  );
  await page.locator("[data-close]").first().click();
  await page.locator("#start-button").click();
  await page.locator("#guide-button").click();
  await page.locator("#meet-button").click();
  for (const question of zebra.quizzes) {
    await page.locator(`[data-answer="${question.correctChoiceId}"]`).click();
    await page.locator("#next-question").click();
  }
  await page.locator("#guide-button").click();
  await page.locator("#camera-button").click();
  await expect(page.locator("#shutter")).toBeEnabled();
  await page.locator("#shutter").click();
  await page.locator("#read-summary").click();
  await expect(page.locator("#dialog #narration-feedback")).toBeVisible();
  await expect(page.locator("#dialog #narration-feedback")).toContainText(
    "could not play",
  );
});

test("phone safari preview preserves volume changes, stops on close, and handles missing audio", async ({
  page,
}) => {
  await deviceVoiceFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./safari.html");
  await page.locator("#settings-button").click();
  await page.locator("#hear-guide").click();
  expect(await page.evaluate(() => window.__voiceTest.spoken.at(-1))).toBe(
    narratorSample,
  );
  const before = await page.evaluate(() => window.__voiceTest.cancels);
  await page.locator("#volume-setting").fill("0.35");
  await page.locator("#volume-setting").dispatchEvent("change");
  expect(await page.evaluate(() => window.__voiceTest.cancels)).toBe(before);
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__voiceTest.cancels))
    .toBeGreaterThan(before);
  await page.locator("#settings-button").click();
  await page.evaluate(() => {
    window.__voiceTest.mode = "missing";
  });
  await page.locator("#hear-guide").click();
  await expect(page.locator("#narration-feedback")).toContainText(
    "unavailable",
  );
  const size = await page.locator("#hear-guide").evaluate((button) => ({
    font: parseFloat(getComputedStyle(button).fontSize),
    height: button.getBoundingClientRect().height,
  }));
  expect(size.font).toBeGreaterThanOrEqual(16);
  expect(size.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.locator("#begin-safari").click();
  await expect(page.locator("#audio-notice")).toContainText("unavailable");
  await expect(page.locator("#guide-animal")).toBeVisible();
});
