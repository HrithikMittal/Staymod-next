# Per-Room-Number iCal URLs - Design Specification

**Date:** 2026-05-09  
**Status:** Approved  
**Type:** Enhancement - OTA Calendar Sync

## Overview

Extend the existing OTA calendar sync feature to support generating separate iCal feed URLs for each physical room number within a multi-unit Room document. This allows property managers to handle scenarios where OTA platforms list each room number as a separate listing (e.g., "Room 101", "Room 102", "Room 103" as individual Airbnb listings) rather than a single listing with quantity.

## Problem Statement

**Current limitation:** 
- Room document with `roomNumbers: ["101", "102", "103"]` generates ONE iCal URL
- This URL shows bookings for all three room numbers combined
- Works for: "Standard Room (3 available)" as single OTA listing
- Doesn't work for: Three separate OTA listings ("Room 101", "Room 102", "Room 103")

**Solution:**
Give property managers the choice to generate:
1. **Combined URL** - All room numbers in one feed (existing behavior)
2. **Per-Number URLs** - Separate feed for each room number (new)

## Goals

1. Allow generating individual iCal URLs for each room number in multi-unit rooms
2. Maintain backward compatibility with existing combined URLs
3. Support both approaches simultaneously (user can generate both types)
4. Use same API endpoint - distinguish by token validation
5. Minimal UI complexity - clear two-section layout

## Non-Goals

- Automatic detection of which type to use
- Migration of existing tokens
- Token rotation/regeneration UI (future enhancement)
- Support for room number ranges or wildcards

## Architecture

### Data Model

**Room Type Extension:**
```typescript
export type Room = OrganizationScope & {
  _id: ObjectId;
  // ... existing fields
  roomNumbers?: string[];
  
  /** UUID v4 token for combined iCal feed (all room numbers) */
  icalToken?: string;
  
  /** Map of room number to UUID v4 token for individual feeds */
  icalTokensByRoomNumber?: Record<string, string>;
  
  createdAt: Date;
  updatedAt: Date;
};
```

**Examples:**

Single-unit room:
```typescript
{
  name: "Presidential Suite",
  roomNumbers: undefined,
  icalToken: "abc-123-def"
  // No icalTokensByRoomNumber needed
}
```

Multi-unit room with both token types:
```typescript
{
  name: "Standard Room",
  roomNumbers: ["101", "102", "103"],
  icalToken: "abc-123-def",  // Combined feed
  icalTokensByRoomNumber: {
    "101": "xyz-789-ghi",
    "102": "mno-456-pqr",
    "103": "stu-012-vwx"
  }
}
```

### API Changes

**Extended PATCH endpoint:** `/api/properties/[propertyId]/rooms/[roomId]`

**New request payload:**
```json
{
  "generateIcalTokensByRoomNumber": true
}
```

**Logic:**
1. Check if room has `roomNumbers` array with multiple entries
2. Generate UUID v4 for each room number
3. Store in `icalTokensByRoomNumber` object
4. Return updated room

**Idempotency:** If tokens already exist, return existing tokens (same as combined token behavior)

**Public iCal endpoint changes:** `/api/public/ical/rooms/[roomId]/[token].ics`

**Token validation logic:**
```typescript
// 1. Find room by roomId
const room = await db.collection<Room>("rooms").findOne({ _id: roomObjectId });

if (!room) return 404;

// 2. Determine token type
const isCombinedFeed = room.icalToken === token;
const roomNumberForToken = !isCombinedFeed
  ? Object.entries(room.icalTokensByRoomNumber || {})
      .find(([_, t]) => t === token)?.[0]
  : null;

// 3. Validate token
if (!isCombinedFeed && !roomNumberForToken) {
  return 404; // Token doesn't match either type
}

// 4. Query bookings with appropriate filter
const bookingFilter = {
  orgId: room.orgId,
  propertyId: room.propertyId,
  $or: [
    { [`rooms.${roomId}`]: { $exists: true } },
    { roomId: roomObjectId }
  ],
  status: { $in: ["confirmed", "checked_in", "completed"] },
  checkOut: { $gte: sixMonthsAgo },
  checkIn: { $lte: twoYearsFromNow }
};

const bookings = await db.collection<Booking>(BOOKINGS_COLLECTION)
  .find(bookingFilter)
  .toArray();

// 5. Filter bookings by room number if per-number feed
const filteredBookings = isCombinedFeed
  ? bookings
  : bookings.filter(booking => {
      const allocation = booking.rooms?.[roomId];
      return allocation?.roomNumbers?.includes(roomNumberForToken);
    });

// 6. Generate feed
const calendarName = isCombinedFeed
  ? `${room.name} - ${property.name}`
  : `${room.name} (Room ${roomNumberForToken}) - ${property.name}`;

return generateIcalFeed(filteredBookings, roomId, calendarName, property.name);
```

