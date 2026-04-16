import "server-only";

/** Builds `/api/public/v1` base URL from incoming request headers (SSR-safe, matches browser origin in dev/prod). */
export function publicApiV1BaseUrlFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const forwardedProto = h.get("x-forwarded-proto");
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : host.includes("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https";
  return `${proto}://${host}/api/public/v1`;
}
