import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { BookingOption } from "@/types/booking-option";
import { BOOKING_OPTIONS_COLLECTION } from "@/types/booking-option";
import type { Property } from "@/types/property";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import {
  createBookingOptionDocument,
  parseCreateBookingOptionInput,
  parsePropertyId,
} from "@/utils/schemas";

const PROPERTIES_COLLECTION = "properties";

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

async function resolvePropertyOr404(orgId: string, propertyIdParam: string) {
  let propertyObjectId: ObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyIdParam);
  } catch {
    return { error: NextResponse.json({ error: "Invalid property id." }, { status: 400 }) };
  }

  const db = await getDb();
  const property = await db
    .collection<Property>(PROPERTIES_COLLECTION)
    .findOne({ _id: propertyObjectId, orgId });

  if (!property) {
    return { error: NextResponse.json({ error: "Property not found." }, { status: 404 }) };
  }

  return { db, propertyObjectId };
}

export async function GET(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId } = await context.params;
  const resolved = await resolvePropertyOr404(orgId, propertyId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, propertyObjectId } = resolved;
  const options = await db
    .collection<BookingOption>(BOOKING_OPTIONS_COLLECTION)
    .find({ orgId, propertyId: propertyObjectId })
    .sort({ sortOrder: 1, name: 1, createdAt: 1 })
    .toArray();

  return NextResponse.json({ bookingOptions: options.map((option) => serializeBookingOption(option)) });
}

export async function POST(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId } = await context.params;
  const resolved = await resolvePropertyOr404(orgId, propertyId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, propertyObjectId } = resolved;

  try {
    const payload = await req.json();
    const input = parseCreateBookingOptionInput(payload);

    const duplicate = await db.collection<BookingOption>(BOOKING_OPTIONS_COLLECTION).findOne({
      orgId,
      propertyId: propertyObjectId,
      name: input.name,
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "A booking option with this name already exists for this property." },
        { status: 409 },
      );
    }

    const doc = createBookingOptionDocument(input, orgId, propertyObjectId);
    const result = await db
      .collection<Omit<BookingOption, "_id">>(BOOKING_OPTIONS_COLLECTION)
      .insertOne(doc);
    const created: BookingOption = { ...doc, _id: result.insertedId };

    return NextResponse.json({ bookingOption: serializeBookingOption(created) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create booking option." },
      { status: 400 },
    );
  }
}
