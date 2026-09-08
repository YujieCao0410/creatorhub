import { expect, test } from "@playwright/test";
import { registerNewUser } from "./helpers";

test.describe("post editor", () => {
  test("caption with inline hashtags becomes the post's tags", async ({
    page,
  }) => {
    await registerNewUser(page);
    await page.goto("/dashboard/posts/new");

    await page
      .getByLabel(/Caption/)
      .fill("my first dance video #design #workflow");

    await page.getByRole("button", { name: "Publish" }).click();
    await page.waitForURL("**/dashboard/posts");
    await expect(page.getByText("my first dance video")).toBeVisible();

    // Hashtags from the caption are extracted and render on the public post.
    await page.goto("/feed");
    await expect(
      page.getByRole("link", { name: "#design" }).first(),
    ).toBeVisible();
  });
});
