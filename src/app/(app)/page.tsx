import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { listPosts } from "@/server/services/post-service";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Publish in minutes",
    body: "A focused editor for drafts and posts. Ship a thought or a long read — no setup, no theme wrangling.",
  },
  {
    title: "Build a real audience",
    body: "Followers, a personalized feed, likes and comments. The people who care about your work find it and stay.",
  },
  {
    title: "Own your creator page",
    body: "A clean public profile at /creators/you — your bio, your posts, your stats. Share one link.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const recent = await listPosts({ limit: 3 }, user?.id);

  return (
    <div className="space-y-20 py-10">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          The home for your work and your audience.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          CreatorHub is a publishing platform for creators. Write posts, grow a
          following, and turn readers into a community.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className={buttonClasses()}>
                Go to dashboard
              </Link>
              <Link
                href="/feed"
                className={buttonClasses({ variant: "secondary" })}
              >
                Open your feed
              </Link>
            </>
          ) : (
            <>
              <Link href="/register" className={buttonClasses()}>
                Get started — it&apos;s free
              </Link>
              <Link
                href="/feed"
                className={buttonClasses({ variant: "secondary" })}
              >
                Explore creators
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <h2 className="font-medium">{f.title}</h2>
            <p className="mt-2 text-sm text-muted">{f.body}</p>
          </Card>
        ))}
      </section>

      {/* Membership */}
      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <h2 className="text-2xl font-semibold">Free to start. Pro when you grow.</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
            Everything you need to publish and build an audience is free.
            CreatorHub Pro adds unlimited drafts and more, billed through Stripe.
          </p>
          <Link href="/pricing" className={buttonClasses({ className: "mt-6" })}>
            See pricing
          </Link>
        </div>
      </section>

      {/* Recent posts */}
      {recent.data.length > 0 && (
        <section className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Fresh from the community</h2>
            <Link
              href="/feed"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {recent.data.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user?.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
