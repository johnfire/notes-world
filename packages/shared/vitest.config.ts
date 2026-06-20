import { defineConfig } from "vitest/config";

// Pure logic tests for the shared package (types + date/completion helpers).
// Node environment — no DOM, no React Native.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
