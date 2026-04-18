import { ObjectId } from "mongodb";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import type { Room } from "@/types/room";
import { getDb } from "@/utils/mongodb";
import { serializePublicBooking } from "@/utils/public-booking-serialize";
import { publicApiJsonResponse, publicApiOptionsResponse } from "@/utils/public-api-cors";
import { queueBookingGuestEmailNotification } from "@/utils/booking-guest-email";
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

export async function OPTIONS(req: Request) {
  return publicApiOptionsResponse(req);
}

export async function GET(req: Request, context: RouteContext) {
  let propertyObjectId: ObjectId;
  try {
    const { propertyId } = await context.params;
    propertyObjectId = parsePropertyId(propertyId);
  } catch {
    return publicApiJsonResponse(req, { error: "Invalid property id." }, { status: 400 });
  }

  const auth = await requirePublicApiAuth(req, "bookings:read", propertyObjectId);
  if (!auth.ok) return auth.response;
  const { orgId } = auth.value;

  const guestEmail = new URL(req.url).searchParams.get("guestEmail")?.trim() ?? "";
  if (!guestEmail) {
    return publicApiJsonResponse(
      req,
      { error: "Query parameter guestEmail is required." },
      { status: 400 },
    );
  }

  const db = await getDb();
  const emailMatch = new RegExp(`^${escapeRegex(guestEmail)}$`, "i");
  const bookings = await db
    .collection<Booking>(BOOKINGS_COLLECTION)
    .find({
      orgId,
      propertyId: propertyObjectId,
      guestEmail: emailMatch,
    })
    .sort({ checkIn: -1, createdAt: -1 })
    .toArray();

  return publicApiJsonResponse(req, { bookings: bookings.map(serializePublicBooking) });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    return publicApiJsonResponse(req, { error: "Invalid property id." }, { status: 400 });
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
        return publicApiJsonResponse(
          req,
          {
            error: `quantity cannot exceed this room listing's unit count (${room.unitCount}) for "${room.name}".`,
          },
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

    queueBookingGuestEmailNotification({
      orgId,
      propertyId: propertyObjectId,
      previous: undefined,
      next: created,
    });

    return publicApiJsonResponse(req, { booking: serializePublicBooking(created) }, { status: 201 });
  } catch (error) {
    return publicApiJsonResponse(
      req,
      { error: error instanceof Error ? error.message : "Failed to create booking." },
      { status: 400 },
    );
  }
}
