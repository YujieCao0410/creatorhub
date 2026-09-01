"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { buttonClasses } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";

export function SiteNav() {
  const { user, logout } = useSession();
  const router = useRouter();

  async function onLogout() {
    await logout();
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            CreatorHub
          </Link>
          <nav className="hidden gap-4 text-sm text-muted sm:flex">
            <Link href="/feed" className="hover:text-foreground">
              Feed
            </Link>
            <Link href="/search" className="hover:text-foreground">
              Explore
            </Link>
          </nav>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-muted hover:text-foreground"
            >
              Dashboard
            </Link>
            <button
              onClick={onLogout}
              className="text-sm text-muted hover:text-foreground"
            >
              Log out
            </button>
            <Link href={`/creators/${user.handle}`} aria-label="Your profile">
              <Avatar name={user.name} src={user.avatarUrl} size={32} />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              Log in
            </Link>
            <Link
              href="/register"
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
