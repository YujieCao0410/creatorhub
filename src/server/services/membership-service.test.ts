import { beforeEach, describe, expect, it } from "vitest";
import { PaymentRequiredError } from "@/lib/errors";
import { FREE_DRAFT_LIMIT } from "@/lib/membership";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import {
  getMembershipInfo,
  setMembership,
} from "./membership-service";
import { createPost } from "./post-service";

let user: Awaited<ReturnType<typeof registerUser>>;

beforeEach(async () => {
  await resetDb();
  user = await registerUser({
    email: "u@example.com",
    handle: "u",
    name: "U",
    password: "supersecret",
  });
});

describe("membership defaults", () => {
  it("new users are FREE", async () => {
    const info = await getMembershipInfo(user.id);
    expect(info.membership).toBe("FREE");
    expect(info.usage.draftLimit).toBe(FREE_DRAFT_LIMIT);
    expect(info.subscription).toBeNull();
  });
});

describe("FREE draft limit", () => {
  it(`blocks the ${FREE_DRAFT_LIMIT + 1}th draft with 402`, async () => {
    for (let i = 0; i < FREE_DRAFT_LIMIT; i++) {
      await createPost(user.id, {
        title: `Draft ${i}`,
        content: "…",
        publish: false,
      });
    }
    await expect(
      createPost(user.id, { title: "One too many", content: "…", publish: false }),
    ).rejects.toBeInstanceOf(PaymentRequiredError);
  });

  it("does not count published posts toward the limit", async () => {
    for (let i = 0; i < 5; i++) {
      await createPost(user.id, {
        title: `Live ${i}`,
        content: "…",
        publish: true,
      });
    }
    await expect(
      createPost(user.id, { title: "A draft", content: "…", publish: false }),
    ).resolves.toBeDefined();
  });

  it("PRO users have no draft limit", async () => {
    await setMembership(user.id, "PRO");
    for (let i = 0; i < FREE_DRAFT_LIMIT + 3; i++) {
      await createPost(user.id, {
        title: `Draft ${i}`,
        content: "…",
        publish: false,
      });
    }
    const info = await getMembershipInfo(user.id);
    expect(info.membership).toBe("PRO");
    expect(info.usage.draftLimit).toBeNull();
    expect(info.usage.drafts).toBe(FREE_DRAFT_LIMIT + 3);
  });
});
