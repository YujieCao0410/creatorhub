import type Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import { handleStripeEvent, syncSubscription } from "./billing-service";

let user: Awaited<ReturnType<typeof registerUser>>;

beforeEach(async () => {
  await resetDb();
  user = await registerUser({
    email: "u@example.com",
    handle: "u",
    name: "U",
    password: "supersecret",
  });
  await prisma.subscription.create({
    data: { userId: user.id, stripeCustomerId: "cus_test_1" },
  });
});

function fakeSubscription(
  overrides: Partial<{
    status: Stripe.Subscription.Status;
    cancelAtPeriodEnd: boolean;
    periodEnd: number;
    customer: string;
    metadataUserId: string;
  }> = {},
): Stripe.Subscription {
  const periodEnd = overrides.periodEnd ?? 1_800_000_000;
  return {
    id: "sub_test_1",
    object: "subscription",
    status: overrides.status ?? "active",
    customer: overrides.customer ?? "cus_test_1",
    cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
    metadata: overrides.metadataUserId
      ? { userId: overrides.metadataUserId }
      : {},
    items: {
      object: "list",
      data: [
        {
          id: "si_1",
          current_period_end: periodEnd,
          price: { id: "price_pro" },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

describe("syncSubscription", () => {
  it("promotes the user to PRO on an active subscription", async () => {
    await syncSubscription(fakeSubscription({ status: "active" }));

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(dbUser.membership).toBe("PRO");

    const sub = await prisma.subscription.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(sub.status).toBe("active");
    expect(sub.stripeSubscriptionId).toBe("sub_test_1");
    expect(sub.priceId).toBe("price_pro");
    expect(sub.currentPeriodEnd?.getTime()).toBe(1_800_000_000 * 1000);
  });

  it("downgrades to FREE when the subscription is canceled", async () => {
    await syncSubscription(fakeSubscription({ status: "active" }));
    await syncSubscription(fakeSubscription({ status: "canceled" }));

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(dbUser.membership).toBe("FREE");
  });

  it("records cancel_at_period_end without downgrading yet", async () => {
    await syncSubscription(
      fakeSubscription({ status: "active", cancelAtPeriodEnd: true }),
    );
    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(dbUser.membership).toBe("PRO");
    const sub = await prisma.subscription.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(sub.cancelAtPeriodEnd).toBe(true);
  });

  it("matches the user by metadata.userId when the customer id is new", async () => {
    await syncSubscription(
      fakeSubscription({ customer: "cus_new", metadataUserId: user.id }),
    );
    const sub = await prisma.subscription.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(sub.stripeCustomerId).toBe("cus_new");
  });

  it("ignores subscriptions for unknown customers", async () => {
    await expect(
      syncSubscription(fakeSubscription({ customer: "cus_unknown" })),
    ).resolves.toBeUndefined();
  });

  it("is idempotent", async () => {
    const sub = fakeSubscription({ status: "active" });
    await syncSubscription(sub);
    await syncSubscription(sub);
    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(dbUser.membership).toBe("PRO");
  });
});

describe("handleStripeEvent", () => {
  it("processes customer.subscription.updated", async () => {
    await handleStripeEvent({
      type: "customer.subscription.updated",
      data: { object: fakeSubscription({ status: "active" }) },
    } as unknown as Stripe.Event);

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(dbUser.membership).toBe("PRO");
  });

  it("ignores unrelated event types", async () => {
    await expect(
      handleStripeEvent({
        type: "invoice.paid",
        data: { object: {} },
      } as unknown as Stripe.Event),
    ).resolves.toBeUndefined();
  });
});
