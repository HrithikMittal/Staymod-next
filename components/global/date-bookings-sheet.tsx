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
import { useApiQuery } from "@/hooks";
import { bookingIncludesUtcNight, eachUtcNightDateKeysBetween } from "@/utils/date-key";
import { calculateBookingAmount, calculateNightsCount } from "@/utils/booking-pricing";
import type { AvailabilityUnitRow } from "@/components/global/group-availability-rows";
import { CalendarIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { defaultNightlyPrice } from "@/utils/room-nightly-price";

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

function formatMoney(value: number | undefined): string {
  return `Rs. ${(value ?? 0).toLocaleString()}`;
}

function formatDateKeyForNight(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isoDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function subtractOneDayDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function statusClass(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500";
    case "checked_in":
      return "bg-sky-500";
    case "completed":
      return "bg-indigo-500";
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

function bookingRoomUnits(booking: BookingListItem): number {
  return Object.values(booking.rooms).reduce((sum, row) => sum + Math.max(1, row.quantity || 1), 0);
}

function payloadFromBooking(booking: BookingListItem): CreateBookingPayload {
  return {
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    guestPhone: booking.guestPhone,
    specialRequests: booking.specialRequests,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    numberOfGuests: booking.numberOfGuests,
    selectedOptions: booking.selectedOptions,
    customItems: booking.customItems,
    discount: booking.discount,
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
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
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

  const expandedBooking = useMemo(() => {
    if (!expandedBookingId) return null;
    return sorted.find((b) => b._id === expandedBookingId) ?? null;
  }, [expandedBookingId, sorted]);

  type RoomAvailabilityPricingResponse = {
    from: string;
    to: string;
    days: { dateKey: string; isWeekend: boolean }[];
    rows: AvailabilityUnitRow[];
  };

  const expandedFromDateKey = expandedBooking ? isoDateOnly(expandedBooking.checkIn) : null;
  const expandedNightsCount = expandedBooking
    ? calculateNightsCount(expandedBooking.checkIn, expandedBooking.checkOut)
    : 0;
  const expandedToDateKey =
    expandedBooking && expandedNightsCount > 0 ? subtractOneDayDateKey(isoDateOnly(expandedBooking.checkOut)) : null;

  const expandedRoomAvailabilityPricingPath =
    expandedFromDateKey && expandedToDateKey
      ? `/api/properties/${propertyId}/room-availability?from=${expandedFromDateKey}&to=${expandedToDateKey}`
      : "";

  const expandedRoomAvailabilityPricingQuery = useApiQuery<RoomAvailabilityPricingResponse>(
    ["room-availability-pricing", propertyId, expandedFromDateKey, expandedToDateKey],
    expandedRoomAvailabilityPricingPath,
    undefined,
    { enabled: Boolean(open && expandedFromDateKey && expandedToDateKey && expandedRoomAvailabilityPricingPath) },
  );

  const nightlyPriceByRoomAndDateKey = useMemo(() => {
    const data = expandedRoomAvailabilityPricingQuery.data;
    if (!data) return null;
    const map = new Map<string, Map<string, number>>();
    for (const row of data.rows) {
      let inner = map.get(row.roomId);
      if (!inner) {
        inner = new Map<string, number>();
        map.set(row.roomId, inner);
      }
      for (const cell of row.cells) {
        if (cell.price != null) inner.set(cell.dateKey, cell.price);
      }
    }
    return map;
  }, [expandedRoomAvailabilityPricingQuery.data]);

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
                const nightsCount = calculateNightsCount(booking.checkIn, booking.checkOut);
                const nights = Math.max(1, nightsCount);
                const guests = Math.max(1, booking.numberOfGuests ?? 1);
                const roomUnits = bookingRoomUnits(booking);

                const roomSubtotalSingleGuestFallback = Object.entries(booking.rooms).reduce((sum, [roomId, row]) => {
                  const room = roomById.get(roomId);
                  return (
                    sum +
                    calculateBookingAmount(booking.checkIn, booking.checkOut, row.quantity, {
                      priceWeekday: room?.priceWeekday,
                      priceWeekend: room?.priceWeekend,
                    })
                  );
                }, 0);

                const roomTotalFallback = roomSubtotalSingleGuestFallback;
                const nightDateKeys = eachUtcNightDateKeysBetween(new Date(booking.checkIn), new Date(booking.checkOut));
                const roomNightlyTotalsFallback = nightDateKeys.map((dateKey) => {
                  return Object.entries(booking.rooms).reduce((sum, [roomId, row]) => {
                    const room = roomById.get(roomId);
                    const unitQty = Math.max(1, row.quantity || 1);
                    const base = room ? defaultNightlyPrice(room, dateKey) : null;
                    return sum + (base ?? 0) * unitQty;
                  }, 0);
                });

                const optionsTotal = (booking.selectedOptions ?? []).reduce(
                  (sum, opt) => sum + opt.pricePerUnit * opt.quantity * (opt.frequency === "day" ? nights : 1),
                  0,
                );
                const customTotal = (booking.customItems ?? []).reduce((sum, item) => sum + item.amount, 0);
                const discount = Math.max(0, booking.discount ?? 0);

                let roomTotal = roomTotalFallback;
                let roomNightlyTotals = roomNightlyTotalsFallback;
                let totalAmount = Math.max(0, roomTotalFallback + optionsTotal + customTotal - discount);

                if (expandedBookingId === booking._id && nightlyPriceByRoomAndDateKey) {
                  roomNightlyTotals = nightDateKeys.map((dateKey) => {
                    return Object.entries(booking.rooms).reduce((sum, [roomId, row]) => {
                      const room = roomById.get(roomId);
                      const unitQty = Math.max(1, row.quantity || 1);
                      const overridden = nightlyPriceByRoomAndDateKey.get(roomId)?.get(dateKey);
                      const base = room ? defaultNightlyPrice(room, dateKey) : null;
                      return sum + (overridden ?? base ?? 0) * unitQty;
                    }, 0);
                  });

                  roomTotal = roomNightlyTotals.reduce((sum, v) => sum + v, 0);
                  totalAmount = Math.max(0, roomTotal + optionsTotal + customTotal - discount);
                }
                return (
                  <li
                    key={booking._id}
                    className={cn(
                      "rounded-xl border border-border/70 bg-card px-3 py-3 text-sm shadow-sm",
                      booking.status === "cancelled" && "opacity-60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[1.05rem] font-semibold tracking-tight">{booking.guestName}</p>
                        <p className="text-muted-foreground mt-0.5 truncate">{summary}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          className="h-7"
                          onClick={() =>
                            setExpandedBookingId((prev) => (prev === booking._id ? null : booking._id))
                          }
                          aria-label={expandedBookingId === booking._id ? "Collapse details" : "Expand details"}
                        >
                          {expandedBookingId === booking._id ? (
                            <ChevronUpIcon className="size-4" />
                          ) : (
                            <ChevronDownIcon className="size-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="h-7"
                          onClick={() => onEditBooking?.(booking)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          className="h-7"
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
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                        <CalendarIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
                        {formatRange(booking.checkIn, booking.checkOut)}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-medium capitalize",
                        )}
                      >
                        <span className={cn("size-1.5 shrink-0 rounded-full", statusClass(booking.status))} />
                        {statusLabel}
                      </span>
                    </div>
                    {expandedBookingId === booking._id ? (
                      <div className="mt-3 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                        <div className="rounded-md border border-border/60 bg-background/70 p-2">
                          <p className="text-[11px] font-semibold text-foreground">Amount breakdown</p>
                          <table className="mt-1.5 w-full text-xs">
                            <tbody>
                              <tr>
                                <td className="py-0.5 text-muted-foreground">Nights</td>
                                <td className="py-0.5 text-right font-medium">{nights}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5 text-muted-foreground">Room units</td>
                                <td className="py-0.5 text-right font-medium">{roomUnits}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5 text-muted-foreground">Guests</td>
                                <td className="py-0.5 text-right font-medium">{guests}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5 text-muted-foreground">Room amount</td>
                                <td className="py-0.5 text-right font-medium">{formatMoney(roomTotal)}</td>
                              </tr>
                              {nightDateKeys.length > 0
                                ? nightDateKeys.map((dateKey, idx) => (
                                    <tr key={dateKey}>
                                      <td className="py-0.5 text-muted-foreground">{formatDateKeyForNight(dateKey)}</td>
                                      <td className="py-0.5 text-right font-medium">
                                        {formatMoney(roomNightlyTotals[idx] ?? 0)}
                                      </td>
                                    </tr>
                                  ))
                                : null}
                              <tr>
                                <td className="py-0.5 text-muted-foreground">Options + extras</td>
                                <td className="py-0.5 text-right font-medium">
                                  {formatMoney(optionsTotal + customTotal)}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-0.5 text-muted-foreground">Discount</td>
                                <td className="py-0.5 text-right font-medium">- {formatMoney(discount)}</td>
                              </tr>
                              <tr className="border-t border-border/60">
                                <td className="pt-1.5 font-semibold text-foreground">Total amount</td>
                                <td className="pt-1.5 text-right font-semibold text-foreground">
                                  {formatMoney(totalAmount)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Advance amount</p>
                          <p className="font-medium text-foreground">{formatMoney(booking.advanceAmount)}</p>
                        </div>
                        {(booking.selectedOptions ?? []).length > 0 ? (
                          <div>
                          <p className="text-muted-foreground">Booking options</p>
                            <ul className="mt-1 space-y-1">
                              {booking.selectedOptions!.map((opt, idx) => (
                                <li
                                  key={`${opt.bookingOptionId}-${idx}`}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span>
                                    {opt.name} × {opt.quantity}
                                  </span>
                                  <span className="font-medium">
                                    {formatMoney(
                                      opt.pricePerUnit *
                                        opt.quantity *
                                        (opt.frequency === "day" ? nights : 1),
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {(booking.customItems ?? []).length > 0 ? (
                          <div>
                          <p className="text-muted-foreground">Custom extras</p>
                            <ul className="mt-1 space-y-1">
                              {booking.customItems!.map((item, idx) => (
                                <li key={`${item.name}-${idx}`} className="flex items-center justify-between gap-2">
                                  <span>{item.name}</span>
                                  <span className="font-medium">{formatMoney(item.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
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
