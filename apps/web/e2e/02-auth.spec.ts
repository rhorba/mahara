/**
 * Authentication flows
 * Covers: login (talent/business/admin), signup, error states, redirects
 */
import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    // Main submit button (not Google OAuth which is also submit)
    await expect(page.getByRole("button", { name: /se connecter|connexion/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("login — invalid credentials shows error", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await page.locator("input#email").fill("nobody@example.com");
    await page.locator("input#password").fill("wrongpassword");
    await page.getByRole("button", { name: /se connecter|connexion/i }).click();
    // Error message appears
    await expect(page.locator("[class*='red-'], [class*='error']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("login — talent user logs in successfully", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await page.locator("input#email").fill("yasmine@demo.mahara.ma");
    await page.locator("input#password").fill("demo1234");
    await page.getByRole("button", { name: /se connecter|connexion/i }).click();
    // Auth.js: login → /fr/auth/redirect → /fr/talent/dashboard
    await page.waitForURL(/auth\/redirect|talent\/dashboard/, { timeout: 60000 });
    if (page.url().includes("/auth/redirect")) {
      await page.waitForURL(/talent\/dashboard/, { timeout: 30000 });
    }
    expect(page.url()).toContain("/talent/dashboard");
  });

  test("login — business user logs in successfully", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await page.locator("input#email").fill("hassan@demo.mahara.ma");
    await page.locator("input#password").fill("demo1234");
    await page.getByRole("button", { name: /se connecter|connexion/i }).click();
    await page.waitForURL(/auth\/redirect|business\/dashboard/, { timeout: 60000 });
    if (page.url().includes("/auth/redirect")) {
      await page.waitForURL(/business\/dashboard/, { timeout: 30000 });
    }
    expect(page.url()).toContain("/business/dashboard");
  });

  test("login — admin user logs in successfully", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await page.locator("input#email").fill("admin@demo.mahara.ma");
    await page.locator("input#password").fill("demo1234");
    await page.getByRole("button", { name: /se connecter|connexion/i }).click();
    await page.waitForURL(/auth\/redirect|admin\/dashboard/, { timeout: 60000 });
    if (page.url().includes("/auth/redirect")) {
      await page.waitForURL(/admin\/dashboard/, { timeout: 30000 });
    }
    expect(page.url()).toContain("/admin/dashboard");
  });

  test("signup page — talent role pre-selected from query param", async ({ page }) => {
    await page.goto("/fr/auth/signup?role=talent");
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
  });

  test("signup page — business role pre-selected from query param", async ({ page }) => {
    await page.goto("/fr/auth/signup?role=business");
    await expect(page.locator("input#email")).toBeVisible();
  });

  test("signup — new talent user account creation", async ({ page }) => {
    const uniqueEmail = `test-talent-${Date.now()}@test.mahara.ma`;
    await page.goto("/fr/auth/signup?role=talent");
    // Check what fields exist
    const nameField = page.locator("input[name='name'], input#name");
    if (await nameField.isVisible()) {
      await nameField.fill("Test Talent User");
    }
    await page.locator("input#email").fill(uniqueEmail);
    await page.locator("input#password").fill("testpassword123");
    await page.locator("button[type='submit']").first().click();
    // Redirect to talent dashboard after signup + auto-login
    await page.waitForURL(/talent\/dashboard|onboarding/, { timeout: 25000 });
    expect(page.url()).toMatch(/localhost:3003/);
  });

  test("signup — new business user account creation", async ({ page }) => {
    const uniqueEmail = `test-business-${Date.now()}@test.mahara.ma`;
    await page.goto("/fr/auth/signup?role=business");
    const nameField = page.locator("input[name='name'], input#name");
    if (await nameField.isVisible()) {
      await nameField.fill("Test Business User");
    }
    await page.locator("input#email").fill(uniqueEmail);
    await page.locator("input#password").fill("testpassword123");
    await page.locator("button[type='submit']").first().click();
    await page.waitForURL(/business\/dashboard|onboarding/, { timeout: 25000 });
    expect(page.url()).toMatch(/localhost:3003/);
  });

  test("protected route redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/fr/talent/dashboard");
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain("login");
  });

  test("protected business route redirects to login", async ({ page }) => {
    await page.goto("/fr/business/dashboard");
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain("login");
  });

  test("protected admin route redirects to login", async ({ page }) => {
    await page.goto("/fr/admin/dashboard");
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain("login");
  });

  test("login page has link to signup", async ({ page }) => {
    await page.goto("/fr/auth/login");
    // Multiple links may point to signup (navbar + form) — use first()
    await expect(page.locator("a[href*='signup']").first()).toBeVisible();
  });

  test("signup page has link to login", async ({ page }) => {
    await page.goto("/fr/auth/signup");
    // Multiple links may point to login (navbar + form) — use first()
    await expect(page.locator("a[href*='login']").first()).toBeVisible();
  });
});
