import type { Locale } from "@/lib/i18n/config";

const JUST_NOW: Record<Locale, string> = { en: "just now", zh: "刚刚" };

/** Compact relative time, e.g. "3h", "2d", "Mar 4" / "刚刚". */
export function formatRelativeDate(
  iso: string | null,
  locale: Locale = "en",
): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diffSeconds = (Date.now() - then) / 1000;

  if (diffSeconds < 60) return JUST_NOW[locale];
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86_400) return `${Math.floor(diffSeconds / 3600)}h`;
  if (diffSeconds < 604_800) return `${Math.floor(diffSeconds / 86_400)}d`;

  const date = new Date(iso);
  return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

/** Truncates plain text to a preview length on a word boundary. */
export function preview(text: string, max = 200): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
