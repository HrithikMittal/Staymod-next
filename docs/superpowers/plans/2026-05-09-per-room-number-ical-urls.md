# Per-Room-Number iCal URLs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend OTA calendar sync to generate separate iCal feed URLs for each physical room number in multi-unit rooms.

**Architecture:** Add `icalTokensByRoomNumber` field to Room type, extend existing PATCH endpoint with new action, update public iCal endpoint to validate both token types and filter bookings by room number, modify UI to show two-section layout for multi-unit rooms.

**Tech Stack:** TypeScript, Next.js 16 App Router, MongoDB, TanStack Query, React, shadcn/ui

---

## File Structure

**Files to modify:**
- `types/room.ts` - Add `icalTokensByRoomNumber` field to Room type
- `api-clients/rooms.ts` - Add `icalTokensByRoomNumber` to RoomListItem, add new API client function
- `app/api/properties/[propertyId]/rooms/[roomId]/route.ts` - Handle new `generateIcalTokensByRoomNumber` action in PATCH endpoint
- `app/api/public/ical/rooms/[roomId]/[token]/route.ts` - Extend token validation to check both types, filter bookings by room number
- `utils/ical-formatter.ts` - Accept optional calendar name parameter for per-number feeds
- `components/global/ota-calendar-sync-section.tsx` - Show two-section UI for multi-unit rooms

**No new files created** - this is an extension of existing OTA calendar sync feature.

---

### Task 1: Extend Room Type with Per-Number Tokens

**Files:**
- Modify: `types/room.ts:96` (after icalToken field)

- [ ] **Step 1: Add icalTokensByRoomNumber field to Room type**

```typescript
  /** UUID v4 token for public iCal feed access. Generated on-demand. */
  icalToken?: string;
  /** Map of room number to UUID v4 token for individual feeds. Generated on-demand for multi-unit rooms. */
  icalTokensByRoomNumber?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add types/room.ts
git commit -m "feat: add icalTokensByRoomNumber field to Room type"
```

---

### Task 2: Extend RoomListItem and Add API Client Function

**Files:**
- Modify: `api-clients/rooms.ts:37` (after icalToken field)
- Modify: `api-clients/rooms.ts:134` (end of file)

- [ ] **Step 1: Add icalTokensByRoomNumber to RoomListItem type**

```typescript
  sortOrder: number;
  icalToken?: string;
  icalTokensByRoomNumber?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
```

- [ ] **Step 2: Add generateRoomIcalTokensByRoomNumber function**

```typescript
export function generateRoomIcalTokensByRoomNumber(propertyId: string, roomId: string) {
  return apiFetch<{ room: RoomListItem }>(`/api/properties/${propertyId}/rooms/${roomId}`, {
    method: "PATCH",
    json: { generateIcalTokensByRoomNumber: true },
  });
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add api-clients/rooms.ts
git commit -m "feat: add icalTokensByRoomNumber to RoomListItem and API client"
```

---

### Task 3: Extend PATCH Endpoint to Generate Per-Number Tokens

**Files:**
- Modify: `app/api/properties/[propertyId]/rooms/[roomId]/route.ts` (PATCH handler, after existing generateIcalToken logic)

- [ ] **Step 1: Read current PATCH handler to locate insertion point**

Read the file and find where `generateIcalToken` is handled (should be around line 150-180 based on the existing implementation)

- [ ] **Step 2: Add generateIcalTokensByRoomNumber handling**

Insert after the existing `if (payload.generateIcalToken === true)` block:

```typescript
  // Generate per-room-number iCal tokens
  if (payload.generateIcalTokensByRoomNumber === true) {
    if (!room.roomNumbers || room.roomNumbers.length === 0) {
      return NextResponse.json(
        { error: "Room has no room numbers to generate tokens for" },
        { status: 400 }
      );
    }

    const existingTokens = room.icalTokensByRoomNumber || {};
    const newTokens: Record<string, string> = {};

    // Generate UUID for each room number (idempotent - reuse existing)
    for (const roomNumber of room.roomNumbers) {
      newTokens[roomNumber] = existingTokens[roomNumber] || crypto.randomUUID();
    }

    // Update room with new tokens
    await db.collection<Room>(ROOMS_COLLECTION).updateOne(
      { _id: roomObjectId },
      { $set: { icalTokensByRoomNumber: newTokens, updatedAt: now } }
    );

    room.icalTokensByRoomNumber = newTokens;
    return NextResponse.json({ room: serializeRoomForApi(room, tagsById) });
  }
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 4: Start dev server and test endpoint**

Run: `npm run dev`

Test with curl (replace IDs with actual values):
```bash
curl -X PATCH http://localhost:3001/api/properties/YOUR_PROPERTY_ID/rooms/YOUR_ROOM_ID \
  -H "Content-Type: application/json" \
  -d '{"generateIcalTokensByRoomNumber": true}'
