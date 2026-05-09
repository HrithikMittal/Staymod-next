/**
 * Jest test suite for iCal formatter utility
 * Run with: npm test -- __tests__/utils/ical-formatter.test.ts
 */

import { ObjectId } from "mongodb";
import type { Booking } from "@/types/booking";
import {
  formatIcalDate,
  formatIcalTimestamp,
  escapeIcalText,
  buildBookingDescription,
  buildVEvent,
  generateIcalFeed,
} from "@/utils/ical-formatter";

// Use Jest globals directly (available in test environment)
const { describe, expect, test } = globalThis as {
  describe: typeof describe;
  expect: typeof expect;
  test: typeof test;
};

// Test data
const mockBooking: Booking = {
  _id: new ObjectId("507f1f77bcf86cd799439011"),
  orgId: "org_123",
  propertyId: new ObjectId("507f1f77bcf86cd799439012"),
  rooms: {
    "room_101": {
      roomType: "suite",
      quantity: 1,
      roomNumbers: ["101", "102"],
    },
  },
  guestName: "John Doe",
  guestEmail: "john@example.com",
  guestPhone: "+1234567890",
  specialRequests: "Late check-in; Extra towels",
  checkIn: new Date("2026-05-15T00:00:00Z"),
  checkOut: new Date("2026-05-17T00:00:00Z"),
  numberOfGuests: 2,
  status: "confirmed",
  createdAt: new Date("2026-05-01T00:00:00Z"),
  updatedAt: new Date("2026-05-01T00:00:00Z"),
};

describe("formatIcalDate", () => {
  test("formats date to YYYYMMDD", () => {
    expect(formatIcalDate(new Date("2026-05-15T14:30:00Z"))).toBe("20260515");
  });

  test("handles single-digit month and day", () => {
    expect(formatIcalDate(new Date("2026-01-01T00:00:00Z"))).toBe("20260101");
  });
});

describe("formatIcalTimestamp", () => {
  test("formats timestamp to YYYYMMDDTHHMMSSZ", () => {
    expect(formatIcalTimestamp(new Date("2026-05-15T14:30:45Z"))).toBe(
      "20260515T143045Z"
    );
  });

  test("handles single-digit values", () => {
    expect(formatIcalTimestamp(new Date("2026-01-01T01:02:03Z"))).toBe(
      "20260101T010203Z"
    );
  });
});

describe("escapeIcalText", () => {
  test("escapes semicolons", () => {
    expect(escapeIcalText("Hello; World")).toBe("Hello\\; World");
  });

  test("escapes commas", () => {
    expect(escapeIcalText("Hello, World")).toBe("Hello\\, World");
  });

  test("escapes backslashes", () => {
    expect(escapeIcalText("Hello\\World")).toBe("Hello\\\\World");
  });

  test("escapes newlines", () => {
    expect(escapeIcalText("Hello\nWorld")).toBe("Hello\\nWorld");
  });

  test("escapes multiple special characters", () => {
    expect(escapeIcalText("Hello; World, Test\\Line\nBreak")).toBe(
      "Hello\\; World\\, Test\\\\Line\\nBreak"
    );
  });

  test("handles undefined input", () => {
    expect(escapeIcalText(undefined)).toBe("");
  });

  test("truncates text at 1000 characters with suffix", () => {
    const longText = "a".repeat(1500);
    const escapedLong = escapeIcalText(longText);
    expect(escapedLong.length).toBe(1013); // 1000 + " (truncated)"
    expect(escapedLong.endsWith(" (truncated)")).toBe(true);
  });
});

describe("buildBookingDescription", () => {
  test("includes booking details header", () => {
    const description = buildBookingDescription(mockBooking, "room_101");
    expect(description).toContain("Booking Details:");
  });

  test("includes guest name", () => {
    const description = buildBookingDescription(mockBooking, "room_101");
    expect(description).toContain("Guest: John Doe");
  });

  test("includes guest email", () => {
    const description = buildBookingDescription(mockBooking, "room_101");
    expect(description).toContain("Email: john@example.com");
  });

  test("includes guest phone", () => {
    const description = buildBookingDescription(mockBooking, "room_101");
    expect(description).toContain("Phone: +1234567890");
  });

  test("includes number of guests", () => {
    const description = buildBookingDescription(mockBooking, "room_101");
    expect(description).toContain("Guests: 2");
  });

  test("includes room numbers", () => {
    const description = buildBookingDescription(mockBooking, "room_101");
    expect(description).toContain("Room Numbers: 101, 102");
  });

  test("includes and escapes special requests", () => {
    const description = buildBookingDescription(mockBooking, "room_101");
    expect(description).toContain("Special Requests: Late check-in\\; Extra towels");
  });

  test("includes booking ID", () => {
    const description = buildBookingDescription(mockBooking, "room_101");
    expect(description).toContain("Booking ID: 507f1f77bcf86cd799439011");
  });

  test("includes room ID", () => {
    const description = buildBookingDescription(mockBooking, "room_101");
    expect(description).toContain("Room ID: room_101");
  });

  test("handles booking without room numbers", () => {
    const bookingNoRoomNumbers = {
      ...mockBooking,
      rooms: {
        "room_101": {
          roomType: "suite" as const,
          quantity: 1,
        },
      },
    };
    const description = buildBookingDescription(bookingNoRoomNumbers, "room_101");
    expect(description).not.toContain("Room Numbers:");
  });
});

