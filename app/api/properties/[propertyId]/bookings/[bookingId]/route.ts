import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import type { Property } from "@/types/property";
import type { Room } from "@/types/room";
import { queueBookingGuestEmailNotification } from "@/utils/booking-guest-email";
import { findOrCreateCustomerForBooking } from "@/utils/customer-link";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import {
  assertAvailabilityForBooking,
  applyBookingInventoryDeduction,
  returnInventoryForBooking,
} from "@/utils/room-availability";
import { createBookingDocument, parseBookingId, parseCreateBookingBody } from "@/utils/schemas/booking";
import { parsePropertyId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";
const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ propertyId: string; bookingId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, bookingId } = await context.params;
  const resolved = await resolveBookingContext(orgId, propertyId, bookingId);
  if ("error" in resolved) {
    return resolved.error;
  }
  return NextResponse.json({ booking: serializeBooking(resolved.existing) });
}

async function loadBookableRoom(
  db: Awaited<ReturnType<typeof getDb>>,
  orgId: string,
  propertyId: ObjectId,
  roomId: ObjectId,
): Promise<Room> {
  const room = await db.collection<Room>(ROOMS_COLLECTION).findOne({
    _id: roomId,
    orgId,
    propertyId,
    isActive: true,
    status: "active",
  });
  if (!room) {
    throw new Error("Room not found or not available for booking.");
  }
  return room;
}

function serializeBooking(b: Booking) {
  const normalizedRooms =
    b.rooms && Object.keys(b.rooms).length > 0
      ? b.rooms
      : b.roomId && b.roomType
        ? {
            [b.roomId.toString()]: {
              roomType: b.roomType,
              quantity: b.quantity ?? 1,
            },
          }
        : {};

  return {
    _id: b._id.toString(),
    orgId: b.orgId,
    propertyId: b.propertyId.toString(),
    customerId: b.customerId?.toString(),
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    guestPhone: b.guestPhone,
    specialRequests: b.specialRequests,
    checkIn: b.checkIn.toISOString(),
    checkOut: b.checkOut.toISOString(),
    numberOfGuests: b.numberOfGuests,
    selectedOptions: b.selectedOptions?.map((o) => ({
      ...o,
      bookingOptionId: o.bookingOptionId.toString(),
    })),
    customItems: b.customItems,
    discount: b.discount,
    advanceAmount: b.advanceAmount,
    status: b.status,
    rooms: normalizedRooms,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

function validateRoomNumbers(lineRoomNumbers: string[] | undefined, room: Room) {
  if (!lineRoomNumbers || lineRoomNumbers.length === 0) {
    return;
  }
  const allowed = new Set((room.roomNumbers ?? []).map((n) => n.trim()).filter(Boolean));
  if (allowed.size === 0) {
    throw new Error(`Room "${room.name}" does not have configured room numbers.`);
  }
  for (const n of lineRoomNumbers) {
    if (!allowed.has(n)) {
      throw new Error(`Room number "${n}" is not valid for "${room.name}".`);
    }
  }
}

async function resolveBookingContext(orgId: string, propertyIdParam: string, bookingIdParam: string) {
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

  const existing = await db.collection<Booking>(BOOKINGS_COLLECTION).findOne({
    _id: bookingObjectId,
    orgId,
    propertyId: propertyObjectId,
  });

  if (!existing) {
    return { error: NextResponse.json({ error: "Booking not found." }, { status: 404 }) };
  }

  return { db, propertyObjectId, bookingObjectId, existing };
}

export async function PATCH(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, bookingId } = await context.params;
  const resolved = await resolveBookingContext(orgId, propertyId, bookingId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, propertyObjectId, bookingObjectId, existing: old } = resolved;

  try {
    const payload = await req.json();
    const sendEmailNotification =
      typeof (payload as { sendEmailNotification?: unknown })?.sendEmailNotification === "boolean"
        ? Boolean((payload as { sendEmailNotification?: unknown }).sendEmailNotification)
        : true;
    const input = parseCreateBookingBody(payload, propertyObjectId);
    const roomMap: Record<string, Room> = {};
    for (const line of input.rooms) {
      const room = await loadBookableRoom(db, orgId, propertyObjectId, line.roomId);
      roomMap[line.roomId.toString()] = room;

      if (line.quantity > room.unitCount) {
        return NextResponse.json(
          { error: `quantity cannot exceed this room listing's unit count (${room.unitCount}) for "${room.name}".` },
          { status: 400 },
        );
      }
      validateRoomNumbers(line.roomNumbers, room);
    }

    if (old.status !== "cancelled") {
      await returnInventoryForBooking(old);
    }

    if (input.status !== "cancelled") {
      for (const line of input.rooms) {
        const room = roomMap[line.roomId.toString()];
        await assertAvailabilityForBooking(
          db,
          orgId,
          propertyObjectId,
          room.type,
          input.checkIn,
          input.checkOut,
          line.quantity,
        );
      }
    }

    const now = new Date();
    const customerId = await findOrCreateCustomerForBooking({
      orgId,
      propertyId: propertyObjectId,
      guestEmail: input.guestEmail,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
    });
    const nextDoc = createBookingDocument(input, orgId, roomMap, customerId);

    await db.collection<Booking>(BOOKINGS_COLLECTION).updateOne(
      { _id: bookingObjectId },
      {
        $set: {
          ...nextDoc,
          createdAt: old.createdAt,
          updatedAt: now,
        },
      },
    );

    const updated = await db.collection<Booking>(BOOKINGS_COLLECTION).findOne({
      _id: bookingObjectId,
    });
    if (!updated) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (updated.status !== "cancelled") {
      await applyBookingInventoryDeduction(updated);
    }

    if (sendEmailNotification) {
      queueBookingGuestEmailNotification({
        orgId,
        propertyId: propertyObjectId,
        previous: old,
        next: updated,
      });
    }

    return NextResponse.json({ booking: serializeBooking(updated) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update booking." },
      { status: 400 },
    );
  }
}
