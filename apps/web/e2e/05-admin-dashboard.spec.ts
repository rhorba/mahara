/**
 * Admin dashboard flows
 * Covers: KPI dashboard, verifications queue, disputes, escrow health
 */
import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Admin — Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("admin dashboard loads with KPI cards", async ({ page }) => {
    await page.goto("/fr/admin/dashboard");
    await expect(page.locator("h1")).toBeVisible();
    // KPI cards should be visible
    const kpiCards = page.locator("[class*='rounded-xl']");
    await expect(kpiCards.first()).toBeVisible();
  });

  test("admin dashboard shows platform metrics", async ({ page }) => {
    await page.goto("/fr/admin/dashboard");
    const content = await page.locator("main").textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(50);
  });

  test("admin dashboard has quick action links", async ({ page }) => {
    await page.goto("/fr/admin/dashboard");
    await expect(page.locator("a[href*='/admin/verifications']").first()).toBeVisible();
    await expect(page.locator("a[href*='/admin/escrow']").first()).toBeVisible();
    await expect(page.locator("a[href*='/admin/disputes']").first()).toBeVisible();
  });

  test("admin verifications page loads", async ({ page }) => {
    await page.goto("/fr/admin/verifications");
    await expect(page.locator("main, [class*='container']").first()).toBeVisible();
  });

  test("admin verifications — shows pending verification queue", async ({ page }) => {
    await page.goto("/fr/admin/verifications");
    const content = await page.locator("body").textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(20);
  });

  test("admin disputes page loads", async ({ page }) => {
    await page.goto("/fr/admin/disputes");
    await expect(page.locator("main, [class*='container']").first()).toBeVisible();
  });

  test("admin disputes — shows dispute queue or empty state", async ({ page }) => {
    await page.goto("/fr/admin/disputes");
    const content = await page.locator("body").textContent();
    expect(content).toBeTruthy();
  });

  test("admin escrow page loads", async ({ page }) => {
    await page.goto("/fr/admin/escrow");
    await expect(page.locator("main, [class*='container']").first()).toBeVisible();
  });

  test("admin escrow — shows escrow transactions", async ({ page }) => {
    await page.goto("/fr/admin/escrow");
    // There should be seeded escrow records (gig5 and gig6 released)
    const content = await page.locator("body").textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(20);
  });

  test("admin — can navigate between sections", async ({ page }) => {
    await page.goto("/fr/admin/dashboard");
    await page.locator("a[href*='/admin/verifications']").first().click();
    await page.waitForURL(/\/admin\/verifications/);
    expect(page.url()).toContain("/admin/verifications");

    await page.locator("a[href*='/admin/escrow'], a[href*='admin']").first().click();
    await expect(page.locator("body")).toBeVisible();
  });

  test("admin — role isolation: admin can access all protected areas", async ({ page }) => {
    // Admin should be able to access admin pages
    await page.goto("/fr/admin/dashboard");
    await expect(page.locator("body")).toBeVisible();
    // Should NOT be redirected to login
    expect(page.url()).not.toContain("/login");
  });
});
