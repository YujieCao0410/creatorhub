"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

type UploadResponse = { url: string; type: string };

/**
 * Uploads straight from the browser to Vercel Blob (bypassing the ~4.5 MB
 * request-body cap on Vercel's serverless routes — most video clips exceed
 * it). Falls back to the legacy same-origin multipart route when Blob isn't
 * configured (local dev without `BLOB_READ_WRITE_TOKEN`, or any error
 * standing up the direct upload) — that route still works for small files.
 */
async function uploadFile(
  file: File,
  kind: "image" | "video",
): Promise<UploadResponse> {
  try {
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/uploads/blob-token",
      clientPayload: JSON.stringify({ kind }),
    });
    return { url: blob.url, type: file.type };
  } catch {
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const body = (await res.json().catch(() => null)) as
      | UploadResponse
      | { error?: { message?: string } }
      | null;
    if (!res.ok || !body || !("url" in body)) {
      const message = (body && "error" in body && body.error?.message) || null;
      throw new Error(message ?? "Upload failed");
    }
    return body;
  }
}

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
      const { url } = await uploadFile(file, kind);
      onChange(url);
    } catch {
      setError(t("editor.uploadFailed"));
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
