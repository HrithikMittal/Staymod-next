import type { Room } from "@/types/room";
import type { RoomTag } from "@/types/room-tag";

/**
 * Room document shape for JSON responses. Per-night overrides live in `nightly_pricing`;
 * legacy `dailyPriceOverrides` is not exposed on the API.
 */
export function serializeRoomForApi(r: Room, tagsById?: Map<string, RoomTag>) {
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
  const roomImages = (r.roomImages ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => {
      const tags = (img.tagIds ?? [])
        .map((tagId) => tagsById?.get(tagId.toString()))
        .filter((tag): tag is RoomTag => Boolean(tag))
        .map((tag) => ({
          _id: tag._id.toString(),
          name: tag.name,
          slug: tag.slug,
        }));
      return {
        url: img.url,
        sortOrder: img.sortOrder,
        tagIds: (img.tagIds ?? []).map((id) => id.toString()),
        tags,
      };
    });

  return {
    ...rest,
    _id: r._id.toString(),
    propertyId: r.propertyId.toString(),
    amenities: Array.isArray(r.amenities) ? r.amenities : [],
    imageUrls:
      roomImages.length > 0
        ? roomImages.map((img) => img.url)
        : Array.isArray(r.imageUrls)
          ? r.imageUrls
          : [],
    roomImages,
    tags: (r.tagIds ?? [])
      .map((tagId) => tagsById?.get(tagId.toString()))
      .filter((tag): tag is RoomTag => Boolean(tag))
      .map((tag) => ({
        _id: tag._id.toString(),
        name: tag.name,
        slug: tag.slug,
      })),
    bedCount,
    unitCount,
  };
}
