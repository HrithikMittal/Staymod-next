import type { ObjectId } from "mongodb";

import type { OrganizationScope } from "@/types/organization";
import type { RoomType } from "@/types/room";

/** MongoDB collection name for reservations. */
export const BOOKINGS_COLLECTION = "bookings" as const;

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "no_show"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * A reservation against a specific {@link Room} listing row. Inventory is tracked per
 * `roomType` on {@link RoomAvailability}; `roomType` is denormalized from the room for fast updates.
 */
export type Booking = OrganizationScope & {
  _id: ObjectId;
  propertyId: ObjectId;
  /** Listing row this booking consumes; capacity bucket is `room.type`. */
  roomId: ObjectId;
  /** Denormalized from `Room.type` — must match `roomId`’s room. */
  roomType: RoomType;
  guestName: string;
  guestEmail?: string;
  /** First night (inclusive), property/UTC policy should match `dateKey` generation. */
  checkIn: Date;
  /** Last morning / departure (exclusive): nights are `[checkIn, checkOut)`. */
  checkOut: Date;
  /** Physical units of this listing booked per night (≤ that room’s `unitCount`). */
  quantity: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
};

/** Payload before server attaches `orgId`, `roomType` (from `Room`), and timestamps. */
export type CreateBookingInput = Omit<
  Booking,
  "_id" | "orgId" | "roomType" | "createdAt" | "updatedAt"
>;
