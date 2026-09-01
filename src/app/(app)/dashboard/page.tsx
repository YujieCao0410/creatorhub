import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { requireUserPage } from "@/lib/auth/page-guards";
import { getDashboardStats } from "@/server/services/user-service";

export default async function DashboardOverviewPage() {
  const user = await requireUserPage();
  const stats = await getDashboardStats(user.id);

  const tiles = [
    { label: "Published", value: stats.posts.published },
    { label: "Drafts", value: stats.posts.drafts },
    { label: "Followers", value: stats.followers },
    { label: "Following", value: stats.following },
    { label: "Likes received", value: stats.likesReceived },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
          <p className="text-sm text-muted">@{user.handle}</p>
        </div>
        <Link href="/dashboard/posts/new" className={buttonClasses({ size: "sm" })}>
          New post
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-2xl font-semibold tabular-nums">{t.value}</p>
            <p className="mt-1 text-xs text-muted">{t.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-medium">Quick links</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href="/dashboard/posts"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Manage content
          </Link>
          <Link
            href="/dashboard/profile"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Edit profile
          </Link>
          <Link
            href={`/creators/${user.handle}`}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            View public profile
          </Link>
        </div>
      </Card>
    </div>
  );
}
