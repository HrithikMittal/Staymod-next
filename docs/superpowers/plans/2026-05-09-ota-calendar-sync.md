# OTA Calendar Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable property managers to export Staymod bookings to OTA platforms (Airbnb, Booking.com, MakeMyTrip, Vrbo) via per-room iCal feeds with secure tokens.

**Architecture:** Add `icalToken` field to Room collection, create public iCal endpoint that queries bookings and formats as RFC 5545, extend Integrations page with calendar sync section showing copy-able feed URLs per room.

**Tech Stack:** Next.js 16 App Router, MongoDB, TanStack Query, shadcn/ui, react-toastify, RFC 5545 iCal format

---

## File Structure

**New files:**
- `utils/ical-formatter.ts` - iCal generation utility (format dates, escape text, build VCALENDAR)
- `app/api/public/ical/rooms/[roomId]/[token]/route.ts` - Public iCal feed endpoint
- `components/global/ota-calendar-sync-section.tsx` - UI section for Integrations page

**Modified files:**
- `types/room.ts` - Add `icalToken?:string` field
- `app/api/properties/[propertyId]/rooms/[roomId]/route.ts` - Handle `generateIcalToken` in PATCH
- `api-clients/rooms.ts` - Add `generateRoomIcalToken` function
- `components/global/integrations-page.tsx` - Add OTA calendar sync section

---

### Task 1: Add iCal token field to Room type

**Files:**
- Modify: `types/room.ts:97`

- [ ] **Step 1: Add icalToken field to Room type**

Open `/Users/adhikansh/Desktop/work/staymod/staymod/types/room.ts` and add the field after line 96 (after `sortOrder`):

```typescript
export type Room = OrganizationScope & {
  _id: ObjectId;
  // ... existing fields ...
  sortOrder: number;
  /** UUID v4 token for public iCal feed access. Generated on-demand. */
  icalToken?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

- [ ] **Step 2: Commit type change**

```bash
git add types/room.ts
git commit -m "feat(types): add icalToken field to Room type

Support OTA calendar sync via per-room iCal feed URLs.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Build iCal formatter utility

**Files:**
- Create: `utils/ical-formatter.ts`

- [ ] **Step 1: Write failing test for iCal date formatting**

Create `/Users/adhikansh/Desktop/work/staymod/staymod/__tests__/utils/ical-formatter.test.ts`:

```typescript
import { describe, expect, test } from "@jest/globals";
import { formatIcalDate } from "@/utils/ical-formatter";

describe("formatIcalDate", () => {
  test("formats Date to YYYYMMDD", () => {
    const date = new Date("2026-05-15T10:30:00Z");
    expect(formatIcalDate(date)).toBe("20260515");
  });

  test("handles single-digit month and day", () => {
    const date = new Date("2026-01-05T00:00:00Z");
    expect(formatIcalDate(date)).toBe("20260105");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: FAIL with "Cannot find module '@/utils/ical-formatter'"

- [ ] **Step 3: Implement formatIcalDate**

Create `/Users/adhikansh/Desktop/work/staymod/staymod/utils/ical-formatter.ts`:

```typescript
/**
 * Format a Date to iCal date string (YYYYMMDD).
 * @param date JavaScript Date object
 * @returns YYYYMMDD string (e.g. "20260515")
 */
export function formatIcalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: PASS

- [ ] **Step 5: Write failing test for iCal timestamp formatting**

Add to `__tests__/utils/ical-formatter.test.ts`:

