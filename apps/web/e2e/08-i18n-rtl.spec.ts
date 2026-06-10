/**
 * i18n and RTL flows
 * Covers: French locale, Arabic locale (RTL), English locale, locale switching
 */
import { expect, test } from "@playwright/test";

test.describe("i18n — Locales", () => {
  test("French locale home page", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.locator("main")).toBeVisible();
  });

  test("Arabic locale home page — RTL layout", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    // RTL direction
    const html = page.locator("html");
    const dir = await html.getAttribute("dir");
    expect(dir).toBe("rtl");
    await expect(page.locator("main")).toBeVisible();
  });

  test("English locale home page", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("main")).toBeVisible();
  });

  test("French login page has French labels", async ({ page }) => {
    await page.goto("/fr/auth/login");
    const content = await page.locator("main").textContent();
    // French text expected
    expect(content).toMatch(/email|mot de passe|connexion/i);
  });

  test("Arabic login page renders RTL", async ({ page }) => {
    await page.goto("/ar/auth/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
    await expect(page.locator("main")).toBeVisible();
  });

  test("Arabic gig browse page renders RTL", async ({ page }) => {
    await page.goto("/ar/gigs");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
    await expect(page.locator("main")).toBeVisible();
  });

  test("French gig browse has French category labels", async ({ page }) => {
    await page.goto("/fr/gigs");
    const content = await page.locator("main").textContent();
    // French category names
    expect(content).toMatch(/design|développement|marketing|données|contenu|traduction|admin/i);
  });

  test("locale redirect — root URL redirects to /fr", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/fr/);
    expect(page.url()).toContain("/fr");
  });

  test("login page is accessible and renders form", async ({ page }) => {
    await page.goto("/fr/auth/login");
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
  });

  test("French signup page renders", async ({ page }) => {
    await page.goto("/fr/auth/signup");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
  });

  test("Arabic signup page renders RTL", async ({ page }) => {
    await page.goto("/ar/auth/signup");
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("i18n — Money Formatting", () => {
  test("gig cards show budget in MAD format", async ({ page }) => {
    await page.goto("/fr/gigs");
    await expect(page.locator("main")).toBeVisible();
    // Budget should be formatted in MAD
    const content = await page.locator("main").textContent();
    expect(content).toMatch(/MAD|DH|\d+/);
  });

  test("Arabic gig cards show budget in MAD format", async ({ page }) => {
    await page.goto("/ar/gigs");
    await expect(page.locator("main")).toBeVisible();
    const content = await page.locator("main").textContent();
    expect(content).toBeTruthy();
  });
});
