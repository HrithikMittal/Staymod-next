"use client";

import { cn } from "@/lib/utils";
import type { BookingListItem } from "@/api-clients/bookings";
import { ChevronRightIcon } from "lucide-react";

// Booking with converted Date objects for calendar display
type BookingWithDates = Omit<BookingListItem, "checkIn" | "checkOut"> & {
  checkIn: Date;
  checkOut: Date;
};

type BookingCalendarEventProps = {
  booking: BookingWithDates;
  colStart: number;
  colEnd: number;
  row: number;
  truncatedStart?: boolean;
  truncatedEnd?: boolean;
  onClick: () => void;
};

/**
 * Get status color class for booking events.
 * Matches the color scheme from booking-list-item.tsx
 */
function getStatusColorClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/90 hover:bg-emerald-500 border-emerald-600";
    case "checked_in":
      return "bg-sky-500/90 hover:bg-sky-500 border-sky-600";
    case "completed":
      return "bg-indigo-500/90 hover:bg-indigo-500 border-indigo-600";
    case "pending":
      return "bg-amber-500/90 hover:bg-amber-500 border-amber-600";
    case "cancelled":
      return "bg-muted-foreground/30 hover:bg-muted-foreground/40 border-muted-foreground/50 line-through";
    case "no_show":
      return "bg-rose-500/90 hover:bg-rose-500 border-rose-600";
    default:
      return "bg-muted-foreground/30 hover:bg-muted-foreground/40 border-muted-foreground/50";
  }
}

/**
 * Get display name for booking status.
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case "checked_in":
      return "Checked In";
    case "no_show":
      return "No Show";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

/**
 * Individual booking event block displayed in the calendar grid.
 * Uses CSS Grid positioning and color-coded by status.
 */
export function BookingCalendarEvent({
  booking,
  colStart,
  colEnd,
  row,
  truncatedStart = false,
  truncatedEnd = false,
  onClick,
}: BookingCalendarEventProps) {
  // Get room summary for display
  const roomSummary = getRoomSummary(booking);

  // Determine if event is single-day or multi-day
  const duration = colEnd - colStart;
  const isCompact = duration === 1;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "pointer-events-auto group relative flex items-center gap-1 rounded border px-1.5 py-0.5 text-left text-xs font-medium text-white shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        getStatusColorClass(booking.status),
        isCompact && "flex-col items-start"
      )}
      style={{
        gridColumn: `${colStart} / ${colEnd}`,
        gridRow: row,
      }}
      title={`${booking.guestName} - ${roomSummary}\n${getStatusLabel(booking.status)}`}
    >
      {/* Truncation indicators */}
      {truncatedStart && (
        <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/50" aria-label="Continues from previous week" />
      )}
      {truncatedEnd && !isCompact && (
        <ChevronRightIcon className="absolute right-0.5 top-1/2 size-3 -translate-y-1/2 text-white/70" aria-label="Continues to next week" />
      )}

      {/* Event content */}
      <span className="truncate font-semibold">
        {booking.guestName}
      </span>
      {!isCompact && (
        <span className="truncate text-white/90">
          {roomSummary}
        </span>
      )}
    </button>
  );
}

/**
 * Generate room summary from booking data.
 * Handles multi-room format.
 */
function getRoomSummary(booking: BookingWithDates): string {
  if (booking.rooms && Object.keys(booking.rooms).length > 0) {
    // Multi-room format
    const roomEntries = Object.entries(booking.rooms);
    if (roomEntries.length === 1) {
      const [_, allocation] = roomEntries[0];
      if (allocation.roomNumbers && allocation.roomNumbers.length > 0) {
        return `Room ${allocation.roomNumbers.join(", ")}`;
      }
      return allocation.roomType.replace(/_/g, " ");
    } else {
      return `${roomEntries.length} rooms`;
    }
  }

  return "Room";
}
