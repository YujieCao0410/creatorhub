import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";
import jaMessages from "@/messages/ja.json";
import ptMessages from "@/messages/pt.json";
import zhMessages from "@/messages/zh.json";
import { getCurrentUser } from "@/lib/auth/session";
import {
  isLocale,
  LOCALE_COOKIE,
  matchLocale,
  type Locale,
} from "./config";
import { makeTranslator, type Messages, type TranslateFn } from "./translate";

const MESSAGES: Record<Locale, Messages> = {
  en: enMessages,
  zh: zhMessages,
  es: esMessages,
  ja: jaMessages,
  pt: ptMessages,
};

/**
 * The active locale for this request. Priority: explicit `locale` cookie →
 * the signed-in user's saved preference → the browser's `Accept-Language`.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookie && isLocale(cookie)) return cookie;

  const user = await getCurrentUser().catch(() => null);
  if (user?.locale && isLocale(user.locale)) return user.locale;

  return matchLocale((await headers()).get("accept-language"));
});

export const getMessages = cache(
  async (): Promise<{
    locale: Locale;
    messages: Messages;
    fallback: Messages;
  }> => {
    const locale = await getLocale();
    return { locale, messages: MESSAGES[locale], fallback: MESSAGES.en };
  },
);

/** `t()` for Server Components. Untranslated keys fall back to English. */
export const getT = cache(async (): Promise<TranslateFn> => {
  const { messages } = await getMessages();
  return makeTranslator(messages, MESSAGES.en);
});
