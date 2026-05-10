import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/utils/mongodb";

/**
 * GET /api/properties/[propertyId]/inbound-stats
 *
 * Get statistics about inbound email processing for a property.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId } = await context.params;

    if (!ObjectId.isValid(propertyId)) {
      return NextResponse.json({ error: "Invalid property ID" }, { status: 400 });
    }

    const db = await getDb();
    const propertyObjectId = new ObjectId(propertyId);

    // Verify property belongs to organization
    const property = await db.collection("properties").findOne({
      _id: propertyObjectId,
      orgId,
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Count bookings imported from email (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const processedCount = await db.collection("bookings").countDocuments({
      propertyId: propertyObjectId,
      "externalReference.importedFrom": "email",
      "externalReference.importedAt": { $gte: thirtyDaysAgo },
    });

    // Count unprocessed emails (last 30 days)
    const unprocessedCount = await db.collection("unprocessedEmails").countDocuments({
      propertyId: propertyObjectId,
      receivedAt: { $gte: thirtyDaysAgo },
    });

    // Count failed imports (last 30 days)
    const failedCount = await db.collection("failedBookingImports").countDocuments({
      propertyId: propertyObjectId,
      receivedAt: { $gte: thirtyDaysAgo },
    });

    return NextResponse.json({
      processed: processedCount,
      pending: failedCount, // Failed imports that might need manual review
      failed: unprocessedCount, // Emails that weren't booking confirmations
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching inbound stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
