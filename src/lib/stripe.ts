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

export type PriceRegion = "cny" | "default";

/** The Pro plan's price and display string for a region. */
export const PRO_PRICING: Record<
  PriceRegion,
  { amount: string; currency: string }
> = {
  cny: { amount: "¥29.9", currency: "CNY" },
  default: { amount: "CAD $29.9", currency: "CAD" },
};

/** Maps a UI locale to a pricing region. */
export function priceRegionForLocale(locale: string): PriceRegion {
  return locale === "zh" ? "cny" : "default";
}

export function proPriceId(region: PriceRegion = "default"): string {
  if (region === "cny" && env.STRIPE_PRICE_PRO_CNY) {
    return env.STRIPE_PRICE_PRO_CNY;
  }
  if (!env.STRIPE_PRICE_PRO) {
    throw new ServiceUnavailableError("Billing is not configured");
  }
  return env.STRIPE_PRICE_PRO;
}