```typescript
import { formatIcalTimestamp } from "@/utils/ical-formatter";

describe("formatIcalTimestamp", () => {
  test("formats Date to ISO 8601 UTC", () => {
    const date = new Date("2026-05-09T12:00:00Z");
    expect(formatIcalTimestamp(date)).toBe("20260509T120000Z");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: FAIL with "formatIcalTimestamp is not exported"

- [ ] **Step 7: Implement formatIcalTimestamp**

Add to `utils/ical-formatter.ts`:

```typescript
/**
 * Format a Date to iCal timestamp (ISO 8601 UTC format).
 * @param date JavaScript Date object
 * @returns YYYYMMDDTHHMMSSZ string (e.g. "20260509T120000Z")
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
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: PASS

- [ ] **Step 9: Write failing test for escaping iCal text**

Add to `__tests__/utils/ical-formatter.test.ts`:

```typescript
import { escapeIcalText } from "@/utils/ical-formatter";

describe("escapeIcalText", () => {
  test("escapes semicolons, commas, and backslashes", () => {
    expect(escapeIcalText("Room 101; Suite")).toBe("Room 101\\; Suite");
    expect(escapeIcalText("Guest: John, Jane")).toBe("Guest: John\\, Jane");
    expect(escapeIcalText("Path\\File")).toBe("Path\\\\File");
  });

  test("replaces newlines with \\n", () => {
    expect(escapeIcalText("Line 1\nLine 2")).toBe("Line 1\\nLine 2");
    expect(escapeIcalText("A\r\nB")).toBe("A\\nB");
  });

  test("handles empty and undefined", () => {
    expect(escapeIcalText("")).toBe("");
    expect(escapeIcalText(undefined)).toBe("");
  });

  test("truncates at 1000 characters", () => {
    const long = "a".repeat(1100);
    const result = escapeIcalText(long);
    expect(result.length).toBeLessThanOrEqual(1013); // 1000 + " (truncated)"
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: FAIL with "escapeIcalText is not exported"

- [ ] **Step 11: Implement escapeIcalText**

Add to `utils/ical-formatter.ts`:

```typescript
/**
 * Escape special characters for iCal text fields per RFC 5545.
 * Escapes: ; , \ and converts newlines to \n.
 * Truncates at 1000 characters.
 * @param text Input string or undefined
 * @returns Escaped string
 */
