"use client";

import { useI18n } from "@/components/i18n-provider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { cn } from "@/lib/cn";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded-md border border-border text-xs",
        className,
      )}
      role="group"
      aria-label={t("nav.language")}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={cn(
            "px-2 py-1 transition-colors",
            locale === code
              ? "bg-brand-600 text-white"
              : "text-muted hover:text-foreground",
          )}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
