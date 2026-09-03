"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/misc";
import { api } from "@/lib/api-client";

type ProviderRow = {
  id: string;
  label: string;
  configured: boolean;
  accountName: string | null;
  connected: boolean;
};

export function IntegrationsPanel({ providers }: { providers: ProviderRow[] }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);

  const noticeProvider = params.get("integration");
  const noticeStatus = params.get("status");
  const notice =
    noticeProvider && noticeStatus
      ? {
          tone: (
            {
              connected: "success",
              denied: "info",
              expired: "error",
              failed: "error",
            } as const
          )[noticeStatus] ?? ("info" as const),
          text: t(`integrations.status.${noticeStatus}`, {
            provider:
              providers.find((p) => p.id === noticeProvider)?.label ??
              noticeProvider,
          }),
        }
      : null;

  async function disconnect(id: string) {
    setBusy(id);
    try {
      await api.post(`/api/integrations/${id}/disconnect`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">{t("integrations.title")}</h2>
      <p className="text-xs text-muted">{t("integrations.hint")}</p>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="divide-y divide-border">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium">{p.label}</p>
              <p className="text-sm text-muted">
                {!p.configured
                  ? t("integrations.notConfigured", { provider: p.label })
                  : p.connected
                    ? p.accountName
                      ? t("integrations.connectedAs", { name: p.accountName })
                      : t("integrations.connected")
                    : t("integrations.connectHint", { provider: p.label })}
              </p>
            </div>

            {p.configured &&
              (p.connected ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => disconnect(p.id)}
                  loading={busy === p.id}
                >
                  {t("integrations.disconnect")}
                </Button>
              ) : (
                <a
                  href={`/api/integrations/${p.id}/connect`}
                  className={buttonClasses({ size: "sm" })}
                >
                  {t("integrations.connect")}
                </a>
              ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
