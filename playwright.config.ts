import { defineConfig } from "@playwright/test";

// The port is configurable because this repo is worked on in more than one
// git worktree at a time. Reusing whatever already answers on 5173 silently
// tests the other worktree's app, and Vite's SPA fallback hides it behind a
// 200. Set PLAYWRIGHT_PORT to keep a run pinned to its own checkout.
const port = Number(process.env.PLAYWRIGHT_PORT || 5173);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`,
    browserName: "chromium",
    channel: "chrome",
    viewport: { width: 1440, height: 960 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"],
    },
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${port} --strictPort`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: false,
      },
});
