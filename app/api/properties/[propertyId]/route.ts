import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { parseUpdatePropertySettingsInput } from "@/utils/schemas/property";
import { parsePropertyId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId: propertyIdParam } = await context.params;

  let propertyObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyIdParam);
  } catch {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  const db = await getDb();
  const property = await db
    .collection<Property>(PROPERTIES_COLLECTION)
    .findOne({ _id: propertyObjectId, orgId });

  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  return NextResponse.json({
    property: {
      ...property,
      _id: property._id.toString(),
    },
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId: propertyIdParam } = await context.params;

  let propertyObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyIdParam);
  } catch {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  let input;
  try {
    input = parseUpdatePropertySettingsInput(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const db = await getDb();
  const now = new Date();
  const updateResult = await db.collection<Property>(PROPERTIES_COLLECTION).findOneAndUpdate(
    { _id: propertyObjectId, orgId },
    {
      $set: {
        name: input.name,
        "address.line1": input.addressLine1,
        gstEnabled: input.gstEnabled,
        ...(input.gstEnabled ? { gstNumber: input.gstNumber } : {}),
        updatedAt: now,
      },
      ...(input.gstEnabled ? {} : { $unset: { gstNumber: "" } }),
    },
    { returnDocument: "after" },
  );

  if (!updateResult) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  return NextResponse.json({
    property: {
      ...updateResult,
      _id: updateResult._id.toString(),
    },
  });
}
