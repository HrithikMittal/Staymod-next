import type { BookingListItem } from "@/api-clients/bookings";
import type { RoomListItem } from "@/api-clients/rooms";

/** Calendar date YYYY-MM-DD in `timeZone` for an instant. */
export function dateKeyInTimeZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayKeyInTimeZone(timeZone: string, now = new Date()): string {
  return dateKeyInTimeZone(now.toISOString(), timeZone);
}

/** Add calendar days to a YYYY-MM-DD string (UTC date arithmetic on the civil date). */
export function addDaysToDateKey(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) {
    return ymd;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function isActiveBooking(b: BookingListItem): boolean {
  return b.status !== "cancelled";
}

function countsTowardPipeline(b: BookingListItem): boolean {
  return b.status === "pending" || b.status === "confirmed";
}

export type PropertyDashboardMetrics = {
  pendingCount: number;
  arrivalsToday: number;
  departuresToday: number;
  upcomingStaysNext7Days: number;
  roomTypes: number;
  physicalUnits: number;
  advanceCollectedThisMonth: number;
};

export function computeDashboardMetrics(
  bookings: BookingListItem[],
  rooms: RoomListItem[],
  timeZone: string,
  now = new Date(),
): PropertyDashboardMetrics {
  const todayKey = todayKeyInTimeZone(timeZone, now);
  const weekEndKey = addDaysToDateKey(todayKey, 7);
  const monthPrefix = todayKey.slice(0, 7);

  let pendingCount = 0;
  let arrivalsToday = 0;
  let departuresToday = 0;
  let upcomingStaysNext7Days = 0;
  let advanceCollectedThisMonth = 0;

  for (const b of bookings) {
    if (b.status === "pending") {
      pendingCount += 1;
    }

    const inKey = dateKeyInTimeZone(b.checkIn, timeZone);
    const outKey = dateKeyInTimeZone(b.checkOut, timeZone);
    const createdKey = dateKeyInTimeZone(b.createdAt, timeZone);

    if (isActiveBooking(b)) {
      if (inKey === todayKey) {
        arrivalsToday += 1;
      }
      if (outKey === todayKey) {
        departuresToday += 1;
      }
    }

    if (countsTowardPipeline(b) && inKey >= todayKey && inKey <= weekEndKey) {
      upcomingStaysNext7Days += 1;
    }

    if (createdKey.startsWith(monthPrefix) && typeof b.advanceAmount === "number") {
      advanceCollectedThisMonth += b.advanceAmount;
    }
  }

  const activeRooms = rooms.filter((r) => r.isActive !== false);
  const roomTypes = activeRooms.length;
  const physicalUnits = activeRooms.reduce((sum, r) => sum + (r.unitCount ?? 1), 0);

  return {
    pendingCount,
    arrivalsToday,
    departuresToday,
    upcomingStaysNext7Days,
    roomTypes,
    physicalUnits,
    advanceCollectedThisMonth,
  };
}

export function bookingRoomSummary(
  booking: BookingListItem,
  roomNameById: Map<string, string>,
): string {
  const entries = Object.entries(booking.rooms ?? {});
  if (entries.length === 0) {
    return "Room";
  }
  return entries
    .map(([roomId, row]) => {
      const name = roomNameById.get(roomId) ?? "Room";
      return row.quantity > 1 ? `${name} ×${row.quantity}` : name;
    })
    .join(", ");
}
