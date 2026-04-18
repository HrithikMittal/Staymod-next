import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import {
  getPropertyEmailSettings,
  serializePropertyEmailSettingsPublic,
  upsertPropertyEmailSettings,
} from "@/utils/property-email-settings";
import { parsePropertyId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
  const { propertyObjectId } = resolved;

  const doc = await getPropertyEmailSettings(orgId, propertyObjectId);
  return NextResponse.json({ emailSettings: serializePropertyEmailSettingsPublic(doc) });
}

export async function PATCH(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId } = await context.params;
  const resolved = await resolveProperty(orgId, propertyId);
  if ("error" in resolved) return resolved.error;
  const { propertyObjectId } = resolved;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  const resendApiKey =
    payload.resendApiKey === undefined
      ? undefined
      : payload.resendApiKey === null
        ? null
        : typeof payload.resendApiKey === "string"
          ? payload.resendApiKey
          : undefined;

  if (payload.resendApiKey !== undefined && resendApiKey === undefined) {
    return NextResponse.json({ error: "resendApiKey must be a string or null." }, { status: 400 });
  }

  if (payload.fromEmail !== undefined && typeof payload.fromEmail !== "string") {
    return NextResponse.json({ error: "fromEmail must be a string." }, { status: 400 });
  }

  const fromEmail: string | undefined =
    payload.fromEmail === undefined ? undefined : payload.fromEmail;

  const notifyOnConfirmation =
    payload.notifyOnConfirmation === undefined
      ? undefined
      : typeof payload.notifyOnConfirmation === "boolean"
        ? payload.notifyOnConfirmation
        : undefined;

  if (payload.notifyOnConfirmation !== undefined && notifyOnConfirmation === undefined) {
    return NextResponse.json({ error: "notifyOnConfirmation must be a boolean." }, { status: 400 });
  }

  const notifyOnUpdate =
    payload.notifyOnUpdate === undefined
      ? undefined
      : typeof payload.notifyOnUpdate === "boolean"
        ? payload.notifyOnUpdate
        : undefined;

  if (payload.notifyOnUpdate !== undefined && notifyOnUpdate === undefined) {
    return NextResponse.json({ error: "notifyOnUpdate must be a boolean." }, { status: 400 });
  }

  const notifyOnCancellation =
    payload.notifyOnCancellation === undefined
      ? undefined
      : typeof payload.notifyOnCancellation === "boolean"
        ? payload.notifyOnCancellation
        : undefined;

  if (payload.notifyOnCancellation !== undefined && notifyOnCancellation === undefined) {
    return NextResponse.json({ error: "notifyOnCancellation must be a boolean." }, { status: 400 });
  }

  const existing = await getPropertyEmailSettings(orgId, propertyObjectId);
  const nextFrom = fromEmail !== undefined ? fromEmail.trim() : (existing?.fromEmail ?? "").trim();
  const willHaveKey =
    resendApiKey !== undefined
      ? resendApiKey !== null && resendApiKey.trim() !== ""
      : Boolean(existing?.resendApiKeyStored);

  if (willHaveKey && !isValidEmail(nextFrom)) {
    return NextResponse.json(
      { error: "A valid fromEmail is required when a Resend API key is configured." },
      { status: 400 },
    );
  }

  try {
    const updated = await upsertPropertyEmailSettings(orgId, propertyObjectId, {
      resendApiKey,
      fromEmail: fromEmail !== undefined ? fromEmail.trim() : undefined,
      notifyOnConfirmation,
      notifyOnUpdate,
      notifyOnCancellation,
    });
    return NextResponse.json({ emailSettings: serializePropertyEmailSettingsPublic(updated) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save email settings." },
      { status: 400 },
    );
  }
}
