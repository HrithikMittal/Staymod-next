import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import type { Room } from "@/types/room";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { parseCreateRoomInput, parsePropertyId, parseRoomId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";
const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ propertyId: string; roomId: string }>;
};

function serializeRoom(r: Room) {
  const bedCount =
    typeof r.bedCount === "number" && Number.isFinite(r.bedCount) && r.bedCount >= 1
      ? Math.floor(r.bedCount)
      : 1;
  return {
    ...r,
    _id: r._id.toString(),
    propertyId: r.propertyId.toString(),
    amenities: Array.isArray(r.amenities) ? r.amenities : [],
    bedCount,
  };
}

async function resolveContextOrError(orgId: string, propertyIdParam: string, roomIdParam: string) {
  let propertyObjectId: ObjectId;
  let roomObjectId: ObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyIdParam);
    roomObjectId = parseRoomId(roomIdParam);
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

  const room = await db.collection<Room>(ROOMS_COLLECTION).findOne({
    _id: roomObjectId,
    orgId,
    propertyId: propertyObjectId,
  });

  if (!room) {
    return { error: NextResponse.json({ error: "Room not found." }, { status: 404 }) };
  }

  return { db, propertyObjectId, roomObjectId, room };
}

export async function PATCH(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, roomId } = await context.params;
  const resolved = await resolveContextOrError(orgId, propertyId, roomId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, propertyObjectId, roomObjectId } = resolved;

  try {
    const payload = await req.json();
    const input = parseCreateRoomInput(payload);

    const duplicate = await db.collection<Room>(ROOMS_COLLECTION).findOne({
      orgId,
      propertyId: propertyObjectId,
      slug: input.slug,
      _id: { $ne: roomObjectId },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Room slug already exists for this property." },
        { status: 409 },
      );
    }

    const now = new Date();
    await db.collection<Room>(ROOMS_COLLECTION).updateOne(
      { _id: roomObjectId },
      {
        $set: {
          ...input,
          updatedAt: now,
        },
      },
    );

    const updated = await db.collection<Room>(ROOMS_COLLECTION).findOne({ _id: roomObjectId });
    if (!updated) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    return NextResponse.json({ room: serializeRoom(updated) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update room.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, roomId } = await context.params;
  const resolved = await resolveContextOrError(orgId, propertyId, roomId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, roomObjectId, propertyObjectId } = resolved;

  const result = await db.collection<Room>(ROOMS_COLLECTION).deleteOne({
    _id: roomObjectId,
    orgId,
    propertyId: propertyObjectId,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
