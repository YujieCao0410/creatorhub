import { LANGUAGES } from "@/lib/languages";

/**
 * UI languages CreatorHub is translated into — every entry has a matching
 * `src/messages/<code>.json`. Untranslated keys fall back to English.
 * To add a language: add a message file and list its code here.
 */
export const LOCALES = [
  "en", "zh", "zh-Hant", "es", "hi", "ar", "pt", "fr", "ja", "ko",
  "de", "ru", "id", "it", "tr", "vi", "th", "pl", "nl", "uk",
  "fil", "ms", "bn", "fa", "sv", "da", "fi", "nb", "cs", "sk",
  "ro", "hu", "el", "bg", "hr", "sr", "ca", "he", "ur", "sw",
] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

/** Right-to-left languages — the `<html dir>` flips for these. */
export const RTL_LOCALES = new Set<Locale>(["ar", "fa", "he", "ur"]);

/** Each language in its own name, for the picker. */
export const LOCALE_LABELS: Record<Locale, string> = Object.fromEntries(
  LANGUAGES.filter((l): l is (typeof LANGUAGES)[number] & { code: Locale } =>
    (LOCALES as readonly string[]).includes(l.code),
  ).map((l) => [l.code, l.endonym]),
) as Record<Locale, string>;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** BCP-47 tag for `Intl` APIs — falls back to the bare code. */
export function intlLocale(locale: Locale): string {
  const map: Partial<Record<Locale, string>> = {
    en: "en-US",
    zh: "zh-CN",
    "zh-Hant": "zh-Hant",
    pt: "pt-BR",
    ko: "ko-KR",
    ja: "ja-JP",
  };
  return map[locale] ?? locale;
}

/**
 * Picks the best supported locale from an `Accept-Language` header
 * (e.g. "zh-CN,zh;q=0.9,en;q=0.8"). Falls back to the default.
 */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const part of acceptLanguage.split(",")) {
    const tag = part.split(";")[0]?.trim() ?? "";
    // Try the full tag first ("zh-Hant"), then the base ("zh").
    if (isLocale(tag)) return tag;
    const base = tag.split("-")[0]?.toLowerCase() ?? "";
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
