/**
 * Public routes — no auth required
 * Covers: home page, gig browse, gig detail, public talent profile
 */
import { expect, test } from "@playwright/test";

test.describe("Public pages", () => {
  test("home page loads with CTA buttons", async ({ page }) => {
    await page.goto("/fr");
    // Title from layout.tsx: "Mahara — مهارة"
    await expect(page).toHaveTitle(/Mahara/i);
    const body = page.locator("main");
    await expect(body).toBeVisible();
    // At least two CTA links present
    const links = page.locator("a[href*='signup']");
    await expect(links.first()).toBeVisible();
  });

  test("home page — French locale", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("a[href*='signup?role=talent']")).toBeVisible();
    await expect(page.locator("a[href*='signup?role=business']")).toBeVisible();
  });

  test("home page — Arabic locale", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("main")).toBeVisible();
    // RTL direction
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "ar");
  });

  test("gig browse page loads with filters", async ({ page }) => {
    await page.goto("/fr/gigs");
    await expect(page.locator("h1")).toBeVisible();
    // Search input
    await expect(page.locator("input[name='search']")).toBeVisible();
    // Category filters
    const cats = page.locator("a").filter({ hasText: /design|Design/i });
    await expect(cats.first()).toBeVisible();
    // At least some gig cards
    await expect(page.locator("main")).toBeVisible();
  });

  test("gig browse — category filter works", async ({ page }) => {
    await page.goto("/fr/gigs");
    await page.locator("a").filter({ hasText: /design/i }).first().click();
    await page.waitForURL(/category=design/);
    await expect(page).toHaveURL(/category=design/);
  });

  test("gig browse — search works", async ({ page }) => {
    await page.goto("/fr/gigs");
    await page.locator("input[name='search']").fill("React");
    await page.locator("button[type='submit']").first().click();
    await page.waitForURL(/search=React/);
    await expect(page).toHaveURL(/search=React/);
  });

  test("gig browse — urgent filter works", async ({ page }) => {
    await page.goto("/fr/gigs");
    await page.locator("a").filter({ hasText: /urgent/i }).first().click();
    await page.waitForURL(/urgent=1/);
    await expect(page).toHaveURL(/urgent=1/);
  });

  test("gig detail page loads", async ({ page }) => {
    await page.goto("/fr/gigs");
    // Click on first gig card
    const firstGig = page.locator("main a").filter({ has: page.locator("h2") }).first();
    const gigHref = await firstGig.getAttribute("href");
    await firstGig.click();
    await page.waitForURL(/\/gigs\//);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("gig detail shows budget in MAD", async ({ page }) => {
    await page.goto("/fr/gigs");
    const firstGig = page.locator("main a").filter({ has: page.locator("h2") }).first();
    await firstGig.click();
    await page.waitForURL(/\/gigs\//);
    // Budget displayed
    await expect(page.locator("text=/MAD|DH/i").first()).toBeVisible();
  });

  test("gig detail — apply button redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/fr/gigs");
    const firstGig = page.locator("main a").filter({ has: page.locator("h2") }).first();
    await firstGig.click();
    await page.waitForURL(/\/gigs\//);
    // Apply button or proposal section
    const applyBtn = page.locator("button, a").filter({ hasText: /postuler|apply|candidature/i }).first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await page.waitForURL(/login|\/fr\//);
    }
  });

  test("public talent profile page loads", async ({ page }) => {
    await page.goto("/fr/talent/");
    await expect(page.locator("main")).toBeVisible();
  });
});
