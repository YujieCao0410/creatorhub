import type { Metadata } from "next";
import Link from "next/link";
import { PostFeed } from "@/components/post-feed";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { getT } from "@/lib/i18n/server";
import { listFeed, listPosts } from "@/server/services/post-service";

export const metadata: Metadata = { title: "Explore" };
export const dynamic = "force-dynamic";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);
  const tab =
    user && (await searchParams).tab === "following" ? "following" : "latest";

  const result =
    tab === "following"
      ? await listFeed(user!.id, { limit: 15 })
      : await listPosts({ limit: 15 }, user?.id);
  const endpoint = tab === "following" ? "/api/feed" : "/api/posts";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">
          {user ? t("feed.yourFeed") : t("feed.explore")}
        </h1>
      </div>

      {user && (
        <div className="flex gap-1 border-b border-border text-sm">
          <TabLink href="/feed" active={tab === "latest"}>
            {t("feed.tabLatest")}
          </TabLink>
          <TabLink href="/feed?tab=following" active={tab === "following"}>
            {t("feed.tabFollowing")}
          </TabLink>
        </div>
      )}

      {result.data.length === 0 ? (
        <EmptyState
          title={
            tab === "following"
              ? t("feed.emptyFollowingTitle")
              : t("feed.emptyLatestTitle")
          }
          description={
            tab === "following"
              ? t("feed.emptyFollowingBody")
              : t("feed.emptyLatestBody")
          }
          action={
            tab === "following" ? (
              <Link href="/feed" className={buttonClasses({ size: "sm" })}>
                {t("feed.browseLatest")}
              </Link>
            ) : user ? (
              <Link
                href="/dashboard/posts/new"
                className={buttonClasses({ size: "sm" })}
              >
                {t("feed.writePost")}
              </Link>
            ) : (
              <Link href="/register" className={buttonClasses({ size: "sm" })}>
                {t("landing.getStarted")}
              </Link>
            )
          }
        />
      ) : (
        <PostFeed
          key={tab}
          initialItems={result.data}
          initialCursor={result.nextCursor}
          endpoint={endpoint}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 font-medium transition-colors",
        active
          ? "border-brand-600 text-foreground"
          : "border-transparent text-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
