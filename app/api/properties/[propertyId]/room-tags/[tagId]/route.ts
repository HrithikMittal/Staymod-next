import { type ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import type { Room } from "@/types/room";
import { ROOM_TAGS_COLLECTION, type RoomTag } from "@/types/room-tag";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { parsePropertyId } from "@/utils/schemas/room";
import { createRoomTagDocument, parseCreateRoomTagInput, parseRoomTagId } from "@/utils/schemas/room-tag";

const PROPERTIES_COLLECTION = "properties";
const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ propertyId: string; tagId: string }>;
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

async function resolveContext(orgId: string, propertyIdParam: string, tagIdParam: string) {
  let propertyObjectId: ObjectId;
  let tagObjectId: ObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyIdParam);
    tagObjectId = parseRoomTagId(tagIdParam);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid id.";
    return { error: NextResponse.json({ error: message }, { status: 400 }) };
  }

  const db = await getDb();
  const property = await db
    .collection<Property>(PROPERTIES_COLLECTION)
    .findOne({ _id: propertyObjectId, orgId });
  if (!property) {
    return { error: NextResponse.json({ error: "Property not found." }, { status: 404 }) };
  }

  const tag = await db.collection<RoomTag>(ROOM_TAGS_COLLECTION).findOne({
    _id: tagObjectId,
    orgId,
    propertyId: propertyObjectId,
  });
  if (!tag) {
    return { error: NextResponse.json({ error: "Room tag not found." }, { status: 404 }) };
  }

  return { db, propertyObjectId, tagObjectId, tag };
}

export async function PATCH(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, tagId } = await context.params;
  const resolved = await resolveContext(orgId, propertyId, tagId);
  if ("error" in resolved) return resolved.error;
  const { db, propertyObjectId, tagObjectId } = resolved;

  try {
    const payload = await req.json();
    const { name } = parseCreateRoomTagInput(payload);
    const now = new Date();
    const next = createRoomTagDocument(orgId, propertyObjectId, name);

    const duplicate = await db.collection<RoomTag>(ROOM_TAGS_COLLECTION).findOne({
      orgId,
      propertyId: propertyObjectId,
      slug: next.slug,
      _id: { $ne: tagObjectId },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Tag already exists." }, { status: 409 });
    }

    await db.collection<RoomTag>(ROOM_TAGS_COLLECTION).updateOne(
      { _id: tagObjectId },
      {
        $set: {
          name: next.name,
          slug: next.slug,
          updatedAt: now,
        },
      },
    );
    const updated = await db.collection<RoomTag>(ROOM_TAGS_COLLECTION).findOne({ _id: tagObjectId });
    if (!updated) {
      return NextResponse.json({ error: "Room tag not found." }, { status: 404 });
    }
    return NextResponse.json({ tag: serializeRoomTag(updated) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update room tag." },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, tagId } = await context.params;
  const resolved = await resolveContext(orgId, propertyId, tagId);
  if ("error" in resolved) return resolved.error;
  const { db, propertyObjectId, tagObjectId } = resolved;

  const linkedRoom = await db.collection<Room>(ROOMS_COLLECTION).findOne({
    orgId,
    propertyId: propertyObjectId,
    $or: [
      { tagIds: { $in: [tagObjectId] } },
      { "roomImages.tagIds": { $in: [tagObjectId] } },
    ],
  });
  if (linkedRoom) {
    return NextResponse.json(
      { error: "Cannot delete this tag because it is linked to one or more rooms." },
      { status: 409 },
    );
  }

  const result = await db.collection<RoomTag>(ROOM_TAGS_COLLECTION).deleteOne({ _id: tagObjectId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Room tag not found." }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
