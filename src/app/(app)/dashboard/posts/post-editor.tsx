"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import type { PostDetail } from "@/lib/dto";

type Values = {
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
};

const EMPTY: Values = { title: "", excerpt: "", content: "", coverImageUrl: "" };

export function PostEditor({
  mode,
  post,
}: {
  mode: "create" | "edit";
  post?: PostDetail;
}) {
  const router = useRouter();
  const t = useT();

  const [values, setValues] = useState<Values>(
    post
      ? {
          title: post.title,
          excerpt: post.excerpt ?? "",
          content: post.content,
          coverImageUrl: post.coverImageUrl ?? "",
        }
      : EMPTY,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "draft" | "publish" | "save" | "toggle">(
    null,
  );

  function update(key: keyof Values) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setValues((v) => ({ ...v, [key]: e.target.value }));
  }

  function payload() {
    return {
      title: values.title,
      content: values.content,
      excerpt: values.excerpt.trim() === "" ? null : values.excerpt,
      coverImageUrl:
        values.coverImageUrl.trim() === "" ? null : values.coverImageUrl,
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
        error={fieldErrors.title}
      >
        <Input
          id="title"
          value={values.title}
          onChange={update("title")}
          aria-invalid={Boolean(fieldErrors.title)}
        />
      </Field>

      <Field
        label={t("editor.excerpt")}
        htmlFor="excerpt"
        hint={t("editor.excerptHint")}
        error={fieldErrors.excerpt}
      >
        <Input
          id="excerpt"
          value={values.excerpt}
          onChange={update("excerpt")}
          maxLength={280}
          aria-invalid={Boolean(fieldErrors.excerpt)}
        />
      </Field>

      <Field
        label={t("editor.coverImageUrl")}
        htmlFor="coverImageUrl"
        error={fieldErrors.coverImageUrl}
      >
        <Input
          id="coverImageUrl"
          type="url"
          value={values.coverImageUrl}
          onChange={update("coverImageUrl")}
          aria-invalid={Boolean(fieldErrors.coverImageUrl)}
        />
      </Field>

      <Field
        label={t("editor.content")}
        htmlFor="content"
        error={fieldErrors.content}
      >
        <Textarea
          id="content"
          className="min-h-64"
          value={values.content}
          onChange={update("content")}
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
