# OTA Calendar Sync via iCal Feeds - Design Specification

**Date:** 2026-05-09  
**Status:** Approved  
**Type:** Feature - OTA Integration

## Overview

Add one-way calendar sync to allow Staymod bookings to be exported to OTA platforms (Airbnb, Booking.com, MakeMyTrip, Vrbo) via industry-standard iCal feeds. This prevents double-bookings by blocking dates on OTA calendars when rooms are booked in Staymod.

## Goals

1. Generate per-room iCal feed URLs with secure tokens
2. Provide Integration UI where property managers can copy iCal URLs
3. Export booking details (guest name, contact info, status, dates) in RFC 5545 format
4. Work immediately with all major OTA platforms without custom API integration

## Non-Goals

- Two-way sync (importing OTA bookings into Staymod)
- Real-time push notifications to OTAs
- Pricing or availability rules sync
- Token regeneration UI (future enhancement)
- Analytics on OTA feed access (future enhancement)

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│  Property Manager                                    │
│  ↓                                                   │
│  Integrations Page (/[id]/properties/[propertyId]/  │
│                     integrations)                    │
│  ↓                                                   │
│  Copies iCal URL for each room                      │
│  ↓                                                   │
│  Pastes into OTA calendar import settings           │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  OTA Platform (Airbnb/Booking.com/etc)              │
│  ↓                                                   │
│  Polls iCal URL every 2-6 hours                     │
│  ↓                                                   │
│  GET /api/public/ical/rooms/[roomId]/[token].ics   │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  Staymod API                                         │
│  ↓                                                   │
│  1. Validate roomId + token                         │
│  2. Query bookings for this room                    │
│  3. Generate iCal format (RFC 5545)                 │
│  4. Return text/calendar response                   │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Token Generation:** When property manager first visits Integrations page, system generates UUID v4 tokens for rooms missing `icalToken`
2. **URL Construction:** Frontend builds URL: `https://[domain]/api/public/ical/rooms/[roomId]/[token].ics`
3. **OTA Import:** Property manager copies URL, adds to OTA's calendar import settings
4. **OTA Polling:** OTA platform polls URL periodically (typically every 2-6 hours)
5. **Feed Generation:** API queries bookings, formats as iCal, returns to OTA
6. **Calendar Blocking:** OTA blocks dates based on events in feed

## Data Model

### Room Schema Changes

Add optional `icalToken` field to existing Room collection:

```typescript
type Room = {
  _id: ObjectId;
  orgId: string;
  propertyId: ObjectId;
  name: string;
  roomType: RoomType;
  // ... existing fields
  
  // NEW: iCal feed token
  icalToken?: string; // UUID v4, generated on-demand
}
```

**Token characteristics:**
- Generated using `crypto.randomUUID()` (Node.js built-in)
- 36 characters: `550e8400-e29b-41d4-a716-446655440000`
- Lazy generation: only created when Integrations page is accessed
- No expiration (public URLs remain valid indefinitely)
- Stored directly in Room document for simple lookups

### Booking Query

No schema changes needed. Query existing bookings:

```typescript
// Pseudo-query
db.bookings.find({
  propertyId: propertyId,
  orgId: orgId,
  "rooms.[roomId]": { $exists: true },
  status: { $nin: ["cancelled", "no_show"] },
  checkOut: { $gte: sixMonthsAgo },
  checkIn: { $lte: twoYearsFromNow }
})
```

Include:
- Multi-room bookings where this room is allocated
- Legacy single-room bookings where `roomId` matches
- Active statuses: pending, confirmed, checked_in, completed

## API Endpoints

### 1. Generate/Fetch Room iCal Feed (Public)

**Route:** `GET /api/public/ical/rooms/[roomId]/[token].ics`

**Authentication:** None (public endpoint, validated by token)

**Request:**
- Path params: `roomId` (MongoDB ObjectId), `token` (UUID v4)
- No query params
- No body

**Response:**

Success (200):
```
Content-Type: text/calendar; charset=utf-8
Content-Disposition: inline; filename="[roomName].ics"
Cache-Control: private, max-age=3600

BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Staymod//Calendar Sync//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Deluxe Room 101 - Sunset Villa
X-WR-TIMEZONE:UTC

BEGIN:VEVENT
UID:507f1f77bcf86cd799439011@staymod.app
DTSTART:20260515
DTEND:20260518
DTSTAMP:20260509T120000Z
SUMMARY:John Doe - confirmed
DESCRIPTION:Booking Details:\nGuest: John Doe\nPhone: +1234567890\nEmail: john@example.com\nGuests: 2\nRoom Numbers: 101\nSpecial Requests: Late check-in\nBooking ID: 507f1f77bcf86cd799439011
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT

END:VCALENDAR
```

Error responses:
- `404` - Room not found or invalid token
- `500` - Server error (logged internally)

