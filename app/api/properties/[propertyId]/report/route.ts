import { NextResponse } from "next/server";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import type { Property } from "@/types/property";
import type { Room } from "@/types/room";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { calculateBookingAmount, calculateNightsCount } from "@/utils/booking-pricing";
import { getDb } from "@/utils/mongodb";
import { parsePropertyId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";
const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

type DateMode = "stay" | "booked";

function parseDateParam(value: string | null, endOfDay: boolean): Date | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  const normalized = endOfDay ? `${s}T23:59:59.999Z` : `${s}T00:00:00.000Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function serializeMoney(value: number): number {
  return Math.max(0, Math.round(value));
}

export async function GET(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  let propertyObjectId;
  try {
    const { propertyId } = await context.params;
    propertyObjectId = parsePropertyId(propertyId);
  } catch {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  const db = await getDb();
  const property = await db.collection<Property>(PROPERTIES_COLLECTION).findOne({
    _id: propertyObjectId,
    orgId,
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const modeParam = (url.searchParams.get("mode") ?? "stay").trim();
  const mode: DateMode = modeParam === "booked" ? "booked" : "stay";
  const fromDate = parseDateParam(url.searchParams.get("from"), false);
  const toDate = parseDateParam(url.searchParams.get("to"), true);
  if (!fromDate || !toDate || toDate.getTime() < fromDate.getTime()) {
    return NextResponse.json({ error: "Valid from/to range is required." }, { status: 400 });
  }

  const dateField = mode === "booked" ? "createdAt" : "checkIn";
  const bookings = await db
    .collection<Booking>(BOOKINGS_COLLECTION)
    .find({
      orgId,
      propertyId: propertyObjectId,
      [dateField]: { $gte: fromDate, $lte: toDate },
    })
    .toArray();

  const rooms = await db
    .collection<Room>(ROOMS_COLLECTION)
    .find({ orgId, propertyId: propertyObjectId })
    .toArray();
  const roomById = new Map(rooms.map((r) => [r._id.toString(), r]));

  let pending = 0;
  let confirmed = 0;
  let checkedIn = 0;
  let completed = 0;
  let cancelled = 0;
  let noShow = 0;

  let totalBilled = 0;
  let dueUpcoming = 0;
  let nightsBooked = 0;

  for (const booking of bookings) {
    if (booking.status === "pending") pending += 1;
    if (booking.status === "confirmed") confirmed += 1;
    if (booking.status === "checked_in") checkedIn += 1;
    if (booking.status === "completed") completed += 1;
    if (booking.status === "cancelled") cancelled += 1;
    if (booking.status === "no_show") noShow += 1;

    const nights = Math.max(0, calculateNightsCount(booking.checkIn.toISOString(), booking.checkOut.toISOString()));
    nightsBooked += nights;

    const roomAmount = Object.entries(booking.rooms ?? {}).reduce((sum, [roomId, row]) => {
      const room = roomById.get(roomId);
      return (
        sum +
        calculateBookingAmount(
          booking.checkIn.toISOString(),
          booking.checkOut.toISOString(),
          row.quantity,
          { priceWeekday: room?.priceWeekday, priceWeekend: room?.priceWeekend },
        )
      );
    }, 0);
    const optionsTotal = (booking.selectedOptions ?? []).reduce(
      (sum, opt) => sum + opt.pricePerUnit * opt.quantity * (opt.frequency === "day" ? Math.max(1, nights) : 1),
      0,
    );
    const extrasTotal = (booking.customItems ?? []).reduce((sum, item) => sum + item.amount, 0);
    const discount = Math.max(0, booking.discount ?? 0);
    const billed = Math.max(0, roomAmount + optionsTotal + extrasTotal - discount);

    const isRevenueStatus =
      booking.status === "pending" ||
      booking.status === "confirmed" ||
      booking.status === "checked_in" ||
      booking.status === "completed";
    if (isRevenueStatus) {
      totalBilled += billed;
    }

    const isUpcomingDueStatus =
      booking.status === "pending" || booking.status === "confirmed" || booking.status === "checked_in";
    if (isUpcomingDueStatus) {
      dueUpcoming += Math.max(0, billed - Math.max(0, booking.advanceAmount ?? 0));
    }
  }

  const advanceCollected = Math.max(0, totalBilled - dueUpcoming);

  return NextResponse.json({
    mode,
    range: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    },
    kpis: {
      total: bookings.length,
      pending,
      confirmed,
      checkedIn,
      completed,
      cancelled,
      noShow,
    },
    revenue: {
      totalBilled: serializeMoney(totalBilled),
      advanceCollected: serializeMoney(advanceCollected),
      dueUpcoming: serializeMoney(dueUpcoming),
    },
    occupancy: {
      nightsBooked: serializeMoney(nightsBooked),
    },
  });
}
