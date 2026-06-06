import { defineConfig } from "vitest/config";

// Node-environment tests only (locale key-parity). The app itself runs under
// Expo/Metro, not vitest — these tests deliberately avoid React Native imports.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
