import { expect, test } from "@playwright/test";
import { login, registerNewUser, SEED } from "./helpers";

test.describe("authentication", () => {
  test("register, then logout, then log back in", async ({ page }) => {
    const user = await registerNewUser(page);
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: `Welcome, ${user.name}` }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL("**/");
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();

    await login(page, user.email, user.password);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: `Welcome, ${user.name}` }),
    ).toBeVisible();
  });

  test("wrong password shows an error and stays on the login page", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(SEED.bob.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("a signed-in user is redirected away from /login", async ({ page }) => {
    await registerNewUser(page);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("registration rejects a duplicate handle", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Impostor");
    await page.getByLabel("Handle").fill(SEED.bob.handle);
    await page.getByLabel("Email").fill("impostor@example.com");
    await page.getByLabel("Password").fill("supersecret123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/handle is already taken/i)).toBeVisible();
  });
});
