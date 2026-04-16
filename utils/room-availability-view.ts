import "server-only";

import type { Booking } from "@/types/booking";
import type { Room, RoomType } from "@/types/room";
import { eachUtcNightDateKeysBetween } from "@/utils/date-key";

/** Physical sellable units for one room listing (matches `buildAvailabilityUnitRows`). */
export function listingCapacity(room: Room): number {
  const nums = (room.roomNumbers ?? []).map((n) => n.trim()).filter(Boolean);
  if (nums.length > 0) {
    return nums.length;
  }
  return Math.max(1, Math.floor(room.unitCount ?? 1));
}

/**
 * Sum of `quantity` for `roomId` on `dateKey` across non-cancelled bookings (multi-line stays).
 */
export function buildBookedQuantityByRoomAndDate(
  bookings: Booking[],
  dateKeySet: ReadonlySet<string>,
): Map<string, number> {
  const map = new Map<string, number>();

  for (const b of bookings) {
    if (b.status === "cancelled") {
      continue;
    }
    const nights = eachUtcNightDateKeysBetween(b.checkIn, b.checkOut);
    for (const dateKey of nights) {
      if (!dateKeySet.has(dateKey)) {
        continue;
      }
      if (b.rooms && Object.keys(b.rooms).length > 0) {
        for (const [roomIdStr, alloc] of Object.entries(b.rooms)) {
          const key = `${roomIdStr}|${dateKey}`;
          map.set(key, (map.get(key) ?? 0) + alloc.quantity);
        }
      } else if (b.roomId && b.quantity != null && b.quantity > 0) {
        const key = `${b.roomId.toString()}|${dateKey}`;
        map.set(key, (map.get(key) ?? 0) + b.quantity);
      }
    }
  }
  return map;
}

/**
 * Unit rows for one listing, stable slot order (for {@link computeUnitCellFull}).
 */
export function slotsForRoom(rows: AvailabilityUnitRow[], roomId: string): AvailabilityUnitRow[] {
  return [...rows].filter((r) => r.roomId === roomId).sort((a, b) => a.slotKey.localeCompare(b.slotKey));
}

/** One physical sellable unit row (room number or indexed unit). */
export type AvailabilityUnitRow = {
  rowId: string;
  roomId: string;
  listingName: string;
  roomType: RoomType;
  /** Display label: room number or "Unit 2". */
  unitLabel: string;
  slotKey: string;
};

function slotRowId(roomId: string, slotKey: string): string {
  return `${roomId}:${slotKey}`;
}

/**
 * Builds one row per physical unit: configured `roomNumbers`, or `unitCount` synthetic slots.
 */
export function buildAvailabilityUnitRows(rooms: Room[]): AvailabilityUnitRow[] {
  const rows: AvailabilityUnitRow[] = [];
  for (const room of rooms) {
    const roomId = room._id.toString();
    const nums = (room.roomNumbers ?? []).map((n) => n.trim()).filter(Boolean);
    if (nums.length > 0) {
      for (const n of [...nums].sort()) {
        rows.push({
          rowId: slotRowId(roomId, n),
          roomId,
          listingName: room.name,
          roomType: room.type,
          unitLabel: n,
          slotKey: n,
        });
      }
    } else {
      const uc = Math.max(1, room.unitCount ?? 1);
      for (let i = 0; i < uc; i++) {
        const slotKey = `__unit:${i}`;
        rows.push({
          rowId: slotRowId(roomId, slotKey),
          roomId,
          listingName: room.name,
          roomType: room.type,
          unitLabel: `Unit ${i + 1}`,
          slotKey,
        });
      }
    }
  }
  return rows;
}

/**
 * Slots explicitly marked occupied by booking `roomNumbers` for a given calendar night.
 */
export function occupiedSlotKeysForDate(bookings: Booking[], dateKey: string): Set<string> {
  const out = new Set<string>();
  for (const b of bookings) {
    if (b.status === "cancelled") {
      continue;
    }
    const nights = eachUtcNightDateKeysBetween(b.checkIn, b.checkOut);
    if (!nights.includes(dateKey)) {
      continue;
    }
    if (!b.rooms || Object.keys(b.rooms).length === 0) {
      continue;
    }
    for (const [roomIdStr, alloc] of Object.entries(b.rooms)) {
      const nums = alloc.roomNumbers?.map((n) => n.trim()).filter(Boolean) ?? [];
      for (const n of nums) {
        out.add(`${roomIdStr}|${n}`);
      }
    }
  }
  return out;
}

/**
 * Sort unit rows for stable allocation within a room type (listing order, then slot key).
 */
export function sortRowsForAllocation(rows: AvailabilityUnitRow[]): AvailabilityUnitRow[] {
  return [...rows].sort((a, b) => {
    if (a.roomType !== b.roomType) {
      return a.roomType.localeCompare(b.roomType);
    }
    if (a.roomId !== b.roomId) {
      return a.roomId.localeCompare(b.roomId);
    }
    return a.slotKey.localeCompare(b.slotKey);
  });
}

/**
 * Full = explicitly booked for that unit, or no free inventory left when this slot is reached
 * in the allocation order (unnumbered bookings consume `remainingForListing`).
 *
 * Call with `orderedSlots` and `remaining` scoped to **one room listing** (`roomId`), not all
 * rows sharing a `room.type` enum.
 */
export function computeUnitCellFull(args: {
  remainingForListing: number;
  row: AvailabilityUnitRow;
  orderedSlots: AvailabilityUnitRow[];
  occupied: Set<string>;
}): boolean {
  const { remainingForListing, row, orderedSlots, occupied } = args;
  let remaining = remainingForListing;

  for (const slot of orderedSlots) {
    const key = `${slot.roomId}|${slot.slotKey}`;
    const explicit = occupied.has(key);
    if (explicit) {
      if (slot.rowId === row.rowId) {
        return true;
      }
      continue;
    }
    if (remaining > 0) {
      if (slot.rowId === row.rowId) {
        return false;
      }
      remaining -= 1;
    } else if (slot.rowId === row.rowId) {
      return true;
    }
  }
  return true;
}
