"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/posts", label: "Content" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/settings", label: "Account" },
  { href: "/dashboard/membership", label: "Membership" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-2 py-1.5 text-sm transition-colors",
              active
                ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-100"
                : "text-muted hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