export function escapeIcalText(text: string | undefined): string {
  if (!text) return "";
  
  let escaped = text
    .replace(/\\/g, "\\\\")  // Backslash first
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
  
  if (escaped.length > 1000) {
    escaped = escaped.substring(0, 1000) + " (truncated)";
  }
  
  return escaped;
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: PASS

- [ ] **Step 13: Write failing test for booking description**

Add to `__tests__/utils/ical-formatter.test.ts`:

```typescript
import { buildBookingDescription } from "@/utils/ical-formatter";

describe("buildBookingDescription", () => {
  test("formats booking details", () => {
    const booking = {
      _id: "507f1f77bcf86cd799439011",
      guestName: "John Doe",
      guestPhone: "+1234567890",
      guestEmail: "john@example.com",
      numberOfGuests: 2,
      specialRequests: "Late check-in",
      rooms: {
        "room123": { roomType: "double", quantity: 1, roomNumbers: ["101"] }
      }
    };
    
    const result = buildBookingDescription(booking as any, "room123");
    expect(result).toContain("Guest: John Doe");
    expect(result).toContain("Phone: +1234567890");
    expect(result).toContain("Email: john@example.com");
    expect(result).toContain("Guests: 2");
    expect(result).toContain("Room Numbers: 101");
    expect(result).toContain("Special Requests: Late check-in");
    expect(result).toContain("Booking ID: 507f1f77bcf86cd799439011");
  });

  test("handles missing optional fields", () => {
    const booking = {
      _id: "507f1f77bcf86cd799439011",
      guestName: "Jane Smith",
      rooms: {
        "room456": { roomType: "single", quantity: 1 }
      }
    };
    
    const result = buildBookingDescription(booking as any, "room456");
    expect(result).toContain("Guest: Jane Smith");
    expect(result).not.toContain("Phone:");
    expect(result).not.toContain("Email:");
  });
});
```

- [ ] **Step 14: Run test to verify it fails**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: FAIL with "buildBookingDescription is not exported"

- [ ] **Step 15: Implement buildBookingDescription**

Add to `utils/ical-formatter.ts`:

```typescript
import type { Booking } from "@/types/booking";

/**
 * Build description field for iCal VEVENT from booking details.
 * @param booking Booking document
 * @param roomId Room ID this feed is for
 * @returns Multi-line description text
 */
export function buildBookingDescription(booking: Booking, roomId: string): string {
  const lines: string[] = ["Booking Details:"];
  
  lines.push(`Guest: ${booking.guestName}`);
  
  if (booking.guestPhone) {
    lines.push(`Phone: ${booking.guestPhone}`);
  }
  
  if (booking.guestEmail) {
    lines.push(`Email: ${booking.guestEmail}`);
  }
  
  if (booking.numberOfGuests) {
    lines.push(`Guests: ${booking.numberOfGuests}`);
  }
  
  const roomAllocation = booking.rooms?.[roomId];
  if (roomAllocation?.roomNumbers && roomAllocation.roomNumbers.length > 0) {
    lines.push(`Room Numbers: ${roomAllocation.roomNumbers.join(", ")}`);
  }
  
  if (booking.specialRequests) {
    lines.push(`Special Requests: ${booking.specialRequests}`);
  }
  
  lines.push(`Booking ID: ${booking._id.toString()}`);
  
  return lines.join("\\n");
}
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: PASS

- [ ] **Step 17: Write failing test for VEVENT generation**

Add to `__tests__/utils/ical-formatter.test.ts`:

```typescript
import { buildVEvent } from "@/utils/ical-formatter";
import { ObjectId } from "mongodb";

describe("buildVEvent", () => {
  test("generates complete VEVENT block", () => {
    const booking = {
      _id: new ObjectId("507f1f77bcf86cd799439011"),
      guestName: "John Doe",
      checkIn: new Date("2026-05-15T00:00:00Z"),
      checkOut: new Date("2026-05-18T00:00:00Z"),
      status: "confirmed" as const,
      rooms: {
        "room123": { roomType: "double", quantity: 1 }
      }
    };
    
    const now = new Date("2026-05-09T12:00:00Z");
    const result = buildVEvent(booking as any, "room123", now);
    
    expect(result).toContain("BEGIN:VEVENT");
    expect(result).toContain("UID:507f1f77bcf86cd799439011@staymod.app");
    expect(result).toContain("DTSTART:20260515");
    expect(result).toContain("DTEND:20260518");
    expect(result).toContain("DTSTAMP:20260509T120000Z");
    expect(result).toContain("SUMMARY:John Doe - confirmed");
    expect(result).toContain("STATUS:CONFIRMED");
    expect(result).toContain("TRANSP:OPAQUE");
    expect(result).toContain("END:VEVENT");
  });
});
```

- [ ] **Step 18: Run test to verify it fails**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: FAIL with "buildVEvent is not exported"

- [ ] **Step 19: Implement buildVEvent**

Add to `utils/ical-formatter.ts`:

```typescript
/**
 * Build a single VEVENT block for an iCal feed.
 * @param booking Booking document
 * @param roomId Room ID this feed is for
 * @param now Current timestamp for DTSTAMP
 * @returns VEVENT block as string
 */
export function buildVEvent(booking: Booking, roomId: string, now: Date): string {
  const uid = `${booking._id.toString()}@staymod.app`;
  const dtstart = formatIcalDate(booking.checkIn);
  const dtend = formatIcalDate(booking.checkOut);
  const dtstamp = formatIcalTimestamp(now);
  const summary = escapeIcalText(`${booking.guestName} - ${booking.status}`);
  const description = escapeIcalText(buildBookingDescription(booking, roomId));
  
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ].join("\r\n");
}
```

- [ ] **Step 20: Run test to verify it passes**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: PASS

- [ ] **Step 21: Write failing test for full calendar generation**

Add to `__tests__/utils/ical-formatter.test.ts`:

```typescript
import { generateIcalFeed } from "@/utils/ical-formatter";

