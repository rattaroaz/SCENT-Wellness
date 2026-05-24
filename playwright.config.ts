import { defineConfig, devices } from "@playwright/test";

/** Dedicated ports so E2E does not collide with local dev (3000/3001). */
const API_PORT = process.env.E2E_API_PORT || "3011";
const WEB_PORT = process.env.E2E_WEB_PORT || "3010";
const API_URL = process.env.E2E_API_URL || `http://127.0.0.1:${API_PORT}`;
const WEB_URL = process.env.E2E_WEB_URL || `http://127.0.0.1:${WEB_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev:e2e-backend",
      url: `${API_URL}/health`,
      cwd: ".",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL: "file:./prisma/e2e.db",
        JWT_SECRET: "e2e-jwt-secret",
        PORT: API_PORT,
        FRONTEND_URL: WEB_URL,
        LOG_LEVEL: "warn",
      },
    },
    {
      command: `npm run dev --workspace=frontend -- -p ${WEB_PORT}`,
      url: WEB_URL,
      cwd: ".",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: API_URL,
      },
    },
  ],
});
