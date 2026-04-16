import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import type { Room } from "@/types/room";
import { getDb } from "@/utils/mongodb";
import { requirePublicApiAuth } from "@/utils/public-api-auth";
import {
  applyBookingInventoryDeduction,
  assertAvailabilityForBooking,
} from "@/utils/room-availability";
import { createBookingDocument, parseCreateBookingBody } from "@/utils/schemas/booking";
import { parsePropertyId } from "@/utils/schemas/room";

const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

function serializeBooking(b: Booking) {
  return {
    _id: b._id.toString(),
    orgId: b.orgId,
    propertyId: b.propertyId.toString(),
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    checkIn: b.checkIn.toISOString(),
    checkOut: b.checkOut.toISOString(),
    numberOfGuests: b.numberOfGuests,
    selectedOptions: b.selectedOptions?.map((o) => ({
      ...o,
      bookingOptionId: o.bookingOptionId.toString(),
    })),
    customItems: b.customItems,
    advanceAmount: b.advanceAmount,
    status: b.status,
    rooms: b.rooms,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
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

export async function POST(req: Request, context: RouteContext) {
  let propertyObjectId: ObjectId;
  try {
    const { propertyId } = await context.params;
    propertyObjectId = parsePropertyId(propertyId);
  } catch {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  const auth = await requirePublicApiAuth(req, "bookings:write", propertyObjectId);
  if (!auth.ok) return auth.response;
  const { orgId } = auth.value;

  const db = await getDb();

  try {
    const payload = await req.json();
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

      if (input.status !== "cancelled") {
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

    const doc = createBookingDocument(input, orgId, roomMap);
    const insertResult = await db.collection<Omit<Booking, "_id">>(BOOKINGS_COLLECTION).insertOne(doc);
    const created: Booking = { ...doc, _id: insertResult.insertedId };

    if (created.status !== "cancelled") {
      await applyBookingInventoryDeduction(created);
    }

    return NextResponse.json({ booking: serializeBooking(created) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create booking." },
      { status: 400 },
    );
  }
}
