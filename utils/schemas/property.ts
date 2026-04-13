import {
  PROPERTY_TYPES,
  type CreatePropertyInput,
  type Property,
  type PropertyType,
} from "@/types/property";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

function ensurePropertyType(value: unknown): PropertyType {
  if (typeof value !== "string" || !PROPERTY_TYPES.includes(value as PropertyType)) {
    throw new Error(`type must be one of: ${PROPERTY_TYPES.join(", ")}.`);
  }
  return value as PropertyType;
}

function ensureTime(value: unknown, label: string): string {
  const time = ensureString(value, label);
  if (!TIME_REGEX.test(time)) {
    throw new Error(`${label} must be in HH:mm format.`);
  }
  return time;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function parseCreatePropertyInput(payload: unknown): CreatePropertyInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload.");
  }

  const input = payload as Record<string, unknown>;
  const address = (input.address as Record<string, unknown> | undefined) ?? {};

  const name = ensureString(input.name, "name");
  const slug = ensureOptionalString(input.slug) ?? slugify(name);
  if (!slug) {
    throw new Error("slug could not be generated from name.");
  }

  const amenitiesRaw = input.amenities;
  const amenities = Array.isArray(amenitiesRaw)
    ? amenitiesRaw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    name,
    slug,
    type: ensurePropertyType(input.type),
    description: ensureOptionalString(input.description),
    address: {
      line1: ensureString(address.line1, "address.line1"),
      line2: ensureOptionalString(address.line2),
      city: ensureString(address.city, "address.city"),
      state: ensureString(address.state, "address.state"),
      country: ensureString(address.country, "address.country"),
      postalCode: ensureString(address.postalCode, "address.postalCode"),
    },
    contact: {
      email: ensureOptionalString(input.contactEmail),
      phone: ensureOptionalString(input.contactPhone),
    },
    timezone: ensureOptionalString(input.timezone) ?? "UTC",
    currency: (ensureOptionalString(input.currency) ?? "INR").toUpperCase(),
    amenities,
    checkInTime: ensureTime(input.checkInTime ?? "14:00", "checkInTime"),
    checkOutTime: ensureTime(input.checkOutTime ?? "11:00", "checkOutTime"),
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
  };
}

export function createPropertyDocument(
  input: CreatePropertyInput,
  orgId: string,
): Omit<Property, "_id"> {
  const now = new Date();
  return {
    ...input,
    orgId,
    createdAt: now,
    updatedAt: now,
  };
}
