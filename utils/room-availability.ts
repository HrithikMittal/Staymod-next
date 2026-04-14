import "server-only";

import type { Db, ObjectId } from "mongodb";

import type { Booking } from "@/types/booking";
import type { RoomAvailability } from "@/types/room-availability";
import { ROOM_AVAILABILITY_COLLECTION } from "@/types/room-availability";
import type { Room, RoomType } from "@/types/room";
import { eachUtcNightDateKeysBetween } from "@/utils/date-key";
import { getDb } from "@/utils/mongodb";

const ROOMS_COLLECTION = "rooms";

/** Active rooms that count toward default capacity for a type. */
const ROOM_INVENTORY_MATCH = {
  isActive: true,
  status: "active" as const,
};

/**
 * Sum of `unitCount` for active rooms of `roomType` at this property (Room schema default).
 */
export async function getDefaultInventoryForRoomType(
  db: Db,
  orgId: string,
  propertyId: ObjectId,
  roomType: RoomType,
): Promise<number> {
  const rooms = db.collection<Room>(ROOMS_COLLECTION);
  const rows = await rooms
    .aggregate<{ total: number }>([
      {
        $match: {
          orgId,
          propertyId,
          type: roomType,
          ...ROOM_INVENTORY_MATCH,
        },
      },
      { $group: { _id: null, total: { $sum: "$unitCount" } } },
    ])
    .toArray();
  return rows[0]?.total ?? 0;
}

/**
 * Effective remaining units: `roomAvailability.noOfRooms` if a row exists, otherwise the Room
 * schema default ({@link getDefaultInventoryForRoomType}).
 */
export async function getEffectiveRemainingRooms(
  db: Db,
  orgId: string,
  propertyId: ObjectId,
  dateKey: string,
  roomType: RoomType,
): Promise<number> {
  const row = await db.collection<RoomAvailability>(ROOM_AVAILABILITY_COLLECTION).findOne({
    orgId,
    propertyId,
    dateKey,
    roomType,
  });
  if (row) {
    return row.noOfRooms;
  }
  return getDefaultInventoryForRoomType(db, orgId, propertyId, roomType);
}

type BookingInventorySlice = Pick<
  Booking,
  "orgId" | "propertyId" | "roomType" | "checkIn" | "checkOut" | "quantity" | "status"
>;

/**
 * After inserting/updating a non-cancelled booking, subtract `quantity` for each night in
 * `[checkIn, checkOut)` and upsert {@link ROOM_AVAILABILITY_COLLECTION} rows.
 *
 * Concurrent bookings for the same night may race; use transactions if you need strict guarantees.
 */
export async function applyBookingInventoryDeduction(booking: BookingInventorySlice): Promise<void> {
  if (booking.status === "cancelled") {
    return;
  }
  const db = await getDb();
  const nights = eachUtcNightDateKeysBetween(booking.checkIn, booking.checkOut);
  const now = new Date();

  for (const dateKey of nights) {
    const effective = await getEffectiveRemainingRooms(
      db,
      booking.orgId,
      booking.propertyId,
      dateKey,
      booking.roomType,
    );
    const next = Math.max(0, effective - booking.quantity);

    await db.collection<RoomAvailability>(ROOM_AVAILABILITY_COLLECTION).updateOne(
      {
        orgId: booking.orgId,
        propertyId: booking.propertyId,
        dateKey,
        roomType: booking.roomType,
      },
      {
        $set: { noOfRooms: next, updatedAt: now },
        $setOnInsert: {
          orgId: booking.orgId,
          propertyId: booking.propertyId,
          dateKey,
          roomType: booking.roomType,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }
}

/**
 * When a booking is cancelled, add `quantity` back per night, capped at the Room-schema default
 * capacity for that type (cannot exceed physical `unitCount` sum).
 */
export async function restoreBookingInventory(booking: BookingInventorySlice): Promise<void> {
  if (booking.status !== "cancelled") {
    return;
  }
  const db = await getDb();
  const nights = eachUtcNightDateKeysBetween(booking.checkIn, booking.checkOut);
  const now = new Date();

  for (const dateKey of nights) {
    const defaultCap = await getDefaultInventoryForRoomType(
      db,
      booking.orgId,
      booking.propertyId,
      booking.roomType,
    );
    const effective = await getEffectiveRemainingRooms(
      db,
      booking.orgId,
      booking.propertyId,
      dateKey,
      booking.roomType,
    );
    const next = Math.min(defaultCap, effective + booking.quantity);

    await db.collection<RoomAvailability>(ROOM_AVAILABILITY_COLLECTION).updateOne(
      {
        orgId: booking.orgId,
        propertyId: booking.propertyId,
        dateKey,
        roomType: booking.roomType,
      },
      {
        $set: { noOfRooms: next, updatedAt: now },
        $setOnInsert: {
          orgId: booking.orgId,
          propertyId: booking.propertyId,
          dateKey,
          roomType: booking.roomType,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }
}
