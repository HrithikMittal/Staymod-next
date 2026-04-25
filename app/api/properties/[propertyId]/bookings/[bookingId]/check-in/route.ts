import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import type { BookingCheckin, BookingCheckinGuest } from "@/types/booking-checkin";
import { BOOKING_CHECKINS_COLLECTION } from "@/types/booking-checkin";
import type { Customer, CustomerIdentityDocument } from "@/types/customer";
import { CUSTOMERS_COLLECTION } from "@/types/customer";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { findOrCreateCustomerForBooking } from "@/utils/customer-link";
import { getDb } from "@/utils/mongodb";
import { parseBookingId } from "@/utils/schemas/booking";
import { parsePropertyId } from "@/utils/schemas/room";

type RouteContext = {
  params: Promise<{ propertyId: string; bookingId: string }>;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function serializeGuest(guest: BookingCheckinGuest) {
  return {
    name: guest.name,
    email: guest.email,
    phone: guest.phone,
    customerId: guest.customerId?.toString(),
    identityDocuments: guest.identityDocuments.map((d) => ({
      fileUrl: d.fileUrl,
      fileKey: d.fileKey,
      fileName: d.fileName,
      contentType: d.contentType,
      source: d.source,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
  };
}

export async function GET(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Organization is required." }, { status: 401 });

  let propertyId;
  let bookingId;
  try {
    const params = await context.params;
    propertyId = parsePropertyId(params.propertyId);
    bookingId = parseBookingId(params.bookingId);
  } catch {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const db = await getDb();
  const doc = await db.collection<BookingCheckin>(BOOKING_CHECKINS_COLLECTION).findOne({
    orgId,
    propertyId,
    bookingId,
  });
  if (!doc) return NextResponse.json({ checkin: null });

  return NextResponse.json({
    checkin: {
      _id: doc._id.toString(),
      bookingId: doc.bookingId.toString(),
      propertyId: doc.propertyId.toString(),
      checkedInAt: doc.checkedInAt.toISOString(),
      guests: doc.guests.map(serializeGuest),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    },
  });
}

export async function POST(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Organization is required." }, { status: 401 });

  let propertyObjectId;
  let bookingObjectId;
  try {
    const params = await context.params;
    propertyObjectId = parsePropertyId(params.propertyId);
    bookingObjectId = parseBookingId(params.bookingId);
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
  const rawGuests = Array.isArray(body.guests) ? body.guests : [];
  if (rawGuests.length === 0) {
    return NextResponse.json({ error: "At least one guest is required." }, { status: 400 });
  }

  const now = new Date();
  const guests: BookingCheckinGuest[] = [];
  for (const rawGuest of rawGuests) {
    if (!rawGuest || typeof rawGuest !== "object") continue;
    const guestObj = rawGuest as Record<string, unknown>;
    const name = normalizeString(guestObj.name);
    const email = normalizeString(guestObj.email) || undefined;
    const phone = normalizeString(guestObj.phone) || undefined;
    const docs = Array.isArray(guestObj.identityDocuments) ? guestObj.identityDocuments : [];
    if (!name) continue;

    const identityDocuments = docs
      .map((rawDoc) => {
        if (!rawDoc || typeof rawDoc !== "object") return null;
        const d = rawDoc as Record<string, unknown>;
        const source = normalizeString(d.source);
        if (source !== "camera" && source !== "photo" && source !== "pdf") return null;
        const fileUrl = normalizeString(d.fileUrl);
        const fileKey = normalizeString(d.fileKey);
        const fileName = normalizeString(d.fileName);
        const contentType = normalizeString(d.contentType);
        if (!fileUrl || !fileKey || !fileName || !contentType) return null;
        return {
          fileUrl,
          fileKey,
          fileName,
          contentType,
          source,
          uploadedAt: now,
        } as BookingCheckinGuest["identityDocuments"][number];
      })
      .filter((x): x is BookingCheckinGuest["identityDocuments"][number] => Boolean(x));

    if (identityDocuments.length === 0) continue;

    let customerId: ObjectId | undefined = undefined;
    if (email) {
      customerId = await findOrCreateCustomerForBooking({
        orgId,
        propertyId: propertyObjectId,
        guestEmail: email,
        guestName: name,
        guestPhone: phone,
      });
    } else if (guests.length === 0 && booking.customerId) {
      customerId = booking.customerId;
    }

    if (customerId) {
      const customerDocs: CustomerIdentityDocument[] = identityDocuments.map((d) => ({
        bookingId: bookingObjectId,
        fileUrl: d.fileUrl,
        fileKey: d.fileKey,
        fileName: d.fileName,
        contentType: d.contentType,
        source: d.source,
        uploadedAt: d.uploadedAt,
      }));
      await db.collection<Customer>(CUSTOMERS_COLLECTION).updateOne(
        { _id: customerId, orgId, propertyId: propertyObjectId },
        {
          $set: { updatedAt: now },
          $push: { identityDocuments: { $each: customerDocs } },
        },
      );
    }

    guests.push({
      name,
      email,
      phone,
      customerId,
      identityDocuments,
    });
  }

  if (guests.length === 0) {
    return NextResponse.json(
      { error: "Add at least one guest with one uploaded identity file." },
      { status: 400 },
    );
  }

  await db.collection<BookingCheckin>(BOOKING_CHECKINS_COLLECTION).updateOne(
    { orgId, propertyId: propertyObjectId, bookingId: bookingObjectId },
    {
      $set: {
        guests,
        checkedInAt: now,
        updatedAt: now,
      },
      $setOnInsert: {
        orgId,
        propertyId: propertyObjectId,
        bookingId: bookingObjectId,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await db.collection<Booking>(BOOKINGS_COLLECTION).updateOne(
    { _id: bookingObjectId, orgId, propertyId: propertyObjectId },
    { $set: { status: "checked_in", updatedAt: now } },
  );

  return NextResponse.json({ ok: true });
}
