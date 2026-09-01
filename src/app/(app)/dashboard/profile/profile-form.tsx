"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import type { SelfUser } from "@/lib/dto";

type Values = { name: string; bio: string; avatarUrl: string };

export function ProfileForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const t = useT();
  const { setUser } = useSession();

  const [values, setValues] = useState<Values>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(key: keyof Values) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      setSaved(false);
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setFormError(null);
    setSaved(false);
    try {
      const { user } = await api.patch<{ user: SelfUser }>("/api/me", {
        name: values.name,
        bio: values.bio.trim() === "" ? null : values.bio,
        avatarUrl: values.avatarUrl.trim() === "" ? null : values.avatarUrl,
      });
      setUser(user);
      setSaved(true);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = err.fieldErrors;
        setFieldErrors(fields);
        if (Object.keys(fields).length === 0) setFormError(err.message);
      } else {
        setFormError(t("common.somethingWrongBody"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError && <Alert>{formError}</Alert>}
      {saved && <Alert tone="success">{t("dashboard.profileUpdated")}</Alert>}

      <Field label={t("dashboard.fieldName")} htmlFor="name" error={fieldErrors.name}>
        <Input
          id="name"
          value={values.name}
          onChange={update("name")}
          aria-invalid={Boolean(fieldErrors.name)}
        />
      </Field>

      <Field
        label={t("dashboard.bio")}
        htmlFor="bio"
        hint={t("dashboard.bioHint")}
        error={fieldErrors.bio}
      >
        <Textarea
          id="bio"
          value={values.bio}
          onChange={update("bio")}
          maxLength={280}
          aria-invalid={Boolean(fieldErrors.bio)}
        />
      </Field>

      <Field
        label={t("dashboard.avatarUrl")}
        htmlFor="avatarUrl"
        hint={t("dashboard.avatarHint")}
        error={fieldErrors.avatarUrl}
      >
        <Input
          id="avatarUrl"
          type="url"
          value={values.avatarUrl}
          onChange={update("avatarUrl")}
          aria-invalid={Boolean(fieldErrors.avatarUrl)}
        />
      </Field>

      <Button type="submit" loading={loading}>
        {t("common.save")}
      </Button>
    </form>
  );
}
