import { ObjectId, type Db } from "mongodb";

import { ROOM_TAGS_COLLECTION, type RoomTag } from "@/types/room-tag";
import {
  createRoomTagDocument,
  normalizeRoomTagNames,
  slugifyRoomTag,
} from "@/utils/schemas/room-tag";

export async function ensureRoomTagIds(
  db: Db,
  orgId: string,
  propertyId: ObjectId,
  tagNames: string[],
): Promise<ObjectId[]> {
  const normalizedNames = normalizeRoomTagNames(tagNames);
  if (normalizedNames.length === 0) {
    return [];
  }

  const ids: ObjectId[] = [];
  for (const name of normalizedNames) {
    const slug = slugifyRoomTag(name);
    if (!slug) continue;
    const now = new Date();
    const doc = createRoomTagDocument(orgId, propertyId, name);
    // `name` and `updatedAt` must not appear in both `$setOnInsert` and `$set` (MongoDB path conflict).
    const result = await db.collection<RoomTag>(ROOM_TAGS_COLLECTION).findOneAndUpdate(
      { orgId, propertyId, slug },
      {
        $setOnInsert: {
          orgId,
          propertyId,
          slug,
          createdAt: doc.createdAt,
        },
        $set: { name: doc.name, updatedAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (result?._id) {
      ids.push(result._id);
    }
  }

  return ids;
}

export async function loadRoomTagsByIds(
  db: Db,
  orgId: string,
  propertyId: ObjectId,
  tagIds: ObjectId[],
): Promise<Map<string, RoomTag>> {
  if (tagIds.length === 0) {
    return new Map();
  }

  const tags = await db
    .collection<RoomTag>(ROOM_TAGS_COLLECTION)
    .find({ orgId, propertyId, _id: { $in: tagIds } })
    .toArray();

  return new Map(tags.map((tag) => [tag._id.toString(), tag]));
}
