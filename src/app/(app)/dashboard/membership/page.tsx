import { Suspense } from "react";
import { Badge, Card } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { FREE_DRAFT_LIMIT } from "@/lib/membership";
import { stripeConfigured } from "@/lib/stripe";
import { getMembershipInfo } from "@/server/services/membership-service";
import {
  CheckoutNotice,
  ManageBillingButton,
  UpgradeButton,
} from "./membership-actions";

export default async function MembershipPage() {
  const user = await requireUser();
  const info = await getMembershipInfo(user.id);
  const isPro = info.membership === "PRO";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Membership</h1>
        <p className="text-sm text-muted">Your current plan and usage.</p>
      </div>

      <Suspense fallback={null}>
        <CheckoutNotice />
      </Suspense>

      <Card className="flex items-center justify-between">
        <div>
          <p className="font-medium">{isPro ? "Pro plan" : "Free plan"}</p>
          <p className="text-sm text-muted">
            {isPro
              ? "Unlimited drafts and everything on Free."
              : `Up to ${FREE_DRAFT_LIMIT} drafts, publishing, following, and the feed.`}
          </p>
        </div>
        <Badge tone={isPro ? "brand" : "neutral"}>
          {isPro ? "Pro" : "Current"}
        </Badge>
      </Card>

      <Card>
        <h2 className="font-medium">Usage</h2>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted">Drafts</span>
          <span className="font-medium tabular-nums">
            {info.usage.drafts}
            {info.usage.draftLimit !== null && ` / ${info.usage.draftLimit}`}
          </span>
        </div>
      </Card>

      {info.subscription && (
        <Card>
          <h2 className="font-medium">Billing</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Status</dt>
              <dd className="font-medium">{info.subscription.status}</dd>
            </div>
            {info.subscription.currentPeriodEnd && (
              <div className="flex justify-between">
                <dt className="text-muted">
                  {info.subscription.cancelAtPeriodEnd ? "Ends" : "Renews"}
                </dt>
                <dd className="font-medium">
                  {new Date(
                    info.subscription.currentPeriodEnd,
                  ).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      <div>
        {!stripeConfigured ? (
          <Card className="opacity-70">
            <p className="font-medium">Billing not configured</p>
            <p className="mt-1 text-sm text-muted">
              Set the Stripe environment variables (see .env.example) to enable
              upgrades.
            </p>
          </Card>
        ) : isPro ? (
          <ManageBillingButton />
        ) : (
          <UpgradeButton />
        )}
      </div>
    </div>
  );
}
