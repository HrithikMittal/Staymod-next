import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
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