describe("generateIcalFeed", () => {
  test("generates complete VCALENDAR with events", () => {
    const bookings = [
      {
        _id: new ObjectId("507f1f77bcf86cd799439011"),
        guestName: "John Doe",
        checkIn: new Date("2026-05-15"),
        checkOut: new Date("2026-05-18"),
        status: "confirmed" as const,
        rooms: {
          "room123": { roomType: "double", quantity: 1 }
        }
      },
      {
        _id: new ObjectId("507f1f77bcf86cd799439012"),
        guestName: "Jane Smith",
        checkIn: new Date("2026-05-20"),
        checkOut: new Date("2026-05-22"),
        status: "pending" as const,
        rooms: {
          "room123": { roomType: "double", quantity: 1 }
        }
      }
    ];
    
    const result = generateIcalFeed(bookings as any[], "room123", "Deluxe Room 101", "Sunset Villa");
    
    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("VERSION:2.0");
    expect(result).toContain("PRODID:-//Staymod//Calendar Sync//EN");
    expect(result).toContain("X-WR-CALNAME:Deluxe Room 101 - Sunset Villa");
    expect(result).toContain("CALSCALE:GREGORIAN");
    expect(result).toContain("METHOD:PUBLISH");
    expect(result).toContain("BEGIN:VEVENT");
    expect(result).toContain("John Doe");
    expect(result).toContain("Jane Smith");
    expect(result).toContain("END:VCALENDAR");
  });

  test("generates empty calendar with no bookings", () => {
    const result = generateIcalFeed([], "room123", "Empty Room", "Test Property");
    
    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("X-WR-CALNAME:Empty Room - Test Property");
    expect(result).not.toContain("BEGIN:VEVENT");
    expect(result).toContain("END:VCALENDAR");
  });
});
```

- [ ] **Step 22: Run test to verify it fails**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: FAIL with "generateIcalFeed is not exported"

- [ ] **Step 23: Implement generateIcalFeed**

Add to `utils/ical-formatter.ts`:

```typescript
/**
 * Generate a complete iCal feed (VCALENDAR) for a room's bookings.
 * @param bookings Array of bookings for this room
 * @param roomId Room ID (for multi-room booking filtering)
 * @param roomName Room display name
 * @param propertyName Property display name
 * @returns Complete iCal feed as string
 */
export function generateIcalFeed(
  bookings: Booking[],
  roomId: string,
  roomName: string,
  propertyName: string,
): string {
  const calendarName = escapeIcalText(`${roomName} - ${propertyName}`);
  const now = new Date();
  
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Staymod//Calendar Sync//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
    "X-WR-TIMEZONE:UTC",
  ].join("\r\n");
  
  const events = bookings.map(booking => buildVEvent(booking, roomId, now)).join("\r\n");
  
  const footer = "END:VCALENDAR";
  
  if (events) {
    return `${header}\r\n${events}\r\n${footer}`;
  } else {
    return `${header}\r\n${footer}`;
  }
}
```

- [ ] **Step 24: Run test to verify it passes**

Run: `npm test -- __tests__/utils/ical-formatter.test.ts`  
Expected: PASS

- [ ] **Step 25: Commit iCal formatter utility**

```bash
git add utils/ical-formatter.ts __tests__/utils/ical-formatter.test.ts
git commit -m "feat(utils): add iCal formatter for OTA calendar sync

Implements RFC 5545 compliant iCal generation:
- Date/timestamp formatting
- Text escaping (semicolons, commas, newlines)
- VEVENT building from booking data
- Full VCALENDAR feed generation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Create public iCal feed endpoint

**Files:**
- Create: `app/api/public/ical/rooms/[roomId]/[token]/route.ts`

- [ ] **Step 1: Create API route file**

Create `/Users/adhikansh/Desktop/work/staymod/staymod/app/api/public/ical/rooms/[roomId]/[token]/route.ts`:

```typescript
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { BOOKINGS_COLLECTION, type Booking } from "@/types/booking";
import type { Property } from "@/types/property";
import type { Room } from "@/types/room";
import { getDb } from "@/utils/mongodb";
import { generateIcalFeed } from "@/utils/ical-formatter";

const PROPERTIES_COLLECTION = "properties";
const ROOMS_COLLECTION = "rooms";

type RouteContext = {
  params: Promise<{ roomId: string; token: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { roomId, token } = await context.params;
  
  // Validate ObjectId format
  if (!ObjectId.isValid(roomId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  const roomObjectId = new ObjectId(roomId);
  const db = await getDb();
  
  // Find room and validate token
  const room = await db.collection<Room>(ROOMS_COLLECTION).findOne({
    _id: roomObjectId,
    icalToken: token,
  });
  
  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  // Fetch property for calendar name
  const property = await db.collection<Property>(PROPERTIES_COLLECTION).findOne({
    _id: room.propertyId,
  });
  
  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  // Query bookings for this room (6 months ago to 2 years future)
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
  
  // Find bookings where this room is allocated
  const bookings = await db
    .collection<Booking>(BOOKINGS_COLLECTION)
    .find({
      orgId: room.orgId,
      propertyId: room.propertyId,
      $or: [
        { [`rooms.${roomId}`]: { $exists: true } },  // Multi-room bookings
        { roomId: roomObjectId },  // Legacy single-room bookings
      ],
      status: { $nin: ["cancelled", "no_show"] },
      checkOut: { $gte: sixMonthsAgo },
      checkIn: { $lte: twoYearsFromNow },
    })
    .toArray();
  
  // Generate iCal feed
  const icalContent = generateIcalFeed(bookings, roomId, room.name, property.name);
  
  // Return with proper headers
  return new NextResponse(icalContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${room.slug || room.name}.ics"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
```

