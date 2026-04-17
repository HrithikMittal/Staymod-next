import "server-only";

import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { ApiKey, ApiKeyScope } from "@/types/api-key";
import { API_KEYS_COLLECTION } from "@/types/api-key";
import { getDb } from "@/utils/mongodb";
import { publicApiCorsHeaders } from "@/utils/public-api-cors";

type PublicApiAuthSuccess = {
  orgId: string;
  apiKeyId: ObjectId;
};

type PublicApiAuthResult =
  | { ok: true; value: PublicApiAuthSuccess }
  | { ok: false; response: NextResponse };

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function originAllowed(apiKey: ApiKey, origin: string | null): boolean {
  const allowedOrigins = (apiKey.allowedOrigins ?? []).map((o) => o.trim()).filter(Boolean);
  if (allowedOrigins.length === 0) return true;
  if (!origin) return true; // allow server-to-server calls with no Origin header
  return allowedOrigins.includes(origin);
}

function ipAllowed(apiKey: ApiKey, req: Request): boolean {
  const allowedIps = (apiKey.allowedIps ?? []).map((ip) => ip.trim()).filter(Boolean);
  if (allowedIps.length === 0) return true;
  const forwarded = req.headers.get("x-forwarded-for");
  const firstIp = forwarded?.split(",")[0]?.trim();
  if (!firstIp) return false;
  return allowedIps.includes(firstIp);
}

function scopeAllowed(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
  const scopes = apiKey.scopes ?? [];
  return scopes.includes("*") || scopes.includes(requiredScope);
}

function propertyAllowed(apiKey: ApiKey, propertyId: ObjectId): boolean {
  const allowedPropertyIds = apiKey.propertyIds ?? [];
  if (allowedPropertyIds.length === 0) return true;
  return allowedPropertyIds.some((id) => id.equals(propertyId));
}

export async function requirePublicApiAuth(
  req: Request,
  requiredScope: ApiKeyScope,
  propertyId: ObjectId,
): Promise<PublicApiAuthResult> {
  const token = parseBearerToken(req.headers.get("authorization"));
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing Bearer API key." },
        { status: 401, headers: publicApiCorsHeaders(req) },
      ),
    };
  }

  const tokenHash = sha256Hex(token);
  const db = await getDb();
  const apiKey = await db.collection<ApiKey>(API_KEYS_COLLECTION).findOne({ keyHash: tokenHash });

  if (!apiKey || !apiKey.isActive) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid API key." },
        { status: 401, headers: publicApiCorsHeaders(req) },
      ),
    };
  }

  if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "API key has expired." },
        { status: 401, headers: publicApiCorsHeaders(req) },
      ),
    };
  }

  const origin = req.headers.get("origin");
  if (!originAllowed(apiKey, origin)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Origin not allowed for this API key." },
        { status: 403, headers: publicApiCorsHeaders(req) },
      ),
    };
  }

  if (!ipAllowed(apiKey, req)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "IP not allowed for this API key." },
        { status: 403, headers: publicApiCorsHeaders(req) },
      ),
    };
  }

  if (!scopeAllowed(apiKey, requiredScope)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "API key scope does not allow this action." },
        { status: 403, headers: publicApiCorsHeaders(req) },
      ),
    };
  }

  if (!propertyAllowed(apiKey, propertyId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "API key is not allowed for this property." },
        { status: 403, headers: publicApiCorsHeaders(req) },
      ),
    };
  }

  await db
    .collection<ApiKey>(API_KEYS_COLLECTION)
    .updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date(), updatedAt: new Date() } });

  return {
    ok: true,
    value: {
      orgId: apiKey.orgId,
      apiKeyId: apiKey._id,
    },
  };
}
