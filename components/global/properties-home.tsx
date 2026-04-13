"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ListPropertiesResponse } from "@/api-clients";
import { CreatePropertyDialog } from "@/components/global/create-property-dialog";
import { PropertiesEmptyState } from "@/components/global/properties/properties-empty-state";
import { PropertyListRow } from "@/components/global/properties/property-list-row";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks";
import { isNavigationReload, readLastPropertyId } from "@/utils/last-property-id";

function PropertiesListSkeleton() {
  return (
    <div className="flex flex-col gap-0 px-2 py-3">
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex items-center gap-4 px-3 py-3.5 sm:px-4">
          <div className="size-11 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-4 w-40 max-w-[60%] animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-56 max-w-[80%] animate-pulse rounded-md bg-muted/80" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PropertiesHome() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const propertiesQuery = useApiQuery<ListPropertiesResponse>(["properties"], "/api/properties");

  const count = propertiesQuery.data?.properties.length ?? 0;

  useEffect(() => {
    if (!isNavigationReload()) return;
    const id = readLastPropertyId()?.trim();
    if (!id) return;
    router.replace(`/${id}/dashboard`);
  }, [router]);

  return (
    <main className="relative flex min-h-0 flex-1 flex-col bg-gradient-to-b from-muted/45 via-background to-background">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 md:px-8">
        <header className="flex flex-col gap-6 border-b border-border/60 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-semibold leading-none tracking-tight">Properties</h1>
              {!propertiesQuery.isLoading && !propertiesQuery.isError ? (
                <span className="rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {count}
                </span>
              ) : null}
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Stays linked to your active organization.
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 self-start sm:self-auto"
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon data-icon="inline-start" />
            New property
          </Button>
        </header>

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_0_0_oklch(0_0_0_/0.03)]">
          {propertiesQuery.isLoading ? (
            <PropertiesListSkeleton />
          ) : propertiesQuery.isError ? (
            <p className="px-5 py-10 text-sm text-destructive">{propertiesQuery.error.message}</p>
          ) : count === 0 ? (
            <PropertiesEmptyState onAdd={() => setCreateOpen(true)} />
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-2.5 sm:px-5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Registry
                </span>
                <span className="text-[11px] text-muted-foreground">{count} total</span>
              </div>
              <div className="divide-y divide-border/80">
                {propertiesQuery.data?.properties.map((property) => (
                  <PropertyListRow key={property._id} property={property} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <CreatePropertyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </main>
  );
}
