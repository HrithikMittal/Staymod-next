import { ObjectId } from "mongodb";

import type { RoomAvailability } from "@/types/room-availability";
import { ROOM_TYPES, type RoomType } from "@/types/room";
import { isValidDateKey } from "@/utils/date-key";

export function ensureRoomTypeForAvailability(value: unknown): RoomType {
  if (typeof value !== "string" || !ROOM_TYPES.includes(value as RoomType)) {
    throw new Error(`roomType must be one of: ${ROOM_TYPES.join(", ")}.`);
  }
  return value as RoomType;
}

export function ensureDateKey(value: unknown): string {
  if (typeof value !== "string" || !isValidDateKey(value)) {
    throw new Error("dateKey must be YYYY-MM-DD.");
  }
  return value;
}

export function createRoomAvailabilityDocument(
  orgId: string,
  propertyId: ObjectId,
  dateKey: string,
  roomType: RoomType,
  noOfRooms: number,
): Omit<RoomAvailability, "_id"> {
  const now = new Date();
  return {
    orgId,
    propertyId,
    dateKey,
    roomType,
    noOfRooms,
    createdAt: now,
    updatedAt: now,
  };
}
