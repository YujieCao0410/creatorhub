import { type Page } from "@playwright/test";

export type TestUser = {
  name: string;
  handle: string;
  email: string;
  password: string;
};

/** Registers a brand-new user and waits for the dashboard. */
export async function registerNewUser(page: Page): Promise<TestUser> {
  const suffix = Math.random().toString(36).slice(2, 9);
  const user: TestUser = {
    name: `E2E ${suffix}`,
    handle: `e2e_${suffix}`,
    email: `e2e_${suffix}@example.com`,
    password: "supersecret123",
  };

  await page.goto("/register");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Handle").fill(user.handle);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard");

  return user;
}

export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Log out" }).first().click();
  await page.waitForURL("**/");
}

/** Seeded users from prisma/seed.ts. */
export const SEED = {
  alicePro: { email: "alice@example.com", password: "password123", handle: "alice" },
  bob: { email: "bob@example.com", password: "password123", handle: "bob" },
};
