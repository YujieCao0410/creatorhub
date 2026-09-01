import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import type { SelfUser } from "@/lib/dto";
import { env } from "@/lib/env";
import { NotFoundError } from "@/lib/errors";
import { getStripe, proPriceId, webhookSecret } from "@/lib/stripe";

export { stripeConfigured } from "@/lib/stripe";

const PRO_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
]);

async function ensureSubscriptionRow(userId: string) {
  return prisma.subscription.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

/** Creates a Stripe Checkout Session for the Pro plan; returns its URL. */
export async function createCheckoutSession(user: SelfUser): Promise<string> {
  const stripe = getStripe();
  const row = await ensureSubscriptionRow(user.id);

  let customerId = row.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { userId: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: proPriceId(), quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { userId: user.id } },
    success_url: `${env.APP_URL}/dashboard/membership?checkout=success`,
    cancel_url: `${env.APP_URL}/dashboard/membership?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Creates a Stripe Billing Portal session so the user can manage/cancel. */
export async function createPortalSession(user: SelfUser): Promise<string> {
  const stripe = getStripe();
  const row = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  if (!row?.stripeCustomerId) throw new NotFoundError("Billing account");

  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: `${env.APP_URL}/dashboard/membership`,
  });
  return session.url;
}

/** Verifies the Stripe signature and returns the parsed event. Throws on failure. */
export function verifyWebhook(payload: string, signature: string): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    webhookSecret(),
  );
}

/**
 * Applies a Stripe subscription's state to our database: updates the
 * Subscription row and flips `User.membership` between PRO and FREE. Idempotent,
 * so Stripe's at-least-once webhook delivery is safe.
 */
export async function syncSubscription(
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const metadataUserId = sub.metadata?.userId;

  const row = await prisma.subscription.findFirst({
    where: {
      OR: [
        ...(metadataUserId ? [{ userId: metadataUserId }] : []),
        { stripeCustomerId: customerId },
        { stripeSubscriptionId: sub.id },
      ],
    },
  });
  if (!row) return; // A customer we don't recognize — ignore.

  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;
  const isPro = PRO_STATUSES.has(sub.status);

  await prisma.$transaction([
    prisma.subscription.update({
      where: { userId: row.userId },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        status: sub.status,
        priceId: item?.price.id ?? null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      },
    }),
    prisma.user.update({
      where: { id: row.userId },
      data: { membership: isPro ? "PRO" : "FREE" },
    }),
  ]);
}

/** Routes a verified Stripe event to the right handler. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;

    case "checkout.session.completed": {
      const session = event.data.object;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (subscriptionId) {
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        await syncSubscription(sub);
      }
      break;
    }

    default:
      break;
  }
}
