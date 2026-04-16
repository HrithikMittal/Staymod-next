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
  "orgId" | "propertyId" | "checkIn" | "checkOut" | "status" | "rooms" | "roomType" | "quantity"
>;

function bookingLines(booking: BookingInventorySlice): Array<{ roomType: RoomType; quantity: number }> {
  if (booking.rooms && Object.keys(booking.rooms).length > 0) {
    return Object.values(booking.rooms).map((row) => ({
      roomType: row.roomType,
      quantity: row.quantity,
    }));
  }
  if (booking.roomType && booking.quantity) {
    return [{ roomType: booking.roomType, quantity: booking.quantity }];
  }
  return [];
}

/**
 * Ensures each night in the stay has at least `quantity` remaining units for `roomType`.
 */
export async function assertAvailabilityForBooking(
  db: Db,
  orgId: string,
  propertyId: ObjectId,
  roomType: RoomType,
  checkIn: Date,
  checkOut: Date,
  quantity: number,
): Promise<void> {
  const nights = eachUtcNightDateKeysBetween(checkIn, checkOut);
  for (const dateKey of nights) {
    const effective = await getEffectiveRemainingRooms(db, orgId, propertyId, dateKey, roomType);
    if (effective < quantity) {
      throw new Error(
        `Not enough availability on ${dateKey} (need ${quantity} unit(s), ${effective} left).`,
      );
    }
  }
}

/**
 * Returns previously deducted units to inventory for each night (cancel, or before updating a booking).
 */
export async function returnInventoryForBooking(booking: BookingInventorySlice): Promise<void> {
  const db = await getDb();
  const nights = eachUtcNightDateKeysBetween(booking.checkIn, booking.checkOut);
  const now = new Date();
  const lines = bookingLines(booking);

  for (const line of lines) {
    for (const dateKey of nights) {
      const defaultCap = await getDefaultInventoryForRoomType(
        db,
        booking.orgId,
        booking.propertyId,
        line.roomType,
      );
      const effective = await getEffectiveRemainingRooms(
        db,
        booking.orgId,
        booking.propertyId,
        dateKey,
        line.roomType,
      );
      const next = Math.min(defaultCap, effective + line.quantity);

      await db.collection<RoomAvailability>(ROOM_AVAILABILITY_COLLECTION).updateOne(
        {
          orgId: booking.orgId,
          propertyId: booking.propertyId,
          dateKey,
          roomType: line.roomType,
        },
        {
          $set: { noOfRooms: next, updatedAt: now },
          $setOnInsert: {
            orgId: booking.orgId,
            propertyId: booking.propertyId,
            dateKey,
            roomType: line.roomType,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }
}

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
  const lines = bookingLines(booking);

  for (const line of lines) {
    for (const dateKey of nights) {
      const effective = await getEffectiveRemainingRooms(
        db,
        booking.orgId,
        booking.propertyId,
        dateKey,
        line.roomType,
      );
      const next = Math.max(0, effective - line.quantity);

      await db.collection<RoomAvailability>(ROOM_AVAILABILITY_COLLECTION).updateOne(
        {
          orgId: booking.orgId,
          propertyId: booking.propertyId,
          dateKey,
          roomType: line.roomType,
        },
        {
          $set: { noOfRooms: next, updatedAt: now },
          $setOnInsert: {
            orgId: booking.orgId,
            propertyId: booking.propertyId,
            dateKey,
            roomType: line.roomType,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }
}

/**
 * When a booking is cancelled, add `quantity` back per night (same as {@link returnInventoryForBooking}).
 */
export async function restoreBookingInventory(booking: BookingInventorySlice): Promise<void> {
  return returnInventoryForBooking(booking);
}
