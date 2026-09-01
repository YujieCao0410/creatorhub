import { expect, test } from "@playwright/test";
import { login, registerNewUser, SEED } from "./helpers";

test.describe("membership", () => {
  test("a new user is on the Free plan", async ({ page }) => {
    await registerNewUser(page);
    await page.goto("/dashboard/membership");
    await expect(page.getByText("Free plan")).toBeVisible();
    await expect(page.getByText("0 / 3")).toBeVisible();
  });

  test("a Pro user sees Manage billing on pricing", async ({ page }) => {
    await login(page, SEED.alicePro.email, SEED.alicePro.password);
    await page.goto("/dashboard/membership");
    await expect(page.getByText("Pro plan")).toBeVisible();

    await page.goto("/pricing");
    await expect(
      page.getByRole("link", { name: "Manage billing" }),
    ).toBeVisible();
  });

  test("Free accounts are capped at 3 drafts", async ({ page }) => {
    await registerNewUser(page);

    for (let i = 1; i <= 3; i++) {
      await page.goto("/dashboard/posts/new");
      await page.getByLabel("Title").fill(`Draft ${i}`);
      await page.getByLabel("Content").fill("draft body");
      await page.getByRole("button", { name: "Save draft" }).click();
      await page.waitForURL("**/dashboard/posts");
    }

    await page.goto("/dashboard/posts/new");
    await page.getByLabel("Title").fill("Draft 4");
    await page.getByLabel("Content").fill("draft body");
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page.getByText(/Upgrade to Pro for unlimited drafts/i)).toBeVisible();
  });
});
