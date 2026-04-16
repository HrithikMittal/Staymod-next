import { ObjectId } from "mongodb";

import {
  BOOKING_OPTION_APPLIES_TO,
  BOOKING_OPTION_FREQUENCY,
  type BookingOption,
  type BookingOptionAppliesTo,
  type BookingOptionFrequency,
  type CreateBookingOptionInput,
} from "@/types/booking-option";

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

function ensureAppliesTo(value: unknown): BookingOptionAppliesTo {
  if (typeof value !== "string" || !BOOKING_OPTION_APPLIES_TO.includes(value as BookingOptionAppliesTo)) {
    throw new Error(`appliesTo must be one of: ${BOOKING_OPTION_APPLIES_TO.join(", ")}.`);
  }
  return value as BookingOptionAppliesTo;
}

function ensureFrequency(value: unknown): BookingOptionFrequency {
  if (typeof value !== "string" || !BOOKING_OPTION_FREQUENCY.includes(value as BookingOptionFrequency)) {
    throw new Error(`frequency must be one of: ${BOOKING_OPTION_FREQUENCY.join(", ")}.`);
  }
  return value as BookingOptionFrequency;
}

function parseLegacyChargeBasis(value: unknown):
  | { appliesTo: BookingOptionAppliesTo; frequency: BookingOptionFrequency }
  | null {
  if (typeof value !== "string") {
    return null;
  }
  if (value === "per_user_per_day") {
    return { appliesTo: "user", frequency: "day" };
  }
  if (value === "per_room_per_day") {
    return { appliesTo: "room", frequency: "day" };
  }
  return null;
}

function ensurePrice(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("pricePerUnit must be a non-negative number.");
  }
  return n;
}

function ensureSortOrder(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error("sortOrder must be an integer.");
  }
  return n;
}

export function parseBookingOptionId(value: unknown): ObjectId {
  if (typeof value !== "string" || !ObjectId.isValid(value)) {
    throw new Error("bookingOptionId must be a valid id.");
  }
  return new ObjectId(value);
}

export function parseCreateBookingOptionInput(payload: unknown): CreateBookingOptionInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload.");
  }

  const input = payload as Record<string, unknown>;
  const legacy = parseLegacyChargeBasis(input.chargeBasis);
  return {
    name: ensureString(input.name, "name"),
    description: ensureOptionalString(input.description),
    appliesTo: legacy?.appliesTo ?? ensureAppliesTo(input.appliesTo),
    frequency: legacy?.frequency ?? ensureFrequency(input.frequency),
    pricePerUnit: ensurePrice(input.pricePerUnit),
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
    sortOrder: ensureSortOrder(input.sortOrder),
  };
}

export function createBookingOptionDocument(
  input: CreateBookingOptionInput,
  orgId: string,
  propertyId: ObjectId,
): Omit<BookingOption, "_id"> {
  const now = new Date();
  return {
    ...input,
    orgId,
    propertyId,
    createdAt: now,
    updatedAt: now,
  };
}