**Implementation notes:**
- iCal dates use `YYYYMMDD` format (no time component, full-day events)
- `DTEND` is exclusive (checkout day is not blocked)
- `UID` must be stable (use bookingId@staymod.app for uniqueness)
- `DTSTAMP` is current generation timestamp
- `SUMMARY` format: `[guestName] - [status]`
- `DESCRIPTION` includes all booking details for property manager reference
- `STATUS:CONFIRMED` for all non-cancelled bookings
- `TRANSP:OPAQUE` marks time as busy (blocks availability)

**iCal Field Mapping:**

| Staymod Field | iCal Field | Format |
|---------------|------------|--------|
| `_id` | `UID` | `[bookingId]@staymod.app` |
| `checkIn` | `DTSTART` | `YYYYMMDD` |
| `checkOut` | `DTEND` | `YYYYMMDD` (exclusive) |
| `guestName` | `SUMMARY` | `[name] - [status]` |
| All booking details | `DESCRIPTION` | Multi-line text |
| `status` | `STATUS` | Always `CONFIRMED` |
| Current time | `DTSTAMP` | ISO 8601 UTC |

### 2. Update Room to Add iCal Token

**Route:** `PATCH /api/properties/[propertyId]/rooms/[roomId]`

**Authentication:** Clerk session, organization scoped

**Request:**
```json
{
  "generateIcalToken": true
}
```

**Response:**
```json
{
  "room": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Deluxe Room 101",
    "icalToken": "550e8400-e29b-41d4-a716-446655440000",
    // ... other fields
  }
}
```

**Logic:**
- If `icalToken` already exists, return existing value (idempotent)
- If missing, generate `crypto.randomUUID()`, save, return
- Validate user has access to propertyId via Clerk organization

## User Interface

### Integrations Page

**Route:** `/app/[id]/properties/[propertyId]/integrations/page.tsx`

**Layout:**

```
┌────────────────────────────────────────────────────┐
│ ← Back to Property                                  │
│                                                     │
│ OTA Calendar Sync                                  │
│ Export your Staymod bookings to OTA platforms to   │
│ prevent double-bookings.                           │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ℹ How to use these calendar feeds            │   │
│ │ [Expandable instructions for each OTA]       │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Room Calendar Feeds                                │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 🛏️ Deluxe Room 101                           │   │
│ │ Standard                                      │   │
│ │                                               │   │
│ │ iCal Feed URL:                                │   │
│ │ ┌──────────────────────────────────────┐     │   │
│ │ │ https://staymod.app/api/public/...   │ 📋  │   │
│ │ └──────────────────────────────────────┘     │   │
│ │                                               │   │
│ │ ✓ Ready to use                                │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [Repeat for each room]                             │
└────────────────────────────────────────────────────┘
```

**Components:**

1. **Page Header**
   - Title: "OTA Calendar Sync"
   - Description explaining one-way export

2. **Instructions Card** (Collapsible)
   - How to add to Airbnb (Settings → Calendar → Import Calendar)
   - How to add to Booking.com (Property → Calendar → Sync calendars)
   - How to add to MakeMyTrip (Properties → Calendar Import)
   - How to add to Vrbo (Calendar → Import/Export)

3. **Room Calendar Card** (per room)
   - Room name and type badge
   - Read-only input field with iCal URL
   - Copy button (shadcn Button with clipboard icon)
   - Status indicator: "Ready to use" or "Generating..."
   - Optional: Last synced timestamp (future enhancement)

**Data fetching:**
- Fetch all rooms for property: `GET /api/properties/[propertyId]/rooms`
- For each room without `icalToken`, call `PATCH` endpoint to generate
- Use TanStack Query with `useApiQuery` for room list
- Use `useApiMutation` for token generation

**Copy to clipboard:**
- Use browser Clipboard API: `navigator.clipboard.writeText(url)`
- Show toast notification: "URL copied to clipboard"
- Fallback: select text in input if Clipboard API unavailable

### Navigation

Add "Integrations" link to property sidebar navigation:

```tsx
// In property layout sidebar
<NavItem 
  href="/[id]/properties/[propertyId]/integrations"
  icon={<LinkIcon />}
  label="Integrations"
/>
```

## Error Handling

### API Endpoint Errors

| Scenario | Response | User Impact |
|----------|----------|-------------|
| Invalid/missing token | 404 | OTA shows "invalid calendar URL" |
| Room not found | 404 | OTA shows "invalid calendar URL" |
| No bookings for room | 200 with empty calendar | OTA shows no blocked dates |
| Database connection error | 500 | OTA retries later (handles gracefully) |
| Malformed booking dates | Skip event, log warning | Other bookings still exported |
| Multi-room booking | Include in each room's feed | OTA sees portion relevant to that room |

**Security note:** Return 404 for both "room not found" and "invalid token" to avoid revealing which roomIds exist.

### UI Errors

| Scenario | Handling |
|----------|----------|
| Failed to load rooms | Show error banner with retry button |
| Token generation fails | Show inline error on room card, allow retry |
| Copy to clipboard fails | Fallback to select-all on input field |
| Property has no rooms | Show empty state: "Add rooms to enable calendar sync" |

