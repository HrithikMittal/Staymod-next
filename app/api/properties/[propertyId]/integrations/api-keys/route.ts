import { randomBytes, createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import type { ApiKey, ApiKeyScope } from "@/types/api-key";
import { API_KEYS_COLLECTION, API_KEY_SCOPES } from "@/types/api-key";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { parsePropertyId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean))];
  }
  if (typeof value === "string") {
    return [...new Set(value.split(/[,\n;]/).map((v) => v.trim()).filter(Boolean))];
  }
  return [];
}

function normalizeScopes(value: unknown): ApiKeyScope[] {
  const fallback: ApiKeyScope[] = ["rooms:read", "availability:read"];
  if (!Array.isArray(value)) return fallback;
  const scopes = [...new Set(value)]
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s): s is ApiKeyScope => API_KEY_SCOPES.includes(s as ApiKeyScope));
  return scopes.length > 0 ? scopes : fallback;
}

function serializeApiKey(apiKey: ApiKey) {
  return {
    _id: apiKey._id.toString(),
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    orgId: apiKey.orgId,
    propertyIds: (apiKey.propertyIds ?? []).map((id) => id.toString()),
    scopes: apiKey.scopes,
    allowedOrigins: apiKey.allowedOrigins ?? [],
    allowedIps: apiKey.allowedIps ?? [],
    isActive: apiKey.isActive,
    expiresAt: apiKey.expiresAt?.toISOString(),
    lastUsedAt: apiKey.lastUsedAt?.toISOString(),
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}

async function resolveProperty(orgId: string, propertyIdParam: string) {
  let propertyObjectId: ObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyIdParam);
  } catch {
    return { error: NextResponse.json({ error: "Invalid property id." }, { status: 400 }) };
  }
  const db = await getDb();
  const property = await db
    .collection<Property>(PROPERTIES_COLLECTION)
    .findOne({ _id: propertyObjectId, orgId });
  if (!property) {
    return { error: NextResponse.json({ error: "Property not found." }, { status: 404 }) };
  }
  return { db, propertyObjectId };
}

export async function GET(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId } = await context.params;
  const resolved = await resolveProperty(orgId, propertyId);
  if ("error" in resolved) return resolved.error;
  const { db, propertyObjectId } = resolved;

  const keys = await db
    .collection<ApiKey>(API_KEYS_COLLECTION)
    .find({
      orgId,
      $or: [{ propertyIds: { $size: 0 } }, { propertyIds: { $in: [propertyObjectId] } }],
    })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ apiKeys: keys.map(serializeApiKey) });
}

export async function POST(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId } = await context.params;
  const resolved = await resolveProperty(orgId, propertyId);
  if ("error" in resolved) return resolved.error;
  const { db, propertyObjectId } = resolved;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const input = payload as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const scopes = normalizeScopes(input.scopes);
  const allowedOrigins = normalizeList(input.allowedOrigins);
  const allowedIps = normalizeList(input.allowedIps);
  const now = new Date();

  const rawKey = `sk_live_${randomBytes(24).toString("hex")}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = `${rawKey.slice(0, 12)}...`;

  const doc: Omit<ApiKey, "_id"> = {
    orgId,
    name: name || undefined,
    keyHash,
    keyPrefix,
    propertyIds: [propertyObjectId],
    scopes,
    allowedOrigins,
    allowedIps,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<Omit<ApiKey, "_id">>(API_KEYS_COLLECTION).insertOne(doc);
  const created: ApiKey = { ...doc, _id: result.insertedId };

  return NextResponse.json(
    {
      apiKey: serializeApiKey(created),
      rawKey,
    },
    { status: 201 },
  );
}
