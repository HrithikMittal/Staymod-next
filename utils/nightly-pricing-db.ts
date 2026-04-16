import "server-only";

import type { Db, ObjectId } from "mongodb";

import type { Room } from "@/types/room";
import type { NightlyPricing } from "@/types/nightly-pricing";
import { NIGHTLY_PRICING_COLLECTION } from "@/types/nightly-pricing";
import { defaultNightlyPrice } from "@/utils/room-nightly-price";

/**
 * Loads per-night amounts from `nightly_pricing` for the given rooms and date keys.
 * Map key: `${roomId}|${dateKey}` → amount.
 */
export async function loadNightlyPricingMap(
  db: Db,
  orgId: string,
  propertyId: ObjectId,
  rooms: Room[],
  dateKeys: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (rooms.length === 0 || dateKeys.length === 0) {
    return map;
  }
  const roomIds = rooms.map((r) => r._id);
  const docs = await db
    .collection<NightlyPricing>(NIGHTLY_PRICING_COLLECTION)
    .find({
      orgId,
      propertyId,
      roomId: { $in: roomIds },
      dateKey: { $in: dateKeys },
    })
    .toArray();

  for (const d of docs) {
    map.set(`${d.roomId.toString()}|${d.dateKey}`, d.amount);
  }
  return map;
}

/**
 * Effective nightly rate: `nightly_pricing` first, then legacy `Room.dailyPriceOverrides`, else weekday/weekend default.
 */
export function resolveNightlyPriceForCell(
  room: Room | undefined,
  dateKey: string,
  collectionMap: Map<string, number>,
): { price: number | null; priceIsOverride: boolean } {
  if (!room) {
    return { price: null, priceIsOverride: false };
  }
  const key = `${room._id.toString()}|${dateKey}`;
  if (collectionMap.has(key)) {
    return { price: collectionMap.get(key)!, priceIsOverride: true };
  }
  const legacy = room.dailyPriceOverrides?.[dateKey];
  const legacyHas =
    room.dailyPriceOverrides != null &&
    Object.prototype.hasOwnProperty.call(room.dailyPriceOverrides, dateKey) &&
    legacy != null &&
    Number.isFinite(legacy) &&
    legacy >= 0;
  if (legacyHas) {
    return { price: legacy, priceIsOverride: true };
  }
  return { price: defaultNightlyPrice(room, dateKey), priceIsOverride: false };
}
