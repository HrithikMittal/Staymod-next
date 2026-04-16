import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Property } from "@/types/property";
import type { NightlyPricing } from "@/types/nightly-pricing";
import { NIGHTLY_PRICING_COLLECTION } from "@/types/nightly-pricing";
import type { Room } from "@/types/room";
import { getActiveOrganizationId } from "@/utils/auth-org";
import { isValidDateKey } from "@/utils/date-key";
import { getDb } from "@/utils/mongodb";
import { loadRoomTagsByIds } from "@/utils/room-tags-db";
import { parsePropertyId, parseRoomId } from "@/utils/schemas/room";
import { serializeRoomForApi } from "@/utils/serialize-room-api";

const PROPERTIES_COLLECTION = "properties";
const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ propertyId: string; roomId: string }>;
};

async function resolveContextOrError(orgId: string, propertyIdParam: string, roomIdParam: string) {
  let propertyObjectId: ObjectId;
  let roomObjectId: ObjectId;
  try {
    propertyObjectId = parsePropertyId(propertyIdParam);
    roomObjectId = parseRoomId(roomIdParam);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid id.";
    return { error: NextResponse.json({ error: message }, { status: 400 }) };
  }

  const db = await getDb();
  const property = await db
    .collection<Property>(PROPERTIES_COLLECTION)
    .findOne({ _id: propertyObjectId, orgId });

  if (!property) {
    return { error: NextResponse.json({ error: "Property not found." }, { status: 404 }) };
  }

  const room = await db.collection<Room>(ROOMS_COLLECTION).findOne({
    _id: roomObjectId,
    orgId,
    propertyId: propertyObjectId,
  });

  if (!room) {
    return { error: NextResponse.json({ error: "Room not found." }, { status: 404 }) };
  }

  return { db, propertyObjectId, roomObjectId, room };
}

/**
 * Set or clear a per-night price override for one calendar night (UTC date key).
 * Body: `{ dateKey: "YYYY-MM-DD", price: number | null }` — `null` removes the override.
 */
export async function PATCH(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, roomId } = await context.params;
  const resolved = await resolveContextOrError(orgId, propertyId, roomId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, propertyObjectId, roomObjectId } = resolved;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const dateKey = typeof body.dateKey === "string" ? body.dateKey.trim() : "";
  if (!isValidDateKey(dateKey)) {
    return NextResponse.json({ error: "dateKey must be YYYY-MM-DD." }, { status: 400 });
  }

  const priceRaw = body.price;
  const now = new Date();

  const pricingFilter = {
    orgId,
    propertyId: propertyObjectId,
    roomId: roomObjectId,
    dateKey,
  };

  if (priceRaw === null || priceRaw === undefined || priceRaw === "") {
    await db.collection<NightlyPricing>(NIGHTLY_PRICING_COLLECTION).deleteOne(pricingFilter);
    await db.collection<Room>(ROOMS_COLLECTION).updateOne(
      { _id: roomObjectId },
      {
        $unset: { [`dailyPriceOverrides.${dateKey}`]: "" },
        $set: { updatedAt: now },
      },
    );
  } else {
    const n = typeof priceRaw === "number" ? priceRaw : Number(priceRaw);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "price must be a non-negative number or null." }, { status: 400 });
    }
    await db.collection<NightlyPricing>(NIGHTLY_PRICING_COLLECTION).updateOne(
      pricingFilter,
      {
        $set: { amount: n, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    await db.collection<Room>(ROOMS_COLLECTION).updateOne(
      { _id: roomObjectId },
      {
        $unset: { [`dailyPriceOverrides.${dateKey}`]: "" },
        $set: { updatedAt: now },
      },
    );
  }

  const updated = await db.collection<Room>(ROOMS_COLLECTION).findOne({ _id: roomObjectId });
  if (!updated) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const updatedTagIds = [
    ...(updated.tagIds ?? []),
    ...((updated.roomImages ?? []).flatMap((img) => img.tagIds ?? [])),
  ];
  const tagsById = await loadRoomTagsByIds(db, orgId, propertyObjectId, updatedTagIds);
  return NextResponse.json({ room: serializeRoomForApi(updated, tagsById) });
}
