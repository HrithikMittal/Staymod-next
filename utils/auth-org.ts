import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Active Clerk organization id for the current session, if any. */
export async function getActiveOrganizationId(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}

/** Use when the route needs both a signed-in user and an active organization. */
export async function requireActiveOrganization(): Promise<
  { ok: true; orgId: string } | { ok: false; response: NextResponse }
> {
  const { userId, orgId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }
  if (!orgId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Select an organization in the header to continue." },
        { status: 403 },
      ),
    };
  }
  return { ok: true, orgId };
}
