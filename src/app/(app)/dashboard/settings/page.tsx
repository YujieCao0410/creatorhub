import Link from "next/link";
import { Suspense } from "react";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { Card } from "@/components/ui/misc";
import { requireUserPage } from "@/lib/auth/page-guards";
import { getLocale, getT } from "@/lib/i18n/server";
import { youtubeConfigured } from "@/lib/youtube";
import { getIntegration } from "@/server/services/integration-service";

export default async function SettingsPage() {
  const [user, t, locale] = await Promise.all([
    requireUserPage(),
    getT(),
    getLocale(),
  ]);
  const youtube = await getIntegration(user.id, "youtube");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("dashboard.accountTitle")}</h1>
        <p className="text-sm text-muted">{t("dashboard.accountSubtitle")}</p>
      </div>

      <Card className="divide-y divide-border p-0">
        <Row label={t("dashboard.fieldName")} value={user.name} />
        <Row label={t("dashboard.fieldHandle")} value={`@${user.handle}`} />
        <Row label={t("dashboard.fieldEmail")} value={user.email} />
        <Row
          label={t("dashboard.fieldPlan")}
          value={
            user.membership === "PRO"
              ? t("membership.pro")
              : t("membership.free")
          }
        />
        <Row
          label={t("dashboard.memberSince")}
          value={new Date(user.createdAt).toLocaleDateString(
            locale === "zh" ? "zh-CN" : "en-US",
          )}
        />
      </Card>

      <Suspense fallback={null}>
        <IntegrationsPanel
          youtube={youtube ? { accountName: youtube.accountName } : null}
          configured={youtubeConfigured}
        />
      </Suspense>

      <Card>
        <h2 className="font-medium">{t("membership.title")}</h2>
        <p className="mt-1 text-sm text-muted">
          <Link href="/dashboard/membership" className="text-brand-600">
            {t("membership.title")}
          </Link>
        </p>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
