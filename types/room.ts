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
  /** Display label, e.g. "3", "G", "Mezzanine". */
  floor?: string;
  /** Maximum guests for this room. */
  maxGuests: number;
  /** Short label, e.g. "1 king" or "2 × twin". */
  bedSummary?: string;
  description?: string;
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
