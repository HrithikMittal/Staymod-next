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
  params: Promise<{ propertyId: string; keyId: string }>;
};

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
  if (!Array.isArray(value)) return [];
  return [...new Set(value)]
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s): s is ApiKeyScope => API_KEY_SCOPES.includes(s as ApiKeyScope));
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

export async function PATCH(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, keyId } = await context.params;
  let propertyObjectId: ObjectId;
  let keyObjectId: ObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyId);
    if (!ObjectId.isValid(keyId)) throw new Error("Invalid key id.");
    keyObjectId = new ObjectId(keyId);
  } catch {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const db = await getDb();
  const property = await db
    .collection<Property>(PROPERTIES_COLLECTION)
    .findOne({ _id: propertyObjectId, orgId });
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const existing = await db.collection<ApiKey>(API_KEYS_COLLECTION).findOne({
    _id: keyObjectId,
    orgId,
    propertyIds: { $in: [propertyObjectId] },
  });
  if (!existing) {
    return NextResponse.json({ error: "API key not found." }, { status: 404 });
  }

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
  const nextName = typeof input.name === "string" ? input.name.trim() : existing.name;
  const nextActive = typeof input.isActive === "boolean" ? input.isActive : existing.isActive;
  const scopes = normalizeScopes(input.scopes);
  const allowedOrigins = normalizeList(input.allowedOrigins);
  const allowedIps = normalizeList(input.allowedIps);

  const setDoc: Partial<ApiKey> = {
    name: nextName || undefined,
    isActive: nextActive,
    updatedAt: new Date(),
  };
  if (scopes.length > 0) setDoc.scopes = scopes;
  if (input.allowedOrigins !== undefined) setDoc.allowedOrigins = allowedOrigins;
  if (input.allowedIps !== undefined) setDoc.allowedIps = allowedIps;

  await db.collection<ApiKey>(API_KEYS_COLLECTION).updateOne({ _id: keyObjectId }, { $set: setDoc });
  const updated = await db.collection<ApiKey>(API_KEYS_COLLECTION).findOne({ _id: keyObjectId });
  if (!updated) return NextResponse.json({ error: "API key not found." }, { status: 404 });

  return NextResponse.json({ apiKey: serializeApiKey(updated) });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, keyId } = await context.params;
  let propertyObjectId: ObjectId;
  let keyObjectId: ObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyId);
    if (!ObjectId.isValid(keyId)) throw new Error("Invalid key id.");
    keyObjectId = new ObjectId(keyId);
  } catch {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection<ApiKey>(API_KEYS_COLLECTION).deleteOne({
    _id: keyObjectId,
    orgId,
    propertyIds: { $in: [propertyObjectId] },
  });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "API key not found." }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
