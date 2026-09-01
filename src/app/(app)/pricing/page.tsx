import type { Metadata } from "next";
import Link from "next/link";
import { PricingActions } from "@/components/pricing-actions";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { FREE_DRAFT_LIMIT } from "@/lib/membership";
import { stripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

const FREE_FEATURES = [
  "Publish unlimited posts",
  `Up to ${FREE_DRAFT_LIMIT} saved drafts`,
  "Follows, feed, likes and comments",
  "Public creator profile",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited drafts",
  "Priority in future feature rollouts",
  "Support CreatorHub's development",
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const isPro = user?.membership === "PRO";

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Simple pricing</h1>
        <p className="mt-2 text-muted">
          Start free. Upgrade when CreatorHub becomes part of your routine.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="mt-1 text-3xl font-semibold">
            $0<span className="text-base font-normal text-muted">/mo</span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden className="text-brand-600">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {user ? (
              <span className="text-sm text-muted">
                {isPro ? "Included with Pro" : "Your current plan"}
              </span>
            ) : (
              <Link
                href="/register"
                className={buttonClasses({ variant: "secondary" })}
              >
                Create account
              </Link>
            )}
          </div>
        </Card>

        <Card className="flex flex-col border-brand-500">
          <h2 className="text-lg font-semibold">Pro</h2>
          <p className="mt-1 text-3xl font-semibold">
            $9<span className="text-base font-normal text-muted">/mo</span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden className="text-brand-600">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <PricingActions
              isAuthenticated={Boolean(user)}
              isPro={isPro}
              billingEnabled={stripeConfigured}
            />
          </div>
        </Card>
      </div>

      <p className="text-center text-xs text-muted">
        Payments are processed by Stripe. Cancel anytime from your dashboard.
      </p>
    </div>
  );
}
