import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: { expedition: "index.html", weather: "weather-lab.html" },
    },
  },
});
