import { expect, test } from "@playwright/test";

test.describe("public browsing (anonymous)", () => {
  test("landing page invites sign-up", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /home for your work/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
  });

  test("feed lists published posts without login", async ({ page }) => {
    await page.goto("/feed");
    await expect(page.getByText("Designing a Consistent API")).toBeVisible();
    await expect(page.getByText("Keyset Pagination in Practice")).toBeVisible();
  });

  test("post detail shows content and a login prompt for commenting", async ({
    page,
  }) => {
    await page.goto("/posts/designing-a-consistent-api");
    await expect(
      page.getByRole("heading", { name: "Designing a Consistent API" }),
    ).toBeVisible();
    await expect(
      page.locator("#comments").getByRole("link", { name: /log in/i }),
    ).toBeVisible();
  });

  test("creator profile shows stats and posts", async ({ page }) => {
    await page.goto("/creators/bob");
    await expect(
      page.getByRole("heading", { name: "Bob Chen" }),
    ).toBeVisible();
    await expect(page.getByText("posts", { exact: false })).toBeVisible();
  });

  test("search finds a post by keyword", async ({ page }) => {
    await page.goto("/search?q=pagination");
    await expect(
      page.getByText("Keyset Pagination in Practice"),
    ).toBeVisible();
  });

  test("pricing page shows both plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
  });

  test("dashboard redirects anonymous users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
