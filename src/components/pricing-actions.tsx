"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";

export function PricingActions({
  isAuthenticated,
  isPro,
  billingEnabled,
}: {
  isAuthenticated: boolean;
  isPro: boolean;
  billingEnabled: boolean;
}) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <Link href="/register?next=/pricing" className={buttonClasses()}>
        {t("pricing.getStarted")}
      </Link>
    );
  }

  if (isPro) {
    return (
      <Link
        href="/dashboard/membership"
        className={buttonClasses({ variant: "secondary" })}
      >
        {t("pricing.manageBilling")}
      </Link>
    );
  }

  if (!billingEnabled) {
    return <p className="text-sm text-muted">{t("pricing.billingDisabled")}</p>;
  }

  async function upgrade() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>("/api/billing/checkout");
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("common.somethingWrongBody"),
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={upgrade} loading={loading} className="w-full">
        {t("pricing.upgrade")}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
