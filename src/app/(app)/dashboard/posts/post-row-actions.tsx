"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { buttonClasses } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";

export function PostRowActions({
  slug,
  published,
}: {
  slug: string;
  published: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm(t("post.deleteConfirm"))) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/posts/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.somethingWrong"));
      setDeleting(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {published && (
        <Link
          href={`/posts/${slug}`}
          className="text-xs text-muted hover:text-foreground"
        >
          {t("common.view")}
        </Link>
      )}
      <Link
        href={`/dashboard/posts/${slug}/edit`}
        className={buttonClasses({ variant: "secondary", size: "sm" })}
      >
        {t("common.edit")}
      </Link>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        {deleting ? t("common.deleting") : t("common.delete")}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
