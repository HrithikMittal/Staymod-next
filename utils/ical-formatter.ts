import type { Booking } from "@/types/booking";

/** RFC 5545 recommends limiting text field length for compatibility */
const MAX_ICAL_TEXT_LENGTH = 1000;

/**
 * Format a Date to iCal date format (YYYYMMDD).
 * @param date - Date to format
 * @returns Date string in YYYYMMDD format
 */
export function formatIcalDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Format a Date to iCal timestamp format (YYYYMMDDTHHMMSSZ in UTC).
 * @param date - Date to format
 * @returns Timestamp string in YYYYMMDDTHHMMSSZ format
 */
export function formatIcalTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape text for iCal format per RFC 5545.
 * Escapes special characters: semicolons, commas, backslashes, and newlines.
 * Truncates at 1000 characters.
 * @param text - Text to escape
 * @returns Escaped and truncated text
 */
export function escapeIcalText(text: string | undefined): string {
  if (!text) return "";

  let escaped = text
    .replace(/\\/g, "\\\\")  // Backslash must be escaped first
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

  // Truncate at maximum length
  if (escaped.length > MAX_ICAL_TEXT_LENGTH) {
    escaped = escaped.substring(0, MAX_ICAL_TEXT_LENGTH) + " (truncated)";
  }

  return escaped;
}

/**
 * Build a multi-line description for a booking.
 * @param booking - Booking to describe
 * @param roomId - Room ID for this booking
 * @returns Multi-line description with guest details
 * @remarks Returns escaped newlines (\\n) suitable for embedding in iCal DESCRIPTION fields
 */
export function buildBookingDescription(booking: Booking, roomId: string): string {
  const lines: string[] = [
    "Booking Details:",
    `Guest: ${escapeIcalText(booking.guestName)}`,
  ];

  if (booking.guestEmail) {
    lines.push(`Email: ${escapeIcalText(booking.guestEmail)}`);
  }

  if (booking.guestPhone) {
    lines.push(`Phone: ${escapeIcalText(booking.guestPhone)}`);
  }

  if (booking.numberOfGuests) {
    lines.push(`Guests: ${booking.numberOfGuests}`);
  }

  // Extract room numbers from the booking.rooms map
  const roomAllocation = booking.rooms[roomId];
  if (roomAllocation?.roomNumbers && roomAllocation.roomNumbers.length > 0) {
    lines.push(`Room Numbers: ${roomAllocation.roomNumbers.join(", ")}`);
  }

  if (booking.specialRequests) {
    lines.push(`Special Requests: ${escapeIcalText(booking.specialRequests)}`);
  }

  lines.push(`Booking ID: ${booking._id.toString()}`);
  lines.push(`Room ID: ${roomId}`);

  return lines.join("\\n");
}

/**
 * Build a complete VEVENT block for a booking.
 * @param booking - Booking to convert
 * @param roomId - Room ID for this booking
 * @param now - Current timestamp for DTSTAMP
 * @returns Complete VEVENT block
 */
export function buildVEvent(booking: Booking, roomId: string, now: Date): string {
  const lines: string[] = ["BEGIN:VEVENT"];

  // UID: unique identifier (includes roomId to ensure uniqueness for multi-room bookings)
  lines.push(`UID:${booking._id.toString()}-${roomId}@staymod.app`);

  // DTSTAMP: timestamp when this event was created/updated
  lines.push(`DTSTAMP:${formatIcalTimestamp(now)}`);

  // DTSTART: check-in date (all-day event)
  lines.push(`DTSTART:${formatIcalDate(booking.checkIn)}`);

  // DTEND: check-out date (all-day event)
  lines.push(`DTEND:${formatIcalDate(booking.checkOut)}`);

  // SUMMARY: brief description
  lines.push(`SUMMARY:${escapeIcalText(booking.guestName)} - ${booking.status}`);

  // DESCRIPTION: detailed information
  lines.push(`DESCRIPTION:${buildBookingDescription(booking, roomId)}`);

  // STATUS: booking status mapped to iCal status
  const icalStatus = booking.status === "confirmed" || booking.status === "checked_in" || booking.status === "completed"
    ? "CONFIRMED"
    : "TENTATIVE";
  lines.push(`STATUS:${icalStatus}`);

  // TRANSP: show as busy
  lines.push("TRANSP:OPAQUE");

  lines.push("END:VEVENT");

  return lines.join("\r\n");
}

/**
 * Generate a complete iCal feed for bookings.
 * @param bookings - Array of bookings to include
 * @param roomId - Room ID for the feed
 * @param calendarName - Calendar name to display in X-WR-CALNAME header
 * @returns Complete VCALENDAR string
 */
export function generateIcalFeed(
  bookings: Booking[],
  roomId: string,
  calendarName: string
): string {
  const now = new Date();
  const lines: string[] = [];

  // Calendar header
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Staymod//Calendar Sync//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(`X-WR-CALNAME:${escapeIcalText(calendarName)}`);
  lines.push("X-WR-TIMEZONE:UTC");

  // Add events for each booking
  for (const booking of bookings) {
    // Only include confirmed, checked_in, or completed bookings
    if (["confirmed", "checked_in", "completed"].includes(booking.status)) {
      lines.push(buildVEvent(booking, roomId, now));
    }
  }

  // Calendar footer
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
