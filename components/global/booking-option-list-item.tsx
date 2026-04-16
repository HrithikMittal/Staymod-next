"use client";

import type { BookingOptionItem } from "@/api-clients";
import { Button } from "@/components/ui/button";

type BookingOptionListItemProps = {
  bookingOption: BookingOptionItem;
  onEdit: (bookingOption: BookingOptionItem) => void;
  onDelete: (bookingOption: BookingOptionItem) => void;
};

function formatChargeBasis(
  appliesTo: BookingOptionItem["appliesTo"],
  frequency: BookingOptionItem["frequency"],
) {
  const applied = appliesTo === "user" ? "Per User" : "Per Room";
  const interval = frequency === "day" ? "Per Day" : "Per Booking";
  return `${applied} ${interval}`;
}

export function BookingOptionListItem({ bookingOption, onEdit, onDelete }: BookingOptionListItemProps) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-4 border-border/60 border-b px-5 py-4 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{bookingOption.name}</p>
          {!bookingOption.isActive ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              Inactive
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatChargeBasis(bookingOption.appliesTo, bookingOption.frequency)} · {bookingOption.pricePerUnit}
        </p>
        {bookingOption.description ? (
          <p className="text-xs text-muted-foreground">{bookingOption.description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => onEdit(bookingOption)}>
          Edit
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(bookingOption)}>
          Delete
        </Button>
      </div>
    </li>
  );
}
