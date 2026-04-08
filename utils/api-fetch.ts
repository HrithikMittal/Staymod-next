export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, message: string, body: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  /** JSON-serializable body; sets Content-Type to application/json */
  json?: unknown;
  body?: BodyInit | null;
};

function resolveUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base =
    typeof window === "undefined"
      ? (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
      : "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Single entry point for HTTP calls. Use this from TanStack Query `queryFn` / `mutationFn`
 * and from server code when calling your own routes or external APIs.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { json, body: rawBody, headers, ...init } = options;
  const url = resolveUrl(path);

  const nextHeaders: HeadersInit = { ...headers };
  let body: BodyInit | null | undefined = rawBody ?? undefined;

  if (json !== undefined) {
    (nextHeaders as Record<string, string>)["Content-Type"] ??= "application/json";
    body = JSON.stringify(json);
  }

  const res = await fetch(url, {
    ...init,
    body: body ?? undefined,
    headers: nextHeaders,
    credentials: init.credentials ?? "same-origin",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(
      res.status,
      `Request failed: ${res.status} ${res.statusText}`,
      text,
    );
  }

  if (!text) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return JSON.parse(text) as T;
  }

  return text as unknown as T;
}
