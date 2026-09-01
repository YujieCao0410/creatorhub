"use client";

import { useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

type UploadResponse = { url: string; type: string };

export function MediaUpload({
  kind,
  value,
  onChange,
}: {
  kind: "image" | "video";
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as
        | UploadResponse
        | { error?: { message?: string } }
        | null;
      if (!res.ok || !body || !("url" in body)) {
        const message =
          (body && "error" in body && body.error?.message) ||
          t("editor.uploadFailed");
        throw new Error(message);
      }
      onChange(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("editor.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {value ? (
        <div>
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="max-h-52 rounded-lg border border-border object-contain"
            />
          ) : (
            <video
              src={value}
              controls
              className="max-h-72 w-full rounded-lg border border-border"
            />
          )}
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              loading={uploading}
            >
              {t("editor.replace")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
            >
              {t("common.delete")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          loading={uploading}
        >
          {kind === "image"
            ? t("editor.uploadImage")
            : t("editor.uploadVideo")}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={kind === "image" ? "image/*" : "video/*"}
        hidden
        onChange={onFile}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
