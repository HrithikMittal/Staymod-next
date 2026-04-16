import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { BookingOption } from "@/types/booking-option";
import { BOOKING_OPTIONS_COLLECTION } from "@/types/booking-option";
import type { Property } from "@/types/property";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import {
  parseBookingOptionId,
  parseCreateBookingOptionInput,
  parsePropertyId,
} from "@/utils/schemas";

const PROPERTIES_COLLECTION = "properties";

type RouteContext = {
  params: Promise<{ propertyId: string; bookingOptionId: string }>;
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

async function resolvePropertyAndOptionOr404(
  orgId: string,
  propertyIdParam: string,
  bookingOptionIdParam: string,
) {
  let propertyObjectId: ObjectId;
  let bookingOptionObjectId: ObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyIdParam);
    bookingOptionObjectId = parseBookingOptionId(bookingOptionIdParam);
  } catch {
    return { error: NextResponse.json({ error: "Invalid id." }, { status: 400 }) };
  }

  const db = await getDb();
  const property = await db
    .collection<Property>(PROPERTIES_COLLECTION)
    .findOne({ _id: propertyObjectId, orgId });
  if (!property) {
    return { error: NextResponse.json({ error: "Property not found." }, { status: 404 }) };
  }

  const option = await db.collection<BookingOption>(BOOKING_OPTIONS_COLLECTION).findOne({
    _id: bookingOptionObjectId,
    orgId,
    propertyId: propertyObjectId,
  });
  if (!option) {
    return { error: NextResponse.json({ error: "Booking option not found." }, { status: 404 }) };
  }

  return { db, propertyObjectId, bookingOptionObjectId, option };
}

export async function PATCH(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, bookingOptionId } = await context.params;
  const resolved = await resolvePropertyAndOptionOr404(orgId, propertyId, bookingOptionId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, propertyObjectId, bookingOptionObjectId } = resolved;
  try {
    const payload = await req.json();
    const input = parseCreateBookingOptionInput(payload);

    const duplicate = await db.collection<BookingOption>(BOOKING_OPTIONS_COLLECTION).findOne({
      orgId,
      propertyId: propertyObjectId,
      name: input.name,
      _id: { $ne: bookingOptionObjectId },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "A booking option with this name already exists for this property." },
        { status: 409 },
      );
    }

    const now = new Date();
    await db.collection<BookingOption>(BOOKING_OPTIONS_COLLECTION).updateOne(
      { _id: bookingOptionObjectId, orgId, propertyId: propertyObjectId },
      {
        $set: {
          ...input,
          updatedAt: now,
        },
      },
    );

    const updated = await db.collection<BookingOption>(BOOKING_OPTIONS_COLLECTION).findOne({
      _id: bookingOptionObjectId,
      orgId,
      propertyId: propertyObjectId,
    });
    if (!updated) {
      return NextResponse.json({ error: "Booking option not found." }, { status: 404 });
    }

    return NextResponse.json({ bookingOption: serializeBookingOption(updated) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update booking option." },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, bookingOptionId } = await context.params;
  const resolved = await resolvePropertyAndOptionOr404(orgId, propertyId, bookingOptionId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, propertyObjectId, bookingOptionObjectId } = resolved;
  await db.collection<BookingOption>(BOOKING_OPTIONS_COLLECTION).deleteOne({
    _id: bookingOptionObjectId,
    orgId,
    propertyId: propertyObjectId,
  });

  return NextResponse.json({ deleted: true });
}
