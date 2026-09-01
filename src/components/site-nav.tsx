"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { useSession } from "@/components/session-provider";
import { buttonClasses } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

const LOGGED_OUT = [
  { href: "/", key: "nav.home" },
  { href: "/feed", key: "nav.explore" },
  { href: "/pricing", key: "nav.pricing" },
] as const;

const LOGGED_IN = [
  { href: "/feed", key: "nav.feed" },
  { href: "/search", key: "nav.search" },
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/dashboard/membership", key: "nav.membership" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const { user, logout } = useSession();
  const t = useT();
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
            {t("brand")}
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
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <LanguageToggle />
          {user ? (
            <>
              <button
                onClick={onLogout}
                className="text-sm text-muted hover:text-foreground"
              >
                {t("nav.logout")}
              </button>
              <Link
                href={`/creators/${user.handle}`}
                aria-label={t("nav.profile")}
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
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className={buttonClasses({ variant: "primary", size: "sm" })}
              >
                {t("nav.signup")}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="-mr-2 flex size-10 flex-col items-center justify-center gap-1 rounded-md sm:hidden"
          aria-label={t("nav.menu")}
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
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href={`/creators/${user.handle}`}
                  onClick={() => setMenuOpen(false)}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  {t("nav.profile")}
                </Link>
                <button
                  onClick={onLogout}
                  className={buttonClasses({ variant: "ghost", size: "sm" })}
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/register"
                  className={buttonClasses({ variant: "primary", size: "sm" })}
                >
                  {t("nav.signup")}
                </Link>
              </>
            )}
            <LanguageToggle className="ml-auto" />
          </div>
        </div>
      )}
    </header>
  );
}
