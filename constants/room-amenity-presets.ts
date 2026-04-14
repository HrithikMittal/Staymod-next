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

const PRESET_LABEL_SET = new Set<string>(ROOM_AMENITY_PRESET_LABELS as readonly string[]);

/** Splits stored amenities into preset checkboxes vs free-text “additional” for the form. */
export function splitAmenitiesForEditForm(amenities: string[]): {
  selectedPresets: string[];
  extraText: string;
} {
  const selectedPresets: string[] = [];
  const extras: string[] = [];
  for (const a of amenities) {
    if (PRESET_LABEL_SET.has(a)) {
      selectedPresets.push(a);
    } else {
      extras.push(a);
    }
  }
  return { selectedPresets, extraText: extras.join(", ") };
}
