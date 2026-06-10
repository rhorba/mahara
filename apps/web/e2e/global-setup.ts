import { chromium } from "@playwright/test";

/**
 * Pre-warms the Next.js dev server CSS compilation before tests run.
 * Tailwind v4 + PostCSS compiles CSS on first request; this ensures
 * all test videos show fully styled pages from the first frame.
 */
export default async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: "http://localhost:3003",
    viewport: { width: 1280, height: 720 },
    locale: "fr-FR",
  });
  const page = await context.newPage();

  const warmupPages = [
    "http://localhost:3003/fr",
    "http://localhost:3003/fr/gigs",
    "http://localhost:3003/fr/auth/login",
    "http://localhost:3003/fr/auth/signup",
  ];

  for (const url of warmupPages) {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  }

  await context.close();
  await browser.close();
}
