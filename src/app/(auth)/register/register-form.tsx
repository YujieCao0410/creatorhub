"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import type { SelfUser } from "@/lib/dto";

export function RegisterForm() {
  const router = useRouter();
  const t = useT();
  const { setUser } = useSession();

  const [values, setValues] = useState({
    name: "",
    handle: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      setFieldErrors((errs) => {
        if (!errs[key]) return errs;
        const next = { ...errs };
        delete next[key];
        return next;
      });
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const { user } = await api.post<{ user: SelfUser }>(
        "/api/auth/register",
        values,
      );
      setUser(user);
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = err.fieldErrors;
        setFieldErrors(fields);
        if (Object.keys(fields).length === 0) setFormError(err.message);
      } else {
        setFormError(t("common.somethingWrongBody"));
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError && <Alert>{formError}</Alert>}

      <Field label={t("auth.name")} htmlFor="name" error={fieldErrors.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          value={values.name}
          onChange={update("name")}
          aria-invalid={Boolean(fieldErrors.name)}
        />
      </Field>

      <Field
        label={t("auth.handle")}
        htmlFor="handle"
        hint={t("auth.handleHint")}
        error={fieldErrors.handle}
      >
        <Input
          id="handle"
          name="handle"
          autoComplete="username"
          required
          value={values.handle}
          onChange={update("handle")}
          aria-invalid={Boolean(fieldErrors.handle)}
        />
      </Field>

      <Field label={t("auth.email")} htmlFor="email" error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={update("email")}
          aria-invalid={Boolean(fieldErrors.email)}
        />
      </Field>

      <Field
        label={t("auth.password")}
        htmlFor="password"
        hint={t("auth.passwordHint")}
        error={fieldErrors.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={values.password}
          onChange={update("password")}
          aria-invalid={Boolean(fieldErrors.password)}
        />
      </Field>

      <Button type="submit" className="w-full" loading={loading}>
        {t("auth.createButton")}
      </Button>
    </form>
  );
}
