"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { LANGUAGES, languageLabel } from "@/lib/languages";

/**
 * Edits a post's per-language captions. The creator adds any languages they
 * want; each platform later picks which one to publish in.
 */
export function CaptionsEditor({
  captions,
  onChange,
  aiEnabled,
  aiBusy,
  aiNote,
  aiError,
  onAiSuggest,
}: {
  captions: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  aiEnabled: boolean;
  aiBusy: boolean;
  aiNote: string | null;
  aiError: string | null;
  /** Given the languages currently shown, run AI generation. */
  onAiSuggest: (languages: string[]) => void;
}) {
  const t = useT();
  const [adding, setAdding] = useState("");

  const langs = Object.keys(captions);
  const available = LANGUAGES.filter((l) => !langs.includes(l.code));

  function setCaption(code: string, text: string) {
    onChange({ ...captions, [code]: text });
  }
  function addLanguage(code: string) {
    if (!code || langs.includes(code)) return;
    onChange({ ...captions, [code]: "" });
    setAdding("");
  }
  function removeLanguage(code: string) {
    const next = { ...captions };
    delete next[code];
    onChange(next);
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t("editor.captionsTitle")}</p>
          <p className="mt-0.5 text-xs text-muted">{t("editor.captionsHint")}</p>
        </div>
        {aiEnabled && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={aiBusy}
            onClick={() =>
              onAiSuggest(langs.length ? langs : ["en"])
            }
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

      {langs.length === 0 && (
        <p className="mt-3 text-xs text-muted">{t("editor.captionsEmpty")}</p>
      )}

      <div className="mt-3 space-y-3">
        {langs.map((code) => (
          <div key={code}>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor={`caption-${code}`}
                className="text-xs font-medium text-muted"
              >
                {languageLabel(code)}
              </label>
              <button
                type="button"
                onClick={() => removeLanguage(code)}
                className="text-xs text-muted hover:text-red-600"
              >
                {t("editor.removeLanguage")}
              </button>
            </div>
            <Textarea
              id={`caption-${code}`}
              className="min-h-20"
              value={captions[code] ?? ""}
              onChange={(e) => setCaption(code, e.target.value)}
              placeholder={t("editor.captionPlaceholder")}
            />
          </div>
        ))}
      </div>

      {available.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <select
            value={adding}
            onChange={(e) => addLanguage(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"
          >
            <option value="">{t("editor.addLanguage")}</option>
            {available.map((l) => (
              <option key={l.code} value={l.code}>
                {languageLabel(l.code)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
