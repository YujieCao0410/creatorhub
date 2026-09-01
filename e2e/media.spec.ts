import path from "node:path";
import { expect, test } from "@playwright/test";
import { registerNewUser } from "./helpers";

const COVER = path.join(__dirname, "fixtures", "cover.png");

test.describe("media & tags", () => {
  test("upload a cover image and add tags to a post", async ({ page }) => {
    await registerNewUser(page);
    await page.goto("/dashboard/posts/new");

    await page.getByLabel("Title").fill("Post with media");
    await page.getByLabel("Content").fill("body text");

    // Tags: type + Enter.
    const tagInput = page.getByRole("textbox", { name: "Tags" });
    await tagInput.fill("design");
    await tagInput.press("Enter");
    await tagInput.fill("workflow");
    await tagInput.press("Enter");
    await expect(page.getByText("#design")).toBeVisible();
    await expect(page.getByText("#workflow")).toBeVisible();

    // Cover image upload (the file input is hidden behind the button).
    await page
      .locator('input[type="file"][accept^="image"]')
      .setInputFiles(COVER);
    await expect(page.getByRole("button", { name: "Replace" })).toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    await page.waitForURL("**/dashboard/posts");
    await expect(page.getByText("Post with media")).toBeVisible();

    // The tags render on the public post.
    await page.goto("/feed");
    await expect(
      page.getByRole("link", { name: "#design" }).first(),
    ).toBeVisible();
  });
});
