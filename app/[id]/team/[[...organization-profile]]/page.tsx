import { OrganizationTeamPage } from "@/components/global/organization-team-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyTeamRoute({ params }: PageProps) {
  const { id } = await params;
  return <OrganizationTeamPage propertyId={id} />;
}
