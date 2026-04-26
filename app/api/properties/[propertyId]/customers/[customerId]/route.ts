import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Booking } from "@/types/booking";
import { BOOKINGS_COLLECTION } from "@/types/booking";
import type { Customer } from "@/types/customer";
import { CUSTOMERS_COLLECTION } from "@/types/customer";
import type { Property } from "@/types/property";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { parsePropertyId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";

type RouteContext = {
  params: Promise<{ propertyId: string; customerId: string }>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function ensureEmail(value: unknown): string {
  if (typeof value !== "string") throw new Error("email is required.");
  const trimmed = value.trim();
  if (!trimmed) throw new Error("email is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("email must be valid.");
  }
  return trimmed;
}

function parseIdentityDocuments(value: unknown) {
  if (value == null) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("identityDocuments must be an array.");
  }
  return value.map((entry, idx) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`identityDocuments.${idx} must be an object.`);
    }
    const row = entry as Record<string, unknown>;
    const bookingId = typeof row.bookingId === "string" && ObjectId.isValid(row.bookingId)
      ? new ObjectId(row.bookingId)
      : null;
    if (!bookingId) {
      throw new Error(`identityDocuments.${idx}.bookingId must be a valid id.`);
    }
    const fileUrl = typeof row.fileUrl === "string" ? row.fileUrl.trim() : "";
    const fileKey = typeof row.fileKey === "string" ? row.fileKey.trim() : "";
    const fileName = typeof row.fileName === "string" ? row.fileName.trim() : "";
    const contentType = typeof row.contentType === "string" ? row.contentType.trim() : "";
    const source = typeof row.source === "string" ? row.source.trim() : "";
    if (!fileUrl || !fileKey || !fileName || !contentType) {
      throw new Error(`identityDocuments.${idx} is missing required file fields.`);
    }
    if (source !== "camera" && source !== "photo" && source !== "pdf") {
      throw new Error(`identityDocuments.${idx}.source must be camera, photo, or pdf.`);
    }
    const uploadedAtRaw = row.uploadedAt;
    const uploadedAt = uploadedAtRaw ? new Date(String(uploadedAtRaw)) : new Date();
    if (Number.isNaN(uploadedAt.getTime())) {
      throw new Error(`identityDocuments.${idx}.uploadedAt must be a valid date.`);
    }
    return {
      bookingId,
      fileUrl,
      fileKey,
      fileName,
      contentType,
      source,
      uploadedAt,
    };
  });
}

function serializeCustomer(c: Customer) {
  return {
    _id: c._id.toString(),
    propertyId: c.propertyId.toString(),
    orgId: c.orgId,
    email: c.email,
    name: c.name,
    phone: c.phone,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    lastBookingAt: c.lastBookingAt?.toISOString(),
    identityDocuments: (c.identityDocuments ?? []).map((doc) => ({
      bookingId: doc.bookingId.toString(),
      fileUrl: doc.fileUrl,
      fileKey: doc.fileKey,
      fileName: doc.fileName,
      contentType: doc.contentType,
      source: doc.source,
      uploadedAt: doc.uploadedAt.toISOString(),
    })),
  };
}

async function resolveContext(orgId: string, propertyIdParam: string, customerIdParam: string) {
  let propertyObjectId: ObjectId;
  let customerObjectId: ObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyIdParam);
    if (!ObjectId.isValid(customerIdParam)) throw new Error("Invalid customer id.");
    customerObjectId = new ObjectId(customerIdParam);
  } catch {
    return { error: NextResponse.json({ error: "Invalid id." }, { status: 400 }) };
  }

  const db = await getDb();
  const property = await db.collection<Property>(PROPERTIES_COLLECTION).findOne({
    _id: propertyObjectId,
    orgId,
  });
  if (!property) return { error: NextResponse.json({ error: "Property not found." }, { status: 404 }) };

  const customer = await db.collection<Customer>(CUSTOMERS_COLLECTION).findOne({
    _id: customerObjectId,
    orgId,
    propertyId: propertyObjectId,
  });
  if (!customer) return { error: NextResponse.json({ error: "Customer not found." }, { status: 404 }) };

  return { db, propertyObjectId, customerObjectId, customer };
}

export async function PATCH(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Organization is required." }, { status: 401 });

  const { propertyId, customerId } = await context.params;
  const resolved = await resolveContext(orgId, propertyId, customerId);
  if ("error" in resolved) return resolved.error;
  const { db, propertyObjectId, customerObjectId } = resolved;

  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const email = ensureEmail(payload.email);
    const emailNormalized = normalizeEmail(email);
    const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : undefined;
    const phone = typeof payload.phone === "string" && payload.phone.trim() ? payload.phone.trim() : undefined;
    const identityDocuments = parseIdentityDocuments(payload.identityDocuments);

    const duplicate = await db.collection<Customer>(CUSTOMERS_COLLECTION).findOne({
      _id: { $ne: customerObjectId },
      orgId,
      propertyId: propertyObjectId,
      emailNormalized,
    });
    if (duplicate) {
      return NextResponse.json({ error: "Customer with this email already exists." }, { status: 409 });
    }

    const now = new Date();
    const updateSet: Record<string, unknown> = {
      email,
      emailNormalized,
      name,
      phone,
      updatedAt: now,
    };
    if (identityDocuments !== undefined) {
      updateSet.identityDocuments = identityDocuments;
    }
    await db.collection<Customer>(CUSTOMERS_COLLECTION).updateOne(
      { _id: customerObjectId },
      { $set: updateSet },
    );
    const updated = await db.collection<Customer>(CUSTOMERS_COLLECTION).findOne({ _id: customerObjectId });
    if (!updated) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    return NextResponse.json({ customer: serializeCustomer(updated) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update customer." },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Organization is required." }, { status: 401 });

  const { propertyId, customerId } = await context.params;
  const resolved = await resolveContext(orgId, propertyId, customerId);
  if ("error" in resolved) return resolved.error;
  const { db, propertyObjectId, customerObjectId } = resolved;

  const linkedBookings = await db.collection<Booking>(BOOKINGS_COLLECTION).countDocuments({
    orgId,
    propertyId: propertyObjectId,
    customerId: customerObjectId,
  });
  if (linkedBookings > 0) {
    return NextResponse.json(
      { error: "Cannot delete customer linked to bookings." },
      { status: 409 },
    );
  }

  await db.collection<Customer>(CUSTOMERS_COLLECTION).deleteOne({ _id: customerObjectId });
  return NextResponse.json({ deleted: true });
}
