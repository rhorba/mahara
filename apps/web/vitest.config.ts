import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Array form ensures specific subpath aliases resolve before package-root aliases.
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // Subpaths first (more specific → must come before package roots)
      {
        find: "@mahara/core/money",
        replacement: path.resolve(__dirname, "../../packages/core/src/money.ts"),
      },
      {
        find: "@mahara/core/types",
        replacement: path.resolve(__dirname, "../../packages/core/src/types.ts"),
      },
      {
        find: "@mahara/core/rbac",
        replacement: path.resolve(__dirname, "../../packages/core/src/rbac.ts"),
      },
      {
        find: "@mahara/core/schemas",
        replacement: path.resolve(__dirname, "../../packages/core/src/schemas.ts"),
      },
      {
        find: "@mahara/db/client",
        replacement: path.resolve(__dirname, "../../packages/db/src/client.ts"),
      },
      {
        find: "@mahara/db/schema",
        replacement: path.resolve(__dirname, "../../packages/db/src/schema/index.ts"),
      },
      {
        find: "@mahara/notifications/queue",
        replacement: path.resolve(__dirname, "../../packages/notifications/src/queue.ts"),
      },
      {
        find: "@mahara/notifications/email",
        replacement: path.resolve(__dirname, "../../packages/notifications/src/email.ts"),
      },
      // Package roots (less specific — come after subpaths)
      {
        find: "@mahara/core",
        replacement: path.resolve(__dirname, "../../packages/core/src/index.ts"),
      },
      {
        find: "@mahara/db",
        replacement: path.resolve(__dirname, "../../packages/db/src/index.ts"),
      },
      {
        find: "@mahara/matching",
        replacement: path.resolve(__dirname, "../../packages/matching/src/index.ts"),
      },
      {
        find: "@mahara/payments",
        replacement: path.resolve(__dirname, "../../packages/payments/src/index.ts"),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
