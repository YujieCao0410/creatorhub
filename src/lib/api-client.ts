/**
 * Typed browser client for the CreatorHub API. Used by Client Components for
 * mutations and interactive refetches. (Server Components read data by calling
 * services directly, so they don't go through this.)
 */

export type ValidationDetail = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Field name -> first message, from a 422 VALIDATION_ERROR response. */
  get fieldErrors(): Record<string, string> {
    if (this.code !== "VALIDATION_ERROR" || !Array.isArray(this.details)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const detail of this.details as ValidationDetail[]) {
      if (detail?.path && !(detail.path in out)) {
        out[detail.path] = detail.message;
      }
    }
    return out;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const error = (body?.error ?? {}) as {
      code?: string;
      message?: string;
      details?: unknown;
    };
    throw new ApiError(
      res.status,
      error.code ?? "UNKNOWN",
      error.message ?? "Request failed",
      error.details,
    );
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
