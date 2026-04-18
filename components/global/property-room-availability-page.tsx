"use client";

import type { BookingListItem, CreateBookingPayload, ListBookingsResponse } from "@/api-clients/bookings";
import type { ListRoomsResponse } from "@/api-clients/rooms";
import { CreateBookingDialog } from "@/components/global/create-booking-dialog";
import { DateBookingsSheet } from "@/components/global/date-bookings-sheet";
import { RoomAvailabilityCell } from "@/components/global/room-availability-cell";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { toDateKeyLocal } from "@/components/ui/date-picker";
import { useApiQuery } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  groupAvailabilityRowsByListing,
  type AvailabilityUnitRow,
} from "@/components/global/group-availability-rows";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { defaultNightlyPrice } from "@/utils/room-nightly-price";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

type AvailabilityDay = {
  dateKey: string;
  isWeekend: boolean;
};

type RoomAvailabilityResponse = {
  from: string;
  to: string;
  days: AvailabilityDay[];
  rows: AvailabilityUnitRow[];
};

function formatRoomTypeLabel(type: string): string {
  return type.replace(/_/g, " ");
}

function formatDay(dateKey: string): { dow: string; date: string } {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  const dow = d.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }).toUpperCase();
  const date = d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return { dow, date };
}

function addOneDay(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function PropertyRoomAvailabilityPage() {
  const params = useParams();
  const propertyId = typeof params.id === "string" ? params.id : "";

  const initial = useMemo(() => {
    const today = new Date();
    const from = new Date(today);
    const to = new Date(today);
    from.setDate(today.getDate() - 7);
    to.setDate(today.getDate() + 7);
    return { from: toDateKeyLocal(from), to: toDateKeyLocal(to) };
  }, []);

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedRoomIdFilter, setSelectedRoomIdFilter] = useState<string | null>(null);
  const [quickBookingForm, setQuickBookingForm] = useState<Partial<CreateBookingPayload> | null>(null);
  const [editingBooking, setEditingBooking] = useState<BookingListItem | null>(null);
  const quickBookingOpen = quickBookingForm !== null || editingBooking !== null;
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [roomColumnWidth, setRoomColumnWidth] = useState(220);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    function apply() {
      setRoomColumnWidth(mq.matches ? 148 : 220);
    }
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const query = useApiQuery<RoomAvailabilityResponse>(
    ["room-availability", propertyId, from, to],
    `/api/properties/${propertyId}/room-availability?from=${from}&to=${to}`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const bookingsQuery = useApiQuery<ListBookingsResponse>(
    ["bookings", propertyId],
    `/api/properties/${propertyId}/bookings`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const roomsQuery = useApiQuery<ListRoomsResponse>(
    ["rooms", propertyId],
    `/api/properties/${propertyId}/rooms`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const groupedRows = useMemo(
    () => groupAvailabilityRowsByListing(query.data?.rows ?? []),
    [query.data?.rows],
  );

  const roomById = useMemo(() => {
    const m = new Map<string, NonNullable<ListRoomsResponse["rooms"]>[number]>();
    roomsQuery.data?.rooms.forEach((r) => m.set(r._id, r));
    return m;
  }, [roomsQuery.data?.rooms]);

  function openQuickBooking(roomId: string, dateKey: string, unitLabel: string) {
    setEditingBooking(null);
    const room = roomById.get(roomId);
    const configuredNumbers = (room?.roomNumbers ?? []).map((n) => n.trim()).filter(Boolean);
    const selectedNumber = configuredNumbers.includes(unitLabel) ? [unitLabel] : undefined;
    setQuickBookingForm({
      roomId,
      rooms: { [roomId]: { quantity: 1, roomNumbers: selectedNumber } },
      checkIn: dateKey,
      checkOut: addOneDay(dateKey),
      status: "confirmed",
    });
  }

  function openBookingsForCell(roomId: string, dateKey: string) {
    setSelectedRoomIdFilter(roomId);
    setSelectedDateKey(dateKey);
  }

  function openEditBookingFromSheet(booking: BookingListItem) {
    setSelectedDateKey(null);
    setSelectedRoomIdFilter(null);
    setQuickBookingForm(null);
    setEditingBooking(booking);
  }

  function extendRange(direction: "left" | "right") {
    if (direction === "left") {
      setFrom((prev) => addDays(prev, -14));
      return;
    }
    setTo((prev) => addDays(prev, 14));
  }

  function handleHorizontalScroll(el: HTMLDivElement | null) {
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const threshold = 2;
    setIsAtStart(scrollLeft <= threshold);
    setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - threshold);
  }

  function startRoomColumnResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = roomColumnWidth;
    const narrow = typeof window !== "undefined" && window.innerWidth < 768;
    const minWidth = narrow ? 120 : 200;
    const maxWidth = narrow ? 320 : 520;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.round(startWidth + (moveEvent.clientX - startX));
      setRoomColumnWidth(Math.max(minWidth, Math.min(maxWidth, nextWidth)));
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-3 pt-3 pb-10 sm:gap-6 sm:px-4 md:px-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Room availability</h1>
            <p className="text-xs text-muted-foreground sm:hidden">
              Swipe the grid horizontally to see all dates.
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-auto sm:max-w-[min(100%,26rem)]">
            <DateRangePicker
              from={from}
              to={to}
              onRangeChange={(nextFrom, nextTo) => {
                setFrom(nextFrom);
                setTo(nextTo);
              }}
              maxDays={62}
              className="w-full md:max-w-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm bg-emerald-600/15 ring-1 ring-emerald-600/20" />
            Available
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm bg-rose-600/15 ring-1 ring-rose-600/20" />
            Full
          </span>
          <span className="sm:inline">Weekend nights (Fri–Sat) highlighted.</span>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm sm:rounded-xl">
        {query.isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading room availability...</p>
        ) : query.isError ? (
          <p className="px-5 py-8 text-sm text-destructive">{query.error.message}</p>
        ) : (
          <>
            <div className="flex items-stretch gap-2 border-border/60 border-b bg-muted/25 p-2 sm:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-10 flex-1 gap-1 text-xs"
                aria-label="Load 14 earlier days"
                onClick={() => extendRange("left")}
                disabled={query.isLoading}
              >
                <ChevronLeftIcon className="size-4 shrink-0" />
                Earlier
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-10 flex-1 gap-1 text-xs"
                aria-label="Load 14 more days"
                onClick={() => extendRange("right")}
                disabled={query.isLoading}
              >
                Later
                <ChevronRightIcon className="size-4 shrink-0" />
              </Button>
            </div>
            <div
              className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
              ref={(el) => {
                handleHorizontalScroll(el);
              }}
              onScroll={(e) => handleHorizontalScroll(e.currentTarget)}
            >
              <table className="min-w-max border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 z-30 border-border/60 border-b border-r border-border bg-card px-2 py-2.5 text-left text-xs font-semibold shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] sm:px-4 sm:py-3 sm:text-sm dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.35)] relative"
                      style={{ width: roomColumnWidth, minWidth: roomColumnWidth }}
                    >
                      <div className="flex items-center justify-between gap-1 sm:gap-2">
                        <span className="leading-tight">Room / unit</span>
                        <div className="hidden items-center gap-1 md:flex">
                          {isAtStart ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label="Load 14 earlier days"
                              onClick={() => extendRange("left")}
                              disabled={query.isLoading}
                            >
                              <ChevronLeftIcon className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div
                        role="separator"
                        aria-label="Resize room column"
                        aria-orientation="vertical"
                        className="absolute top-0 right-0 hidden h-full w-2 cursor-col-resize touch-none md:block"
                        onPointerDown={startRoomColumnResize}
                      />
                    </th>
                    {query.data?.days.map((day, index, arr) => {
                      const formatted = formatDay(day.dateKey);
                      const isLast = index === arr.length - 1;
                      return (
                        <th
                          key={day.dateKey}
                          className={cn(
                            "min-w-[70px] border-border/60 border-b p-0 text-center sm:min-w-[84px]",
                            day.isWeekend ? "bg-amber-500/10" : "bg-muted/20",
                          )}
                        >
                          <div className="grid grid-cols-[1fr_auto] items-center gap-0.5 px-0.5 py-1.5 sm:gap-1 sm:px-1 sm:py-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRoomIdFilter(null);
                                setSelectedDateKey(day.dateKey);
                              }}
                              className={cn(
                                "hover:bg-muted/50 flex min-w-0 flex-col items-center rounded px-0.5 py-1 text-center transition-colors sm:px-1",
                                "focus-visible:ring-ring ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                              )}
                              aria-label={`View bookings for ${formatted.dow} ${formatted.date}`}
                            >
                              <span className="text-[9px] tracking-wider text-muted-foreground uppercase sm:text-[10px]">
                                {formatted.dow}
                              </span>
                              <span className="text-[11px] font-semibold text-foreground sm:text-xs">{formatted.date}</span>
                            </button>
                            {isLast && isAtEnd ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="hidden md:inline-flex"
                                aria-label="Load 14 more days"
                                onClick={() => extendRange("right")}
                                disabled={query.isLoading}
                              >
                                <ChevronRightIcon className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
              <tbody>
                {groupedRows.map((group) => (
                  <Fragment key={group.roomId}>
                    <tr className="bg-muted/35">
                      <td
                        className="sticky left-0 z-20 border-border/60 border-b border-r border-border bg-muted px-2 py-2 align-middle shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] sm:px-4 sm:py-2.5 dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.35)]"
                        style={{ width: roomColumnWidth, minWidth: roomColumnWidth }}
                      >
                        <p className="text-xs font-semibold leading-snug tracking-tight sm:text-sm">{group.listingName}</p>
                        <p className="mt-0.5 text-[10px] capitalize text-muted-foreground sm:text-[11px]">
                          {formatRoomTypeLabel(group.roomType)}
                        </p>
                      </td>
                      {query.data?.days.map((day) => {
                        const firstRow = group.unitRows[0];
                        const cell = firstRow?.cells.find((c) => c.dateKey === day.dateKey);
                        const room = roomById.get(group.roomId);
                        const basePrice =
                          room && cell ? defaultNightlyPrice(room, cell.dateKey) : null;
                        const formatted = formatDay(day.dateKey);
                        const dateLabel = `${formatted.dow} ${formatted.date}`;
                        return (
                          <td
                            key={`${group.roomId}-header-${day.dateKey}`}
                            className={cn(
                              "min-w-[70px] border-border/60 border-b px-1 py-1 align-middle sm:min-w-[84px] sm:px-1.5 sm:py-1.5",
                              day.isWeekend ? "bg-amber-500/[0.07]" : "bg-muted/25",
                            )}
                          >
                            {cell ? (
                              <RoomAvailabilityCell
                                variant="listing"
                                propertyId={propertyId}
                                roomId={group.roomId}
                                dateKey={cell.dateKey}
                                dateLabel={dateLabel}
                                price={cell.price}
                                priceIsOverride={Boolean(cell.priceIsOverride)}
                                basePrice={basePrice}
                              />
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                    {group.unitRows.map((row) => (
                      <tr key={row.rowId}>
                        <td
                          className="sticky left-0 z-20 border-border/60 border-b border-r border-border bg-card py-2 pr-2 pl-5 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] sm:py-2.5 sm:pr-3 sm:pl-8 dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.35)]"
                          style={{ width: roomColumnWidth, minWidth: roomColumnWidth }}
                        >
                          <p className="text-right text-[12px] font-medium text-foreground sm:text-[13px]">{row.unitLabel}</p>
                        </td>
                        {row.cells.map((cell) => (
                          <td
                            key={`${row.rowId}-${cell.dateKey}`}
                            className={cn(
                              "min-w-[70px] border-border/60 border-b px-1 py-1 align-middle sm:min-w-[84px] sm:px-1.5 sm:py-1.5",
                              cell.isFull ? "bg-rose-500/10" : "bg-emerald-500/8",
                            )}
                          >
                            <RoomAvailabilityCell
                              variant="unit"
                              isFull={cell.isFull}
                              onCreateBooking={
                                cell.isFull
                                  ? undefined
                                  : () => openQuickBooking(row.roomId, cell.dateKey, row.unitLabel)
                              }
                              onViewBookings={
                                cell.isFull ? () => openBookingsForCell(row.roomId, cell.dateKey) : undefined
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </section>

      <DateBookingsSheet
        open={selectedDateKey !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDateKey(null);
            setSelectedRoomIdFilter(null);
          }
        }}
        dateKey={selectedDateKey}
        roomIdFilter={selectedRoomIdFilter}
        onRoomIdFilterChange={setSelectedRoomIdFilter}
        onEditBooking={openEditBookingFromSheet}
        propertyId={propertyId}
        bookings={bookingsQuery.data?.bookings ?? []}
        bookingsLoading={bookingsQuery.isLoading}
        bookingsError={bookingsQuery.isError ? bookingsQuery.error : null}
        rooms={roomsQuery.data?.rooms}
      />

      {propertyId ? (
        <CreateBookingDialog
          propertyId={propertyId}
          rooms={roomsQuery.data?.rooms ?? []}
          existingBookings={bookingsQuery.data?.bookings ?? []}
          roomsLoading={roomsQuery.isLoading}
          open={quickBookingOpen}
          booking={editingBooking}
          initialFormOverride={quickBookingForm}
          onOpenChange={(open) => {
            if (!open) {
              setQuickBookingForm(null);
              setEditingBooking(null);
            }
          }}
        />
      ) : null}
    </main>
  );
}
