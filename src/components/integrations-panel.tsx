"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/misc";
import { api } from "@/lib/api-client";

export function IntegrationsPanel({
  youtube,
  configured,
}: {
  youtube: { accountName: string | null } | null;
  configured: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const status = useSearchParams().get("youtube");
  const [disconnecting, setDisconnecting] = useState(false);

  async function disconnect() {
    setDisconnecting(true);
    try {
      await api.post("/api/integrations/youtube/disconnect");
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  const notice =
    status === "connected"
      ? { tone: "success" as const, text: t("integrations.statusConnected") }
      : status === "denied"
        ? { tone: "info" as const, text: t("integrations.statusDenied") }
        : status === "expired"
          ? { tone: "error" as const, text: t("integrations.statusExpired") }
          : status === "failed"
            ? { tone: "error" as const, text: t("integrations.statusFailed") }
            : null;

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">{t("integrations.title")}</h2>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{t("integrations.youtube")}</p>
          <p className="text-sm text-muted">
            {!configured
              ? t("integrations.notConfigured")
              : youtube
                ? youtube.accountName
                  ? t("integrations.connectedAs", { name: youtube.accountName })
                  : t("integrations.connected")
                : t("integrations.connectHint")}
          </p>
        </div>

        {configured &&
          (youtube ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={disconnect}
              loading={disconnecting}
            >
              {t("integrations.disconnect")}
            </Button>
          ) : (
            <a
              href="/api/integrations/youtube/connect"
              className={buttonClasses({ size: "sm" })}
            >
              {t("integrations.connect")}
            </a>
          ))}
      </div>
    </Card>
  );
}
