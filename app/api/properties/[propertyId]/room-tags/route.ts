import { type ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import { ROOM_TAGS_COLLECTION, type RoomTag } from "@/types/room-tag";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { createRoomTagDocument, parseCreateRoomTagInput } from "@/utils/schemas/room-tag";
import { parsePropertyId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

function serializeRoomTag(tag: RoomTag) {
  return {
    ...tag,
    _id: tag._id.toString(),
    propertyId: tag.propertyId.toString(),
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}

export async function GET(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  let propertyObjectId: ObjectId;
  try {
    const { propertyId } = await context.params;
    propertyObjectId = parsePropertyId(propertyId);
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

  const tags = await db
    .collection<RoomTag>(ROOM_TAGS_COLLECTION)
    .find({ orgId, propertyId: propertyObjectId })
    .sort({ name: 1 })
    .toArray();

  return NextResponse.json({ tags: tags.map(serializeRoomTag) });
}

export async function POST(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  let propertyObjectId: ObjectId;
  try {
    const { propertyId } = await context.params;
    propertyObjectId = parsePropertyId(propertyId);
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

  try {
    const payload = await req.json();
    const { name } = parseCreateRoomTagInput(payload);
    const doc = createRoomTagDocument(orgId, propertyObjectId, name);

    const duplicate = await db.collection<RoomTag>(ROOM_TAGS_COLLECTION).findOne({
      orgId,
      propertyId: propertyObjectId,
      slug: doc.slug,
    });
    if (duplicate) {
      return NextResponse.json({ error: "Tag already exists." }, { status: 409 });
    }

    const result = await db.collection<Omit<RoomTag, "_id">>(ROOM_TAGS_COLLECTION).insertOne(doc);
    const created: RoomTag = { ...doc, _id: result.insertedId };
    return NextResponse.json({ tag: serializeRoomTag(created) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create room tag." },
      { status: 400 },
    );
  }
}
