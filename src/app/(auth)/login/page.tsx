import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const t = await getT();
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">
        {t("auth.welcomeBack")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("auth.loginSubtitle")}</p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-brand-600">
          {t("auth.createLink")}
        </Link>
      </p>
    </div>
  );
}
