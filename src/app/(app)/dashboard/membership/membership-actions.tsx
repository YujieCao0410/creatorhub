"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";

function useBillingRedirect(path: string) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>(path);
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("common.somethingWrong"),
      );
      setLoading(false);
    }
  }

  return { go, loading, error };
}

export function UpgradeButton() {
  const t = useT();
  const { go, loading, error } = useBillingRedirect("/api/billing/checkout");
  return (
    <div>
      <Button onClick={go} loading={loading}>
        {t("pricing.upgrade")}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const t = useT();
  const { go, loading, error } = useBillingRedirect("/api/billing/portal");
  return (
    <div>
      <Button variant="secondary" onClick={go} loading={loading}>
        {t("pricing.manageBilling")}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function CheckoutNotice() {
  const t = useT();
  const status = useSearchParams().get("checkout");
  if (status === "success") {
    return <Alert tone="success">{t("membership.checkoutSuccess")}</Alert>;
  }
  if (status === "cancelled") {
    return <Alert tone="info">{t("membership.checkoutCancelled")}</Alert>;
  }
  return null;
}
