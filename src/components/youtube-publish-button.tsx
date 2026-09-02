"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";

export function YouTubePublishButton({
  slug,
  youtubeUrl,
}: {
  slug: string;
  youtubeUrl: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (youtubeUrl) {
    return (
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        {t("integrations.onYouTube")}
      </a>
    );
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      await api.post(`/api/posts/${slug}/publish/youtube`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("integrations.statusFailed"),
      );
      setPublishing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        size="sm"
        onClick={publish}
        loading={publishing}
      >
        {publishing
          ? t("integrations.publishing")
          : t("integrations.publishYouTube")}
      </Button>
      {error && (
        <p className="max-w-48 text-right text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
