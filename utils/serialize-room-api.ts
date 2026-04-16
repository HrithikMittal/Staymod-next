import type { Room } from "@/types/room";

/**
 * Room document shape for JSON responses. Per-night overrides live in `nightly_pricing`;
 * legacy `dailyPriceOverrides` is not exposed on the API.
 */
export function serializeRoomForApi(r: Room) {
  const bedCount =
    typeof r.bedCount === "number" && Number.isFinite(r.bedCount) && r.bedCount >= 1
      ? Math.floor(r.bedCount)
      : 1;
  const unitCount =
    typeof r.unitCount === "number" && Number.isFinite(r.unitCount) && r.unitCount >= 1
      ? Math.floor(r.unitCount)
      : 1;
  const { dailyPriceOverrides, ...rest } = r;
  void dailyPriceOverrides;
  return {
    ...rest,
    _id: r._id.toString(),
    propertyId: r.propertyId.toString(),
    amenities: Array.isArray(r.amenities) ? r.amenities : [],
    bedCount,
    unitCount,
  };
}
