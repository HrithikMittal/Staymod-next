/**
 * Preset amenities shown as a checklist when creating or editing a room.
 * Labels are stored as-is on the room document (`amenities: string[]`).
 */
export const ROOM_AMENITY_PRESET_LABELS = [
  "Mountain view",
  "Outdoor access",
  "Garden or nature views",
  "Vanity mirror",
  "Outdoor lighting",
  "Board games",
  "Water sports equipment",
  "Parking",
  "Kitchenette",
  "Iron & ironing board",
  "Fresh linens & towels",
  "Hot water",
  "Natural light",
  "Wi‑Fi",
] as const;

export type RoomAmenityPresetLabel = (typeof ROOM_AMENITY_PRESET_LABELS)[number];
