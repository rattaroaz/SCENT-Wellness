import { test, expect } from "@playwright/test";
import {
  createPatientViaApi,
  createTemplateViaApi,
  loginApi,
} from "./helpers";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[autocomplete="username"]').fill("admin");
  await page.locator('input[type="password"]').fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("aside").getByText("admin").first()).toBeVisible();
}

test.describe("Patient and campaign flow", () => {
  test("creates a patient and starts a campaign", async ({ page, request }) => {
    const token = await loginApi(request);
    const mrn = `E2E-${Date.now()}`;
    const templateName = `E2E Template ${Date.now()}`;
    await createTemplateViaApi(request, token, templateName);
    await createPatientViaApi(request, token, mrn);

    // Fresh session so AppContext loads templates/patients including API fixtures
    await page.addInitScript((t) => {
      localStorage.setItem("token", t);
    }, token);
    await page.goto("/app");
    await expect(page.locator("aside").getByText("admin").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.locator("aside nav").getByRole("button", { name: "Patient" }).click();
    await page.getByPlaceholder(/Name, MRN/i).fill(mrn);
    await page.getByRole("button", { name: new RegExp(mrn) }).click();

    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    await expect(page.getByText(mrn)).toBeVisible();

    const templateSelect = page.locator("select").first();
    await templateSelect.selectOption({ label: templateName });
    await page.getByRole("button", { name: /Start campaign/i }).click();

    await expect(page.getByRole("heading", { name: "Threads" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(templateName)).toBeVisible({ timeout: 15_000 });
  });

  test("navigates between main sections", async ({ page }) => {
    await signIn(page);
    const nav = page.locator("aside nav");

    await nav.getByRole("button", { name: "Templates" }).click();
    await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible();

    await nav.getByRole("button", { name: "Threads" }).click();
    await expect(page.getByRole("heading", { name: "Threads" })).toBeVisible();

    await nav.getByRole("button", { name: "Messages" }).click();
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  });
});
