import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { listPosts } from "@/server/services/post-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);
  const feed = await listPosts({ limit: 3 }, user?.id);

  const features = [
    { title: t("landing.feature1Title"), body: t("landing.feature1Body") },
    { title: t("landing.feature2Title"), body: t("landing.feature2Body") },
    { title: t("landing.feature3Title"), body: t("landing.feature3Body") },
  ];

  return (
    <div className="space-y-20 py-10">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          {t("landing.heroSubtitle")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className={buttonClasses()}>
                {t("landing.goToDashboard")}
              </Link>
              <Link
                href="/feed"
                className={buttonClasses({ variant: "secondary" })}
              >
                {t("landing.openFeed")}
              </Link>
            </>
          ) : (
            <>
              <Link href="/register" className={buttonClasses()}>
                {t("landing.getStarted")}
              </Link>
              <Link
                href="/feed"
                className={buttonClasses({ variant: "secondary" })}
              >
                {t("landing.exploreCreators")}
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <h2 className="font-medium">{f.title}</h2>
            <p className="mt-2 text-sm text-muted">{f.body}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <h2 className="text-2xl font-semibold">
            {t("landing.membershipTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
            {t("landing.membershipBody")}
          </p>
          <Link href="/pricing" className={buttonClasses({ className: "mt-6" })}>
            {t("landing.seePricing")}
          </Link>
        </div>
      </section>

      {feed.data.length > 0 && (
        <section className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">{t("landing.recentTitle")}</h2>
            <Link
              href="/feed"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              {t("landing.viewAll")}
            </Link>
          </div>
          <div className="space-y-4">
            {feed.data.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user?.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
