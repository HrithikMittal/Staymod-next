import { NextResponse } from "next/server";

import type { Customer } from "@/types/customer";
import { CUSTOMERS_COLLECTION } from "@/types/customer";
import type { Property } from "@/types/property";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import { parsePropertyId } from "@/utils/schemas/room";

const PROPERTIES_COLLECTION = "properties";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

function ensureEmail(value: unknown): string {
  if (typeof value !== "string") throw new Error("email is required.");
  const trimmed = value.trim();
  if (!trimmed) throw new Error("email is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("email must be valid.");
  }
  return trimmed;
}

export async function GET(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId } = await context.params;
  let propertyObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyId);
  } catch {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  const db = await getDb();
  const property = await db.collection<Property>(PROPERTIES_COLLECTION).findOne({
    _id: propertyObjectId,
    orgId,
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const pageRaw = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "10", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 10;
  const query = (url.searchParams.get("q") ?? "").trim();

  const filters: Record<string, unknown> = { orgId, propertyId: propertyObjectId };
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filters.$or = [{ email: regex }, { name: regex }, { phone: regex }];
  }

  const total = await db.collection<Customer>(CUSTOMERS_COLLECTION).countDocuments(filters);
  const customers = await db
    .collection<Customer>(CUSTOMERS_COLLECTION)
    .find(filters)
    .sort({ lastBookingAt: -1, updatedAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return NextResponse.json({
    customers: customers.map(serializeCustomer),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}

export async function POST(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId } = await context.params;
  let propertyObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyId);
  } catch {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  const db = await getDb();
  const property = await db.collection<Property>(PROPERTIES_COLLECTION).findOne({
    _id: propertyObjectId,
    orgId,
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const email = ensureEmail(payload.email);
    const emailNormalized = normalizeEmail(email);
    const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : undefined;
    const phone = typeof payload.phone === "string" && payload.phone.trim() ? payload.phone.trim() : undefined;

    const exists = await db.collection<Customer>(CUSTOMERS_COLLECTION).findOne({
      orgId,
      propertyId: propertyObjectId,
      emailNormalized,
    });
    if (exists) {
      return NextResponse.json({ error: "Customer with this email already exists." }, { status: 409 });
    }

    const now = new Date();
    const doc: Omit<Customer, "_id"> = {
      orgId,
      propertyId: propertyObjectId,
      email,
      emailNormalized,
      name,
      phone,
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await db.collection<Omit<Customer, "_id">>(CUSTOMERS_COLLECTION).insertOne(doc);
    const created: Customer = { ...doc, _id: inserted.insertedId };
    return NextResponse.json({ customer: serializeCustomer(created) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create customer." },
      { status: 400 },
    );
  }
}