```

Expected: 200 response with room object containing `icalTokensByRoomNumber` field

- [ ] **Step 5: Test error case (room without roomNumbers)**

Test with a room that has no roomNumbers array:
```bash
curl -X PATCH http://localhost:3001/api/properties/YOUR_PROPERTY_ID/rooms/SINGLE_ROOM_ID \
  -H "Content-Type: application/json" \
  -d '{"generateIcalTokensByRoomNumber": true}'
```

Expected: 400 response with error message "Room has no room numbers to generate tokens for"

- [ ] **Step 6: Commit**

```bash
git add app/api/properties/[propertyId]/rooms/[roomId]/route.ts
git commit -m "feat: handle generateIcalTokensByRoomNumber in PATCH endpoint"
```

---

### Task 4: Extend Public iCal Endpoint for Token Validation

**Files:**
- Modify: `app/api/public/ical/rooms/[roomId]/[token]/route.ts` (GET handler, replace token validation logic)

- [ ] **Step 1: Replace token validation logic**

Find the current token validation (around line 37-48) and replace it with:

```typescript
    // Find room by ID (no token check yet - we'll validate below)
    const room = await db.collection<Room>("rooms").findOne({
      _id: roomObjectId,
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    // Determine token type and validate
    const isCombinedFeed = room.icalToken === token;
    const roomNumberForToken = !isCombinedFeed
      ? Object.entries(room.icalTokensByRoomNumber || {})
          .find(([_, t]) => t === token)?.[0]
      : null;

    // Validate token matches either type
    if (!isCombinedFeed && !roomNumberForToken) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }
```

- [ ] **Step 2: Add booking filtering logic**

Replace the current `generateIcalFeed` call (around line 96-100) with:

```typescript
    // Filter bookings by room number if per-number feed
    const filteredBookings = isCombinedFeed
      ? bookings
      : bookings.filter(booking => {
          // Check multi-room format
          const allocation = booking.rooms?.[roomId];
          if (allocation?.roomNumbers?.includes(roomNumberForToken)) {
            return true;
          }

          // Check legacy single-room format (no per-number granularity)
          // Include in all per-number feeds as fallback
          if (booking.roomId?.toString() === roomId && !booking.rooms) {
            return true;
          }

          return false;
        });

    // Generate calendar name based on feed type
    const calendarName = isCombinedFeed
      ? `${room.name} - ${property.name}`
      : `${room.name} (Room ${roomNumberForToken}) - ${property.name}`;

    // Generate iCal feed
    const icalContent = generateIcalFeed(
      filteredBookings,
      roomId,
      calendarName,
      property.name
    );
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add app/api/public/ical/rooms/[roomId]/[token]/route.ts
git commit -m "feat: validate per-number tokens and filter bookings"
```

---

### Task 5: Update iCal Formatter to Accept Calendar Name

**Files:**
- Modify: `utils/ical-formatter.ts:148` (generateIcalFeed function signature)

- [ ] **Step 1: Update function signature to accept calendarName**

Replace the current function signature (line 148-153):

```typescript
export function generateIcalFeed(
  bookings: Booking[],
  roomId: string,
  calendarName: string,
  propertyName: string
): string {
```

- [ ] **Step 2: Update X-WR-CALNAME to use provided calendarName**

Replace line 163 (the X-WR-CALNAME line):

```typescript
  lines.push(`X-WR-CALNAME:${escapeIcalText(calendarName)}`);
```

- [ ] **Step 3: Update all callers in ota-calendar-sync-section.tsx**

This file currently doesn't call generateIcalFeed directly (it's called by the API endpoint), so no changes needed.

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No type errors (the public endpoint already passes the correct number of parameters now)

- [ ] **Step 5: Commit**

```bash
git add utils/ical-formatter.ts
git commit -m "feat: accept calendarName parameter in generateIcalFeed"
```

---

### Task 6: Update UI Component for Two-Section Layout

**Files:**
- Modify: `components/global/ota-calendar-sync-section.tsx` (RoomCalendarCard component)

- [ ] **Step 1: Replace RoomCalendarCard component with two-section layout**

Replace the entire `RoomCalendarCard` component (lines 42-141) with:

```typescript
/**
 * Individual room card showing iCal URL(s) with copy-to-clipboard functionality.
 * For multi-unit rooms, shows two sections: combined and per-number feeds.
 */
function RoomCalendarCard({ room, propertyId, origin }: RoomCalendarCardProps) {
  const queryClient = useQueryClient();
  
  const generateCombinedTokenMutation = useMutation({
    mutationFn: () => generateRoomIcalToken(propertyId, room._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
      toast.success("Combined calendar URL generated");
    },
    onError: () => {
      toast.error("Failed to generate combined calendar URL");
    },
  });

  const generatePerNumberTokensMutation = useMutation({
    mutationFn: () => generateRoomIcalTokensByRoomNumber(propertyId, room._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
      toast.success("Per-room-number calendar URLs generated");
    },
    onError: () => {
      toast.error("Failed to generate per-room-number URLs");
    },
  });

  const handleGenerateCombined = () => {
    generateCombinedTokenMutation.mutate();
  };

  const handleGeneratePerNumber = () => {
    generatePerNumberTokensMutation.mutate();
  };

  const combinedIcalUrl = room.icalToken
    ? `${origin}/api/public/ical/rooms/${room._id}/${room.icalToken}.ics`
    : null;

  const handleCopy = async (url: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success(`${label} URL copied to clipboard`);
      } else {
        // Fallback for older browsers or insecure contexts
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (success) {
          toast.success(`${label} URL copied to clipboard`);
        } else {
          toast.error("Failed to copy URL");
        }
      }
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const isMultiUnit = room.roomNumbers && room.roomNumbers.length > 1;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground">{room.name}</h3>
        <p className="text-sm text-muted-foreground">
          {room.type.replace(/_/g, " ")}
          {isMultiUnit && ` • ${room.roomNumbers.length} units: ${room.roomNumbers.join(", ")}`}
        </p>
      </div>

      {!isMultiUnit ? (
        // Single-unit room: show simple single-URL UI
        <>
          {!room.icalToken && (
            <Button
              size="sm"
              onClick={handleGenerateCombined}
              disabled={generateCombinedTokenMutation.isPending}
              className="mb-3"
            >
              {generateCombinedTokenMutation.isPending && (
                <LoaderIcon className="animate-spin" />
              )}
              Generate URL
            </Button>
          )}

          {combinedIcalUrl ? (
            <div className="space-y-2">
              <Label htmlFor={`ical-url-${room._id}`}>iCal Feed URL</Label>
              <div className="flex gap-2">
                <Input
                  id={`ical-url-${room._id}`}
                  value={combinedIcalUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => handleCopy(combinedIcalUrl, "Calendar")}
                  aria-label="Copy URL"
                >
                  <CopyIcon />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">✓ Ready to use</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Generate a calendar URL to sync this room with OTA platforms
            </p>
          )}
        </>
      ) : (
        // Multi-unit room: show two-section layout
        <div className="space-y-6">
          {/* Combined Calendar Section */}
          <div>
            <div className="mb-2 border-b border-border pb-1">
              <h4 className="text-sm font-semibold text-foreground">
                Combined Calendar (All Units)
              </h4>
              <p className="text-xs text-muted-foreground">
                Use when OTA lists as single room with quantity
              </p>
            </div>

            {!room.icalToken && (
              <Button
                size="sm"
                onClick={handleGenerateCombined}
                disabled={generateCombinedTokenMutation.isPending}
                className="mb-2"
              >
                {generateCombinedTokenMutation.isPending && (
                  <LoaderIcon className="animate-spin" />
                )}
                Generate Combined URL
              </Button>
            )}

            {combinedIcalUrl ? (
              <div className="space-y-2">
                <Label htmlFor={`ical-combined-${room._id}`} className="text-xs">
                  iCal Feed URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`ical-combined-${room._id}`}
                    value={combinedIcalUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => handleCopy(combinedIcalUrl, "Combined calendar")}
                    aria-label="Copy combined URL"
                  >
                    <CopyIcon />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">✓ Ready to use</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Generate URL to sync all room numbers together
              </p>
            )}
          </div>

          {/* Per Room Number Section */}
          <div>
            <div className="mb-2 border-b border-border pb-1">
              <h4 className="text-sm font-semibold text-foreground">Per Room Number</h4>
              <p className="text-xs text-muted-foreground">
                Use when each room is a separate OTA listing
              </p>
            </div>

            {!room.icalTokensByRoomNumber && (
              <Button
                size="sm"
                onClick={handleGeneratePerNumber}
                disabled={generatePerNumberTokensMutation.isPending}
                className="mb-2"
              >
                {generatePerNumberTokensMutation.isPending && (
                  <LoaderIcon className="animate-spin" />
                )}
                Generate Per-Number URLs
              </Button>
            )}

            {room.icalTokensByRoomNumber ? (
              <div className="space-y-3">
                {room.roomNumbers.map((roomNumber) => {
                  const token = room.icalTokensByRoomNumber?.[roomNumber];
                  const url = token
                    ? `${origin}/api/public/ical/rooms/${room._id}/${token}.ics`
                    : null;

                  return (
                    <div key={roomNumber} className="space-y-1">
                      <Label
                        htmlFor={`ical-${room._id}-${roomNumber}`}
                        className="text-xs font-medium"
                      >
                        Room {roomNumber}
                      </Label>
                      {url && (
                        <div className="flex gap-2">
                          <Input
                            id={`ical-${room._id}-${roomNumber}`}
                            value={url}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => handleCopy(url, `Room ${roomNumber}`)}
                            aria-label={`Copy URL for room ${roomNumber}`}
                          >
                            <CopyIcon />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Generate separate URLs for each room number
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Import generateRoomIcalTokensByRoomNumber at top of file**

Add to existing imports from `@/api-clients/rooms`:

```typescript
import { generateRoomIcalToken, generateRoomIcalTokensByRoomNumber, type RoomListItem } from "@/api-clients/rooms";
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 4: Start dev server and visually inspect UI**

Run: `npm run dev`

Navigate to a property's integrations page and verify:
- Single-unit rooms show simple single-URL UI (unchanged)
- Multi-unit rooms show two-section layout with "Combined Calendar" and "Per Room Number" sections
- Both sections have "Generate" buttons when tokens don't exist
- Copy buttons work for all URL types

- [ ] **Step 5: Commit**

```bash
git add components/global/ota-calendar-sync-section.tsx
git commit -m "feat: add two-section layout for multi-unit room calendars"
```

---

### Task 7: Manual End-to-End Testing

**Files:** None (manual testing only)

- [ ] **Step 1: Test combined feed for multi-unit room**

1. Create or use existing multi-unit room with roomNumbers: ["101", "102", "103"]
2. Generate combined token via UI
3. Copy combined URL
4. Open URL in browser or import into calendar app
5. Verify feed contains all bookings for all room numbers

- [ ] **Step 2: Test per-number feeds**

1. Generate per-number tokens via UI
2. Verify all 3 room numbers show individual URLs
3. Create test booking for rooms 101 and 102 only
4. Open room 101 feed - verify it shows the booking
5. Open room 102 feed - verify it shows the booking
6. Open room 103 feed - verify it shows NO bookings (not allocated)

- [ ] **Step 3: Test both token types coexist**

1. Verify both combined and per-number URLs work simultaneously
2. Verify combined feed shows all bookings
3. Verify each per-number feed shows only its bookings

- [ ] **Step 4: Test single-unit room unchanged**

1. Navigate to single-unit room (no roomNumbers or only 1 room number)
2. Verify UI shows simple single-URL layout (not two-section)
3. Verify existing combined token still works

- [ ] **Step 5: Test error handling**

1. Try generating per-number tokens on room without roomNumbers
2. Verify error toast appears
3. Verify no tokens are created

- [ ] **Step 6: Document test results**

Add notes to this plan about any issues found during testing.

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Task 1: Data model - `icalTokensByRoomNumber` field added to Room type
- ✅ Task 2: API client - RoomListItem extended, `generateRoomIcalTokensByRoomNumber` function added
- ✅ Task 3: PATCH endpoint - handles `generateIcalTokensByRoomNumber` action
- ✅ Task 4: Public endpoint - validates both token types, filters bookings by room number
- ✅ Task 5: iCal formatter - accepts calendar name parameter
- ✅ Task 6: UI component - two-section layout for multi-unit rooms
- ✅ Task 7: Manual testing - covers all scenarios from spec

**Placeholder scan:**
- No "TBD", "TODO", or placeholder content
- All code blocks are complete
- All commands have expected output
- No references to undefined types or functions

**Type consistency:**
- `icalTokensByRoomNumber` type is `Record<string, string>` everywhere
- `generateIcalTokensByRoomNumber` action name is consistent across API client and endpoint
- `calendarName` parameter name is consistent in iCal formatter
- `roomNumberForToken` variable name is consistent in public endpoint

**No gaps found.**

---

## Notes

- This is an additive feature - no breaking changes to existing combined feed behavior
- Both token types can coexist on the same room
- Token generation is idempotent (existing tokens are reused)
- Legacy single-room bookings (without `rooms` map) are included in all per-number feeds as fallback
- Single-unit rooms continue showing simple UI unchanged
