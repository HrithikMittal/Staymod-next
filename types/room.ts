import type { ObjectId } from "mongodb";

import type { OrganizationScope } from "@/types/organization";

/** Physical or bookable unit under a property (hotel room, cottage, dorm bed, etc.). */
export const ROOM_TYPES = [
  "single",
  "double",
  "twin",
  "triple",
  "quad",
  "suite",
  "studio",
  "dorm_bed",
  "family",
  "other",
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_STATUSES = ["active", "inactive", "maintenance", "out_of_order"] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

/**
 * Bookable unit under a property. Includes **`orgId`** (via {@link OrganizationScope}) so
 * MongoDB queries can scope by organization without joining through `properties` every time.
 *
 * **Prices** use the same currency as the parent property (`property.currency`); store major units (e.g. INR).
 */
export type Room = OrganizationScope & {
  _id: ObjectId;
  /** Parent property this room belongs to. */
  propertyId: ObjectId;
  name: string;
  /** Unique per property (not globally); used for URLs and imports. */
  slug: string;
  type: RoomType;
  status: RoomStatus;
  /** Short marketing line shown in listings. */
  tagline?: string;
  /** Longer copy for detail views. */
  description?: string;
  /** Display label, e.g. "3", "G", "Mezzanine". */
  floor?: string;
  /** Maximum guests the room can accommodate. */
  maxGuests: number;
  /**
   * Distinct physical beds or sleep surfaces to sell or assign (bunks count as separate beds).
   * Use this for future per-bed booking/inventory; `bedSize` remains the human description.
   */
  bedCount: number;
  /** Bed configuration label, e.g. "King", "2 × Twin", "Twin bunks". */
  bedSize?: string;
  /** @deprecated Prefer `bedSize`; kept for older documents. */
  bedSummary?: string;
  /** Standard nightly rate — weekday (Mon–Thu or property-defined). */
  priceWeekday?: number;
  /** Standard nightly rate — weekend (Fri–Sun or property-defined). */
  priceWeekend?: number;
  /** Feature tags, e.g. Wi‑Fi, balcony. */
  amenities: string[];
  isActive: boolean;
  /** Lower sorts first when listing rooms. */
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRoomInput = Omit<
  Room,
  "_id" | "orgId" | "propertyId" | "createdAt" | "updatedAt"
>;
