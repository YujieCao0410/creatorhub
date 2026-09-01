import { expect, test } from "@playwright/test";
import { registerNewUser } from "./helpers";

test.describe("social features", () => {
  test("follow a creator and see their posts in the Following feed", async ({
    page,
  }) => {
    await registerNewUser(page);

    await page.goto("/creators/bob");
    await page.getByRole("button", { name: "Follow" }).click();
    await expect(
      page.getByRole("button", { name: "Following" }),
    ).toBeVisible();

    await page.goto("/feed?tab=following");
    await expect(page.getByText("Designing a Consistent API")).toBeVisible();
  });

  test("like a post and the like persists across reloads", async ({ page }) => {
    await registerNewUser(page);
    await page.goto("/posts/a-note-on-slow-mornings");

    await page.getByRole("button", { name: "Like" }).click();
    await expect(page.getByRole("button", { name: "Unlike" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Unlike" })).toBeVisible();
  });

  test("comment on a post, then delete the comment", async ({ page }) => {
    await registerNewUser(page);
    await page.goto("/posts/keyset-pagination-in-practice");

    const text = `E2E comment ${Date.now()}`;
    await page.getByLabel("Add a comment").fill(text);
    await page.getByRole("button", { name: "Comment", exact: true }).click();
    await expect(page.getByText(text)).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByText(text)).toHaveCount(0);
  });
});
