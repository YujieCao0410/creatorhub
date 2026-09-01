import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/page-guards";
import { DashboardNav } from "./dashboard-nav";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Proxy already gates /dashboard; this redirect is defense in depth for
  // stale sessions (valid token, missing user).
  await requireUserPage();

  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr]">
      <aside>
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Dashboard
        </p>
        <DashboardNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
