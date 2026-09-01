import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SelfUser } from "@/lib/dto";
import { getCurrentUser } from "./session";

/**
 * For Server Component pages/layouts behind auth. Unlike `requireUser` (which
 * throws a 401 — correct for API routes), this redirects to /login, so a stale
 * or invalidated session lands on the login page instead of an error screen.
 */
export async function requireUserPage(): Promise<SelfUser> {
  const user = await getCurrentUser();
  if (user) return user;

  const pathname = (await headers()).get("x-pathname") ?? "";
  const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
  redirect(`/login${next}`);
}

/** Requires a PRO page visitor; sends FREE users to the pricing page. */
export async function requireProPage(): Promise<SelfUser> {
  const user = await requireUserPage();
  if (user.membership !== "PRO") redirect("/pricing");
  return user;
}
