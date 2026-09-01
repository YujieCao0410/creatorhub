"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <Link href="/register?next=/pricing" className={buttonClasses()}>
        Get started
      </Link>
    );
  }

  if (isPro) {
    return (
      <Link
        href="/dashboard/membership"
        className={buttonClasses({ variant: "secondary" })}
      >
        Manage billing
      </Link>
    );
  }

  if (!billingEnabled) {
    return <p className="text-sm text-muted">Billing is not configured.</p>;
  }

  async function upgrade() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>("/api/billing/checkout");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={upgrade} loading={loading} className="w-full">
        Upgrade to Pro
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
