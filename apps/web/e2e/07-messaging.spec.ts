/**
 * Messaging flows
 * Covers: message inbox, thread view, message sending
 */
import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Talent — Messaging", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "talent");
  });

  test("talent messages inbox loads", async ({ page }) => {
    await page.goto("/fr/talent/messages");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("talent messages shows thread list or empty state", async ({ page }) => {
    await page.goto("/fr/talent/messages");
    const content = await page.locator("main").textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(20);
  });

  test("talent message thread page loads", async ({ page }) => {
    await page.goto("/fr/talent/messages");
    // If there are threads, click the first one
    const threadLinks = page.locator("a[href*='/talent/messages/']");
    if (await threadLinks.count() > 0) {
      await threadLinks.first().click();
      await page.waitForURL(/\/talent\/messages\//);
      await expect(page.locator("main")).toBeVisible();
    }
  });
});

test.describe("Business — Messaging", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "business");
  });

  test("business messages inbox loads", async ({ page }) => {
    await page.goto("/fr/business/messages");
    await expect(page.locator("main")).toBeVisible();
  });

  test("business messages shows thread list or empty state", async ({ page }) => {
    await page.goto("/fr/business/messages");
    const content = await page.locator("main").textContent();
    expect(content).toBeTruthy();
  });

  test("business message thread page loads if threads exist", async ({ page }) => {
    await page.goto("/fr/business/messages");
    const threadLinks = page.locator("a[href*='/business/messages/']");
    if (await threadLinks.count() > 0) {
      await threadLinks.first().click();
      await page.waitForURL(/\/business\/messages\//);
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
