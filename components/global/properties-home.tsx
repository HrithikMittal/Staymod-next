"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowRightIcon, PlusIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ListPropertiesResponse } from "@/api-clients";
import { HomeToolbar } from "@/components/global/home-toolbar";
import { CreatePropertyDialog } from "@/components/global/create-property-dialog";
import { PropertiesEmptyState } from "@/components/global/properties/properties-empty-state";
import { PropertyListRow } from "@/components/global/properties/property-list-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { useApiQuery } from "@/hooks";
import { ApiError } from "@/utils/api-fetch";
import { readLastPropertyId } from "@/utils/last-property-id";

function propertiesListErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.body) as { error?: string };
      if (typeof parsed.error === "string" && parsed.error.trim()) {
        return parsed.error;
      }
    } catch {
      // ignore
    }
    if (error.status === 403) {
      return "Select an organization in the header to load properties.";
    }
    if (error.status === 401) {
      return "Sign in to load properties.";
    }
  }
  return error.message;
}

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
  const { isLoaded, isSignedIn } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const propertiesQuery = useApiQuery<ListPropertiesResponse>(["properties"], "/api/properties");

  const count = propertiesQuery.data?.properties.length ?? 0;

  useEffect(() => {
    const id = readLastPropertyId()?.trim();
    if (!id) return;
    router.replace(`/${id}/dashboard`);
  }, [router]);

  // Hero for signed-out visitors
  if (isLoaded && !isSignedIn) {
    return (
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -top-32 left-1/2 size-[700px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]"
            style={{ animation: "glow-drift 14s ease-in-out infinite" }}
          />
          <div
            className="absolute bottom-1/4 right-0 size-[400px] rounded-full bg-primary/6 blur-[100px]"
            style={{ animation: "glow-drift 18s ease-in-out infinite reverse" }}
          />
        </div>
        <div className="dot-grid absolute inset-0 opacity-50" aria-hidden />

        <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10 md:px-8">
          <HomeToolbar />

          {/* Hero */}
          <div
            className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center"
            style={{ animation: "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              <ZapIcon className="size-3" />
              Property management, simplified
            </div>

            <div className="flex flex-col gap-4">
              <h1 className="max-w-2xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
                <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-transparent">
                  Smarter stays,
                </span>
                <br />
                <span className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                  simpler ops
                </span>
              </h1>
              <p className="mx-auto max-w-md text-base text-muted-foreground">
                Manage bookings, rooms, and teams across all your properties — from one dashboard.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className={buttonVariants({ size: "lg" })}
              >
                Get started free
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/sign-in"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Sign in
              </Link>
            </div>

            {/* Feature chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {["Booking management", "Room availability", "Team access", "Email notifications"].map((feat) => (
                <span
                  key={feat}
                  className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
                >
                  {feat}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-0 flex-1 flex-col bg-background">
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden />

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 md:px-8">
        <HomeToolbar />
        <header
          className="flex flex-col gap-6 border-b border-border/50 pb-8 sm:flex-row sm:items-end sm:justify-between"
          style={{ animation: "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-semibold leading-none tracking-tight">Properties</h1>
              {!propertiesQuery.isLoading && !propertiesQuery.isError ? (
                <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
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

        <section
          className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_0_0_1px_oklch(1_0_0_/_0.02),_0_8px_24px_oklch(0_0_0_/_0.3)]"
          style={{ animation: "fade-up 0.5s 0.08s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          {propertiesQuery.isLoading ? (
            <PropertiesListSkeleton />
          ) : propertiesQuery.isError ? (
            <p className="px-5 py-10 text-sm text-destructive">
              {propertiesListErrorMessage(propertiesQuery.error)}
            </p>
          ) : count === 0 ? (
            <PropertiesEmptyState onAdd={() => setCreateOpen(true)} />
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-2.5 sm:px-5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Registry
                </span>
                <span className="text-[11px] text-muted-foreground">{count} total</span>
              </div>
              <div className="divide-y divide-border/40">
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