### UI Changes

**Component:** `components/global/ota-calendar-sync-section.tsx`

**Layout for multi-unit rooms:**

```
┌─────────────────────────────────────────────────┐
│ Standard Room                                    │
│ 3 units: 101, 102, 103                          │
│                                                  │
│ ━━━ Combined Calendar (All Units) ━━━           │
│ Use when OTA lists as single room with quantity │
│                                                  │
│ iCal Feed URL:                                   │
│ ┌────────────────────────────────┐              │
│ │ https://...                     │ [Copy]      │
│ └────────────────────────────────┘              │
│ ✓ Ready to use                                   │
│                                                  │
│ ━━━ Per Room Number ━━━                          │
│ Use when each room is a separate OTA listing    │
│                                                  │
│ • Room 101:                                      │
│   ┌────────────────────────────────┐            │
│   │ https://...101-token.ics        │ [Copy]    │
│   └────────────────────────────────┘            │
│ • Room 102:                                      │
│   ┌────────────────────────────────┐            │
│   │ https://...102-token.ics        │ [Copy]    │
│   └────────────────────────────────┘            │
│ • Room 103:                                      │
│   ┌────────────────────────────────┐            │
│   │ https://...103-token.ics        │ [Copy]    │
│   └────────────────────────────────┘            │
└─────────────────────────────────────────────────┘
```

**Behavior:**
- Rooms without `roomNumbers` or with only 1 room number: Show current single-URL UI (no change)
- Multi-unit rooms: Show two sections
- Each section has its own "Generate" button if tokens don't exist
- Both sections can be generated independently
- Both sections can exist simultaneously

**API Client additions:**
```typescript
export function generateRoomIcalTokensByRoomNumber(propertyId: string, roomId: string) {
  return apiFetch<{ room: RoomListItem }>(`/api/properties/${propertyId}/rooms/${roomId}`, {
    method: "PATCH",
    json: { generateIcalTokensByRoomNumber: true },
  });
}

export type RoomListItem = {
  // ... existing fields
  icalToken?: string;
  icalTokensByRoomNumber?: Record<string, string>;
};
```

## Implementation Details

### Token Generation

**Combined token generation:** (existing)
```typescript
if (payload.generateIcalToken === true) {
  if (!room.icalToken) {
    room.icalToken = crypto.randomUUID();
    await db.collection<Room>(ROOMS_COLLECTION).updateOne(
      { _id: roomObjectId },
      { $set: { icalToken: room.icalToken, updatedAt: new Date() } }
    );
  }
  return room;
}
```

**Per-number token generation:** (new)
```typescript
if (payload.generateIcalTokensByRoomNumber === true) {
  if (!room.roomNumbers || room.roomNumbers.length === 0) {
    return { error: "Room has no room numbers" };
  }
  
  const existingTokens = room.icalTokensByRoomNumber || {};
  const newTokens: Record<string, string> = {};
  
  for (const roomNumber of room.roomNumbers) {
    newTokens[roomNumber] = existingTokens[roomNumber] || crypto.randomUUID();
  }
  
  await db.collection<Room>(ROOMS_COLLECTION).updateOne(
    { _id: roomObjectId },
    { $set: { icalTokensByRoomNumber: newTokens, updatedAt: new Date() } }
  );
  
  return { ...room, icalTokensByRoomNumber: newTokens };
}
```

