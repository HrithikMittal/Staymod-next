import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameMonth } from "date-fns";

import type { BookingListItem } from "@/api-clients/bookings";
import { eachUtcNightDateKeysBetween, formatDateKeyUtc } from "./date-key";

// Booking with converted Date objects
type BookingWithDates = Omit<BookingListItem, "checkIn" | "checkOut"> & {
  checkIn: Date;
  checkOut: Date;
};

/**
 * Generate weeks array for a given month.
 * Each week is an array of 7 dates (Sunday-Saturday).
 * Includes padding days from previous/next months to complete weeks.
 *
 * @param year - Year (e.g., 2026)
 * @param month - Month (0-11, where 0 = January)
 * @returns Array of weeks, where each week is an array of 7 Date objects
 */
export function getMonthWeeks(year: number, month: number): Date[][] {
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);

  // Get the calendar view bounds (start of first week to end of last week)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 0 = Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Get all days in the calendar view
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group into weeks of 7 days
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  return weeks;
}

/**
 * Check if a booking overlaps with a date range.
 * Uses half-open interval: checkIn is inclusive, checkOut is exclusive.
 *
 * @param checkIn - Booking check-in date
 * @param checkOut - Booking check-out date
 * @param rangeStart - Range start date (inclusive)
 * @param rangeEnd - Range end date (inclusive for this check)
 * @returns True if booking has any nights within the range
 */
export function isBookingInDateRange(
  checkIn: Date,
  checkOut: Date,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  // Booking ends before range starts OR booking starts after range ends
  if (checkOut <= rangeStart || checkIn > rangeEnd) {
    return false;
  }
  return true;
}

/**
 * Calculate CSS Grid column positions for a booking event within a week.
 *
 * @param checkIn - Booking check-in date
 * @param checkOut - Booking check-out date
 * @param weekStart - Start of the week (Sunday)
 * @returns Object with colStart (1-7), colEnd (2-8), and truncated flags
 */
export function getBookingGridPosition(
  checkIn: Date,
  checkOut: Date,
  weekStart: Date
): { colStart: number; colEnd: number; truncatedStart: boolean; truncatedEnd: boolean } {
  const weekEnd = addDays(weekStart, 6); // Saturday

  // Clamp booking to week boundaries
  const displayStart = checkIn < weekStart ? weekStart : checkIn;
  const displayEnd = checkOut > addDays(weekEnd, 1) ? addDays(weekEnd, 1) : checkOut;

  // Calculate day of week (0 = Sunday, 6 = Saturday)
  const startDayOfWeek = displayStart.getDay();
  // For end, we use the last night (checkOut - 1 day)
  const lastNight = addDays(displayEnd, -1);
  const endDayOfWeek = lastNight.getDay();

  // CSS Grid columns are 1-indexed
  // colStart: 1-7 (Sunday-Saturday)
  // colEnd: one past the last column (2-8)
  const colStart = startDayOfWeek + 1;
  const colEnd = endDayOfWeek + 2; // +1 for day of week, +1 for one-past-end

  return {
    colStart,
    colEnd,
    truncatedStart: checkIn < weekStart,
    truncatedEnd: checkOut > addDays(weekEnd, 1),
  };
}

/**
 * Positioned booking event within a week.
 */
export type PositionedBooking = {
  booking: BookingWithDates;
  row: number;
  colStart: number;
  colEnd: number;
  truncatedStart: boolean;
  truncatedEnd: boolean;
};

/**
 * Stack overlapping bookings into rows to avoid visual conflicts.
 * Uses a greedy algorithm to assign each booking to the first available row.
 *
 * @param bookings - Array of bookings that overlap with this week
 * @param weekStart - Start of the week (Sunday)
 * @returns Array of positioned bookings with row and column information
 */
export function layoutBookingsForWeek(
  bookings: BookingWithDates[],
  weekStart: Date
): PositionedBooking[] {
  const weekEnd = addDays(weekStart, 7); // One day past Saturday for exclusive bound

  // Filter bookings that actually overlap with this week
  const relevantBookings = bookings.filter(booking =>
    isBookingInDateRange(booking.checkIn, booking.checkOut, weekStart, addDays(weekEnd, -1))
  );

  // Sort by check-in date, then by duration (longer bookings first)
  const sortedBookings = [...relevantBookings].sort((a, b) => {
    const aStart = a.checkIn.getTime();
    const bStart = b.checkIn.getTime();
    if (aStart !== bStart) return aStart - bStart;

    // Longer bookings first (more days = lower time diff for checkOut - checkIn)
    const aDuration = a.checkOut.getTime() - a.checkIn.getTime();
    const bDuration = b.checkOut.getTime() - b.checkIn.getTime();
    return bDuration - aDuration;
  });

  const positioned: PositionedBooking[] = [];

  // Track which rows are occupied for each date key in this week
  // dateKey → Set<rowIndex>
  const occupiedRows = new Map<string, Set<number>>();

  for (const booking of sortedBookings) {
    // Get all date keys (nights) this booking occupies in this week
    const allBookingNights = eachUtcNightDateKeysBetween(
      booking.checkIn,
      booking.checkOut
    );

    // Filter to only nights in this week
    const weekNights = allBookingNights.filter(dateKey => {
      const nightDate = new Date(dateKey + "T00:00:00Z");
      return nightDate >= weekStart && nightDate < weekEnd;
    });

    if (weekNights.length === 0) continue; // Shouldn't happen due to filtering above

    // Find first available row
    let row = 0;
    while (true) {
      // Check if this row is occupied on any of the nights
      const hasConflict = weekNights.some(night => occupiedRows.get(night)?.has(row));
      if (!hasConflict) break;
      row++;
    }

    // Mark this row as occupied for all nights
    weekNights.forEach(night => {
      if (!occupiedRows.has(night)) {
        occupiedRows.set(night, new Set());
      }
      occupiedRows.get(night)!.add(row);
    });

    // Calculate grid position
    const position = getBookingGridPosition(booking.checkIn, booking.checkOut, weekStart);

    positioned.push({
      booking,
      row: row + 1, // CSS Grid rows are 1-indexed
      ...position,
    });
  }

  return positioned;
}

/**
 * Filter bookings to only those overlapping with a specific month.
 *
 * @param bookings - All bookings
 * @param year - Year
 * @param month - Month (0-11)
 * @returns Filtered bookings
 */
export function getBookingsInMonth(
  bookings: BookingWithDates[],
  year: number,
  month: number
): BookingWithDates[] {
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);

  return bookings.filter(booking =>
    isBookingInDateRange(booking.checkIn, booking.checkOut, monthStart, monthEnd)
  );
}

/**
 * Check if a date belongs to the target month.
 *
 * @param date - Date to check
 * @param year - Target year
 * @param month - Target month (0-11)
 * @returns True if date is in the same month
 */
export function isDateInMonth(date: Date, year: number, month: number): boolean {
  return isSameMonth(date, new Date(year, month, 1));
}
