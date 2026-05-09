import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import type { Booking } from "@/types/booking";
import type { Property } from "@/types/property";
import type { Room } from "@/types/room";
import { generateIcalFeed } from "@/utils/ical-formatter";
import { getDb } from "@/utils/mongodb";

/**
 * GET /api/public/ical/rooms/[roomId]/[token]
 *
 * Public iCal feed for a room. No authentication required; the token acts as the secret.
 * OTA platforms poll this endpoint to import bookings into their calendars.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string; token: string }> }
): Promise<NextResponse> {
  try {
    const { roomId, token } = await context.params;

    // Validate ObjectId format
    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json(
        { error: "Invalid room ID format" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const roomObjectId = new ObjectId(roomId);

    // Find room by ID and token (security check)
    const room = await db.collection<Room>("rooms").findOne({
      _id: roomObjectId,
      icalToken: token,
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found or invalid token" },
        { status: 404 }
      );
    }

    // Fetch property for calendar name
    const property = await db.collection<Property>("properties").findOne({
      _id: room.propertyId,
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Query bookings for this room: 6 months ago to 2 years future
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const twoYearsFuture = new Date(now);
    twoYearsFuture.setFullYear(twoYearsFuture.getFullYear() + 2);

    // Query for bookings that:
    // 1. Multi-room: have this room in the rooms map
    // 2. Legacy: have this roomId directly
    // 3. Only include confirmed, checked_in, and completed statuses (feed-eligible)
    // 4. Fall within our date range
    // Note: Consider adding a compound index on (orgId, propertyId, status) for query performance
    const bookings = await db
      .collection<Booking>("bookings")
      .find({
        orgId: room.orgId,
        propertyId: room.propertyId,
        $or: [
          // Multi-room bookings: check if roomId exists as a key in rooms map
          { [`rooms.${roomId}`]: { $exists: true } },
          // Legacy single-room bookings
          { roomId: roomObjectId },
        ],
        status: { $in: ["confirmed", "checked_in", "completed"] },
        // Check-out date is after 6 months ago (booking still relevant)
        checkOut: { $gte: sixMonthsAgo },
        // Check-in date is before 2 years future (don't include very far future bookings)
        checkIn: { $lte: twoYearsFuture },
      })
      .toArray();

    // Generate iCal feed
    const icalContent = generateIcalFeed(
      bookings,
      roomId,
      room.name,
      property.name
    );

    // Return with appropriate headers
    const filename = `${room.slug || roomId}-${property.slug || "calendar"}.ics`;

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error generating iCal feed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
