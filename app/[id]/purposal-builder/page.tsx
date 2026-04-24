import { PropertyPurposalBuilderPage } from "@/components/global/property-purposal-builder-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyPurposalBuilderRoutePage({ params }: PageProps) {
  const { id } = await params;
  return <PropertyPurposalBuilderPage propertyId={id} />;
}
