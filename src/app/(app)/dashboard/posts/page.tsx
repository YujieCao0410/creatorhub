import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { DistributePanel } from "@/components/distribute-panel";
import { requireUserPage } from "@/lib/auth/page-guards";
import { getLocale, getT } from "@/lib/i18n/server";
import { listAuthoredPosts } from "@/server/services/post-service";
import { PostRowActions } from "./post-row-actions";

export default async function ContentPage() {
  const [user, t, locale] = await Promise.all([
    requireUserPage(),
    getT(),
    getLocale(),
  ]);
  const posts = await listAuthoredPosts(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("dashboard.content")}</h1>
        <Link
          href="/dashboard/posts/new"
          className={buttonClasses({ size: "sm" })}
        >
          {t("dashboard.newPost")}
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title={t("dashboard.noPostsTitle")}
          description={t("dashboard.noPostsBody")}
          action={
            <Link
              href="/dashboard/posts/new"
              className={buttonClasses({ size: "sm" })}
            >
              {t("dashboard.newPost")}
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-border p-0">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{post.title}</span>
                  {post.published ? (
                    <Badge tone="green">{t("dashboard.published")}</Badge>
                  ) : (
                    <Badge>{t("post.draft")}</Badge>
                  )}
                  {post.videoUrl && <Badge tone="brand">🎬</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {t("dashboard.likesUpdated", {
                    likes: post.counts.likes,
                    date: new Date(post.updatedAt).toLocaleDateString(
                      locale === "zh" ? "zh-CN" : "en-US",
                    ),
                  })}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <PostRowActions slug={post.slug} published={post.published} />
                {post.videoUrl && (
                  <DistributePanel
                    slug={post.slug}
                    targets={post.publishTargets}
                  />
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
