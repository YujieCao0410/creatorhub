export type Messages = Record<string, unknown>;
export type TranslateVars = Record<string, string | number>;
export type TranslateFn = (key: string, vars?: TranslateVars) => string;

/**
 * Builds a `t(key, vars?)` function over a nested message object.
 * `t("nav.feed")` looks up `messages.nav.feed`; a missing key returns the key
 * itself (so nothing ever renders blank). `{name}` placeholders are filled from
 * `vars`.
 */
function lookup(messages: Messages, key: string): string | undefined {
  const value = key
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      messages,
    );
  return typeof value === "string" ? value : undefined;
}

/**
 * Builds `t(key, vars?)`. A key missing from `messages` falls back to
 * `fallback` (English), then to the key itself.
 */
export function makeTranslator(
  messages: Messages,
  fallback?: Messages,
): TranslateFn {
  return (key, vars) => {
    let text =
      lookup(messages, key) ??
      (fallback ? lookup(fallback, key) : undefined) ??
      key;
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(replacement));
      }
    }
    return text;
  };
}
