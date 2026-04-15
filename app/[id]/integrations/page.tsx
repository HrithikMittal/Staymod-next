import { IntegrationsPage } from "@/components/global/integrations-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyIntegrationsRoute({ params }: PageProps) {
  const { id } = await params;
  return <IntegrationsPage propertyId={id} />;
}
