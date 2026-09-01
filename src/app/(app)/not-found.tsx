import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">{t("common.notFoundTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("common.notFoundBody")}</p>
      <Link href="/" className={buttonClasses({ className: "mt-6" })}>
        {t("common.backHome")}
      </Link>
    </div>
  );
}
