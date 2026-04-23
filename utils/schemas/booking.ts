import { ObjectId } from "mongodb";

import type {
  Booking,
  BookingCustomItem,
  BookingRoomsMap,
  BookingSelectedOption,
  BookingStatus,
  CreateBookingInput,
  CreateBookingRoomInput,
} from "@/types/booking";
import { BOOKING_STATUSES } from "@/types/booking";
import { BOOKING_OPTION_APPLIES_TO, BOOKING_OPTION_FREQUENCY } from "@/types/booking-option";
import type { Room } from "@/types/room";
import { parseRoomId } from "@/utils/schemas/room";

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

function ensureOptionalPositiveInt(value: unknown, label: string): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  return ensurePositiveInt(value, label);
}

function ensureNonNegativeNumber(value: unknown, label: string): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return n;
}

function ensureStringArray(value: unknown, label: string): string[] | undefined {
  if (value == null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array of strings.`);
  }
  const out = value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return out.length ? out : undefined;
}

function parseSelectedOptionsInput(input: Record<string, unknown>): BookingSelectedOption[] | undefined {
  const raw = input.selectedOptions;
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error("selectedOptions must be an array.");
  }
  const out = raw.map((entry, idx) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`selectedOptions.${idx} must be an object.`);
    }
    const row = entry as Record<string, unknown>;
    const bookingOptionIdRaw = row.bookingOptionId;
    if (typeof bookingOptionIdRaw !== "string" || !ObjectId.isValid(bookingOptionIdRaw)) {
      throw new Error(`selectedOptions.${idx}.bookingOptionId must be a valid id.`);
    }
    const appliesTo = row.appliesTo;
    if (typeof appliesTo !== "string" || !BOOKING_OPTION_APPLIES_TO.includes(appliesTo as never)) {
      throw new Error(`selectedOptions.${idx}.appliesTo must be one of: ${BOOKING_OPTION_APPLIES_TO.join(", ")}.`);
    }
    const frequency = row.frequency;
    if (typeof frequency !== "string" || !BOOKING_OPTION_FREQUENCY.includes(frequency as never)) {
      throw new Error(
        `selectedOptions.${idx}.frequency must be one of: ${BOOKING_OPTION_FREQUENCY.join(", ")}.`,
      );
    }
    return {
      bookingOptionId: new ObjectId(bookingOptionIdRaw),
      name: ensureString(row.name, `selectedOptions.${idx}.name`),
      appliesTo: appliesTo as (typeof BOOKING_OPTION_APPLIES_TO)[number],
      frequency: frequency as (typeof BOOKING_OPTION_FREQUENCY)[number],
      pricePerUnit: ensureNonNegativeNumber(row.pricePerUnit, `selectedOptions.${idx}.pricePerUnit`) ?? 0,
      quantity: ensurePositiveInt(row.quantity, `selectedOptions.${idx}.quantity`),
    } satisfies BookingSelectedOption;
  });
  return out.length > 0 ? out : undefined;
}

function parseCustomItemsInput(input: Record<string, unknown>): BookingCustomItem[] | undefined {
  const raw = input.customItems;
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error("customItems must be an array.");
  }
  const out = raw.map((entry, idx) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`customItems.${idx} must be an object.`);
    }
    const row = entry as Record<string, unknown>;
    return {
      name: ensureString(row.name, `customItems.${idx}.name`),
      amount: ensureNonNegativeNumber(row.amount, `customItems.${idx}.amount`) ?? 0,
    } satisfies BookingCustomItem;
  });
  return out.length > 0 ? out : undefined;
}

function parseRoomsInput(input: Record<string, unknown>): CreateBookingRoomInput[] {
  const rawRooms = input.rooms;

  if (rawRooms == null) {
    throw new Error("rooms is required.");
  }
  if (typeof rawRooms !== "object") {
    throw new Error("rooms must be an object or an array.");
  }

  /** Array form: `[{ "roomId": "...", "quantity": 2, "roomNumbers": ["101"] }]` (common for public APIs). */
  if (Array.isArray(rawRooms)) {
    if (rawRooms.length === 0) {
      throw new Error("rooms must include at least one room.");
    }
    return rawRooms.map((entry, idx) => {
      if (!entry || typeof entry !== "object") {
        throw new Error(`rooms.${idx} must be an object.`);
      }
      const row = entry as Record<string, unknown>;
      const roomIdRaw = row.roomId;
      if (typeof roomIdRaw !== "string" || !ObjectId.isValid(roomIdRaw)) {
        throw new Error(`rooms.${idx}.roomId must be a valid id.`);
      }
      return {
        roomId: parseRoomId(roomIdRaw),
        quantity: ensurePositiveInt(row.quantity, `rooms.${idx}.quantity`),
        roomNumbers: ensureStringArray(row.roomNumbers, `rooms.${idx}.roomNumbers`),
      } satisfies CreateBookingRoomInput;
    });
  }

  /** Map form: `{ "roomIdHex": { "quantity": 2 } }` (internal / legacy). */
  const entries = Object.entries(rawRooms as Record<string, unknown>);
  if (entries.length === 0) {
    throw new Error("rooms must include at least one room.");
  }
  return entries.map(([roomId, value]) => {
    if (!ObjectId.isValid(roomId)) {
      throw new Error(`rooms key "${roomId}" must be a valid room id.`);
    }
    if (!value || typeof value !== "object") {
      throw new Error("rooms map values must be objects.");
    }
    const v = value as Record<string, unknown>;
    return {
      roomId: parseRoomId(roomId),
      quantity: ensurePositiveInt(v.quantity, `rooms.${roomId}.quantity`),
      roomNumbers: ensureStringArray(v.roomNumbers, `rooms.${roomId}.roomNumbers`),
    } satisfies CreateBookingRoomInput;
  });
}

export function parseBookingId(value: unknown): ObjectId {
  if (typeof value !== "string" || !ObjectId.isValid(value)) {
    throw new Error("bookingId must be a valid id.");
  }
  return new ObjectId(value);
}

/** Validates JSON body; `propertyId` comes from the route, not the request body. */
export function parseCreateBookingBody(payload: unknown, propertyId: ObjectId): CreateBookingInput {
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
    propertyId,
    guestName: ensureString(input.guestName, "guestName"),
    guestEmail: ensureOptionalString(input.guestEmail),
    guestPhone: ensureOptionalString(input.guestPhone),
    specialRequests: ensureOptionalString(input.specialRequests),
    checkIn,
    checkOut,
    numberOfGuests: ensureOptionalPositiveInt(input.numberOfGuests, "numberOfGuests"),
    rooms: parseRoomsInput(input),
    selectedOptions: parseSelectedOptionsInput(input),
    customItems: parseCustomItemsInput(input),
    discount: ensureNonNegativeNumber(input.discount, "discount"),
    advanceAmount: ensureNonNegativeNumber(input.advanceAmount, "advanceAmount"),
    status: ensureBookingStatus(
      typeof input.status === "string" && input.status.trim() ? input.status : "pending",
    ),
  };
}

export function createBookingDocument(
  input: CreateBookingInput,
  orgId: string,
  roomMap: Record<string, Pick<Room, "type">>,
): Omit<Booking, "_id"> {
  const now = new Date();
  const rooms: BookingRoomsMap = Object.fromEntries(
    input.rooms.map((line) => {
      const roomId = line.roomId.toString();
      const room = roomMap[roomId];
      if (!room) {
        throw new Error("Room metadata missing while creating booking.");
      }
      return [
        roomId,
        {
          roomType: room.type,
          quantity: line.quantity,
          roomNumbers: line.roomNumbers,
        },
      ];
    }),
  );
  const first = input.rooms[0];
  const firstRoomType = roomMap[first.roomId.toString()]?.type;
  return {
    propertyId: input.propertyId,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    specialRequests: input.specialRequests,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    numberOfGuests: input.numberOfGuests,
    selectedOptions: input.selectedOptions,
    customItems: input.customItems,
    discount: input.discount,
    advanceAmount: input.advanceAmount,
    status: input.status,
    rooms,
    roomId: first?.roomId,
    roomType: firstRoomType,
    quantity: first?.quantity,
    orgId,
    createdAt: now,
    updatedAt: now,
  };
}
