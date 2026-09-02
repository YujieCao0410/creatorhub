"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import type { DistributionPlan, PublishTargetDTO } from "@/lib/dto";
import { PLATFORMS } from "@/lib/platforms";

function statusTone(status: PublishTargetDTO["status"]) {
  if (status === "published") return "green" as const;
  if (status === "failed") return "neutral" as const;
  return "brand" as const;
}

export function DistributePanel({
  slug,
  targets,
}: {
  slug: string;
  targets: PublishTargetDTO[];
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<DistributionPlan | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishedCount = targets.filter((x) => x.status === "published").length;

  useEffect(() => {
    if (!open || plan) return;
    api
      .get<DistributionPlan>(`/api/posts/${slug}/distribute`)
      .then((p) => {
        setPlan(p);
        // Pre-check platforms that aren't published yet.
        const done = new Set(
          p.targets.filter((x) => x.status === "published").map((x) => x.platform),
        );
        setChecked(new Set(PLATFORMS.map((x) => x.id).filter((id) => !done.has(id))));
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : t("distribute.loadFailed")),
      );
  }, [open, plan, slug, t]);

  const currentTargets = plan?.targets ?? targets;
  const targetByPlatform = new Map(currentTargets.map((x) => [x.platform, x]));
  const captionByPlatform = new Map(
    (plan?.captions ?? []).map((c) => [c.platform, c.caption]),
  );

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function distribute() {
    setBusy(true);
    setError(null);
    try {
      const p = await api.post<DistributionPlan>(
        `/api/posts/${slug}/distribute`,
        { platforms: [...checked] },
      );
      setPlan(p);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("distribute.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function markDone(platform: string, url: string) {
    setBusy(true);
    setError(null);
    try {
      const p = await api.post<DistributionPlan>(
        `/api/posts/${slug}/targets/${platform}`,
        url.trim() ? { externalUrl: url.trim() } : {},
      );
      setPlan(p);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("distribute.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("distribute.open")}
        {publishedCount > 0 && (
          <span className="ml-1 text-xs text-muted">
            {publishedCount}/{PLATFORMS.length}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{t("distribute.title")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
                className="text-muted hover:text-foreground"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">{t("distribute.hint")}</p>

            {error && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {error}
              </p>
            )}

            <div className="mt-4 space-y-2">
              {PLATFORMS.map((platform) => {
                const target = targetByPlatform.get(platform.id);
                const isPublished = target?.status === "published";
                return (
                  <PlatformRow
                    key={platform.id}
                    label={platform.label}
                    locale={platform.locale}
                    api={platform.api}
                    checked={checked.has(platform.id)}
                    disabled={isPublished || busy}
                    onToggle={() => toggle(platform.id)}
                    target={target}
                    caption={captionByPlatform.get(platform.id) ?? ""}
                    onMarkDone={(url) => markDone(platform.id, url)}
                    t={t}
                  />
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {t("common.close")}
              </Button>
              <Button
                size="sm"
                loading={busy}
                disabled={checked.size === 0}
                onClick={distribute}
              >
                {t("distribute.publishSelected")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PlatformRow({
  label,
  locale,
  api: isApi,
  checked,
  disabled,
  onToggle,
  target,
  caption,
  onMarkDone,
  t,
}: {
  label: string;
  locale: "en" | "zh";
  api: boolean;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  target: PublishTargetDTO | undefined;
  caption: string;
  onMarkDone: (url: string) => void;
  t: (k: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const isManual = !isApi;
  const isPublished = target?.status === "published";
  const showManualTools =
    isManual && (target?.status === "manual" || expanded) && !isPublished;

  async function copy() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select the text manually */
    }
  }

  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={checked && !isPublished}
          disabled={disabled}
          onChange={onToggle}
          className="size-4 accent-brand-600"
          aria-label={label}
        />
        <span className="font-medium">{label}</span>
        <span className="rounded bg-black/[0.06] px-1 text-[10px] uppercase text-muted dark:bg-white/10">
          {locale === "zh" ? "中" : "EN"}
        </span>
        {isApi ? (
          <Badge tone="brand">API</Badge>
        ) : (
          <Badge>{t("distribute.manual")}</Badge>
        )}
        <span className="ml-auto">
          {target && (
            <Badge tone={statusTone(target.status)}>
              {t(`distribute.status.${target.status}`)}
            </Badge>
          )}
        </span>
      </div>

      {target?.error && (
        <p className="mt-1.5 text-xs text-red-600">{target.error}</p>
      )}

      {isPublished && target?.externalUrl && (
        <a
          href={target.externalUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block text-xs font-medium text-brand-600 hover:underline"
        >
          {target.externalUrl}
        </a>
      )}

      {isManual && !isPublished && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs text-muted hover:text-foreground"
        >
          {expanded ? t("distribute.hideCaption") : t("distribute.showCaption")}
        </button>
      )}

      {showManualTools && (
        <div className="mt-2 space-y-2">
          <textarea
            readOnly
            value={caption}
            rows={4}
            className="w-full resize-none rounded-md border border-border bg-background p-2 text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? t("distribute.copied") : t("distribute.copyCaption")}
            </Button>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("distribute.pasteUrl")}
              className="min-w-40 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none"
            />
            <Button size="sm" onClick={() => onMarkDone(url)}>
              {t("distribute.markDone")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