describe("buildVEvent", () => {
  const now = new Date("2026-05-09T12:00:00Z");

  test("starts with BEGIN:VEVENT", () => {
    const vevent = buildVEvent(mockBooking, "room_101", now);
    expect(vevent).toContain("BEGIN:VEVENT");
  });

  test("ends with END:VEVENT", () => {
    const vevent = buildVEvent(mockBooking, "room_101", now);
    expect(vevent).toContain("END:VEVENT");
  });

  test("includes unique UID with roomId", () => {
    const vevent = buildVEvent(mockBooking, "room_101", now);
    expect(vevent).toContain("UID:507f1f77bcf86cd799439011-room_101@staymod.app");
  });

  test("includes DTSTAMP", () => {
    const vevent = buildVEvent(mockBooking, "room_101", now);
    expect(vevent).toContain("DTSTAMP:20260509T120000Z");
  });

  test("includes check-in date without VALUE=DATE", () => {
    const vevent = buildVEvent(mockBooking, "room_101", now);
    expect(vevent).toContain("DTSTART:20260515");
    expect(vevent).not.toContain("DTSTART;VALUE=DATE:");
  });

  test("includes check-out date without VALUE=DATE", () => {
    const vevent = buildVEvent(mockBooking, "room_101", now);
    expect(vevent).toContain("DTEND:20260517");
    expect(vevent).not.toContain("DTEND;VALUE=DATE:");
  });

  test("includes summary", () => {
    const vevent = buildVEvent(mockBooking, "room_101", now);
    expect(vevent).toContain("SUMMARY:John Doe - confirmed");
  });

  test("includes confirmed status", () => {
    const vevent = buildVEvent(mockBooking, "room_101", now);
    expect(vevent).toContain("STATUS:CONFIRMED");
  });

  test("marks as busy", () => {
    const vevent = buildVEvent(mockBooking, "room_101", now);
    expect(vevent).toContain("TRANSP:OPAQUE");
  });

  test("maps checked_in to CONFIRMED status", () => {
    const checkedInBooking = { ...mockBooking, status: "checked_in" as const };
    const vevent = buildVEvent(checkedInBooking, "room_101", now);
    expect(vevent).toContain("STATUS:CONFIRMED");
  });

  test("maps completed to CONFIRMED status", () => {
    const completedBooking = { ...mockBooking, status: "completed" as const };
    const vevent = buildVEvent(completedBooking, "room_101", now);
    expect(vevent).toContain("STATUS:CONFIRMED");
  });

  test("maps pending to TENTATIVE status", () => {
    const pendingBooking = { ...mockBooking, status: "pending" as const };
    const vevent = buildVEvent(pendingBooking, "room_101", now);
    expect(vevent).toContain("STATUS:TENTATIVE");
  });
});

describe("generateIcalFeed", () => {
  const bookings = [mockBooking];

  test("starts with BEGIN:VCALENDAR", () => {
    const feed = generateIcalFeed(bookings, "room_101", "Deluxe Room 101 - Grand Hotel");
    expect(feed).toContain("BEGIN:VCALENDAR");
  });

  test("ends with END:VCALENDAR", () => {
    const feed = generateIcalFeed(bookings, "room_101", "Deluxe Room 101 - Grand Hotel");
    expect(feed).toContain("END:VCALENDAR");
  });

  test("includes version", () => {
    const feed = generateIcalFeed(bookings, "room_101", "Deluxe Room 101 - Grand Hotel");
    expect(feed).toContain("VERSION:2.0");
  });

  test("includes product ID without 'OTA'", () => {
    const feed = generateIcalFeed(bookings, "room_101", "Deluxe Room 101 - Grand Hotel");
    expect(feed).toContain("PRODID:-//Staymod//Calendar Sync//EN");
    expect(feed).not.toContain("OTA Calendar Sync");
  });

  test("includes calendar name", () => {
    const feed = generateIcalFeed(bookings, "room_101", "Deluxe Room 101 - Grand Hotel");
    expect(feed).toContain("X-WR-CALNAME:Deluxe Room 101 - Grand Hotel");
  });

  test("does not include X-WR-CALDESC", () => {
    const feed = generateIcalFeed(bookings, "room_101", "Deluxe Room 101 - Grand Hotel");
    expect(feed).not.toContain("X-WR-CALDESC:");
  });

  test("includes at least one event", () => {
    const feed = generateIcalFeed(bookings, "room_101", "Deluxe Room 101 - Grand Hotel");
    expect(feed).toContain("BEGIN:VEVENT");
  });

  test("excludes cancelled bookings", () => {
    const cancelledBooking = { ...mockBooking, status: "cancelled" as const };
    const feedWithCancelled = generateIcalFeed(
      [cancelledBooking],
      "room_101",
      "Deluxe Room 101 - Grand Hotel"
    );
    expect(feedWithCancelled).not.toContain("BEGIN:VEVENT");
  });

  test("includes confirmed bookings", () => {
    const feed = generateIcalFeed(bookings, "room_101", "Deluxe Room 101 - Grand Hotel");
    expect(feed).toContain("BEGIN:VEVENT");
  });

  test("includes checked_in bookings", () => {
    const checkedInBooking = { ...mockBooking, status: "checked_in" as const };
    const feed = generateIcalFeed(
      [checkedInBooking],
      "room_101",
      "Deluxe Room 101 - Grand Hotel"
    );
    expect(feed).toContain("BEGIN:VEVENT");
  });

  test("includes completed bookings", () => {
    const completedBooking = { ...mockBooking, status: "completed" as const };
    const feed = generateIcalFeed(
      [completedBooking],
      "room_101",
      "Deluxe Room 101 - Grand Hotel"
    );
    expect(feed).toContain("BEGIN:VEVENT");
  });
});
