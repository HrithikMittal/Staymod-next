import { ROOM_AMENITY_PRESET_LABELS } from "@/constants/room-amenity-presets";
import {
  ALL_BED_TYPE_IDS,
  BATHROOM_ITEM_DEFS,
  BED_TYPE_PRIMARY,
  BED_TYPE_SECONDARY,
  type BedTypeId,
  bathItemKey,
  bathroomModeKey,
  bedCountKey,
  guestAmenityKey,
  GUEST_AMENITY_GROUPS,
  policyKey,
} from "@/constants/room-creation-details";

const PRESET_LABEL_SET = new Set<string>(ROOM_AMENITY_PRESET_LABELS as readonly string[]);

const GUEST_ID_SET = new Set(
  GUEST_AMENITY_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
);

export type RoomDetailsDraft = {
  guestAmenityIds: string[];
  bathroomPrivate: boolean;
  bathroomItemIds: string[];
  bedCounts: Record<BedTypeId, number>;
  showMoreBedTypes: boolean;
  policies: { smoking: boolean; parties: boolean };
};

function emptyBedCounts(): Record<BedTypeId, number> {
  return Object.fromEntries(ALL_BED_TYPE_IDS.map((id) => [id, 0])) as Record<BedTypeId, number>;
}

export function createEmptyRoomDetailsDraft(): RoomDetailsDraft {
  return {
    guestAmenityIds: [],
    bathroomPrivate: true,
    bathroomItemIds: [],
    bedCounts: emptyBedCounts(),
    showMoreBedTypes: false,
    policies: { smoking: false, parties: false },
  };
}

function isSmToken(value: string): boolean {
  return value.startsWith("sm:");
}

export function partitionStoredAmenities(
  amenities: string[],
  legacy?: { bedCount?: number },
): {
  presetSelected: string[];
  details: RoomDetailsDraft;
  extraText: string;
} {
  const presetSelected: string[] = [];
  const extras: string[] = [];
  const guestAmenityIds: string[] = [];
  const bathroomItemIds: string[] = [];
  let bathroomPrivate = true;
  const bedCounts = emptyBedCounts();
  const policies = { smoking: false, parties: false };
  let sawBathroomMode = false;
  let sawBedKey = false;

  for (const raw of amenities) {
    const a = raw.trim();
    if (!a) continue;

    if (PRESET_LABEL_SET.has(a)) {
      presetSelected.push(a);
      continue;
    }

    if (!isSmToken(a)) {
      extras.push(a);
      continue;
    }

    if (a.startsWith("sm:guest:")) {
      const id = a.slice("sm:guest:".length);
      if (GUEST_ID_SET.has(id)) {
        guestAmenityIds.push(id);
      } else {
        extras.push(a);
      }
      continue;
    }

    if (a === bathroomModeKey("private")) {
      bathroomPrivate = true;
      sawBathroomMode = true;
      continue;
    }
    if (a === bathroomModeKey("shared")) {
      bathroomPrivate = false;
      sawBathroomMode = true;
      continue;
    }

    if (a.startsWith("sm:bitem:")) {
      const id = a.slice("sm:bitem:".length);
      if (BATHROOM_ITEM_DEFS.some((d) => d.id === id)) {
        bathroomItemIds.push(id);
      } else {
        extras.push(a);
      }
      continue;
    }

    const bedMatch = /^sm:bed:(single|double|king|super_king|bunk|sofa|futon):(\d+)$/.exec(a);
    if (bedMatch) {
      const type = bedMatch[1] as BedTypeId;
      const n = Number.parseInt(bedMatch[2], 10);
      if (Number.isFinite(n) && n >= 0) {
        bedCounts[type] = n;
        sawBedKey = true;
      }
      continue;
    }

    if (a === policyKey("smoking")) {
      policies.smoking = true;
      continue;
    }
    if (a === policyKey("parties")) {
      policies.parties = true;
      continue;
    }

    extras.push(a);
  }

  if (!sawBathroomMode) {
    bathroomPrivate = true;
  }

  if (!sawBedKey) {
    const fallback = Math.max(1, legacy?.bedCount ?? 1);
    bedCounts.double = fallback;
  }

  return {
    presetSelected,
    details: {
      guestAmenityIds: [...new Set(guestAmenityIds)],
      bathroomPrivate,
      bathroomItemIds: [...new Set(bathroomItemIds)],
      bedCounts,
      showMoreBedTypes: BED_TYPE_SECONDARY.some((b) => (bedCounts[b.id] ?? 0) > 0),
      policies,
    },
    extraText: extras.join(", "),
  };
}

export function buildSmDetailStrings(details: RoomDetailsDraft): string[] {
  const out: string[] = [];
  for (const id of details.guestAmenityIds) {
    if (GUEST_ID_SET.has(id)) {
      out.push(guestAmenityKey(id));
    }
  }
  out.push(bathroomModeKey(details.bathroomPrivate ? "private" : "shared"));
  for (const id of details.bathroomItemIds) {
    if (BATHROOM_ITEM_DEFS.some((d) => d.id === id)) {
      out.push(bathItemKey(id));
    }
  }
  for (const id of ALL_BED_TYPE_IDS) {
    const n = details.bedCounts[id] ?? 0;
    if (n > 0) {
      out.push(bedCountKey(id, n));
    }
  }
  if (details.policies.smoking) {
    out.push(policyKey("smoking"));
  }
  if (details.policies.parties) {
    out.push(policyKey("parties"));
  }
  return out;
}

export function mergeRoomAmenityList(params: {
  presetSelected: string[];
  extraText: string;
  details: RoomDetailsDraft;
}): string[] {
  const extra = params.extraText
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sm = buildSmDetailStrings(params.details);
  return [...new Set([...params.presetSelected, ...sm, ...extra])];
}

export function buildBedFieldsFromCounts(bedCounts: Record<BedTypeId, number>): {
  bedCount: number;
  bedSize?: string;
} {
  let total = 0;
  for (const id of ALL_BED_TYPE_IDS) {
    total += Math.max(0, bedCounts[id] ?? 0);
  }
  const bedCount = Math.max(1, total);
  const parts: string[] = [];
  for (const row of [...BED_TYPE_PRIMARY, ...BED_TYPE_SECONDARY]) {
    const n = Math.max(0, bedCounts[row.id] ?? 0);
    if (n <= 0) continue;
    parts.push(n === 1 ? row.label : `${n}× ${row.label}`);
  }
  return {
    bedCount,
    bedSize: parts.length ? parts.join(", ") : undefined,
  };
}

export { BED_TYPE_PRIMARY, BED_TYPE_SECONDARY };
