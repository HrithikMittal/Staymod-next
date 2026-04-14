import { PersistLastPropertyId } from "@/components/global/persist-last-property-id";
import { PropertySidebar } from "@/components/global/property-sidebar";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function PropertyLayout({ children, params }: LayoutProps) {
  const { id } = await params;

  return (
    <>
      <PersistLastPropertyId propertyId={id} />
      <div className="flex min-h-0 flex-1">
        <PropertySidebar propertyId={id} />
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
      </div>
    </>
  );
}
