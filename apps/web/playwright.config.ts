import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 90000,
  reporter: [
    ["list"],
    ["html", { outputFolder: "../../docs/playwright-report", open: "never" }],
    ["json", { outputFile: "../../docs/playwright-results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3003",
    trace: "on",
    video: {
      mode: "on",
      size: { width: 1280, height: 720 },
    },
    screenshot: "on",
    locale: "fr-FR",
    timezoneId: "Africa/Casablanca",
    viewport: { width: 1280, height: 720 },
  },
  outputDir: "../../docs/test-results",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
