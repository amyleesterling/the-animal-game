import { defineConfig } from "vitest/config";
export default defineConfig({
  // Relative asset paths, so a build works wherever it is served from: the
  // site root, or a subfolder like /weather/ on GitHub Pages. An absolute
  // base silently 404s every asset when the page is not at the root.
  base: "./",
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: { expedition: "index.html", weather: "weather-lab.html" },
    },
  },
});
