import { NextResponse } from "next/server";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { parseBookingId } from "@/utils/schemas/booking";
import { parsePropertyId } from "@/utils/schemas/room";
import {
  createCheckinDocumentUploadUrl,
  validateCheckinDocumentInput,
} from "@/utils/s3-checkin-documents";

type RouteContext = {
  params: Promise<{ propertyId: string; bookingId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Organization is required." }, { status: 401 });

  let propertyObjectId;
  let bookingObjectId;
  let propertyId: string;
  let bookingId: string;
  try {
    const params = await context.params;
    propertyId = params.propertyId;
    bookingId = params.bookingId;
    propertyObjectId = parsePropertyId(propertyId);
    bookingObjectId = parseBookingId(bookingId);
  } catch {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const db = await getDb();
  const booking = await db.collection<Booking>(BOOKINGS_COLLECTION).findOne({
    _id: bookingObjectId,
    orgId,
    propertyId: propertyObjectId,
  });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const contentType = typeof body.contentType === "string" ? body.contentType.trim() : "";
  const size = typeof body.size === "number" ? body.size : Number(body.size);

  try {
    validateCheckinDocumentInput(fileName, contentType, size);
    const signed = await createCheckinDocumentUploadUrl({
      orgId,
      propertyId,
      bookingId,
      fileName,
      contentType,
    });
    return NextResponse.json(signed);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create upload URL." },
      { status: 400 },
    );
  }
}
