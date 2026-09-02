/**
 * UI languages CreatorHub is translated into. Add a locale here and drop a
 * matching `src/messages/<code>.json` next to it — the picker and loader pick
 * it up automatically. Untranslated keys fall back to English.
 */
export const LOCALES = ["en", "zh", "es", "ja", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

/** Each language in its own name, for the picker. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  es: "Español",
  ja: "日本語",
  pt: "Português",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the best supported locale from an `Accept-Language` header
 * (e.g. "zh-CN,zh;q=0.9,en;q=0.8"). Falls back to the default.
 */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const part of acceptLanguage.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase() ?? "";
    const base = tag.split("-")[0] ?? "";
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
