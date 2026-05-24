import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login page and signs in as admin", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "SCENT Wellness" })).toBeVisible();

    await page.locator('input[autocomplete="username"]').fill("admin");
    await page.locator('input[type="password"]').fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "SCENT Wellness" }).first()).toBeVisible();
    await expect(page.locator("aside").getByText("admin").first()).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[autocomplete="username"]').fill("admin");
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator("p.text-red-600")).toContainText(
      /invalid username or password/i
    );
  });

  test("redirects unauthenticated users from /app to login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });
});
