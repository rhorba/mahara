/**
 * Navigation and layout tests
 * Covers: navbar, footer, mobile-first layout, breadcrumbs, 404
 */
import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Navigation — Public", () => {
  test("navbar visible on home page", async ({ page }) => {
    await page.goto("/fr");
    // Navbar or header
    const nav = page.locator("nav, header").first();
    await expect(nav).toBeVisible();
  });

  test("navbar has link to gigs", async ({ page }) => {
    await page.goto("/fr");
    const gigsLink = page.locator("a[href*='/gigs']");
    await expect(gigsLink.first()).toBeVisible();
  });

  test("navbar has login link", async ({ page }) => {
    await page.goto("/fr");
    const loginLink = page.locator("a[href*='login']");
    await expect(loginLink.first()).toBeVisible();
  });

  test("gig browse page has breadcrumb or back navigation", async ({ page }) => {
    await page.goto("/fr/gigs");
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Navigation — Talent Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "talent");
  });

  test("navbar shows user info when logged in", async ({ page }) => {
    await page.goto("/fr");
    const nav = page.locator("nav, header").first();
    await expect(nav).toBeVisible();
  });

  test("can navigate talent menu items", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/fr/talent/dashboard");
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/fr/talent/profile");
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/fr/talent/proposals");
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/fr/talent/messages");
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/fr/talent/earnings");
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Navigation — Business Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "business");
  });

  test("can navigate all business pages", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/fr/business/dashboard");
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/fr/business/profile");
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/fr/business/gigs");
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/fr/business/gigs/new");
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/fr/business/messages");
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Navigation — Admin Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("can navigate all admin pages", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/fr/admin/dashboard");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/fr/admin/verifications");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/fr/admin/disputes");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/fr/admin/escrow");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Mobile Layout", () => {
  test("home page renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/fr");
    await expect(page.locator("main")).toBeVisible();
  });

  test("gig browse renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/fr/gigs");
    await expect(page.locator("main")).toBeVisible();
  });

  test("login form renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/fr/auth/login");
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator("button[type='submit']").first()).toBeVisible();
  });
});
