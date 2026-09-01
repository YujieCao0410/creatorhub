import type { Metadata } from "next";
import Link from "next/link";
import { PricingActions } from "@/components/pricing-actions";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { FREE_DRAFT_LIMIT } from "@/lib/membership";
import { stripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);
  const isPro = user?.membership === "PRO";

  const freeFeatures = [
    t("pricing.freeFeatures.0"),
    t("pricing.freeFeatures.1", { limit: FREE_DRAFT_LIMIT }),
    t("pricing.freeFeatures.2"),
    t("pricing.freeFeatures.3"),
  ];
  const proFeatures = [
    t("pricing.proFeatures.0"),
    t("pricing.proFeatures.1"),
    t("pricing.proFeatures.2"),
    t("pricing.proFeatures.3"),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">{t("pricing.title")}</h1>
        <p className="mt-2 text-muted">{t("pricing.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col">
          <h2 className="text-lg font-semibold">{t("pricing.free")}</h2>
          <p className="mt-1 text-3xl font-semibold">
            $0
            <span className="text-base font-normal text-muted">
              {t("pricing.perMonth")}
            </span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {freeFeatures.map((f) => (
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
                {isPro
                  ? t("pricing.includedWithPro")
                  : t("pricing.currentPlan")}
              </span>
            ) : (
              <Link
                href="/register"
                className={buttonClasses({ variant: "secondary" })}
              >
                {t("pricing.createAccount")}
              </Link>
            )}
          </div>
        </Card>

        <Card className="flex flex-col border-brand-500">
          <h2 className="text-lg font-semibold">{t("pricing.pro")}</h2>
          <p className="mt-1 text-3xl font-semibold">
            $9
            <span className="text-base font-normal text-muted">
              {t("pricing.perMonth")}
            </span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {proFeatures.map((f) => (
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
        {t("pricing.processedByStripe")}
      </p>
    </div>
  );
}
