"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/session-provider";
import { buttonClasses } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string };

const LOGGED_OUT: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/feed", label: "Explore" },
  { href: "/pricing", label: "Pricing" },
];

const LOGGED_IN: NavItem[] = [
  { href: "/feed", label: "Feed" },
  { href: "/search", label: "Search" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/membership", label: "Membership" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const { user, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function onLogout() {
    setMenuOpen(false);
    await logout();
    router.replace("/");
    router.refresh();
  }

  const items = user ? LOGGED_IN : LOGGED_OUT;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            CreatorHub
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  isActive(pathname, item.href)
                    ? "font-medium text-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {user ? (
            <>
              <button
                onClick={onLogout}
                className="text-sm text-muted hover:text-foreground"
              >
                Log out
              </button>
              <Link
                href={`/creators/${user.handle}`}
                aria-label="Your profile"
                className="ml-1"
              >
                <Avatar name={user.name} src={user.avatarUrl} size={32} />
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <button
          type="button"
          className="-mr-2 flex size-10 flex-col items-center justify-center gap-1 rounded-md sm:hidden"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="block h-0.5 w-5 bg-foreground" />
          <span className="block h-0.5 w-5 bg-foreground" />
          <span className="block h-0.5 w-5 bg-foreground" />
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-border px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-md px-2 py-2 text-sm",
                  isActive(pathname, item.href)
                    ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-100"
                    : "text-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex gap-2">
            {user ? (
              <>
                <Link
                  href={`/creators/${user.handle}`}
                  onClick={() => setMenuOpen(false)}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  Profile
                </Link>
                <button
                  onClick={onLogout}
                  className={buttonClasses({ variant: "ghost", size: "sm" })}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className={buttonClasses({ variant: "primary", size: "sm" })}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
