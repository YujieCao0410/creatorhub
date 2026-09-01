import { expect, test } from "@playwright/test";
import { registerNewUser } from "./helpers";

test.describe("content management", () => {
  test("create a draft, publish it, then delete it", async ({ page }) => {
    const user = await registerNewUser(page);

    // Create a published post directly.
    await page.goto("/dashboard/posts/new");
    await page.getByLabel("Title").fill("My E2E Post");
    await page.getByLabel("Content").fill("Body written by an end-to-end test.");
    await page.getByRole("button", { name: "Publish" }).click();
    await page.waitForURL("**/dashboard/posts");
    await expect(page.getByText("My E2E Post")).toBeVisible();
    await expect(page.getByText("Published")).toBeVisible();

    // It appears on the public profile.
    await page.goto(`/creators/${user.handle}`);
    await expect(
      page.getByRole("heading", { name: "My E2E Post" }),
    ).toBeVisible();

    // Delete it from the dashboard.
    await page.goto("/dashboard/posts");
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByText("My E2E Post")).toHaveCount(0);
  });

  test("title is required", async ({ page }) => {
    await registerNewUser(page);
    await page.goto("/dashboard/posts/new");
    await page.getByLabel("Content").fill("No title here.");
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Title is required")).toBeVisible();
  });
});
