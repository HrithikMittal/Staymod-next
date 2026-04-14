import type { ObjectId } from "mongodb";

import type { OrganizationScope } from "@/types/organization";
import type { RoomType } from "@/types/room";

/** MongoDB collection name for nightly inventory overlays. */
export const ROOM_AVAILABILITY_COLLECTION = "roomAvailability" as const;

/**
 * Nightly **remaining** inventory for a `roomType` bucket at a property.
 *
 * - **Bucket:** All active {@link Room} rows with the same `type` share one counter (`roomType`).
 * - **Fallback:** If no document exists for `(propertyId, dateKey, roomType)`, availability is the
 *   sum of `unitCount` over active, bookable rooms of that type (see `utils/room-availability.ts`).
 * - **Updates:** Creating or confirming a {@link Booking} should subtract `quantity` per night and
 *   upsert rows here so `noOfRooms` stays in sync.
 */
export type RoomAvailability = OrganizationScope & {
  _id: ObjectId;
  propertyId: ObjectId;
  /**
   * Calendar night identifier. Use {@link formatDateKeyUtc} / property-local helpers so this
   * matches how you slice stays (UTC vs property timezone — see `utils/date-key.ts`).
   */
  dateKey: string;
  roomType: RoomType;
  /** Remaining sellable units for this type on this night. */
  noOfRooms: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRoomAvailabilityInput = Omit<
  RoomAvailability,
  "_id" | "orgId" | "createdAt" | "updatedAt"
>;
