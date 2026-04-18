import { BATHROOM_ITEM_DEFS, GUEST_AMENITY_GROUPS } from "@/constants/room-creation-details";

const GUEST_LABEL_BY_ID = new Map(
  GUEST_AMENITY_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.label])),
);

const BATH_LABEL_BY_ID = new Map<string, string>(
  BATHROOM_ITEM_DEFS.map((d) => [d.id, d.label]),
);

/**
 * Maps a single stored amenity string to a human-readable label for UI lists.
 * Returns `null` for internal keys that should not appear as pills (e.g. bed counts
 * when the card already shows bed size / count).
 */
export function formatStoredAmenityForDisplay(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("sm:")) {
    return trimmed;
  }

  if (trimmed.startsWith("sm:guest:")) {
    const id = trimmed.slice("sm:guest:".length);
    return GUEST_LABEL_BY_ID.get(id) ?? null;
  }

  if (trimmed === "sm:bathroom:private") {
    return "Private bathroom";
  }
  if (trimmed === "sm:bathroom:shared") {
    return "Shared bathroom";
  }

  if (trimmed.startsWith("sm:bitem:")) {
    const id = trimmed.slice("sm:bitem:".length);
    return BATH_LABEL_BY_ID.get(id) ?? null;
  }

  const bedMatch = /^sm:bed:(single|double|king|super_king|bunk|sofa|futon):(\d+)$/.exec(trimmed);
  if (bedMatch) {
    return null;
  }

  if (trimmed === "sm:pol:smoking") {
    return "Smoking allowed";
  }
  if (trimmed === "sm:pol:parties") {
    return "Parties/events allowed";
  }

  return null;
}

/**
 * Deduplicated labels for chips on room cards and similar summaries.
 */
export function amenitiesForDisplayList(amenities: string[] | undefined): string[] {
  if (!amenities?.length) {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of amenities) {
    const label = formatStoredAmenityForDisplay(raw);
    if (!label) {
      continue;
    }
    const key = label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(label);
  }
  return out;
}
