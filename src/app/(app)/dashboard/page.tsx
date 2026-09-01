import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { requireUserPage } from "@/lib/auth/page-guards";
import { getT } from "@/lib/i18n/server";
import { getDashboardStats } from "@/server/services/user-service";

export default async function DashboardOverviewPage() {
  const [user, t] = await Promise.all([requireUserPage(), getT()]);
  const stats = await getDashboardStats(user.id);

  const tiles = [
    { label: t("dashboard.published"), value: stats.posts.published },
    { label: t("dashboard.drafts"), value: stats.posts.drafts },
    { label: t("dashboard.followers"), value: stats.followers },
    { label: t("dashboard.following"), value: stats.following },
    { label: t("dashboard.likesReceived"), value: stats.likesReceived },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {t("dashboard.welcome", { name: user.name })}
          </h1>
          <p className="text-sm text-muted">@{user.handle}</p>
        </div>
        <Link
          href="/dashboard/posts/new"
          className={buttonClasses({ size: "sm" })}
        >
          {t("dashboard.newPost")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-4">
            <p className="text-2xl font-semibold tabular-nums">{tile.value}</p>
            <p className="mt-1 text-xs text-muted">{tile.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-medium">{t("dashboard.quickLinks")}</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href="/dashboard/posts"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {t("dashboard.manageContent")}
          </Link>
          <Link
            href="/dashboard/profile"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {t("creator.editProfile")}
          </Link>
          <Link
            href={`/creators/${user.handle}`}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {t("creator.viewPublicProfile")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
