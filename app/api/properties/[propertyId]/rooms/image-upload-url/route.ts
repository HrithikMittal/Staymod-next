import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { parsePropertyId } from "@/utils/schemas/room";
import { createRoomImageUploadUrl, validateRoomImageInput } from "@/utils/s3-room-images";

const PROPERTIES_COLLECTION = "properties";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  let propertyObjectId;
  let propertyId: string;
  try {
    const params = await context.params;
    propertyId = params.propertyId;
    propertyObjectId = parsePropertyId(params.propertyId);
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

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const contentType = typeof body.contentType === "string" ? body.contentType.trim() : "";
  const size = typeof body.size === "number" ? body.size : Number(body.size);

  try {
    validateRoomImageInput(fileName, contentType, size);
    const signed = await createRoomImageUploadUrl({
      orgId,
      propertyId,
      fileName,
      contentType,
    });
    return NextResponse.json(signed);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create upload URL." },
      { status: 400 },
    );
  }
}
