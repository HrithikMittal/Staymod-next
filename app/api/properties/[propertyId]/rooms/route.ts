import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import type { Room } from "@/types/room";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import {
  createRoomDocument,
  parseCreateRoomInput,
  parsePropertyId,
} from "@/utils/schemas/room";

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

  return NextResponse.json({
    rooms: rooms.map((r) => {
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
    }),
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

    const duplicate = await db.collection<Room>(ROOMS_COLLECTION).findOne({
      orgId,
      propertyId: propertyObjectId,
      slug: input.slug,
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Room slug already exists for this property." },
        { status: 409 },
      );
    }

    const room = createRoomDocument(input, orgId, propertyObjectId);
    const insertResult = await db.collection<Omit<Room, "_id">>(ROOMS_COLLECTION).insertOne(room);

    const created = { ...room, _id: insertResult.insertedId };

    return NextResponse.json(
      {
        room: {
          ...created,
          _id: created._id.toString(),
          propertyId: created.propertyId.toString(),
        },
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
