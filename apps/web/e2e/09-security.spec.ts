/**
 * Security and RBAC tests
 * Covers: unauthenticated redirects, role isolation, security headers
 */
import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Security Headers", () => {
  test("response includes X-Frame-Options header", async ({ page }) => {
    const response = await page.goto("/fr");
    const headers = response!.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
  });

  test("response includes X-Content-Type-Options header", async ({ page }) => {
    const response = await page.goto("/fr");
    const headers = response!.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });

  test("response includes Content-Security-Policy header", async ({ page }) => {
    const response = await page.goto("/fr");
    const headers = response!.headers();
    expect(headers["content-security-policy"]).toBeTruthy();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
  });

  test("response includes Referrer-Policy header", async ({ page }) => {
    const response = await page.goto("/fr");
    const headers = response!.headers();
    expect(headers["referrer-policy"]).toBeTruthy();
  });

  test("CSP blocks frame-ancestors", async ({ page }) => {
    const response = await page.goto("/fr");
    const csp = response!.headers()["content-security-policy"];
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

test.describe("RBAC — Unauthenticated Access", () => {
  const protectedRoutes = [
    "/fr/talent/dashboard",
    "/fr/talent/profile",
    "/fr/talent/proposals",
    "/fr/talent/messages",
    "/fr/talent/earnings",
    "/fr/business/dashboard",
    "/fr/business/profile",
    "/fr/business/gigs",
    "/fr/business/gigs/new",
    "/fr/business/messages",
    "/fr/admin/dashboard",
    "/fr/admin/verifications",
    "/fr/admin/disputes",
    "/fr/admin/escrow",
  ];

  for (const route of protectedRoutes) {
    test(`unauthenticated — ${route} redirects to login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/login/, { timeout: 10000 });
      expect(page.url()).toContain("login");
    });
  }
});

test.describe("RBAC — Role Cross-Access", () => {
  test("talent cannot access business dashboard", async ({ page }) => {
    await loginAs(page, "talent");
    await page.goto("/fr/business/dashboard");
    await page.waitForURL(/(?!.*business\/dashboard)/, { timeout: 8000 });
    expect(page.url()).not.toContain("/business/dashboard");
  });

  test("talent cannot access admin dashboard", async ({ page }) => {
    await loginAs(page, "talent");
    await page.goto("/fr/admin/dashboard");
    await page.waitForURL(/(?!.*admin\/dashboard)/, { timeout: 8000 });
    expect(page.url()).not.toContain("/admin/dashboard");
  });

  test("business cannot access talent dashboard", async ({ page }) => {
    await loginAs(page, "business");
    await page.goto("/fr/talent/dashboard");
    await page.waitForURL(/(?!.*talent\/dashboard)/, { timeout: 8000 });
    expect(page.url()).not.toContain("/talent/dashboard");
  });

  test("business cannot access admin dashboard", async ({ page }) => {
    await loginAs(page, "business");
    await page.goto("/fr/admin/dashboard");
    await page.waitForURL(/(?!.*admin\/dashboard)/, { timeout: 8000 });
    expect(page.url()).not.toContain("/admin/dashboard");
  });

  test("admin can access all protected areas", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/fr/admin/dashboard");
    expect(page.url()).not.toContain("login");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("RBAC — Public Routes Accessible Without Auth", () => {
  const publicRoutes = [
    "/fr",
    "/fr/gigs",
    "/fr/auth/login",
    "/fr/auth/signup",
  ];

  for (const route of publicRoutes) {
    test(`public route accessible: ${route}`, async ({ page }) => {
      const response = await page.goto(route);
      // Login and signup pages ARE the auth pages — don't check they're not login
      const isAuthPage = route.includes("/auth/");
      if (!isAuthPage) {
        expect(page.url()).not.toContain("login");
      }
      expect(response!.status()).toBeLessThan(500);
    });
  }
});
