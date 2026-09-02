"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import {
  makeTranslator,
  type Messages,
  type TranslateFn,
} from "@/lib/i18n/translate";

type I18nValue = {
  locale: Locale;
  t: TranslateFn;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  fallback,
  children,
}: {
  locale: Locale;
  messages: Messages;
  /** English messages, used for keys missing from `messages`. */
  fallback?: Messages;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useMemo(() => makeTranslator(messages, fallback), [messages, fallback]);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // Persist to the account so the choice follows the user across devices.
      // Ignore failure (e.g. logged out) — the cookie already took effect.
      void fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      }).catch(() => {});
      router.refresh();
    },
    [router],
  );

  const value = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

/** Convenience hook when you only need the translate function. */
export function useT(): TranslateFn {
  return useI18n().t;
}
