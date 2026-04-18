import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import type { Property } from "@/types/property";
import { resendBookingConfirmationEmail } from "@/utils/booking-guest-email";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { parseBookingId } from "@/utils/schemas/booking";
import { parsePropertyId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";

type RouteContext = {
  params: Promise<{ propertyId: string; bookingId: string }>;
};

async function resolveBooking(orgId: string, propertyIdParam: string, bookingIdParam: string) {
  let propertyObjectId: ObjectId;
  let bookingObjectId: ObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyIdParam);
    bookingObjectId = parseBookingId(bookingIdParam);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid id.";
    return { error: NextResponse.json({ error: message }, { status: 400 }) };
  }

  const db = await getDb();
  const property = await db
    .collection<Property>(PROPERTIES_COLLECTION)
    .findOne({ _id: propertyObjectId, orgId });

  if (!property) {
    return { error: NextResponse.json({ error: "Property not found." }, { status: 404 }) };
  }

  const booking = await db.collection<Booking>(BOOKINGS_COLLECTION).findOne({
    _id: bookingObjectId,
    orgId,
    propertyId: propertyObjectId,
  });

  if (!booking) {
    return { error: NextResponse.json({ error: "Booking not found." }, { status: 404 }) };
  }

  return { propertyObjectId, booking };
}

export async function POST(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, bookingId } = await context.params;
  const resolved = await resolveBooking(orgId, propertyId, bookingId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { propertyObjectId, booking } = resolved;

  if (booking.status !== "confirmed") {
    return NextResponse.json(
      { error: "Only confirmed bookings can receive a confirmation email." },
      { status: 400 },
    );
  }

  if (!booking.guestEmail?.trim()) {
    return NextResponse.json({ error: "This booking has no guest email address." }, { status: 400 });
  }

  try {
    await resendBookingConfirmationEmail({
      orgId,
      propertyId: propertyObjectId,
      booking,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email." },
      { status: 400 },
    );
  }
}
