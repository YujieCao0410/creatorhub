import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const t = await getT();
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">
        {t("auth.createTitle")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("auth.createSubtitle")}</p>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-600">
          {t("auth.loginLink")}
        </Link>
      </p>
    </div>
  );
}
