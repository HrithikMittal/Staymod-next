import { ObjectId } from "mongodb";

import type { Customer } from "@/types/customer";
import { CUSTOMERS_COLLECTION } from "@/types/customer";
import { getDb } from "@/utils/mongodb";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findOrCreateCustomerForBooking(args: {
  orgId: string;
  propertyId: ObjectId;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
}): Promise<ObjectId | undefined> {
  const rawEmail = args.guestEmail?.trim();
  if (!rawEmail) return undefined;
  const emailNormalized = normalizeEmail(rawEmail);
  if (!emailNormalized) return undefined;

  const db = await getDb();
  const existing = await db.collection<Customer>(CUSTOMERS_COLLECTION).findOne({
    orgId: args.orgId,
    propertyId: args.propertyId,
    emailNormalized,
  });
  const now = new Date();

  if (existing) {
    await db.collection<Customer>(CUSTOMERS_COLLECTION).updateOne(
      { _id: existing._id },
      {
        $set: {
          email: rawEmail,
          name: args.guestName?.trim() || existing.name,
          phone: args.guestPhone?.trim() || existing.phone,
          updatedAt: now,
          lastBookingAt: now,
        },
      },
    );
    return existing._id;
  }

  const doc: Omit<Customer, "_id"> = {
    orgId: args.orgId,
    propertyId: args.propertyId,
    email: rawEmail,
    emailNormalized,
    name: args.guestName?.trim() || undefined,
    phone: args.guestPhone?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    lastBookingAt: now,
  };
  const inserted = await db.collection<Omit<Customer, "_id">>(CUSTOMERS_COLLECTION).insertOne(doc);
  return inserted.insertedId;
}
