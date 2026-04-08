import { NextResponse } from "next/server";

import { getDb } from "@/utils/mongodb";

export async function GET() {
  let database: "up" | "down" | "not_configured" = "not_configured";

  if (process.env.MONGODB_URI) {
    try {
      const db = await getDb();
      await db.command({ ping: 1 });
      database = "up";
    } catch {
      database = "down";
    }
  }

  return NextResponse.json({
    ok: database !== "down",
    database,
  });
}
