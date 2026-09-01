"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";

function useBillingRedirect(path: string) {
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
        err instanceof ApiError ? err.message : "Something went wrong.",
      );
      setLoading(false);
    }
  }

  return { go, loading, error };
}

export function UpgradeButton() {
  const { go, loading, error } = useBillingRedirect("/api/billing/checkout");
  return (
    <div>
      <Button onClick={go} loading={loading}>
        Upgrade to Pro
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const { go, loading, error } = useBillingRedirect("/api/billing/portal");
  return (
    <div>
      <Button variant="secondary" onClick={go} loading={loading}>
        Manage billing
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function CheckoutNotice() {
  const status = useSearchParams().get("checkout");
  if (status === "success") {
    return (
      <Alert tone="success">
        Payment received. Your Pro features unlock as soon as Stripe confirms
        the subscription — refresh in a moment if the plan still shows Free.
      </Alert>
    );
  }
  if (status === "cancelled") {
    return <Alert tone="info">Checkout cancelled — no charge was made.</Alert>;
  }
  return null;
}
