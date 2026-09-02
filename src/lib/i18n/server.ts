import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import ar from "@/messages/ar.json";
import bg from "@/messages/bg.json";
import bn from "@/messages/bn.json";
import ca from "@/messages/ca.json";
import cs from "@/messages/cs.json";
import da from "@/messages/da.json";
import de from "@/messages/de.json";
import el from "@/messages/el.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fa from "@/messages/fa.json";
import fi from "@/messages/fi.json";
import fil from "@/messages/fil.json";
import fr from "@/messages/fr.json";
import he from "@/messages/he.json";
import hi from "@/messages/hi.json";
import hr from "@/messages/hr.json";
import hu from "@/messages/hu.json";
import id from "@/messages/id.json";
import it from "@/messages/it.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import ms from "@/messages/ms.json";
import nb from "@/messages/nb.json";
import nl from "@/messages/nl.json";
import pl from "@/messages/pl.json";
import pt from "@/messages/pt.json";
import ro from "@/messages/ro.json";
import ru from "@/messages/ru.json";
import sk from "@/messages/sk.json";
import sr from "@/messages/sr.json";
import sv from "@/messages/sv.json";
import sw from "@/messages/sw.json";
import th from "@/messages/th.json";
import tr from "@/messages/tr.json";
import uk from "@/messages/uk.json";
import ur from "@/messages/ur.json";
import vi from "@/messages/vi.json";
import zhHant from "@/messages/zh-Hant.json";
import zh from "@/messages/zh.json";
import { isLocale, LOCALE_COOKIE, matchLocale, type Locale } from "./config";
import { makeTranslator, type Messages, type TranslateFn } from "./translate";

const MESSAGES: Record<Locale, Messages> = {
  en, zh, "zh-Hant": zhHant, es, hi, ar, pt, fr, ja, ko,
  de, ru, id, it, tr, vi, th, pl, nl, uk,
  fil, ms, bn, fa, sv, da, fi, nb, cs, sk,
  ro, hu, el, bg, hr, sr, ca, he, ur, sw,
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
