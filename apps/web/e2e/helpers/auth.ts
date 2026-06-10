import type { Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  role: "talent" | "business" | "admin",
) {
  const credentials = {
    talent: { email: "yasmine@demo.mahara.ma", password: "demo1234" },
    business: { email: "hassan@demo.mahara.ma", password: "demo1234" },
    admin: { email: "admin@demo.mahara.ma", password: "demo1234" },
  };

  const dashboardPath = {
    talent: "/fr/talent/dashboard",
    business: "/fr/business/dashboard",
    admin: "/fr/admin/dashboard",
  };

  const { email, password } = credentials[role];
  const target = dashboardPath[role];

  await page.goto("/fr/auth/login");
  await page.locator("input#email").fill(email);
  await page.locator("input#password").fill(password);
  // Use text to distinguish from Google OAuth button (also type="submit")
  await page.getByRole("button", { name: /se connecter|connexion/i }).click();

  // Wait for auth/redirect chain to land on the role's dashboard (60s for webpack warm-up)
  await page.waitForURL((url) => url.toString().includes(target), {
    timeout: 60000,
  });
}
