"use client";

import { useState, useMemo } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, FilterIcon } from "lucide-react";

import type { BookingListItem } from "@/api-clients/bookings";
import type { RoomListItem } from "@/api-clients/rooms";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookingCalendarEvent } from "./booking-calendar-event";
import {
  getMonthWeeks,
  getBookingsInMonth,
  layoutBookingsForWeek,
  isDateInMonth,
} from "@/utils/calendar-layout";

type BookingStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";

type BookingsCalendarViewProps = {
  bookings: BookingListItem[];
  rooms: RoomListItem[];
  onSelectBooking: (bookingId: string) => void;
  onCreateBooking?: (date?: Date) => void;
  selectedRoomId?: string;
  selectedStatus?: BookingStatus;
  onRoomFilterChange?: (roomId: string | undefined) => void;
  onStatusFilterChange?: (status: BookingStatus | undefined) => void;
};

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Main calendar grid component that renders the month view of bookings.
 * Displays bookings as color-coded event blocks spanning check-in to check-out dates.
 */
export function BookingsCalendarView({
  bookings,
  rooms,
  onSelectBooking,
  onCreateBooking,
  selectedRoomId,
  selectedStatus,
  onRoomFilterChange,
  onStatusFilterChange,
}: BookingsCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigate months
  const goToPreviousMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Convert BookingListItem to format expected by calendar utilities
  const bookingsWithDates = useMemo(() => {
    return bookings.map(booking => ({
      ...booking,
      checkIn: new Date(booking.checkIn),
      checkOut: new Date(booking.checkOut),
    }));
  }, [bookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let filtered = bookingsWithDates;

    // Filter by room
    if (selectedRoomId) {
      filtered = filtered.filter(booking => {
        // Check multi-room format
        if (booking.rooms && booking.rooms[selectedRoomId]) {
          return true;
        }
        return false;
      });
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(booking => booking.status === selectedStatus);
    }

    return filtered;
  }, [bookingsWithDates, selectedRoomId, selectedStatus]);

  // Get bookings for current month
  const monthBookings = useMemo(
    () => getBookingsInMonth(filteredBookings, year, month),
    [filteredBookings, year, month]
  );

  // Generate weeks for calendar grid
  const weeks = useMemo(() => getMonthWeeks(year, month), [year, month]);

  // Get positioned bookings for each week
  const weeklyPositionedBookings = useMemo(() => {
    return weeks.map(week => layoutBookingsForWeek(monthBookings, week[0]));
  }, [weeks, monthBookings]);

  // Handle date cell click
  const handleDateClick = (date: Date) => {
    if (onCreateBooking) {
      onCreateBooking(date);
    }
  };

  // Current month display name
  const monthName = format(new Date(year, month, 1), "MMMM yyyy");

  // Get selected room name
  const selectedRoom = rooms.find(r => r._id === selectedRoomId);
  const roomFilterLabel = selectedRoom ? selectedRoom.name : "All Rooms";

  // Get selected status label
  const statusFilterLabel = selectedStatus
    ? selectedStatus.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "All Statuses";

  return (
    <div className="space-y-4">
      {/* Header with month navigation and filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeftIcon />
          </Button>
          <h3 className="min-w-[160px] text-center text-lg font-semibold text-foreground">
            {monthName}
          </h3>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Room Filter */}
          {onRoomFilterChange && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                <FilterIcon className="size-4" />
                <span>{roomFilterLabel}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRoomFilterChange(undefined)}>
                  All Rooms
                </DropdownMenuItem>
                {rooms.map(room => (
                  <DropdownMenuItem
                    key={room._id}
                    onClick={() => onRoomFilterChange(room._id)}
                  >
                    {room.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Status Filter */}
          {onStatusFilterChange && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                <FilterIcon className="size-4" />
                <span>{statusFilterLabel}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onStatusFilterChange(undefined)}>
                  All Statuses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusFilterChange("confirmed")}>
                  Confirmed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusFilterChange("checked_in")}>
                  Checked In
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusFilterChange("completed")}>
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusFilterChange("pending")}>
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusFilterChange("cancelled")}>
                  Cancelled
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusFilterChange("no_show")}>
                  No Show
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Booking count and legend */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {monthBookings.length} booking{monthBookings.length !== 1 ? "s" : ""} in {monthName}
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">Status:</span>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded bg-emerald-500" />
            <span className="text-muted-foreground">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded bg-sky-500" />
            <span className="text-muted-foreground">Checked In</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded bg-indigo-500" />
            <span className="text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded bg-amber-500" />
            <span className="text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded bg-muted-foreground/50" />
            <span className="text-muted-foreground">Cancelled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded bg-rose-500" />
            <span className="text-muted-foreground">No Show</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {DAY_HEADERS.map(day => (
              <div
                key={day}
                className="border-r border-border px-2 py-2 text-center text-xs font-semibold text-muted-foreground last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Week rows */}
          {weeks.map((week, weekIndex) => {
            const positionedBookings = weeklyPositionedBookings[weekIndex];
            const maxRow = positionedBookings.length > 0
              ? Math.max(...positionedBookings.map(p => p.row))
              : 0;

            return (
              <div
                key={weekIndex}
                className="relative grid grid-cols-7 border-b border-border last:border-b-0"
                style={{
                  minHeight: `${80 + maxRow * 28}px`, // Base height + rows for bookings
                }}
              >
                {/* Date cells */}
                {week.map((date, dayIndex) => {
                  const isCurrentMonth = isDateInMonth(date, year, month);
                  const isToday =
                    date.toDateString() === new Date().toDateString();

                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      onClick={() => handleDateClick(date)}
                      className="group relative border-r border-border p-2 text-left hover:bg-accent/50 last:border-r-0"
                      disabled={!onCreateBooking}
                    >
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full text-sm font-medium ${
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </button>
                  );
                })}

                {/* Booking events (positioned absolutely over the grid) */}
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="grid grid-cols-7 px-1 pt-8"
                    style={{
                      gridAutoRows: "24px",
                      height: "100%",
                    }}
                  >
                    {positionedBookings.map((positioned, index) => (
                      <BookingCalendarEvent
                        key={positioned.booking._id.toString() + index}
                        booking={positioned.booking}
                        colStart={positioned.colStart}
                        colEnd={positioned.colEnd}
                        row={positioned.row}
                        truncatedStart={positioned.truncatedStart}
                        truncatedEnd={positioned.truncatedEnd}
                        onClick={() => onSelectBooking(positioned.booking._id.toString())}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {monthBookings.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {bookings.length === 0
              ? `No bookings in ${monthName}. ${onCreateBooking ? "Click a date to create one." : ""}`
              : "No bookings match your filters. Try adjusting room or status filters."}
          </p>
        </div>
      )}
    </div>
  );
}
