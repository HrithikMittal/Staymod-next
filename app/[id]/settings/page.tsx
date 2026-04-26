import { PropertySettingsPage as PropertySettingsView } from "@/components/global/property-settings-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertySettingsPage({ params }: PageProps) {
  const { id } = await params;
  return <PropertySettingsView propertyId={id} />;
}
