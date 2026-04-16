"use client";

import type { BookingListItem, CreateBookingPayload } from "@/api-clients/bookings";
import { updateBooking } from "@/api-clients/bookings";
import type { RoomListItem } from "@/api-clients/rooms";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingIncludesUtcNight } from "@/utils/date-key";
import { CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

function formatSheetDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRange(checkIn: string, checkOut: string) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${a.toLocaleDateString(undefined, opts)} → ${b.toLocaleDateString(undefined, opts)}`;
}

function statusClass(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500";
    case "pending":
      return "bg-amber-500";
    case "cancelled":
      return "bg-muted-foreground/50";
    case "no_show":
      return "bg-rose-500";
    default:
      return "bg-muted-foreground/50";
  }
}

function roomSummaryForBooking(booking: BookingListItem, roomById: Map<string, RoomListItem>) {
  const entries = Object.entries(booking.rooms).map(([roomId, row]) => ({
    roomId,
    quantity: row.quantity,
  }));
  if (entries.length === 0) {
    return "Room";
  }
  return entries
    .map((entry) => {
      const room = roomById.get(entry.roomId);
      const label = room?.name ?? "Room";
      return entry.quantity > 1 ? `${label} ×${entry.quantity}` : label;
    })
    .join(", ");
}

function payloadFromBooking(booking: BookingListItem): CreateBookingPayload {
  return {
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    advanceAmount: booking.advanceAmount,
    status: "cancelled",
    rooms: Object.fromEntries(
      Object.entries(booking.rooms).map(([roomId, row]) => [
        roomId,
        { quantity: row.quantity, roomNumbers: row.roomNumbers },
      ]),
    ),
  };
}

type DateBookingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateKey: string | null;
  roomIdFilter?: string | null;
  onRoomIdFilterChange?: (roomId: string | null) => void;
  onEditBooking?: (booking: BookingListItem) => void;
  propertyId: string;
  bookings: BookingListItem[];
  bookingsLoading: boolean;
  bookingsError: Error | null;
  rooms: RoomListItem[] | undefined;
};

export function DateBookingsSheet({
  open,
  onOpenChange,
  dateKey,
  roomIdFilter = null,
  onRoomIdFilterChange,
  onEditBooking,
  propertyId,
  bookings,
  bookingsLoading,
  bookingsError,
  rooms,
}: DateBookingsSheetProps) {
  const queryClient = useQueryClient();
  const roomById = useMemo(() => {
    const m = new Map<string, RoomListItem>();
    rooms?.forEach((r) => m.set(r._id, r));
    return m;
  }, [rooms]);

  const forNight = useMemo(() => {
    if (!dateKey) {
      return [];
    }
    return bookings.filter((b) => {
      if (!bookingIncludesUtcNight(b.checkIn, b.checkOut, dateKey)) {
        return false;
      }
      if (!roomIdFilter) {
        return true;
      }
      return Boolean(b.rooms?.[roomIdFilter]);
    });
  }, [bookings, dateKey, roomIdFilter]);

  const sorted = useMemo(() => {
    return [...forNight].sort((a, b) => {
      if (a.status === "cancelled" && b.status !== "cancelled") {
        return 1;
      }
      if (a.status !== "cancelled" && b.status === "cancelled") {
        return -1;
      }
      return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
    });
  }, [forNight]);

  const title = dateKey ? formatSheetDate(dateKey) : "";
  const filterRoomName = roomIdFilter != null ? (roomById.get(roomIdFilter)?.name ?? "Selected room") : null;

  const cancelMutation = useMutation({
    mutationFn: async (booking: BookingListItem) =>
      updateBooking(propertyId, booking._id, payloadFromBooking(booking)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bookings", propertyId] });
      await queryClient.invalidateQueries({ queryKey: ["room-availability", propertyId] });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-border/60 border-b px-4 py-4 text-left">
          <SheetTitle>Bookings</SheetTitle>
          <SheetDescription className="text-foreground font-medium">{title}</SheetDescription>
          <div className="mt-3 flex items-center gap-2">
            <select
              value={roomIdFilter ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onRoomIdFilterChange?.(v ? v : null);
              }}
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              aria-label="Filter bookings by room"
            >
              <option value="">All rooms</option>
              {(rooms ?? []).map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => onRoomIdFilterChange?.(null)}
              disabled={!roomIdFilter}
            >
              Clear
            </Button>
          </div>
          {filterRoomName ? <p className="text-xs text-muted-foreground">Showing: {filterRoomName}</p> : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {bookingsLoading ? (
            <p className="text-muted-foreground text-sm">Loading bookings...</p>
          ) : bookingsError ? (
            <p className="text-destructive text-sm">{bookingsError.message}</p>
          ) : sorted.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bookings for this night.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sorted.map((booking) => {
                const summary = roomSummaryForBooking(booking, roomById);
                const statusLabel = booking.status.replace(/_/g, " ");
                return (
                  <li
                    key={booking._id}
                    className={cn(
                      "rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-sm",
                      booking.status === "cancelled" && "opacity-60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{booking.guestName}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => onEditBooking?.(booking)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          onClick={() => {
                            if (!window.confirm("Cancel this booking? This will free room availability.")) {
                              return;
                            }
                            cancelMutation.mutate(booking);
                          }}
                          disabled={booking.status === "cancelled" || cancelMutation.isPending}
                        >
                          {booking.status === "cancelled"
                            ? "Cancelled"
                            : cancelMutation.isPending && cancelMutation.variables?._id === booking._id
                              ? "Cancelling..."
                              : "Cancel"}
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{summary}</p>
                    <p className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 text-xs">
                      <CalendarIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
                      {formatRange(booking.checkIn, booking.checkOut)}
                    </p>
                    <span
                      className={cn(
                        "mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-medium capitalize",
                      )}
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", statusClass(booking.status))} />
                      {statusLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {cancelMutation.isError ? (
            <p className="text-destructive mt-3 text-sm">{cancelMutation.error.message}</p>
          ) : null}
        </div>

        <div className="border-border/60 border-t px-4 py-3">
          <Link
            href={`/${propertyId}/bookings`}
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            Open all bookings
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