### Booking Filtering Logic

**Key consideration:** Multi-room bookings store room allocation as:
```typescript
booking.rooms = {
  "roomId1": { 
    roomType: "standard", 
    quantity: 2, 
    roomNumbers: ["101", "102"] 
  }
}
```

**Per-number filtering:**
```typescript
function filterBookingsByRoomNumber(bookings: Booking[], roomId: string, targetRoomNumber: string) {
  return bookings.filter(booking => {
    // Check multi-room format
    const allocation = booking.rooms?.[roomId];
    if (allocation?.roomNumbers?.includes(targetRoomNumber)) {
      return true;
    }
    
    // Check legacy single-room format (doesn't have per-number granularity)
    // Include these in all per-number feeds as fallback
    if (booking.roomId?.toString() === roomId && !booking.rooms) {
      return true;
    }
    
    return false;
  });
}
```

## Error Handling

### API Errors

| Scenario | Response | User Impact |
|----------|----------|-------------|
| Generate per-number tokens on single-unit room | 400 Bad Request | User sees error toast |
| Room has no roomNumbers array | 400 Bad Request | User sees error toast |
| Invalid token (neither combined nor per-number) | 404 Not Found | OTA sees "invalid URL" |
| Room deleted after token generated | 404 Not Found | OTA sees "invalid URL" |

### UI Errors

| Scenario | Handling |
|----------|----------|
| Failed to generate per-number tokens | Show error toast, retry button |
| Room numbers array is empty | Hide "Per Room Number" section entirely |
| Room has 1 room number | Show single-URL UI (treat as single-unit) |
| Copy to clipboard fails | Fallback to select-all on input |

## Testing Strategy

### Unit Tests

- Token validation logic (combined vs per-number)
- Booking filtering by room number
- Edge cases: empty roomNumbers, single room number, legacy bookings

### Integration Tests

- Generate per-number tokens endpoint
- Public iCal endpoint with per-number token
- Combined and per-number tokens on same room
- Booking filtering accuracy

### Manual Testing

1. Create multi-unit room (3 room numbers)
2. Generate combined token, verify URL works
3. Generate per-number tokens, verify all 3 URLs work
4. Create booking with specific room numbers (e.g., 101, 102)
5. Verify combined feed shows all bookings
6. Verify room 101 feed shows only 101 bookings
7. Verify room 103 feed shows no bookings (not in booking)
8. Test with legacy single-room bookings

## Success Metrics

- Property managers can generate per-number URLs for multi-unit rooms
- Both combined and per-number feeds can coexist
- Per-number feeds accurately show only relevant bookings
- No breaking changes to existing combined feed behavior
- UI clearly communicates when to use each type

## Future Enhancements

1. **Bulk token generation** - "Generate All" button to create both types at once
2. **Token revocation** - Regenerate individual room number tokens
3. **Usage analytics** - Track which OTAs are polling which feeds
4. **Room number aliasing** - Support alternative names ("101" = "Room 1" = "First Floor Suite")
5. **Automatic mapping** - Detect OTA listing structure and suggest token type

## Dependencies

- Existing OTA calendar sync feature (completed)
- Room type with roomNumbers array (already exists)
- Public iCal endpoint (already exists)
- Token generation infrastructure (already exists)

## Timeline Estimate

- Data model changes: 30 minutes
- API endpoint extension: 1-2 hours
- Public endpoint token logic: 2-3 hours
- UI component updates: 3-4 hours
- Testing: 2-3 hours
- **Total: 1-2 days** for single developer

## Migration Strategy

**No migration needed:** This is a purely additive feature. Existing rooms with `icalToken` continue working unchanged. The new `icalTokensByRoomNumber` field is optional and only used when explicitly generated by the user.

## References

- Original OTA Calendar Sync spec: `docs/superpowers/specs/2026-05-09-ota-calendar-sync-design.md`
- RFC 5545 iCalendar: https://datatracker.ietf.org/doc/html/rfc5545
- Multi-room booking structure: `types/booking.ts`
