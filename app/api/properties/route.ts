import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import { requireActiveOrganization } from "@/utils/auth-org";
import { getDb } from "@/utils/mongodb";
import {
  createPropertyDocument,
  parseCreatePropertyInput,
} from "@/utils/schemas/property";

const PROPERTIES_COLLECTION = "properties";

export async function GET() {
  const org = await requireActiveOrganization();
  if (!org.ok) return org.response;
  const { orgId } = org;

  const db = await getDb();
  const properties = await db
    .collection<Property>(PROPERTIES_COLLECTION)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ properties });
}

export async function POST(req: Request) {
  const org = await requireActiveOrganization();
  if (!org.ok) return org.response;
  const { orgId } = org;

  try {
    const payload = await req.json();
    const input = parseCreatePropertyInput(payload);
    const db = await getDb();

    const duplicate = await db.collection<Property>(PROPERTIES_COLLECTION).findOne({
      orgId,
      slug: input.slug,
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Property slug already exists in this organization." },
        { status: 409 },
      );
    }

    const property = createPropertyDocument(input, orgId);
    const insertResult = await db
      .collection<Omit<Property, "_id">>(PROPERTIES_COLLECTION)
      .insertOne(property);

    return NextResponse.json(
      {
        property: {
          ...property,
          _id: insertResult.insertedId,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create property.",
      },
      { status: 400 },
    );
  }
}
