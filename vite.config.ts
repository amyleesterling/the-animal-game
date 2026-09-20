import { defineConfig } from "vitest/config";
export default defineConfig({
  base: "./",
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: {
        expedition: "index.html",
        animals: "animal-lab.html",
        safari: "safari.html",
      },
    },
  },
});
