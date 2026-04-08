import "server-only";

import { auth } from "@clerk/nextjs/server";

/** Active Clerk organization id for the current session, if any. */
export async function getActiveOrganizationId(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}
