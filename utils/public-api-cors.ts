import "server-only";

import { NextResponse } from "next/server";

/**
 * CORS for browser clients calling `/api/public/v1/*` from other origins (Authorization triggers preflight).
 */
export function publicApiCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

export function publicApiOptionsResponse(req: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: publicApiCorsHeaders(req),
  });
}

export function publicApiJsonResponse(
  req: Request,
  body: unknown,
  init?: { status?: number },
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: publicApiCorsHeaders(req),
  });
}
