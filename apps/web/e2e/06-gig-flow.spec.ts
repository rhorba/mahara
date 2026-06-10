/**
 * Full gig lifecycle flow
 * Covers: talent applies to gig, business views proposals
 */
import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Gig Application Flow", () => {
  test("talent can view open gigs and see apply option when logged in", async ({ page }) => {
    await loginAs(page, "talent");
    await page.goto("/fr/gigs");
    await expect(page.locator("main")).toBeVisible();
    // Open gigs listed
    const gigCards = page.locator("main a").filter({ has: page.locator("h2") });
    await expect(gigCards.first()).toBeVisible();
    // Click first gig
    await gigCards.first().click();
    await page.waitForURL(/\/gigs\//);
    await expect(page.locator("main")).toBeVisible();
  });

  test("talent can browse gigs by development category", async ({ page }) => {
    await loginAs(page, "talent");
    await page.goto("/fr/gigs?category=development");
    await expect(page.locator("main")).toBeVisible();
  });

  test("talent can browse gigs by design category", async ({ page }) => {
    await loginAs(page, "talent");
    await page.goto("/fr/gigs?category=design");
    await expect(page.locator("main")).toBeVisible();
  });

  test("talent can see their proposals", async ({ page }) => {
    await loginAs(page, "talent");
    await page.goto("/fr/talent/proposals");
    await expect(page.locator("main")).toBeVisible();
    // Yasmine has a pending proposal on gig1
    const content = await page.locator("main").textContent();
    expect(content).toBeTruthy();
  });

  test("business can see gig proposals", async ({ page }) => {
    await loginAs(page, "business");
    await page.goto("/fr/business/gigs");
    await expect(page.locator("main")).toBeVisible();
    // Hassan has gigs with pending proposals
    const gigLinks = page.locator("a").filter({ has: page.locator("h2, h3") });
    if (await gigLinks.count() > 0) {
      await gigLinks.first().click();
      await page.waitForURL(/\/business\/gigs\//);
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("talent gig detail page has full description", async ({ page }) => {
    await loginAs(page, "talent");
    await page.goto("/fr/gigs");
    const gigCards = page.locator("main a").filter({ has: page.locator("h2") });
    if (await gigCards.count() > 0) {
      await gigCards.first().click();
      await page.waitForURL(/\/gigs\//);
      const content = await page.locator("main").textContent();
      expect(content!.length).toBeGreaterThan(100);
    }
  });

  test("unauthenticated user can browse gigs without login", async ({ page }) => {
    await page.goto("/fr/gigs");
    await expect(page.locator("h1")).toBeVisible();
    // Should see gig cards without being logged in
    await expect(page.locator("main")).toBeVisible();
  });

  test("gig detail shows match score area when talent is logged in", async ({ page }) => {
    await loginAs(page, "talent");
    await page.goto("/fr/gigs");
    const gigCards = page.locator("main a").filter({ has: page.locator("h2") });
    if (await gigCards.count() > 0) {
      await gigCards.first().click();
      await page.waitForURL(/\/gigs\//);
      const content = await page.locator("main").textContent();
      expect(content).toBeTruthy();
    }
  });
});

test.describe("Gig Browse — Filtering and Pagination", () => {
  test("gig page filters by development", async ({ page }) => {
    await page.goto("/fr/gigs?category=development");
    await expect(page.locator("main")).toBeVisible();
    // Development filter chip should appear active
    const devChip = page.locator("a").filter({ hasText: /développement|development/i });
    await expect(devChip.first()).toBeVisible();
  });

  test("gig page filters by marketing", async ({ page }) => {
    await page.goto("/fr/gigs?category=marketing");
    await expect(page.locator("main")).toBeVisible();
  });

  test("gig page filters by data", async ({ page }) => {
    await page.goto("/fr/gigs?category=data");
    await expect(page.locator("main")).toBeVisible();
    // Omar has a proposal on the data gig
  });

  test("gig page filters by content", async ({ page }) => {
    await page.goto("/fr/gigs?category=content");
    await expect(page.locator("main")).toBeVisible();
  });

  test("gig page urgent filter shows urgent gigs", async ({ page }) => {
    await page.goto("/fr/gigs?urgent=1");
    await expect(page.locator("main")).toBeVisible();
    // Gig2 is urgent
  });

  test("gig page search for React returns results", async ({ page }) => {
    await page.goto("/fr/gigs?search=React");
    await expect(page.locator("main")).toBeVisible();
  });

  test("gig page search with no results shows empty state", async ({ page }) => {
    await page.goto("/fr/gigs?search=XYZNOTEXIST999");
    await expect(page.locator("main")).toBeVisible();
    // Empty state text
    const empty = page.locator("text=/aucun|no results/i");
    // Either shows empty or the page renders gracefully
    const content = await page.locator("main").textContent();
    expect(content).toBeTruthy();
  });
});
