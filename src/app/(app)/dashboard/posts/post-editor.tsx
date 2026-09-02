"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CaptionsEditor } from "@/components/captions-editor";
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
  captions: Record<string, string>;
};

const EMPTY: Values = {
  title: "",
  excerpt: "",
  content: "",
  coverImageUrl: null,
  videoUrl: null,
  tags: [],
  captions: {},
};

type CaptionSuggestion = {
  captions: Record<string, string>;
  tags: string[];
  note: string;
};

export function PostEditor({
  mode,
  post,
  aiEnabled = false,
  defaultTags = [],
}: {
  mode: "create" | "edit";
  post?: PostDetail;
  aiEnabled?: boolean;
  /** Pre-filled into `tags` when creating a new post. */
  defaultTags?: string[];
}) {
  const router = useRouter();
  const t = useT();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  async function suggestCaptions(languages: string[]) {
    if (!post) return;
    setAiBusy(true);
    setAiNote(null);
    setAiError(null);
    try {
      const s = await api.post<CaptionSuggestion>(
        `/api/posts/${post.slug}/captions/suggest`,
        { languages },
      );
      setValues((v) => ({
        ...v,
        captions: { ...v.captions, ...s.captions },
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
          captions: post.captions,
        }
      : { ...EMPTY, tags: defaultTags },
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    null | "draft" | "publish" | "save" | "toggle"
  >(null);

  function updateText(key: "title" | "excerpt" | "content") {
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
      captions: values.captions,
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

      <CaptionsEditor
        captions={values.captions}
        onChange={(captions) => set("captions", captions)}
        aiEnabled={aiEnabled && mode === "edit"}
        aiBusy={aiBusy}
        aiNote={aiNote}
        aiError={aiError}
        onAiSuggest={suggestCaptions}
      />

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
