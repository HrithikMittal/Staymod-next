import type { Room } from "@/types/room";
import { ROOM_TAGS_COLLECTION, type RoomTag } from "@/types/room-tag";
import { getDb } from "@/utils/mongodb";
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/utils/public-api-cors";
import { requirePublicApiAuth } from "@/utils/public-api-auth";
import { parsePropertyId } from "@/utils/schemas/room";
import { serializeRoomForApi } from "@/utils/serialize-room-api";

const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function OPTIONS(req: Request) {
  return publicApiOptionsResponse(req);
}

export async function GET(req: Request, context: RouteContext) {
  let propertyObjectId;
  try {
    const { propertyId } = await context.params;
    propertyObjectId = parsePropertyId(propertyId);
  } catch {
    return publicApiJsonResponse(req, { error: "Invalid property id." }, { status: 400 });
  }

  const auth = await requirePublicApiAuth(req, "rooms:read", propertyObjectId);
  if (!auth.ok) return auth.response;
  const { orgId } = auth.value;

  const db = await getDb();
  const rooms = await db
    .collection<Room>(ROOMS_COLLECTION)
    .find({ orgId, propertyId: propertyObjectId, isActive: true, status: "active" })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();

  const allTagIds = rooms.flatMap((room) => [
    ...(room.tagIds ?? []),
    ...((room.roomImages ?? []).flatMap((img) => img.tagIds ?? [])),
  ]);
  const tags = await db
    .collection<RoomTag>(ROOM_TAGS_COLLECTION)
    .find({ orgId, propertyId: propertyObjectId, _id: { $in: allTagIds } })
    .toArray();
  const tagsById = new Map(tags.map((tag) => [tag._id.toString(), tag]));

  return publicApiJsonResponse(req, {
    rooms: rooms.map((room) => serializeRoomForApi(room, tagsById)),
  });
}
