/**
 * Languages a creator can write (or have AI write) a caption in.
 *
 * `code` is a short BCP-47-ish tag we store as the key in `Post.captions`.
 * `endonym` is the language's own name (shown in pickers); `english` is the
 * English name (for AI prompts and fallback labels).
 *
 * This list is deliberately broad — CreatorHub is for creators anywhere. Add
 * more freely; nothing else in the code hard-codes a language.
 */

export type Language = {
  code: string;
  endonym: string;
  english: string;
};

export const LANGUAGES: Language[] = [
  { code: "en", endonym: "English", english: "English" },
  { code: "zh", endonym: "中文", english: "Chinese (Simplified)" },
  { code: "zh-Hant", endonym: "繁體中文", english: "Chinese (Traditional)" },
  { code: "es", endonym: "Español", english: "Spanish" },
  { code: "hi", endonym: "हिन्दी", english: "Hindi" },
  { code: "ar", endonym: "العربية", english: "Arabic" },
  { code: "pt", endonym: "Português", english: "Portuguese" },
  { code: "fr", endonym: "Français", english: "French" },
  { code: "ja", endonym: "日本語", english: "Japanese" },
  { code: "ko", endonym: "한국어", english: "Korean" },
  { code: "de", endonym: "Deutsch", english: "German" },
  { code: "ru", endonym: "Русский", english: "Russian" },
  { code: "id", endonym: "Bahasa Indonesia", english: "Indonesian" },
  { code: "it", endonym: "Italiano", english: "Italian" },
  { code: "tr", endonym: "Türkçe", english: "Turkish" },
  { code: "vi", endonym: "Tiếng Việt", english: "Vietnamese" },
  { code: "th", endonym: "ไทย", english: "Thai" },
  { code: "pl", endonym: "Polski", english: "Polish" },
  { code: "nl", endonym: "Nederlands", english: "Dutch" },
  { code: "uk", endonym: "Українська", english: "Ukrainian" },
  { code: "fil", endonym: "Filipino", english: "Filipino" },
  { code: "ms", endonym: "Bahasa Melayu", english: "Malay" },
  { code: "bn", endonym: "বাংলা", english: "Bengali" },
  { code: "fa", endonym: "فارسی", english: "Persian" },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

export function getLanguage(code: string): Language | undefined {
  return BY_CODE.get(code);
}

export function isLanguageCode(code: string): boolean {
  return BY_CODE.has(code);
}

/** A readable label: endonym, with the English name when they differ. */
export function languageLabel(code: string): string {
  const lang = BY_CODE.get(code);
  if (!lang) return code;
  return lang.endonym === lang.english
    ? lang.endonym
    : `${lang.endonym} · ${lang.english}`;
}
