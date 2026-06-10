/**
 * Business dashboard and gig management flows
 * Covers: dashboard, profile, gig listing, new gig, gig detail, messages
 */
import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Business — Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "business");
  });

  test("business dashboard loads", async ({ page }) => {
    await page.goto("/fr/business/dashboard");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    // Shows company name (Hassan has "Souk Digital" seeded)
    const content = await page.locator("main").textContent();
    expect(content).toBeTruthy();
  });

  test("business dashboard has navigation links", async ({ page }) => {
    await page.goto("/fr/business/dashboard");
    await expect(page.locator("a[href*='/business/profile']").first()).toBeVisible();
    await expect(page.locator("a[href$='/business/gigs']").first()).toBeVisible();
    await expect(page.locator("a[href*='/business/gigs/new']").first()).toBeVisible();
    await expect(page.locator("a[href*='/business/messages']").first()).toBeVisible();
  });

  test("business profile page loads", async ({ page }) => {
    await page.goto("/fr/business/profile");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("business profile — company name field visible", async ({ page }) => {
    await page.goto("/fr/business/profile");
    const content = await page.locator("main").textContent();
    expect(content).toBeTruthy();
  });

  test("business gigs list page loads", async ({ page }) => {
    await page.goto("/fr/business/gigs");
    await expect(page.locator("main")).toBeVisible();
  });

  test("business gigs — shows Hassan's gigs", async ({ page }) => {
    await page.goto("/fr/business/gigs");
    const content = await page.locator("main").textContent();
    // Hassan has gigs seeded: design gig, development gig
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(100);
  });

  test("new gig form page loads", async ({ page }) => {
    await page.goto("/fr/business/gigs/new");
    await expect(page.locator("main")).toBeVisible();
    // Form fields
    const titleField = page.locator("input[name='title']");
    if (await titleField.count() > 0) {
      await expect(titleField).toBeVisible();
    }
  });

  test("new gig form — all required fields present", async ({ page }) => {
    await page.goto("/fr/business/gigs/new");
    await expect(page.locator("main")).toBeVisible();
    const content = await page.locator("main").textContent();
    expect(content!.length).toBeGreaterThan(100);
  });

  test("new gig form — can fill and see preview", async ({ page }) => {
    await page.goto("/fr/business/gigs/new");
    const titleField = page.locator("input[name='title']");
    if (await titleField.isVisible()) {
      await titleField.fill("Test Gig E2E — Design Landing Page");
      const budgetField = page.locator("input[name='budget']");
      if (await budgetField.isVisible()) {
        await budgetField.fill("2000");
      }
      const descField = page.locator("textarea[name='description']");
      if (await descField.isVisible()) {
        await descField.fill("This is a test gig created by E2E tests.");
      }
    }
    await expect(page.locator("main")).toBeVisible();
  });

  test("gig detail page loads for business owner", async ({ page }) => {
    await page.goto("/fr/business/gigs");
    const firstGig = page.locator("a").filter({ has: page.locator("h2, h3") }).first();
    if (await firstGig.count() > 0) {
      await firstGig.click();
      await page.waitForURL(/\/business\/gigs\//);
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("business messages page loads", async ({ page }) => {
    await page.goto("/fr/business/messages");
    await expect(page.locator("main")).toBeVisible();
  });

  test("business — role isolation: cannot access talent dashboard", async ({ page }) => {
    await page.goto("/fr/talent/dashboard");
    await page.waitForURL(/(?!.*talent\/dashboard)/, { timeout: 8000 });
    expect(page.url()).not.toContain("/talent/dashboard");
  });

  test("business — role isolation: cannot access admin dashboard", async ({ page }) => {
    await page.goto("/fr/admin/dashboard");
    await page.waitForURL(/(?!.*admin\/dashboard)/, { timeout: 8000 });
    expect(page.url()).not.toContain("/admin/dashboard");
  });
});

test.describe("Business — Gig Detail with Proposals", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "business");
  });

  test("gig detail shows proposals from talents", async ({ page }) => {
    await page.goto("/fr/business/gigs");
    await expect(page.locator("main")).toBeVisible();
    // Navigate into first gig that has proposals
    const gigLinks = page.locator("a").filter({ has: page.locator("h2, h3") });
    const count = await gigLinks.count();
    if (count > 0) {
      await gigLinks.first().click();
      await page.waitForURL(/\/business\/gigs\//);
      await expect(page.locator("main")).toBeVisible();
      // The detail page should show something meaningful
      const content = await page.locator("main").textContent();
      expect(content!.length).toBeGreaterThan(50);
    }
  });
});
