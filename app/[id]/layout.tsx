import { PersistLastPropertyId } from "@/components/global/persist-last-property-id";
import { PropertyMobileNav } from "@/components/global/property-mobile-nav";
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
      <div className="flex h-[100dvh] min-h-0 flex-1 overflow-hidden">
        <PropertySidebar propertyId={id} />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            {children}
          </div>
          <PropertyMobileNav propertyId={id} />
        </div>
      </div>
    </>
  );
}
