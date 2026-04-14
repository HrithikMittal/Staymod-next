type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyRoomAvailabilityPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Room availability</h1>
        <p className="text-sm text-muted-foreground">
          Nightly inventory by room type — property <span className="font-mono text-foreground">{id}</span>
        </p>
      </div>
    </main>
  );
}
