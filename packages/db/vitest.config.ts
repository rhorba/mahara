import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests need real DB — set DATABASE_URL to enable
    testTimeout: 30_000,
  },
});
