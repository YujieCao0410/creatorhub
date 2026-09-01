import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

// Minimal landing page. Phase 10 turns this into a real marketing page.
export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Publish your work. Grow your audience.
      </h1>
      <p className="mx-auto mt-4 max-w-md text-muted">
        CreatorHub is a home for creators to share posts, follow each other, and
        build a following.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        {user ? (
          <Link href="/dashboard" className={buttonClasses()}>
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link href="/register" className={buttonClasses()}>
              Get started
            </Link>
            <Link
              href="/feed"
              className={buttonClasses({ variant: "secondary" })}
            >
              Explore the feed
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
