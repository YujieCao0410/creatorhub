import "server-only";
import Stripe from "stripe";
import { env } from "./env";
import { ServiceUnavailableError } from "./errors";

/**
 * Server-only Stripe client. `import "server-only"` makes the build fail if this
 * module is ever pulled into a Client Component, so the secret key can't leak.
 */

/** True when all Stripe env vars are present. Gate billing UI/routes on this. */
export const stripeConfigured = Boolean(
  env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_PRO,
);

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ServiceUnavailableError("Billing is not configured");
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY, {
    appInfo: { name: "CreatorHub" },
  });
  return client;
}

export function webhookSecret(): string {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new ServiceUnavailableError("Billing is not configured");
  }
  return env.STRIPE_WEBHOOK_SECRET;
}

export function proPriceId(): string {
  if (!env.STRIPE_PRICE_PRO) {
    throw new ServiceUnavailableError("Billing is not configured");
  }
  return env.STRIPE_PRICE_PRO;
}
