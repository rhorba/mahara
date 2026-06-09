import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@mahara/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@mahara/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
      "@mahara/matching": path.resolve(__dirname, "../../packages/matching/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
