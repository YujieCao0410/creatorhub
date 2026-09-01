"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";

const TAG_RE = /^[\p{L}\p{N}_-]{1,30}$/u;

export function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/^#/, "");
    if (
      !tag ||
      value.includes(tag) ||
      value.length >= 10 ||
      !TAG_RE.test(tag)
    ) {
      return;
    }
    onChange([...value, tag]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      add(draft);
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
          add(draft);
          setDraft("");
        }}
        placeholder={value.length === 0 ? t("editor.tagsPlaceholder") : ""}
        className="min-w-32 flex-1 bg-transparent py-0.5 text-sm outline-none"
        aria-label={t("editor.tags")}
      />
    </div>
  );
}
