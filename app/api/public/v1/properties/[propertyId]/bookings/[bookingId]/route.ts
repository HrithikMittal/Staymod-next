import { ObjectId } from "mongodb";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import { getDb } from "@/utils/mongodb";
import { serializePublicBooking } from "@/utils/public-booking-serialize";
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/utils/public-api-cors";
import { requirePublicApiAuth } from "@/utils/public-api-auth";
import { parseBookingId } from "@/utils/schemas/booking";
import { parsePropertyId } from "@/utils/schemas/room";

type RouteContext = {
  params: Promise<{ propertyId: string; bookingId: string }>;
};

export async function OPTIONS(req: Request) {
  return publicApiOptionsResponse(req);
}

export async function GET(req: Request, context: RouteContext) {
  let propertyObjectId: ObjectId;
  let bookingObjectId: ObjectId;
  try {
    const { propertyId, bookingId } = await context.params;
    propertyObjectId = parsePropertyId(propertyId);
    bookingObjectId = parseBookingId(bookingId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid id.";
    return publicApiJsonResponse(req, { error: message }, { status: 400 });
  }

  const auth = await requirePublicApiAuth(req, "bookings:read", propertyObjectId);
  if (!auth.ok) return auth.response;
  const { orgId } = auth.value;

  const db = await getDb();
  const booking = await db.collection<Booking>(BOOKINGS_COLLECTION).findOne({
    _id: bookingObjectId,
    orgId,
    propertyId: propertyObjectId,
  });

  if (!booking) {
    return publicApiJsonResponse(req, { error: "Booking not found." }, { status: 404 });
  }

  return publicApiJsonResponse(req, { booking: serializePublicBooking(booking) });
}
