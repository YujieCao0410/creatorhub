"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";

const TAG_RE = /^[\p{L}\p{N}_-]{1,30}$/u;
const MAX_TAGS = 10;

export function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");

  /** Splits on spaces/commas so pasting or typing "#a #b #c" adds all of them. */
  function commit(raw: string) {
    const parts = raw
      .split(/[\s,]+/)
      .map((p) => p.trim().toLowerCase().replace(/^#+/, ""))
      .filter(Boolean);

    const next = [...value];
    for (const part of parts) {
      if (next.length >= MAX_TAGS) break;
      if (!next.includes(part) && TAG_RE.test(part)) next.push(part);
    }
    if (next.length !== value.length) onChange(next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commit(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-100"
        >
          #{tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== tag))}
            aria-label={`remove ${tag}`}
            className="text-brand-700/70 hover:text-brand-700"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          commit(draft);
          setDraft("");
        }}
        placeholder={value.length === 0 ? t("editor.tagsPlaceholder") : ""}
        className="min-w-32 flex-1 bg-transparent py-0.5 text-sm outline-none"
        aria-label={t("editor.tags")}
      />
    </div>
  );
}
