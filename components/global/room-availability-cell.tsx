"use client";

import { updateRoomDailyPrice } from "@/api-clients/rooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

function formatMoney(value: number | null): string {
  if (value == null) {
    return "--";
  }
  return `Rs. ${value.toLocaleString()}`;
}

export type RoomAvailabilityCellProps =
  | {
      variant: "listing";
      propertyId: string;
      roomId: string;
      dateKey: string;
      dateLabel: string;
      price: number | null;
      priceIsOverride: boolean;
      basePrice: number | null;
    }
  | {
      variant: "unit";
      isFull: boolean;
      onCreateBooking?: () => void;
      onViewBookings?: () => void;
    };

/** Nightly rate + edit popover — use on the room listing header row only. */
function ListingPriceCell({
  propertyId,
  roomId,
  dateKey,
  dateLabel,
  price,
  priceIsOverride,
  basePrice,
}: {
  propertyId: string;
  roomId: string;
  dateKey: string;
  dateLabel: string;
  price: number | null;
  priceIsOverride: boolean;
  basePrice: number | null;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      if (price != null) {
        setAmount(String(Math.round(price)));
      } else {
        setAmount("");
      }
    }
  }

  const mutation = useMutation({
    mutationFn: (payload: { dateKey: string; price: number | null }) =>
      updateRoomDailyPrice(propertyId, roomId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["room-availability", propertyId] });
      void queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
      setOpen(false);
    },
  });

  function handleSave() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0 || amount.trim() === "") {
      return;
    }
    mutation.mutate({ dateKey, price: Math.round(n) });
  }

  function handleClearOverride() {
    mutation.mutate({ dateKey, price: null });
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "mx-auto h-auto min-h-[44px] w-[68px] flex-col justify-center gap-0.5 p-1 font-normal whitespace-normal sm:min-h-[48px] sm:w-[76px] sm:p-1.5",
              "border-border/80 bg-muted/50 text-foreground shadow-sm hover:bg-muted/70 dark:hover:bg-muted/60",
              priceIsOverride && "ring-2 ring-amber-500/55 ring-offset-1 ring-offset-background",
            )}
          />
        }
      >
        <span className="text-[10px] font-medium text-muted-foreground">Rate</span>
        <span className="text-[11px] font-semibold tabular-nums">{formatMoney(price)}</span>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-1.5rem,20rem)] max-w-[calc(100vw-2rem)] p-3 sm:w-80" align="center">
        <PopoverTitle className="text-sm font-medium">Nightly rate · {dateLabel}</PopoverTitle>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Default (weekday/weekend):{" "}
          {basePrice != null ? `Rs. ${basePrice.toLocaleString()}` : "—"}
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`night-price-${roomId}-${dateKey}`} className="text-xs text-muted-foreground">
              Amount (Rs.)
            </Label>
            <Input
              id={`night-price-${roomId}-${dateKey}`}
              type="number"
              min={0}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={mutation.isPending}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={mutation.isPending} onClick={handleSave}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={mutation.isPending || !priceIsOverride}
              onClick={handleClearOverride}
            >
              Use default rate
            </Button>
          </div>
          {mutation.isError ? (
            <p className="text-destructive text-xs">{mutation.error.message}</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Free/Full only — use on unit (room number) rows. */
function UnitStatusBadge({
  isFull,
  onCreateBooking,
  onViewBookings,
}: {
  isFull: boolean;
  onCreateBooking?: () => void;
  onViewBookings?: () => void;
}) {
  const clickable = isFull ? Boolean(onViewBookings) : Boolean(onCreateBooking);
  const onClick = isFull ? onViewBookings : onCreateBooking;
  const title = isFull ? "View bookings" : "Create booking";
  const Comp = clickable ? Button : "div";
  return (
    <Comp
      {...(clickable
        ? {
            type: "button" as const,
            variant: "ghost" as const,
            onClick,
            title,
          }
        : {})}
      className={cn(
        "mx-auto flex min-h-[44px] w-[68px] flex-col items-center justify-center rounded-md border px-1 py-1.5 shadow-sm sm:min-h-[48px] sm:w-[76px] sm:px-1.5",
        clickable &&
          "cursor-pointer hover:brightness-[0.97] focus-visible:ring-ring ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        isFull
          ? "border-rose-300/80 bg-rose-100 text-rose-950 dark:border-rose-800 dark:bg-rose-950/90 dark:text-rose-50"
          : "border-emerald-300/80 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-50",
      )}
    >
      <span className="text-[11px] font-semibold tabular-nums tracking-tight">
        {isFull ? "Full" : "Free"}
      </span>
    </Comp>
  );
}

export function RoomAvailabilityCell(props: RoomAvailabilityCellProps) {
  if (props.variant === "unit") {
    return (
      <UnitStatusBadge
        isFull={props.isFull}
        onCreateBooking={props.onCreateBooking}
        onViewBookings={props.onViewBookings}
      />
    );
  }
  return (
    <ListingPriceCell
      propertyId={props.propertyId}
      roomId={props.roomId}
      dateKey={props.dateKey}
      dateLabel={props.dateLabel}
      price={props.price}
      priceIsOverride={props.priceIsOverride}
      basePrice={props.basePrice}
    />
  );
}
