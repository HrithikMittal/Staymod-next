import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChooseOrganizationClient } from "@/components/global/session-tasks/choose-organization-client";

export const metadata: Metadata = {
  title: "Choose organization",
  description: "Select or create an organization to use Staymod.",
};

export default async function ChooseOrganizationPage() {
  // Pending sessions must be treated as signed-in on this route,
  // otherwise Clerk returns null userId and we incorrectly bounce to /sign-in.
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) {
    redirect("/sign-in");
  }

  return <ChooseOrganizationClient />;
}
