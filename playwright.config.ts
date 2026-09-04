import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://creatorhub:creatorhub@localhost:5432/creatorhub_e2e?schema=public";

const TEST_ENV = {
  DATABASE_URL: E2E_DATABASE_URL,
  JWT_SECRET: "e2e-secret-that-is-at-least-thirty-two-chars",
  APP_URL: BASE_URL,
  RATE_LIMIT_DISABLED: "1",
};

/**
 * End-to-end tests run a production build of the app against a dedicated
 * Postgres database, reset and seeded by e2e/global-setup.ts.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 45_000,
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `${envPrefix(TEST_ENV)} npm run e2e:app`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

function envPrefix(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ");
}
