import { NextResponse } from "next/server";

import type { BookingOption } from "@/types/booking-option";
import { BOOKING_OPTIONS_COLLECTION } from "@/types/booking-option";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { parsePropertyId } from "@/utils/schemas";

const DEFAULT_BOOKING_OPTIONS: Array<{
  name: string;
  description?: string;
  appliesTo: "user" | "room";
  frequency: "day" | "booking";
  pricePerUnit: number;
  sortOrder: number;
}> = [
  { name: "AI", appliesTo: "user", frequency: "day", pricePerUnit: 2500, sortOrder: 1 },
  { name: "AP", appliesTo: "user", frequency: "day", pricePerUnit: 1500, sortOrder: 2 },
  { name: "CP", appliesTo: "user", frequency: "day", pricePerUnit: 500, sortOrder: 3 },
  { name: "EP", appliesTo: "user", frequency: "day", pricePerUnit: 0, sortOrder: 4 },
  { name: "MAP", appliesTo: "user", frequency: "day", pricePerUnit: 500, sortOrder: 5 },
  { name: "Mattress", appliesTo: "user", frequency: "day", pricePerUnit: 700, sortOrder: 6 },
];

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId } = await context.params;
  let propertyObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyId);
  } catch {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  const db = await getDb();
  const existingCount = await db.collection<BookingOption>(BOOKING_OPTIONS_COLLECTION).countDocuments({
    orgId,
    propertyId: propertyObjectId,
  });
  if (existingCount > 0) {
    return NextResponse.json(
      { error: "Booking options already exist for this property." },
      { status: 409 },
    );
  }

  const now = new Date();
  const docs: Omit<BookingOption, "_id">[] = DEFAULT_BOOKING_OPTIONS.map((row) => ({
    orgId,
    propertyId: propertyObjectId,
    name: row.name,
    description: row.description,
    appliesTo: row.appliesTo,
    frequency: row.frequency,
    pricePerUnit: row.pricePerUnit,
    isActive: true,
    sortOrder: row.sortOrder,
    createdAt: now,
    updatedAt: now,
  }));

  await db.collection<Omit<BookingOption, "_id">>(BOOKING_OPTIONS_COLLECTION).insertMany(docs);
  return NextResponse.json({ imported: docs.length }, { status: 201 });
}
