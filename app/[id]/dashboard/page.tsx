import { PersistLastPropertyId } from "@/components/global/persist-last-property-id";
import { PropertiesBackLink } from "@/components/global/properties-back-link";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyDashboardPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 md:px-8">
      <PersistLastPropertyId propertyId={id} />
      <div className="flex flex-col gap-1">
        <PropertiesBackLink />
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Property <span className="font-mono text-foreground">{id}</span>
        </p>
      </div>
    </main>
  );
}
