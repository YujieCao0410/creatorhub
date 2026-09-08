"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { MediaUpload } from "@/components/media-upload";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import type { PostDetail } from "@/lib/dto";
import { extractHashtags } from "@/lib/tags";

type CaptionSuggestion = {
  captions: Record<string, string>;
  tags: string[];
  note: string;
};

export function PostEditor({
  mode,
  post,
  aiEnabled = false,
  aiCreditsLeft = null,
  defaultTags = [],
}: {
  mode: "create" | "edit";
  post?: PostDetail;
  aiEnabled?: boolean;
  /** AI generations left this month; null = unlimited (PRO). */
  aiCreditsLeft?: number | null;
  /** The creator's saved hashtags, seeded into a new post's caption box. */
  defaultTags?: string[];
}) {
  const router = useRouter();
  const t = useT();

  // One caption box. Existing posts keep whatever language key they were saved
  // under; new posts default to "en" (the distribute step falls back to this
  // single caption for every platform and language anyway).
  const primaryLang = useMemo(
    () => (post ? (Object.keys(post.captions)[0] ?? "en") : "en"),
    [post],
  );

  const [caption, setCaption] = useState(() => {
    if (post) return post.captions[primaryLang] ?? "";
    return defaultTags.length
      ? "\n\n" + defaultTags.map((x) => `#${x}`).join(" ")
      : "";
  });
  const [location, setLocation] = useState(post?.location ?? "");
  const [videoUrl, setVideoUrl] = useState<string | null>(post?.videoUrl ?? null);
  const [shareToCommunity, setShareToCommunity] = useState(
    post?.shareToCommunity ?? true,
  );

  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(aiCreditsLeft);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    null | "draft" | "publish" | "save" | "toggle"
  >(null);

  async function runAi() {
    if (!post) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const s = await api.post<CaptionSuggestion>(
        `/api/posts/${post.slug}/captions/suggest`,
        { languages: [primaryLang] },
      );
      const text = s.captions[primaryLang] ?? Object.values(s.captions)[0] ?? "";
      const tagLine = s.tags.length
        ? "\n\n" + s.tags.map((x) => `#${x}`).join(" ")
        : "";
      setCaption((text + tagLine).trim());
      setCredits((c) => (c === null ? null : Math.max(0, c - 1)));
    } catch (err) {
      setAiError(
        err instanceof ApiError ? err.message : t("common.somethingWrongBody"),
      );
    } finally {
      setAiBusy(false);
    }
  }

  function createPayload() {
    return {
      location: location.trim(),
      videoUrl,
      tags: extractHashtags(caption),
      captions: { [primaryLang]: caption.trim() },
      shareToCommunity,
    };
  }

  async function run(
    action: NonNullable<typeof busy>,
    fn: () => Promise<PostDetail>,
  ) {
    if (action !== "toggle" && !caption.trim()) {
      setFieldErrors({ captions: t("editor.captionRequired") });
      return;
    }
    setBusy(action);
    setFieldErrors({});
    setFormError(null);
    try {
      await fn();
      router.push(`/dashboard/posts`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        if (Object.keys(err.fieldErrors).length === 0) setFormError(err.message);
      } else {
        setFormError(t("common.somethingWrongBody"));
      }
      setBusy(null);
    }
  }

  const createDraft = () =>
    run("draft", async () => {
      const { post: p } = await api.post<{ post: PostDetail }>("/api/posts", {
        ...createPayload(),
        publish: false,
      });
      return p;
    });

  const createPublished = () =>
    run("publish", async () => {
      const { post: p } = await api.post<{ post: PostDetail }>("/api/posts", {
        ...createPayload(),
        publish: true,
      });
      return p;
    });

  const save = () =>
    run("save", async () => {
      const { post: updated } = await api.patch<{ post: PostDetail }>(
        `/api/posts/${post!.slug}`,
        createPayload(),
      );
      return updated;
    });

  const togglePublish = () =>
    run("toggle", async () => {
      const { post: updated } = await api.patch<{ post: PostDetail }>(
        `/api/posts/${post!.slug}`,
        { published: !post!.published },
      );
      return updated;
    });

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="max-w-2xl space-y-5"
      noValidate
    >
      {formError && <Alert>{formError}</Alert>}

      <Field label={t("editor.video")} htmlFor="video" hint={t("editor.videoHint")}>
        <MediaUpload kind="video" value={videoUrl} onChange={setVideoUrl} />
        <p className="mt-1 text-xs text-muted">{t("editor.coverIsFirstFrame")}</p>
      </Field>

      <Field
        label={t("editor.caption")}
        htmlFor="caption"
        hint={t("editor.captionHint")}
        error={fieldErrors.captions || fieldErrors.content}
        required
      >
        <Textarea
          id="caption"
          className="min-h-40"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t("editor.captionPlaceholder")}
        />
        {aiEnabled && mode === "edit" && (
          <div className="mt-2 flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={aiBusy}
              disabled={credits === 0}
              onClick={runAi}
            >
              {aiBusy ? t("editor.aiWorking") : t("editor.aiSuggest")}
            </Button>
            {credits !== null && (
              <span className="text-[11px] text-muted">
                {credits === 0
                  ? t("editor.aiOutOfCredits")
                  : t("editor.aiCreditsLeft", { n: credits })}
              </span>
            )}
          </div>
        )}
        {aiError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-200">
            {aiError}
          </p>
        )}
      </Field>

      <Field
        label={t("editor.location")}
        htmlFor="location"
        hint={t("editor.locationHint")}
      >
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={120}
          placeholder={t("editor.locationPlaceholder")}
        />
      </Field>

      <details className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        <summary className="cursor-pointer select-none font-medium">
          {t("editor.moreSettings")}
        </summary>
        <label className="mt-3 flex items-start gap-2">
          <input
            type="checkbox"
            checked={shareToCommunity}
            onChange={(e) => setShareToCommunity(e.target.checked)}
            className="mt-0.5 size-4 accent-brand-600"
          />
          <span>
            {t("editor.shareToCommunity")}
            <span className="block text-xs text-muted">
              {t("editor.shareToCommunityHint")}
            </span>
          </span>
        </label>
      </details>

      <div className="flex flex-wrap gap-2">
        {mode === "create" ? (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={createDraft}
              loading={busy === "draft"}
              disabled={busy !== null}
            >
              {t("editor.saveDraft")}
            </Button>
            <Button
              type="button"
              onClick={createPublished}
              loading={busy === "publish"}
              disabled={busy !== null}
            >
              {t("editor.publish")}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={save}
              loading={busy === "save"}
              disabled={busy !== null}
            >
              {t("common.save")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={togglePublish}
              loading={busy === "toggle"}
              disabled={busy !== null}
            >
              {post!.published ? t("editor.unpublish") : t("editor.publish")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
