import { ObjectId } from "mongodb";

import {
  ROOM_STATUSES,
  ROOM_TYPES,
  type CreateRoomInput,
  type Room,
  type RoomStatus,
  type RoomType,
} from "@/types/room";

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

function ensureRoomType(value: unknown): RoomType {
  if (typeof value !== "string" || !ROOM_TYPES.includes(value as RoomType)) {
    throw new Error(`type must be one of: ${ROOM_TYPES.join(", ")}.`);
  }
  return value as RoomType;
}

function ensureRoomStatus(value: unknown): RoomStatus {
  if (typeof value !== "string" || !ROOM_STATUSES.includes(value as RoomStatus)) {
    throw new Error(`status must be one of: ${ROOM_STATUSES.join(", ")}.`);
  }
  return value as RoomStatus;
}

function ensurePositiveInt(value: unknown, label: string, fallback: number): number {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    throw new Error(`${label} must be a positive integer.`);
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

/** Optional non-negative price in property currency (major units). */
function ensureOptionalPrice(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return n;
}

function ensureAmenities(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function parsePropertyId(value: unknown): ObjectId {
  if (typeof value !== "string" || !ObjectId.isValid(value)) {
    throw new Error("propertyId must be a valid id.");
  }
  return new ObjectId(value);
}

/** Validates JSON body for creating a room (parent `propertyId` is enforced by the route handler). */
export function parseCreateRoomInput(payload: unknown): CreateRoomInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload.");
  }

  const input = payload as Record<string, unknown>;
  const name = ensureString(input.name, "name");
  const slug = ensureOptionalString(input.slug) ?? slugify(name);
  if (!slug) {
    throw new Error("slug could not be generated from name.");
  }

  const bedSize = ensureOptionalString(input.bedSize);
  const legacyBed = ensureOptionalString(input.bedSummary);

  return {
    name,
    slug,
    type: ensureRoomType(input.type),
    status: ensureRoomStatus(
      typeof input.status === "string" && input.status.trim() ? input.status : "active",
    ),
    tagline: ensureOptionalString(input.tagline),
    description: ensureOptionalString(input.description),
    floor: ensureOptionalString(input.floor),
    maxGuests: ensurePositiveInt(input.maxGuests, "maxGuests", 2),
    bedSize: bedSize ?? legacyBed,
    priceWeekday: ensureOptionalPrice(input.priceWeekday, "priceWeekday"),
    priceWeekend: ensureOptionalPrice(input.priceWeekend, "priceWeekend"),
    amenities: ensureAmenities(input.amenities),
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
    sortOrder: ensureSortOrder(input.sortOrder),
  };
}

export function createRoomDocument(
  input: CreateRoomInput,
  orgId: string,
  propertyId: ObjectId,
): Omit<Room, "_id"> {
  const now = new Date();
  return {
    ...input,
    orgId,
    propertyId,
    createdAt: now,
    updatedAt: now,
  };
}
