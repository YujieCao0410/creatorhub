import { Suspense } from "react";
import { Badge, Card } from "@/components/ui/misc";
import { requireUserPage } from "@/lib/auth/page-guards";
import { getLocale, getT } from "@/lib/i18n/server";
import { FREE_DRAFT_LIMIT } from "@/lib/membership";
import { stripeConfigured } from "@/lib/stripe";
import { getMembershipInfo } from "@/server/services/membership-service";
import {
  CheckoutNotice,
  ManageBillingButton,
  UpgradeButton,
} from "./membership-actions";

export default async function MembershipPage() {
  const [user, t, locale] = await Promise.all([
    requireUserPage(),
    getT(),
    getLocale(),
  ]);
  const info = await getMembershipInfo(user.id);
  const isPro = info.membership === "PRO";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("membership.title")}</h1>
        <p className="text-sm text-muted">{t("membership.subtitle")}</p>
      </div>

      <Suspense fallback={null}>
        <CheckoutNotice />
      </Suspense>

      <Card className="flex items-center justify-between">
        <div>
          <p className="font-medium">
            {isPro ? t("membership.proPlan") : t("membership.freePlan")}
          </p>
          <p className="text-sm text-muted">
            {isPro
              ? t("membership.proPlanBody")
              : t("membership.freePlanBody", { limit: FREE_DRAFT_LIMIT })}
          </p>
        </div>
        <Badge tone={isPro ? "brand" : "neutral"}>
          {isPro ? t("membership.proBadge") : t("membership.current")}
        </Badge>
      </Card>

      <Card>
        <h2 className="font-medium">{t("membership.usage")}</h2>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted">{t("dashboard.drafts")}</span>
          <span className="font-medium tabular-nums">
            {info.usage.drafts}
            {info.usage.draftLimit !== null && ` / ${info.usage.draftLimit}`}
          </span>
        </div>
      </Card>

      {info.subscription && (
        <Card>
          <h2 className="font-medium">{t("membership.billing")}</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t("membership.status")}</dt>
              <dd className="font-medium">{info.subscription.status}</dd>
            </div>
            {info.subscription.currentPeriodEnd && (
              <div className="flex justify-between">
                <dt className="text-muted">
                  {info.subscription.cancelAtPeriodEnd
                    ? t("membership.ends")
                    : t("membership.renews")}
                </dt>
                <dd className="font-medium">
                  {new Date(
                    info.subscription.currentPeriodEnd,
                  ).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      <div>
        {!stripeConfigured ? (
          <Card className="opacity-70">
            <p className="font-medium">
              {t("membership.billingNotConfigured")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {t("membership.billingNotConfiguredBody")}
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
