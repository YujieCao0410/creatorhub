import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";
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
};

/**
 * The active locale for this request: an explicit `locale` cookie wins,
 * otherwise the browser's `Accept-Language` decides.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookie && isLocale(cookie)) return cookie;
  return matchLocale((await headers()).get("accept-language"));
});

export const getMessages = cache(
  async (): Promise<{ locale: Locale; messages: Messages }> => {
    const locale = await getLocale();
    return { locale, messages: MESSAGES[locale] };
  },
);

/** `t()` for Server Components. */
export const getT = cache(async (): Promise<TranslateFn> => {
  const { messages } = await getMessages();
  return makeTranslator(messages);
});
