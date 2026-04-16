import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import type { Room } from "@/types/room";
import { ROOM_TAGS_COLLECTION, type RoomTag } from "@/types/room-tag";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { ensureRoomTagIds, loadRoomTagsByIds } from "@/utils/room-tags-db";
import {
  createRoomDocument,
  parseCreateRoomInput,
  parsePropertyId,
} from "@/utils/schemas/room";
import { serializeRoomForApi } from "@/utils/serialize-room-api";

const PROPERTIES_COLLECTION = "properties";
const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

async function resolvePropertyOr404(orgId: string, propertyIdParam: string) {
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
  const resolved = await resolvePropertyOr404(orgId, propertyId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, propertyObjectId } = resolved;

  const rooms = await db
    .collection<Room>(ROOMS_COLLECTION)
    .find({ orgId, propertyId: propertyObjectId })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();

  const roomTagIds = rooms.flatMap((room) => [
    ...(room.tagIds ?? []),
    ...((room.roomImages ?? []).flatMap((img) => img.tagIds ?? [])),
  ]);
  const tagsById = await loadRoomTagsByIds(db, orgId, propertyObjectId, roomTagIds);

  return NextResponse.json({
    rooms: rooms.map((r) => serializeRoomForApi(r, tagsById)),
  });
}

export async function POST(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId } = await context.params;
  const resolved = await resolvePropertyOr404(orgId, propertyId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, propertyObjectId } = resolved;

  try {
    const payload = await req.json();
    const input = parseCreateRoomInput(payload);
    const { tagNames = [], ...parsedRoomInput } = input;
    const tagIds = await ensureRoomTagIds(db, orgId, propertyObjectId, tagNames);
    const imageTagIds = (parsedRoomInput.roomImages ?? [])
      .flatMap((img) => img.tagIds ?? [])
      .filter((id): id is ObjectId => Boolean(id));
    const allTagIds = [...tagIds, ...imageTagIds];
    const validTagIds = await db
      .collection<RoomTag>(ROOM_TAGS_COLLECTION)
      .find({ orgId, propertyId: propertyObjectId, _id: { $in: allTagIds } })
      .project({ _id: 1 })
      .toArray();
    const validTagIdSet = new Set(validTagIds.map((tag) => tag._id.toString()));
    const invalidImageTag = imageTagIds.find((id) => !validTagIdSet.has(id.toString()));
    if (invalidImageTag) {
      return NextResponse.json({ error: "One or more image tags are invalid for this property." }, { status: 400 });
    }
    const roomInput = {
      ...parsedRoomInput,
      tagIds,
    };

    const duplicate = await db.collection<Room>(ROOMS_COLLECTION).findOne({
      orgId,
      propertyId: propertyObjectId,
      slug: roomInput.slug,
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Room slug already exists for this property." },
        { status: 409 },
      );
    }

    const room = createRoomDocument(roomInput, orgId, propertyObjectId);
    const insertResult = await db.collection<Omit<Room, "_id">>(ROOMS_COLLECTION).insertOne(room);

    const created = { ...room, _id: insertResult.insertedId };
    const createdTagIds = [
      ...(created.tagIds ?? []),
      ...((created.roomImages ?? []).flatMap((img) => img.tagIds ?? [])),
    ];
    const tagsById = await loadRoomTagsByIds(db, orgId, propertyObjectId, createdTagIds);

    return NextResponse.json(
      {
        room: serializeRoomForApi(created, tagsById),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create room.",
      },
      { status: 400 },
    );
  }
}
