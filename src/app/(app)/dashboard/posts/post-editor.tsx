"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { MediaUpload } from "@/components/media-upload";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import type { PostDetail } from "@/lib/dto";

type Values = {
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  videoUrl: string | null;
  tags: string[];
  captionEn: string;
  captionZh: string;
};

const EMPTY: Values = {
  title: "",
  excerpt: "",
  content: "",
  coverImageUrl: null,
  videoUrl: null,
  tags: [],
  captionEn: "",
  captionZh: "",
};

type CaptionSuggestion = {
  captionEn: string;
  captionZh: string;
  tags: string[];
  note: string;
};

export function PostEditor({
  mode,
  post,
  aiEnabled = false,
}: {
  mode: "create" | "edit";
  post?: PostDetail;
  aiEnabled?: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  async function suggestCaptions() {
    if (!post) return;
    setAiBusy(true);
    setAiNote(null);
    setAiError(null);
    try {
      const s = await api.post<CaptionSuggestion>(
        `/api/posts/${post.slug}/captions/suggest`,
      );
      setValues((v) => ({
        ...v,
        captionEn: s.captionEn || v.captionEn,
        captionZh: s.captionZh || v.captionZh,
        tags: [...new Set([...v.tags, ...s.tags])].slice(0, 10),
      }));
      setAiNote(s.note || t("editor.aiDone"));
    } catch (err) {
      setAiError(
        err instanceof ApiError ? err.message : t("common.somethingWrongBody"),
      );
    } finally {
      setAiBusy(false);
    }
  }

  const [values, setValues] = useState<Values>(
    post
      ? {
          title: post.title,
          excerpt: post.excerpt ?? "",
          content: post.content,
          coverImageUrl: post.coverImageUrl,
          videoUrl: post.videoUrl,
          tags: post.tags,
          captionEn: post.captionEn,
          captionZh: post.captionZh,
        }
      : EMPTY,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    null | "draft" | "publish" | "save" | "toggle"
  >(null);

  function updateText(
    key: "title" | "excerpt" | "content" | "captionEn" | "captionZh",
  ) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  }
  function set<K extends keyof Values>(key: K, val: Values[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function payload() {
    return {
      title: values.title,
      content: values.content,
      excerpt: values.excerpt.trim() === "" ? null : values.excerpt,
      coverImageUrl: values.coverImageUrl,
      videoUrl: values.videoUrl,
      tags: values.tags,
      captionEn: values.captionEn,
      captionZh: values.captionZh,
    };
  }

  async function run(
    action: NonNullable<typeof busy>,
    fn: () => Promise<PostDetail>,
  ) {
    setBusy(action);
    setFieldErrors({});
    setFormError(null);
    try {
      const result = await fn();
      router.push(`/dashboard/posts`);
      router.refresh();
      return result;
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = err.fieldErrors;
        setFieldErrors(fields);
        if (Object.keys(fields).length === 0) setFormError(err.message);
      } else {
        setFormError(t("common.somethingWrongBody"));
      }
      setBusy(null);
    }
  }

  const createDraft = () =>
    run("draft", async () => {
      const { post } = await api.post<{ post: PostDetail }>("/api/posts", {
        ...payload(),
        publish: false,
      });
      return post;
    });

  const createPublished = () =>
    run("publish", async () => {
      const { post } = await api.post<{ post: PostDetail }>("/api/posts", {
        ...payload(),
        publish: true,
      });
      return post;
    });

  const save = () =>
    run("save", async () => {
      const { post: updated } = await api.patch<{ post: PostDetail }>(
        `/api/posts/${post!.slug}`,
        payload(),
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
      className="max-w-2xl space-y-4"
      noValidate
    >
      {formError && <Alert>{formError}</Alert>}

      <Field
        label={t("editor.title")}
        htmlFor="title"
        hint={t("editor.titleHint")}
        error={fieldErrors.title}
      >
        <Input
          id="title"
          value={values.title}
          onChange={updateText("title")}
          aria-invalid={Boolean(fieldErrors.title)}
        />
      </Field>

      <Field
        label={t("editor.tags")}
        htmlFor="tags"
        hint={t("editor.tagsHint")}
        error={fieldErrors.tags}
      >
        <TagInput
          value={values.tags}
          onChange={(tags) => set("tags", tags)}
        />
      </Field>

      <Field label={t("editor.video")} htmlFor="video">
        <MediaUpload
          kind="video"
          value={values.videoUrl}
          onChange={(url) => set("videoUrl", url)}
        />
      </Field>

      <Field
        label={t("editor.cover")}
        htmlFor="cover"
        hint={t("editor.coverHint")}
        error={fieldErrors.coverImageUrl}
      >
        <MediaUpload
          kind="image"
          value={values.coverImageUrl}
          onChange={(url) => set("coverImageUrl", url)}
        />
      </Field>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t("editor.captionsTitle")}</p>
            <p className="mt-0.5 text-xs text-muted">
              {t("editor.captionsHint")}
            </p>
          </div>
          {aiEnabled && mode === "edit" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={suggestCaptions}
              loading={aiBusy}
              disabled={busy !== null}
            >
              {aiBusy ? t("editor.aiWorking") : t("editor.aiSuggest")}
            </Button>
          )}
        </div>
        {aiNote && (
          <p className="mt-2 rounded-md bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-950 dark:text-brand-100">
            {aiNote}
          </p>
        )}
        {aiError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-200">
            {aiError}
          </p>
        )}
        <div className="mt-3 space-y-3">
          <Field label={t("editor.captionEn")} htmlFor="captionEn">
            <Textarea
              id="captionEn"
              className="min-h-20"
              value={values.captionEn}
              onChange={updateText("captionEn")}
              placeholder={t("editor.captionEnPlaceholder")}
            />
          </Field>
          <Field label={t("editor.captionZh")} htmlFor="captionZh">
            <Textarea
              id="captionZh"
              className="min-h-20"
              value={values.captionZh}
              onChange={updateText("captionZh")}
              placeholder={t("editor.captionZhPlaceholder")}
            />
          </Field>
        </div>
      </div>

      <Field
        label={t("editor.excerpt")}
        htmlFor="excerpt"
        hint={t("editor.excerptHint")}
        error={fieldErrors.excerpt}
      >
        <Input
          id="excerpt"
          value={values.excerpt}
          onChange={updateText("excerpt")}
          maxLength={280}
          aria-invalid={Boolean(fieldErrors.excerpt)}
        />
      </Field>

      <Field
        label={t("editor.content")}
        htmlFor="content"
        hint={t("editor.contentHint")}
        error={fieldErrors.content}
      >
        <Textarea
          id="content"
          className="min-h-64"
          value={values.content}
          onChange={updateText("content")}
          aria-invalid={Boolean(fieldErrors.content)}
        />
      </Field>

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
              {post!.published
                ? t("editor.unpublish")
                : t("editor.publish")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
