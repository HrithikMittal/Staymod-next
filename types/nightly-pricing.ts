import type { ObjectId } from "mongodb";

/**
 * MongoDB collection: `nightly_pricing`
 *
 * Per-night rates for a room **listing** (one document per org + property + room + UTC calendar night).
 * If no document exists for a night, callers fall back to {@link Room} `priceWeekday` / `priceWeekend`.
 *
 * Legacy: older data may still live on `Room.dailyPriceOverrides` until migrated; read paths merge both.
 */
export const NIGHTLY_PRICING_COLLECTION = "nightly_pricing";

export type NightlyPricing = {
  _id: ObjectId;
  orgId: string;
  propertyId: ObjectId;
  roomId: ObjectId;
  /** UTC calendar night `YYYY-MM-DD`. */
  dateKey: string;
  /** Major currency units (same as room base rates). */
  amount: number;
  createdAt: Date;
  updatedAt: Date;
};
