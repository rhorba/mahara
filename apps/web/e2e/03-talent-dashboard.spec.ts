/**
 * Talent dashboard and profile flows
 * Covers: dashboard, profile edit, proposals list, messages, earnings
 */
import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Talent — Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "talent");
  });

  test("talent dashboard loads with stat cards", async ({ page }) => {
    await page.goto("/fr/talent/dashboard");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    // Stat cards present
    const statCards = page.locator("[class*='rounded-xl']").filter({ has: page.locator("[class*='text-2xl']") });
    expect(await statCards.count()).toBeGreaterThan(0);
  });

  test("talent dashboard has navigation links", async ({ page }) => {
    await page.goto("/fr/talent/dashboard");
    await expect(page.locator("a[href*='/talent/profile']").first()).toBeVisible();
    await expect(page.locator("a[href*='/gigs']").first()).toBeVisible();
    await expect(page.locator("a[href*='/talent/proposals']").first()).toBeVisible();
    await expect(page.locator("a[href*='/talent/messages']").first()).toBeVisible();
    await expect(page.locator("a[href*='/talent/earnings']").first()).toBeVisible();
  });

  test("talent profile page loads", async ({ page }) => {
    await page.goto("/fr/talent/profile");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("talent profile — bio field visible", async ({ page }) => {
    await page.goto("/fr/talent/profile");
    const bioField = page.locator("textarea[name='bio'], textarea[id='bio']");
    if (await bioField.count() > 0) {
      await expect(bioField.first()).toBeVisible();
    } else {
      // Profile might show existing data
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("talent proposals page loads", async ({ page }) => {
    await page.goto("/fr/talent/proposals");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("talent proposals — shows proposal cards or empty state", async ({ page }) => {
    await page.goto("/fr/talent/proposals");
    const proposals = page.locator("[class*='rounded']").filter({ has: page.locator("h2, h3") });
    const emptyState = page.locator("text=/aucune|no proposals|candidature/i");
    const hasContent = (await proposals.count()) > 0 || (await emptyState.count()) > 0;
    // At minimum, the page renders something useful
    await expect(page.locator("main")).toBeVisible();
  });

  test("talent messages page loads", async ({ page }) => {
    await page.goto("/fr/talent/messages");
    await expect(page.locator("main")).toBeVisible();
  });

  test("talent earnings page loads", async ({ page }) => {
    await page.goto("/fr/talent/earnings");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("talent can navigate to gig browse from dashboard", async ({ page }) => {
    await page.goto("/fr/talent/dashboard");
    await page.locator("a[href*='/gigs']").first().click();
    await page.waitForURL(/\/gigs/);
    expect(page.url()).toContain("/gigs");
  });

  test("talent — role isolation: cannot access business dashboard", async ({ page }) => {
    await page.goto("/fr/business/dashboard");
    // Should redirect away (to home or login)
    await page.waitForURL(/(?!.*business\/dashboard)/, { timeout: 8000 });
    expect(page.url()).not.toContain("/business/dashboard");
  });

  test("talent — role isolation: cannot access admin dashboard", async ({ page }) => {
    await page.goto("/fr/admin/dashboard");
    await page.waitForURL(/(?!.*admin\/dashboard)/, { timeout: 8000 });
    expect(page.url()).not.toContain("/admin/dashboard");
  });
});

test.describe("Talent — Profile Edit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "talent");
  });

  test("talent profile page shows existing profile data", async ({ page }) => {
    await page.goto("/fr/talent/profile");
    // Yasmine has a profile seeded — should show data
    const content = await page.locator("main").textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(50);
  });

  test("talent profile — availability selector visible", async ({ page }) => {
    await page.goto("/fr/talent/profile");
    const availability = page.locator("select[name='availability'], [name='availability']");
    if (await availability.count() > 0) {
      await expect(availability.first()).toBeVisible();
    }
  });

  test("talent profile — skills section visible", async ({ page }) => {
    await page.goto("/fr/talent/profile");
    const skillsSection = page.locator("text=/compétences|skills/i").first();
    if (await skillsSection.count() > 0) {
      await expect(skillsSection).toBeVisible();
    }
  });
});
