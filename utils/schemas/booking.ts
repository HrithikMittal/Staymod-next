import { ObjectId } from "mongodb";

import type { Booking, BookingStatus, CreateBookingInput } from "@/types/booking";
import { BOOKING_STATUSES } from "@/types/booking";
import type { Room } from "@/types/room";
import { parsePropertyId, parseRoomId } from "@/utils/schemas/room";

function ensureString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function ensureOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function ensureBookingStatus(value: unknown): BookingStatus {
  if (typeof value !== "string" || !BOOKING_STATUSES.includes(value as BookingStatus)) {
    throw new Error(`status must be one of: ${BOOKING_STATUSES.join(", ")}.`);
  }
  return value as BookingStatus;
}

function ensureDate(value: unknown, label: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d;
    }
  }
  throw new Error(`${label} must be a valid date.`);
}

function ensurePositiveInt(value: unknown, label: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return n;
}

/** Validates JSON body for creating a booking (`roomType` is filled from `Room` in the route). */
export function parseCreateBookingInput(payload: unknown): CreateBookingInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload.");
  }

  const input = payload as Record<string, unknown>;
  const checkIn = ensureDate(input.checkIn, "checkIn");
  const checkOut = ensureDate(input.checkOut, "checkOut");
  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new Error("checkOut must be after checkIn.");
  }

  return {
    propertyId: parsePropertyId(input.propertyId),
    roomId: parseRoomId(input.roomId),
    guestName: ensureString(input.guestName, "guestName"),
    guestEmail: ensureOptionalString(input.guestEmail),
    checkIn,
    checkOut,
    quantity: ensurePositiveInt(input.quantity, "quantity"),
    status: ensureBookingStatus(
      typeof input.status === "string" && input.status.trim() ? input.status : "pending",
    ),
  };
}

export function createBookingDocument(
  input: CreateBookingInput,
  orgId: string,
  room: Pick<Room, "type">,
): Omit<Booking, "_id"> {
  const now = new Date();
  return {
    ...input,
    orgId,
    roomType: room.type,
    createdAt: now,
    updatedAt: now,
  };
}
