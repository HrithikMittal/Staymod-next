import type { BookingOption } from "@/types/booking-option";
import { BOOKING_OPTIONS_COLLECTION } from "@/types/booking-option";
import { getDb } from "@/utils/mongodb";
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/utils/public-api-cors";
import { requirePublicApiAuth } from "@/utils/public-api-auth";
import { parsePropertyId } from "@/utils/schemas/room";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

function serializeBookingOption(option: BookingOption) {
  const legacyChargeBasis = (option as BookingOption & { chargeBasis?: string }).chargeBasis;
  const appliesTo =
    option.appliesTo ?? (legacyChargeBasis === "per_room_per_day" ? "room" : "user");
  const frequency = option.frequency === "booking" ? "booking" : "day";

  return {
    _id: option._id.toString(),
    orgId: option.orgId,
    propertyId: option.propertyId.toString(),
    name: option.name,
    description: option.description,
    appliesTo,
    frequency,
    pricePerUnit: option.pricePerUnit,
    isActive: option.isActive,
    sortOrder: option.sortOrder,
    createdAt: option.createdAt.toISOString(),
    updatedAt: option.updatedAt.toISOString(),
  };
}

export async function OPTIONS(req: Request) {
  return publicApiOptionsResponse(req);
}

export async function GET(req: Request, context: RouteContext) {
  let propertyObjectId;
  try {
    const { propertyId } = await context.params;
    propertyObjectId = parsePropertyId(propertyId);
  } catch {
    return publicApiJsonResponse(req, { error: "Invalid property id." }, { status: 400 });
  }

  const auth = await requirePublicApiAuth(req, "booking-options:read", propertyObjectId);
  if (!auth.ok) return auth.response;
  const { orgId } = auth.value;

  const db = await getDb();
  const options = await db
    .collection<BookingOption>(BOOKING_OPTIONS_COLLECTION)
    .find({ orgId, propertyId: propertyObjectId, isActive: true })
    .sort({ sortOrder: 1, name: 1, createdAt: 1 })
    .toArray();

  return publicApiJsonResponse(req, {
    bookingOptions: options.map((option) => serializeBookingOption(option)),
  });
}