- [ ] **Step 2: Test endpoint returns 404 for invalid room**

Start dev server: `npm run dev`  
Test: `curl http://localhost:3000/api/public/ical/rooms/507f1f77bcf86cd799439011/invalid-token.ics`  
Expected: `{"error":"Not found"}` with 404 status

- [ ] **Step 3: Commit iCal endpoint**

```bash
git add app/api/public/ical/rooms/\[roomId\]/\[token\]/route.ts
git commit -m "feat(api): add public iCal feed endpoint

Returns RFC 5545 compliant iCal feed for room bookings.
- Token-based authentication (no Clerk session required)
- Queries bookings 6 months past to 2 years future
- Handles multi-room and legacy single-room bookings
- Returns 404 for invalid room/token (security)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Extend room PATCH endpoint to generate iCal tokens

**Files:**
- Modify: `app/api/properties/[propertyId]/rooms/[roomId]/route.ts:67-114`

- [ ] **Step 1: Add token generation logic to PATCH handler**

Open `/Users/adhikansh/Desktop/work/staymod/staymod/app/api/properties/[propertyId]/rooms/[roomId]/route.ts` and modify the PATCH handler. After line 68 (`const input = parseCreateRoomInput(payload);`), add:

```typescript
export async function PATCH(req: Request, context: RouteContext) {
  const orgId = await getActiveOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 401 });
  }

  const { propertyId, roomId } = await context.params;
  const resolved = await resolveContextOrError(orgId, propertyId, roomId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { db, propertyObjectId, roomObjectId, room } = resolved;

  try {
    const payload = await req.json();
    
    // Handle iCal token generation request
    if (payload.generateIcalToken === true) {
      const existingToken = room.icalToken;
      if (existingToken) {
        // Token already exists, return current room
        const tagsById = await loadRoomTagsByIds(db, orgId, propertyObjectId, room.tagIds ?? []);
        return NextResponse.json({ room: serializeRoomForApi(room, tagsById) });
      }
      
      // Generate new token
      const newToken = crypto.randomUUID();
      const now = new Date();
      await db.collection<Room>(ROOMS_COLLECTION).updateOne(
        { _id: roomObjectId },
        {
          $set: {
            icalToken: newToken,
            updatedAt: now,
          },
        },
      );
      
      const updated = await db.collection<Room>(ROOMS_COLLECTION).findOne({ _id: roomObjectId });
      if (!updated) {
        return NextResponse.json({ error: "Room not found." }, { status: 404 });
      }
      
      const tagsById = await loadRoomTagsByIds(db, orgId, propertyObjectId, updated.tagIds ?? []);
      return NextResponse.json({ room: serializeRoomForApi(updated, tagsById) });
    }
    
    // Existing room update logic continues below
    const input = parseCreateRoomInput(payload);
    // ... rest of existing PATCH logic
```

- [ ] **Step 2: Add crypto import at top of file**

Add to imports at top of file:

```typescript
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import crypto from "crypto";
```

- [ ] **Step 3: Test token generation (manual verification)**

Start dev server: `npm run dev`  
Note: Full test requires auth token and existing room - will verify in UI testing

- [ ] **Step 4: Commit token generation logic**

```bash
git add app/api/properties/\[propertyId\]/rooms/\[roomId\]/route.ts
git commit -m "feat(api): add iCal token generation to room PATCH

Handle generateIcalToken request field:
- Returns existing token if present (idempotent)
- Generates crypto.randomUUID() if missing
- Updates room document with token and timestamp

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Add API client function for token generation

**Files:**
- Modify: `api-clients/rooms.ts:127`

- [ ] **Step 1: Add generateRoomIcalToken function**

Add to end of `/Users/adhikansh/Desktop/work/staymod/staymod/api-clients/rooms.ts`:

```typescript
export function generateRoomIcalToken(propertyId: string, roomId: string) {
  return apiFetch<{ room: RoomListItem }>(`/api/properties/${propertyId}/rooms/${roomId}`, {
    method: "PATCH",
    json: { generateIcalToken: true },
  });
}
```

- [ ] **Step 2: Add icalToken field to RoomListItem type**

Modify RoomListItem type (around line 38):

```typescript
export type RoomListItem = {
  _id: string;
  propertyId: string;
  orgId: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  tagline?: string;
  description?: string;
  floor?: string;
  maxGuests: number;
  bedCount: number;
  unitCount: number;
  roomNumbers?: string[];
  bedSize?: string;
  bedSummary?: string;
  priceWeekday?: number;
  priceWeekend?: number;
  imageUrls?: string[];
  roomImages?: Array<{
    url: string;
    sortOrder: number;
    tagIds?: string[];
    tags?: Array<{ _id: string; name: string; slug: string }>;
  }>;
  tags?: Array<{ _id: string; name: string; slug: string }>;
  amenities: string[];
  isActive: boolean;
  sortOrder: number;
  icalToken?: string;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 3: Commit API client changes**

```bash
git add api-clients/rooms.ts
git commit -m "feat(api-clients): add generateRoomIcalToken function

Add client function and type support for iCal token generation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Build OTA Calendar Sync section component

**Files:**
- Create: `components/global/ota-calendar-sync-section.tsx`

- [ ] **Step 1: Create component file with structure**

Create `/Users/adhikansh/Desktop/work/staymod/staymod/components/global/ota-calendar-sync-section.tsx`:

```typescript
"use client";

import { useState, useSyncExternalStore } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "react-toastify";

import { fetchRooms, generateRoomIcalToken, type RoomListItem } from "@/api-clients/rooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useApiQuery } from "@/hooks";

type OtaCalendarSyncSectionProps = {
  propertyId: string;
};

function useOrigin(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
}

function RoomCalendarCard({
  room,
  propertyId,
  origin,
}: {
  room: RoomListItem;
  propertyId: string;
  origin: string;
}) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const generateTokenMutation = useMutation({
    mutationFn: () => generateRoomIcalToken(propertyId, room._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
      toast.success("iCal URL generated");
    },
    onError: () => {
      toast.error("Failed to generate iCal URL");
    },
  });

  const icalUrl = room.icalToken
    ? `${origin}/api/public/ical/rooms/${room._id}/${room.icalToken}.ics`
    : "";

  async function copyToClipboard() {
    if (!icalUrl) return;
    
    try {
      await navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
      const input = document.getElementById(`ical-url-${room._id}`) as HTMLInputElement;
      if (input) {
        input.select();
        toast.info("Please copy the selected URL");
      }
    }
  }

  const isGenerating = generateTokenMutation.isPending;
  const needsToken = !room.icalToken && !isGenerating;

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{room.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">{room.type}</p>
        </div>
        {room.icalToken && (
          <span className="shrink-0 text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Ready to use
          </span>
        )}
      </div>

      {needsToken ? (
        <Button
          type="button"
          size="sm"
          onClick={() => generateTokenMutation.mutate()}
          disabled={isGenerating}
        >
          Generate iCal URL
        </Button>
      ) : isGenerating ? (
        <p className="text-sm text-muted-foreground">Generating...</p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`ical-url-${room._id}`} className="text-xs">
            iCal Feed URL
          </Label>
          <div className="flex gap-2">
            <Input
              id={`ical-url-${room._id}`}
              value={icalUrl}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? (
                <CheckIcon data-icon="inline-start" />
              ) : (
                <CopyIcon data-icon="inline-start" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function OtaCalendarSyncSection({ propertyId }: OtaCalendarSyncSectionProps) {
  const origin = useOrigin();

  const roomsQuery = useApiQuery(
    ["rooms", propertyId],
    `/api/properties/${propertyId}/rooms`,
    fetchRooms,
    { enabled: Boolean(propertyId) },
  );

  const rooms = roomsQuery.data?.rooms ?? [];

  return (
    <section className="space-y-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="instructions" className="border-none">
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            ℹ️ How to use these calendar feeds
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Airbnb</p>
              <p>Settings → Availability → Calendar sync → Import calendar → Paste iCal URL</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Booking.com</p>
              <p>Property → Calendar → Sync calendars → Import from other sites → Paste iCal URL</p>
            </div>
            <div>
              <p className="font-medium text-foreground">MakeMyTrip</p>
              <p>Properties → Calendar Import → Add external calendar → Paste iCal URL</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Vrbo</p>
              <p>Calendar → Import/Export → Import calendar → Paste iCal URL</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div>
        <h3 className="mb-3 text-sm font-medium">Room Calendar Feeds</h3>
        {roomsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading rooms...</p>
        ) : roomsQuery.isError ? (
          <p className="text-sm text-destructive">Failed to load rooms</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rooms yet. Add rooms to enable calendar sync.
          </p>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <RoomCalendarCard
                key={room._id}
                room={room}
                propertyId={propertyId}
                origin={origin}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit OTA calendar sync section component**

```bash
git add components/global/ota-calendar-sync-section.tsx
git commit -m "feat(components): add OTA calendar sync section

Displays per-room iCal feed URLs with copy-to-clipboard.
- Generates tokens on-demand via mutation
- Collapsible instructions for major OTAs
- Toast notifications for user feedback
- Handles loading, error, and empty states

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Integrate OTA section into Integrations page

**Files:**
- Modify: `components/global/integrations-page.tsx:133-372`

- [ ] **Step 1: Import OTA section component**

Add to imports at top of `/Users/adhikansh/Desktop/work/staymod/staymod/components/global/integrations-page.tsx`:

```typescript
import { OtaCalendarSyncSection } from "@/components/global/ota-calendar-sync-section";
```

- [ ] **Step 2: Add OTA section before API Access**

In the `<div className="space-y-6">` block (around line 134), add OTA section as the first child:

```typescript
      <div className="space-y-6">
        <SectionCard
          title="OTA Calendar Sync"
          description="Export your Staymod bookings to OTA platforms to prevent double-bookings. One-way sync only."
        >
          <OtaCalendarSyncSection propertyId={propertyId} />
        </SectionCard>

        <SectionCard
          title="API Access"
          description="Manage API keys with scopes and origin/IP restrictions for customer integrations."
        >
          {/* existing API Access content */}
```

- [ ] **Step 3: Test in browser**

Start dev server: `npm run dev`  
Navigate to: `http://localhost:3000/[orgId]/integrations`  
Verify:
- OTA Calendar Sync section appears first
- Instructions accordion expands/collapses
- Room cards show "Generate iCal URL" button
- After generating, URL appears with copy button
- Copy button shows "Copied" after click

- [ ] **Step 4: Commit integrations page update**

```bash
git add components/global/integrations-page.tsx
git commit -m "feat(integrations): add OTA calendar sync section

Position OTA sync as first section in integrations page.
One-way export for Airbnb, Booking.com, MakeMyTrip, Vrbo.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Manual end-to-end testing

**Files:** None (testing only)

- [ ] **Step 1: Create test property and rooms**

1. Start dev server: `npm run dev`
2. Sign in to app
3. Create a test property
4. Add 2-3 test rooms with different types
5. Create several test bookings with:
   - Different statuses (confirmed, pending, checked_in)
   - Various dates (past, current, future)
   - Special characters in guest names (test escaping)
   - Multi-room bookings

- [ ] **Step 2: Generate iCal URLs**

1. Navigate to Integrations page
2. Verify OTA Calendar Sync section shows all rooms
3. Click "Generate iCal URL" for each room
4. Verify "Ready to use" status appears
5. Copy each URL to clipboard
6. Verify toast notification shows

- [ ] **Step 3: Validate iCal feed format**

1. Open iCal URL in browser (paste copied URL)
2. Verify response headers:
   - `Content-Type: text/calendar; charset=utf-8`
   - `Content-Disposition: inline; filename="..."`
   - `Cache-Control: private, max-age=3600`
3. Verify iCal structure:
   - Starts with `BEGIN:VCALENDAR`
   - Contains `VERSION:2.0`
   - Contains `X-WR-CALNAME` with room + property name
   - Each booking has `BEGIN:VEVENT...END:VEVENT`
   - Ends with `END:VCALENDAR`
4. Copy iCal content and validate at: https://icalendar.org/validator.html
5. Verify no errors reported

- [ ] **Step 4: Test with OTA platform (optional)**

If possible, test import with real OTA:
1. Log into Airbnb test account or Booking.com extranet
2. Navigate to calendar sync settings
3. Import iCal URL
4. Verify dates are blocked on OTA calendar
5. Add new booking in Staymod
6. Wait for OTA to re-poll (or force refresh if available)
7. Verify new booking appears on OTA

- [ ] **Step 5: Test error scenarios**

1. Test invalid room ID: `/api/public/ical/rooms/invalid/token.ics` → 404
2. Test invalid token: `/api/public/ical/rooms/[validId]/wrong-token.ics` → 404
3. Test empty property (no rooms) → shows empty state
4. Test property with rooms but no bookings → empty calendar (valid iCal)
5. Test cancelled booking → not included in feed
6. Test clipboard API failure (disable in DevTools) → fallback to select text

- [ ] **Step 6: Document test results**

Create a comment in the tracking issue or spec doc with:
- Browser tested (Chrome/Firefox/Safari)
- All test scenarios passed
- Screenshots of Integrations page
- Sample iCal output
- Any issues found and resolutions

---

### Task 9: Final review and deployment prep

**Files:** None (review only)

- [ ] **Step 1: Review all code changes**

Run: `git log --oneline HEAD~9..HEAD`  
Verify commit messages are clear and follow conventions

- [ ] **Step 2: Run full test suite**

Run: `npm test`  
Expected: All tests pass

- [ ] **Step 3: Type check**

Run: `npm run type-check` or `npx tsc --noEmit`  
Expected: No type errors

- [ ] **Step 4: Lint check**

Run: `npm run lint`  
Expected: No lint errors (or only acceptable warnings)

- [ ] **Step 5: Build verification**

Run: `npm run build`  
Expected: Build succeeds with no errors

- [ ] **Step 6: Update documentation (if needed)**

If user docs exist:
1. Add section about OTA Calendar Sync
2. Include screenshots from Integrations page
3. Link to OTA-specific import instructions
4. Note one-way sync limitation

- [ ] **Step 7: Final commit (if docs updated)**

```bash
git add docs/
git commit -m "docs: add OTA calendar sync user guide

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Spec Coverage Self-Review

**Data Model:**
- ✓ Task 1: Added `icalToken` field to Room type
- ✓ Task 4: Token generation with crypto.randomUUID()
- ✓ Task 3: Booking query (multi-room + legacy support)

**API Endpoints:**
- ✓ Task 3: Public iCal feed endpoint with token validation
- ✓ Task 4: PATCH room endpoint handles generateIcalToken

**iCal Format (RFC 5545):**
- ✓ Task 2: Date formatting (YYYYMMDD)
- ✓ Task 2: Timestamp formatting (ISO 8601 UTC)
- ✓ Task 2: Text escaping (semicolons, commas, newlines)
- ✓ Task 2: VEVENT building with all required fields
- ✓ Task 2: Full VCALENDAR generation

**User Interface:**
- ✓ Task 6: OTA Calendar Sync section component
- ✓ Task 6: Room calendar cards with copy-to-clipboard
- ✓ Task 6: Instructions accordion for major OTAs
- ✓ Task 7: Integration into existing Integrations page

**Error Handling:**
- ✓ Task 3: 404 for invalid room/token (security)
- ✓ Task 3: Empty calendar for no bookings (valid iCal)
- ✓ Task 6: Loading, error, and empty states in UI
- ✓ Task 6: Clipboard fallback (select text)

**Testing:**
- ✓ Task 2: Unit tests for all iCal formatter functions
- ✓ Task 8: Manual end-to-end testing checklist
- ✓ Task 8: iCal validator verification
- ✓ Task 8: Error scenario testing

**Edge Cases:**
- ✓ Task 2: Text truncation at 1000 chars
- ✓ Task 3: Multi-room bookings ($or query)
- ✓ Task 3: Legacy single-room bookings
- ✓ Task 3: Exclude cancelled/no-show
- ✓ Task 4: Idempotent token generation

All spec requirements covered. No gaps identified.