### Edge Cases

1. **Multi-room bookings:**
   - Each room's feed shows the same booking event
   - OTAs handle this correctly (blocking each room independently)

2. **Legacy single-room bookings:**
   - Query includes `roomId` field match for backward compatibility
   - Migrated to `rooms` map format in feed output

3. **Overlapping bookings:**
   - Export all events (OTAs display conflicts, property manager resolves)

4. **Cancelled/no-show bookings:**
   - Excluded from feed (dates become available on OTA)
   - OTA automatically unblocks when booking removed from feed

5. **Very long special requests:**
   - Truncate `DESCRIPTION` field at 1000 characters
   - Add "(truncated)" indicator if needed

6. **Non-ASCII characters in guest names:**
   - iCal format supports UTF-8
   - Escape special characters (`;`, `,`, `\n`) per RFC 5545

## Testing Strategy

### Unit Tests

- iCal format generation (date formatting, escaping, field mapping)
- Token validation logic
- Booking query with various filter scenarios
- Multi-room booking inclusion

### Integration Tests

- Full API endpoint flow (token validation → query → format → response)
- Token generation endpoint (idempotency)
- Organization scoping (can't access other org's rooms)

### Manual Testing

1. Create test property with multiple rooms
2. Add bookings with various statuses, dates, special characters
3. Generate iCal URLs from Integrations page
4. Validate iCal format with online validator (icalendar.org/validator)
5. Import URL into Airbnb test account, verify dates block correctly
6. Test copy-to-clipboard on different browsers
7. Test error states (invalid tokens, no rooms, etc.)

### OTA-specific Validation

- **Airbnb:** Import URL, verify blocked dates appear immediately
- **Booking.com:** Add to sync calendars, check 2-hour delay behavior
- **MakeMyTrip:** Test import flow (may require manual approval)
- **Vrbo:** Verify full calendar display

## Implementation Tasks

1. **Database migration:**
   - Add `icalToken` field to Room schema (optional string)
   - No data migration needed (tokens generated on-demand)

2. **API - iCal endpoint:**
   - Create `/app/api/public/ical/rooms/[roomId]/[token]/route.ts`
   - Implement token validation
   - Build booking query (handle multi-room + legacy)
   - Write iCal formatter utility (`utils/ical-formatter.ts`)
   - Add RFC 5545 field escaping
   - Set proper headers (content-type, cache-control)

3. **API - Token generation:**
   - Extend existing PATCH `/api/properties/[propertyId]/rooms/[roomId]`
   - Add `generateIcalToken` request field
   - Generate UUID v4 if missing, return if exists

4. **UI - Integrations page:**
   - Create page component with layout
   - Build Instructions accordion (shadcn Accordion)
   - Create RoomCalendarCard component
   - Implement copy-to-clipboard with toast notification
   - Add loading states during token generation
   - Style with existing design system

5. **Navigation:**
   - Add "Integrations" link to property sidebar
   - Update types if needed

6. **Testing:**
   - Write unit tests for iCal formatter
   - Add integration tests for API endpoints
   - Manual OTA testing checklist

7. **Documentation:**
   - Add help text to Integrations page
   - Update user documentation (if exists)

## Future Enhancements

Not in scope for initial release, but valuable next steps:

1. **Token regeneration UI:** "Regenerate URL" button per room (invalidates old token)
2. **Feed access analytics:** Track when OTAs last fetched feed, show on Integrations page
3. **Webhook support:** Notify OTAs immediately when bookings change (requires OTA API integration)
4. **Two-way sync:** Import OTA bookings into Staymod (much more complex)
5. **Pricing/availability sync:** Export room rates, minimum stays, etc.
6. **Property-level feed:** Single URL blocking all rooms (for single-unit properties)
7. **Sync health monitoring:** Alert if OTA hasn't fetched feed in X days

## Success Metrics

- Property managers successfully add iCal URLs to OTA platforms
- OTA calendars accurately reflect Staymod bookings (spot-check)
- No double-bookings reported due to sync issues
- Feed generation response time < 500ms for typical property
- Zero 500 errors on iCal endpoint (OTAs handle 404 gracefully)

## Timeline Estimate

- Database + API: 2-3 days
- UI: 1-2 days  
- Testing + OTA validation: 1-2 days
- **Total: 4-7 days** for single developer

## Dependencies

- Existing Room and Booking collections
- Clerk organization scoping (already in place)
- shadcn UI components (already in place)
- TanStack Query hooks (already in place)
- MongoDB connection (already in place)

## References

- [RFC 5545 - iCalendar Specification](https://datatracker.ietf.org/doc/html/rfc5545)
- [iCalendar Validator](https://icalendar.org/validator.html)
- [Airbnb Calendar Import Guide](https://www.airbnb.com/help/article/99)
- [Booking.com Calendar Sync](https://partner.booking.com/en-us/help/getting-started/how-do-i-manage-my-property-calendar)
