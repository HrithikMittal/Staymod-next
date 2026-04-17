import { ObjectId } from "mongodb";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import type { Room } from "@/types/room";
import { eachUtcNightDateKeysBetween, formatDateKeyUtc, isValidDateKey } from "@/utils/date-key";
import { getDb } from "@/utils/mongodb";
import { loadNightlyPricingMap, resolveNightlyPriceForCell } from "@/utils/nightly-pricing-db";
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/utils/public-api-cors";
import { requirePublicApiAuth } from "@/utils/public-api-auth";
import { isWeekendNightUtc } from "@/utils/room-nightly-price";
import {
  buildAvailabilityUnitRows,
  buildBookedQuantityByRoomAndDate,
  computeUnitCellFull,
  listingCapacity,
  occupiedSlotKeysForDate,
  slotsForRoom,
} from "@/utils/room-availability-view";
import { parsePropertyId } from "@/utils/schemas/room";

const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function OPTIONS(req: Request) {
  return publicApiOptionsResponse(req);
}

function addDaysDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateKeyUtc(d);
}

function dateKeysInclusive(fromDateKey: string, toDateKey: string): string[] {
  const keys: string[] = [];
  let current = fromDateKey;
  while (current <= toDateKey) {
    keys.push(current);
    current = addDaysDateKey(current, 1);
  }
  return keys;
}

function parseDateParam(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!isValidDateKey(value)) {
    throw new Error("from/to must be YYYY-MM-DD.");
  }
  return value;
}

export async function GET(req: Request, context: RouteContext) {
  let propertyObjectId: ObjectId;
  try {
    const { propertyId } = await context.params;
    propertyObjectId = parsePropertyId(propertyId);
  } catch {
    return publicApiJsonResponse(req, { error: "Invalid property id." }, { status: 400 });
  }

  const auth = await requirePublicApiAuth(req, "availability:read", propertyObjectId);
  if (!auth.ok) return auth.response;
  const { orgId } = auth.value;

  const today = formatDateKeyUtc(new Date());
  const defaultTo = addDaysDateKey(today, 29);
  const url = new URL(req.url);

  let from = today;
  let to = defaultTo;
  try {
    from = parseDateParam(url.searchParams.get("from"), today);
    to = parseDateParam(url.searchParams.get("to"), defaultTo);
  } catch (error) {
    return publicApiJsonResponse(
      req,
      { error: error instanceof Error ? error.message : "Invalid date range." },
      { status: 400 },
    );
  }

  if (from > to) {
    return publicApiJsonResponse(req, { error: "from must be before or equal to to." }, { status: 400 });
  }

  const dateKeys = dateKeysInclusive(from, to);
  if (dateKeys.length > 62) {
    return publicApiJsonResponse(req, { error: "Date range cannot exceed 62 nights." }, { status: 400 });
  }

  const db = await getDb();
  const rooms = await db
    .collection<Room>(ROOMS_COLLECTION)
    .find({
      orgId,
      propertyId: propertyObjectId,
      isActive: true,
      status: "active",
    })
    .sort({ sortOrder: 1, createdAt: 1 })
    .toArray();

  const roomById = new Map(rooms.map((r) => [r._id.toString(), r]));
  const dateKeySet = new Set(dateKeys);
  const allBookings = await db
    .collection<Booking>(BOOKINGS_COLLECTION)
    .find({
      orgId,
      propertyId: propertyObjectId,
      status: { $ne: "cancelled" },
    })
    .toArray();
  const bookingsInRange = allBookings.filter((b) => {
    const nights = eachUtcNightDateKeysBetween(b.checkIn, b.checkOut);
    return nights.some((n) => dateKeySet.has(n));
  });

  const bookedQtyByRoomAndDate = buildBookedQuantityByRoomAndDate(bookingsInRange, dateKeySet);
  const unitRows = buildAvailabilityUnitRows(rooms);
  const nightlyPricingMap = await loadNightlyPricingMap(db, orgId, propertyObjectId, rooms, dateKeys);

  const days = dateKeys.map((dateKey) => ({
    dateKey,
    isWeekend: isWeekendNightUtc(dateKey),
  }));

  const rowsOut = await Promise.all(
    unitRows.map(async (row) => {
      const room = roomById.get(row.roomId);
      const cells = await Promise.all(
        dateKeys.map(async (dateKey) => {
          const cap = room ? listingCapacity(room) : 0;
          const booked = bookedQtyByRoomAndDate.get(`${row.roomId}|${dateKey}`) ?? 0;
          const remainingForListing = Math.max(0, cap - booked);
          const occupied = occupiedSlotKeysForDate(bookingsInRange, dateKey);
          const ordered = slotsForRoom(unitRows, row.roomId);
          const isFull = computeUnitCellFull({
            remainingForListing,
            row,
            orderedSlots: ordered,
            occupied,
          });
          const { price, priceIsOverride } = resolveNightlyPriceForCell(room, dateKey, nightlyPricingMap);
          return { dateKey, isFull, price, priceIsOverride };
        }),
      );
      return {
        rowId: row.rowId,
        roomId: row.roomId,
        listingName: row.listingName,
        roomType: row.roomType,
        unitLabel: row.unitLabel,
        cells,
      };
    }),
  );

  return publicApiJsonResponse(req, {
    from,
    to,
    days,
    rows: rowsOut,
  });
}
