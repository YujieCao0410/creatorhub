import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DashboardNav } from "./dashboard-nav";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already gates /dashboard; this is defense in depth and gives
  // us the user for the shell.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

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
