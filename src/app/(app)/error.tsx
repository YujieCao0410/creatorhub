"use client";

import { useEffect } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">{t("common.somethingWrong")}</h1>
      <p className="mt-2 text-sm text-muted">{t("common.somethingWrongBody")}</p>
      <Button className="mt-6" onClick={reset}>
        {t("common.tryAgain")}
      </Button>
    </div>
  );
}
