"use client";

import Link from "next/link";

import type { PropertyListItem } from "@/api-clients";
import { writeLastPropertyId } from "@/utils/last-property-id";

type PropertyListRowProps = {
  property: PropertyListItem;
};

function formatLocation(property: PropertyListItem) {
  const { city, state, country } = property.address;
  return [city, state, country].filter(Boolean).join(", ");
}

export function PropertyListRow({ property }: PropertyListRowProps) {
  const initial = property.name.trim().charAt(0).toUpperCase() || "?";
  const href = `/${property._id}/dashboard`;

  return (
    <Link
      href={href}
      onClick={() => writeLastPropertyId(property._id)}
      className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-5"
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/12 to-primary/5 text-sm font-semibold text-primary tabular-nums"
        aria-hidden
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium leading-snug">{property.name}</p>
          <span className="shrink-0 rounded-md border border-border/80 bg-background px-2 py-0.5 text-xs capitalize text-muted-foreground sm:hidden">
            {property.type}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{formatLocation(property)}</p>
      </div>
      <span className="hidden shrink-0 rounded-md border border-border/80 bg-background px-2 py-0.5 text-xs capitalize text-muted-foreground sm:inline">
        {property.type}
      </span>
    </Link>
  );
}
