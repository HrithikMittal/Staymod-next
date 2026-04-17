"use client";

import { OrganizationProfile } from "@clerk/nextjs";

import { organizationTeamProfileAppearance } from "@/components/global/organization-profile-appearance";

type OrganizationTeamPageProps = {
  propertyId: string;
};

export function OrganizationTeamPage({ propertyId }: OrganizationTeamPageProps) {
  const profilePath = `/${propertyId}/team`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Organization team members</h1>
        <p className="text-sm text-muted-foreground">
          Invite people to your organization, assign roles, and manage membership. Applies to all properties in this
          organization.
        </p>
      </div>
      <div className="organization-team-clerk-root flex min-h-[480px] w-full justify-center">
        <OrganizationProfile
          routing="path"
          path={profilePath}
          afterLeaveOrganizationUrl="/"
          appearance={organizationTeamProfileAppearance}
        />
      </div>
    </main>
  );
}
