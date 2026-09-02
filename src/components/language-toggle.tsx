"use client";

import { useI18n } from "@/components/i18n-provider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { cn } from "@/lib/cn";

/** Language picker. Shows every locale CreatorHub is translated into. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={cn("inline-flex items-center gap-1 text-xs", className)}>
      <span aria-hidden className="text-muted">
        🌐
      </span>
      <span className="sr-only">{t("nav.language")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as (typeof LOCALES)[number])}
        className="rounded-md border border-border bg-surface px-1.5 py-1 text-xs outline-none"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
