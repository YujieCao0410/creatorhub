import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import arMessages from "@/messages/ar.json";
import bnMessages from "@/messages/bn.json";
import deMessages from "@/messages/de.json";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";
import faMessages from "@/messages/fa.json";
import filMessages from "@/messages/fil.json";
import frMessages from "@/messages/fr.json";
import hiMessages from "@/messages/hi.json";
import idMessages from "@/messages/id.json";
import itMessages from "@/messages/it.json";
import jaMessages from "@/messages/ja.json";
import koMessages from "@/messages/ko.json";
import msMessages from "@/messages/ms.json";
import nlMessages from "@/messages/nl.json";
import plMessages from "@/messages/pl.json";
import ptMessages from "@/messages/pt.json";
import ruMessages from "@/messages/ru.json";
import thMessages from "@/messages/th.json";
import trMessages from "@/messages/tr.json";
import ukMessages from "@/messages/uk.json";
import viMessages from "@/messages/vi.json";
import zhHantMessages from "@/messages/zh-Hant.json";
import zhMessages from "@/messages/zh.json";
import { isLocale, LOCALE_COOKIE, matchLocale, type Locale } from "./config";
import { makeTranslator, type Messages, type TranslateFn } from "./translate";

const MESSAGES: Record<Locale, Messages> = {
  en: enMessages,
  zh: zhMessages,
  "zh-Hant": zhHantMessages,
  es: esMessages,
  hi: hiMessages,
  ar: arMessages,
  pt: ptMessages,
  fr: frMessages,
  ja: jaMessages,
  ko: koMessages,
  de: deMessages,
  ru: ruMessages,
  id: idMessages,
  it: itMessages,
  tr: trMessages,
  vi: viMessages,
  th: thMessages,
  pl: plMessages,
  nl: nlMessages,
  uk: ukMessages,
  fil: filMessages,
  ms: msMessages,
  bn: bnMessages,
  fa: faMessages,
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
