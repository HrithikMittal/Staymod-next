# Sidebar & Rooms Page Framer Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Staymod property sidebar and Rooms page in Framer using the Airbnb for Hosts aesthetic — clean white surfaces, coral accent (#FF5A5F), warm typography, enriched room rows.

**Architecture:** Two Framer code components (`Sidebar.tsx` and `RoomsPage.tsx`) created via the Framer MCP, then inserted into the Framer canvas side-by-side to show the full dashboard layout. Color and text styles are set up first as project-level tokens.

**Tech Stack:** Framer MCP tools (`manageColorStyle`, `manageTextStyle`, `createCodeFile`, `updateXmlForNode`), React/TypeScript Framer code components, Inline SVG icons.

**Spec:** `docs/superpowers/specs/2026-04-16-sidebar-rooms-redesign.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| Framer color styles | Create | Design tokens for the project |
| Framer text styles | Create | Typography tokens |
| `Sidebar.tsx` | Create (Framer code file) | Collapsible sidebar component |
| `RoomsPage.tsx` | Create (Framer code file) | Rooms page with header + room list |
| Framer canvas (page `augiA20Il`) | Update | Place both components side-by-side |

---

## Task 1: Explore Current Framer Page

**Purpose:** Understand existing canvas structure before making changes.

- [ ] **Step 1: Get root page XML**

Call `getNodeXml` with nodeId `augiA20Il`. Note any existing nodes that may conflict or need to be cleared.

- [ ] **Step 2: Note the page dimensions and any existing content**

If the page has existing frames/nodes that would conflict with the new design, note their nodeIds for cleanup in Task 5.

---

## Task 2: Set Up Color Styles

**Purpose:** Create project-level color tokens matching the spec. These will be referenced in code components.

- [ ] **Step 1: Create Accent color**

Call `manageColorStyle`:
```json
{
  "type": "create",
  "stylePath": "/Airbnb/Accent",
  "properties": { "light": "#FF5A5F" }
}
```

- [ ] **Step 2: Create Accent Background color**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/AccentBg",
  "properties": { "light": "#FFF0EF" }
}
```

- [ ] **Step 3: Create Text Primary color**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/TextPrimary",
  "properties": { "light": "#222222" }
}
```

- [ ] **Step 4: Create Text Secondary color**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/TextSecondary",
  "properties": { "light": "#484848" }
}
```

- [ ] **Step 5: Create Text Muted color**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/TextMuted",
  "properties": { "light": "#717171" }
}
```

- [ ] **Step 6: Create Border color**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/Border",
  "properties": { "light": "#EBEBEB" }
}
```

- [ ] **Step 7: Create Surface color**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/Surface",
  "properties": { "light": "#FFFFFF" }
}
```

- [ ] **Step 8: Create Hover color**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/Hover",
  "properties": { "light": "#F7F7F7" }
}
```

- [ ] **Step 9: Create Divider color**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/Divider",
  "properties": { "light": "#F0F0F0" }
}
```

---

## Task 3: Set Up Text Styles

**Purpose:** Create typography tokens used across both components.

- [ ] **Step 1: Create Page Title style**

Call `manageTextStyle`:
```json
{
  "type": "create",
  "stylePath": "/Airbnb/PageTitle",
  "properties": {
    "font": "GF;Inter-600",
    "fontSize": "24px",
    "lineHeight": "32px",
    "color": "#222222",
    "tag": "h1"
  }
}
```

- [ ] **Step 2: Create Body style**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/Body",
  "properties": {
    "font": "GF;Inter-400",
    "fontSize": "14px",
    "lineHeight": "20px",
    "color": "#484848"
  }
}
```

- [ ] **Step 3: Create Caption style**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/Caption",
  "properties": {
    "font": "GF;Inter-400",
    "fontSize": "12px",
    "lineHeight": "16px",
    "color": "#717171"
  }
}
```

- [ ] **Step 4: Create Label style (column headers)**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/Label",
  "properties": {
    "font": "GF;Inter-500",
    "fontSize": "12px",
    "lineHeight": "16px",
    "color": "#717171",
    "transform": "uppercase",
    "letterSpacing": "0.05em"
  }
}
```

- [ ] **Step 5: Create RoomName style**

```json
{
  "type": "create",
  "stylePath": "/Airbnb/RoomName",
  "properties": {
    "font": "GF;Inter-600",
    "fontSize": "14px",
    "lineHeight": "20px",
    "color": "#222222"
  }
}
```

---

## Task 4: Create Sidebar Code Component

**Purpose:** Build the collapsible Airbnb-style sidebar as a Framer code component.

- [ ] **Step 1: Read the Framer code file guide**

Call `ReadMcpResourceTool` with URI `mcp://mcp.unframer.co/prompts/how-to-write-framer-code-files.md` to understand any Framer-specific code requirements before writing.

- [ ] **Step 2: Create `Sidebar.tsx`**

Call `createCodeFile` with name `"Sidebar.tsx"` and the following content:

```tsx
import { addPropertyControls, ControlType } from "framer"

const NAV_ITEMS = [
    { label: "Dashboard", icon: DashboardIcon },
    { label: "Rooms", icon: RoomsIcon },
    { label: "Availability", icon: AvailabilityIcon },
    { label: "Bookings", icon: BookingsIcon },
    { label: "Integrations", icon: IntegrationsIcon },
]

const STATUS_COLORS = {
    active: { bg: "#E8F5E9", text: "#2E7D32" },
    maintenance: { bg: "#FFF3E0", text: "#E65100" },
    out_of_order: { bg: "#FCE4EC", text: "#C62828" },
    inactive: { bg: "#F5F5F5", text: "#9E9E9E" },
}

function DashboardIcon({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
            <rect x="11" y="2" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
            <rect x="2" y="11" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
            <rect x="11" y="11" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
        </svg>
    )
}

function RoomsIcon({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="8" width="16" height="9" rx="1.5" stroke={color} strokeWidth="1.5" />
            <path d="M5 8V6a3 3 0 016 0v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M2 13h16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

function AvailabilityIcon({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="4" width="14" height="13" rx="1.5" stroke={color} strokeWidth="1.5" />
            <path d="M3 8h14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 3v2M13 3v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="12" r="1" fill={color} />
            <circle cx="10" cy="12" r="1" fill={color} />
            <circle cx="13" cy="12" r="1" fill={color} />
        </svg>
    )
}

function BookingsIcon({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="14" height="14" rx="1.5" stroke={color} strokeWidth="1.5" />
            <path d="M7 7h6M7 10h6M7 13h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

function IntegrationsIcon({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="5" cy="10" r="2.5" stroke={color} strokeWidth="1.5" />
            <circle cx="15" cy="5" r="2.5" stroke={color} strokeWidth="1.5" />
            <circle cx="15" cy="15" r="2.5" stroke={color} strokeWidth="1.5" />
            <path d="M7.5 10h3.5M12.5 6.5L7.5 9.5M12.5 13.5L7.5 10.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

function ChevronDownIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="#717171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function Sidebar({
    activeItem = "Rooms",
    collapsed = false,
    propertyName = "Sunset Villa",
}: {
    activeItem?: string
    collapsed?: boolean
    propertyName?: string
}) {
    const width = collapsed ? 64 : 240

    return (
        <div
            style={{
                width,
                height: "100%",
                minHeight: "100vh",
                backgroundColor: "#FFFFFF",
                borderRight: "1px solid #EBEBEB",
                display: "flex",
                flexDirection: "column",
                fontFamily:
                    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                flexShrink: 0,
            }}
        >
            {/* Property Header */}
            <div
                style={{
                    padding: "16px 12px",
                    borderBottom: "1px solid #EBEBEB",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 72,
                }}
            >
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background:
                            "linear-gradient(135deg, #FF5A5F 0%, #FF8A8E 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        fontWeight: 700,
                        fontSize: 16,
                        flexShrink: 0,
                        boxShadow: "0 2px 8px rgba(255,90,95,0.3)",
                    }}
                >
                    {propertyName.charAt(0).toUpperCase()}
                </div>
                {!collapsed && (
                    <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "#222222",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {propertyName}
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#717171",
                                    marginTop: 1,
                                }}
                            >
                                Property
                            </div>
                        </div>
                        <ChevronDownIcon />
                    </>
                )}
            </div>

            {/* Nav Items */}
            <div
                style={{
                    flex: 1,
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                {NAV_ITEMS.map((item) => {
                    const isActive = item.label === activeItem
                    const iconColor = isActive ? "#FF5A5F" : "#717171"
                    return (
                        <div
                            key={item.label}
                            style={{
                                height: 40,
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                padding: collapsed ? "0 10px" : "0 10px",
                                gap: 10,
                                backgroundColor: isActive
                                    ? "#FFF0EF"
                                    : "transparent",
                                borderLeft: isActive
                                    ? "3px solid #FF5A5F"
                                    : "3px solid transparent",
                                cursor: "pointer",
                                justifyContent: collapsed ? "center" : "flex-start",
                            }}
                        >
                            <item.icon color={iconColor} />
                            {!collapsed && (
                                <span
                                    style={{
                                        fontSize: 14,
                                        color: isActive ? "#FF5A5F" : "#484848",
                                        fontWeight: isActive ? 500 : 400,
                                        userSelect: "none",
                                    }}
                                >
                                    {item.label}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* User Footer */}
            <div
                style={{
                    padding: "12px",
                    borderTop: "1px solid #EBEBEB",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: "#F7F7F7",
                        border: "1px solid #EBEBEB",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#484848",
                        flexShrink: 0,
                    }}
                >
                    A
                </div>
                {!collapsed && (
                    <div style={{ minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#222222",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            Admin User
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "#717171",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            admin@staymod.com
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

addPropertyControls(Sidebar, {
    activeItem: {
        type: ControlType.Enum,
        title: "Active Item",
        options: ["Dashboard", "Rooms", "Availability", "Bookings", "Integrations"],
        defaultValue: "Rooms",
    },
    collapsed: {
        type: ControlType.Boolean,
        title: "Collapsed",
        defaultValue: false,
    },
    propertyName: {
        type: ControlType.String,
        title: "Property Name",
        defaultValue: "Sunset Villa",
    },
})
```

- [ ] **Step 3: Note the returned `insertUrl`** for use in Task 6.

---

## Task 5: Create RoomsPage Code Component

**Purpose:** Build the Rooms page with header, column headers, and sample room rows.

- [ ] **Step 1: Create `RoomsPage.tsx`**

Call `createCodeFile` with name `"RoomsPage.tsx"` and the following content:

```tsx
import { addPropertyControls, ControlType } from "framer"

const SAMPLE_ROOMS = [
    {
        name: "Deluxe Double Room",
        tagline: "Sea view · 2nd floor",
        type: "Double",
        guests: 2,
        beds: 1,
        bedSize: "King",
        weekday: 2400,
        weekend: 3200,
        status: "active" as const,
    },
    {
        name: "Premium Suite",
        tagline: "Corner suite with balcony",
        type: "Suite",
        guests: 4,
        beds: 2,
        bedSize: "King + Twin",
        weekday: 5500,
        weekend: 7000,
        status: "active" as const,
    },
    {
        name: "Standard Single",
        tagline: "Compact and cozy",
        type: "Single",
        guests: 1,
        beds: 1,
        bedSize: "Single",
        weekday: 1200,
        weekend: 1600,
        status: "maintenance" as const,
    },
    {
        name: "Family Room",
        tagline: "Spacious with extra beds",
        type: "Family",
        guests: 5,
        beds: 3,
        bedSize: "Queen + 2 Twin",
        weekday: 3800,
        weekend: 4800,
        status: "inactive" as const,
    },
]

type RoomStatus = "active" | "maintenance" | "out_of_order" | "inactive"

const STATUS_CONFIG: Record<
    RoomStatus,
    { bg: string; text: string; label: string }
> = {
    active: { bg: "#E8F5E9", text: "#2E7D32", label: "Active" },
    maintenance: { bg: "#FFF3E0", text: "#E65100", label: "Maintenance" },
    out_of_order: { bg: "#FCE4EC", text: "#C62828", label: "Out of order" },
    inactive: { bg: "#F5F5F5", text: "#9E9E9E", label: "Inactive" },
}

function BedIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect
                x="1"
                y="5"
                width="12"
                height="7"
                rx="1"
                stroke="#717171"
                strokeWidth="1.2"
            />
            <path
                d="M3.5 5V4a2.5 2.5 0 015 0v1"
                stroke="#717171"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
            <path
                d="M1 9h12"
                stroke="#717171"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
        </svg>
    )
}

function GuestIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle
                cx="7"
                cy="4.5"
                r="2.5"
                stroke="#717171"
                strokeWidth="1.2"
            />
            <path
                d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5"
                stroke="#717171"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
        </svg>
    )
}

function EditIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
                d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z"
                stroke="#717171"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function DeleteIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
                d="M2 3.5h10M5.5 3.5V2.5h3v1M5 3.5l.5 7.5h3L9 3.5"
                stroke="#E53935"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function ThumbnailPlaceholder() {
    return (
        <div
            style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                backgroundColor: "#F7F7F7",
                border: "1px solid #EBEBEB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}
        >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect
                    x="2"
                    y="8"
                    width="16"
                    height="9"
                    rx="1.5"
                    stroke="#BBBBBB"
                    strokeWidth="1.5"
                />
                <path
                    d="M5 8V6a3 3 0 016 0v2"
                    stroke="#BBBBBB"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <path
                    d="M2 13h16"
                    stroke="#BBBBBB"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    )
}

function RoomRow({
    room,
    isLast,
}: {
    room: (typeof SAMPLE_ROOMS)[0]
    isLast: boolean
}) {
    const status = STATUS_CONFIG[room.status]
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1fr 80px",
                alignItems: "center",
                padding: "12px 16px",
                gap: 16,
                borderBottom: isLast ? "none" : "1px solid #F0F0F0",
                backgroundColor: "#FFFFFF",
            }}
        >
            {/* Room info */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                }}
            >
                <ThumbnailPlaceholder />
                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#222222",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {room.name}
                    </div>
                    <div
                        style={{
                            fontSize: 12,
                            color: "#717171",
                            marginTop: 2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {room.tagline}
                    </div>
                </div>
            </div>

            {/* Type badge */}
            <div>
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        backgroundColor: "#FFF0EF",
                        color: "#FF5A5F",
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "3px 10px",
                        borderRadius: 100,
                        border: "1px solid #FFCDD0",
                    }}
                >
                    {room.type}
                </span>
            </div>

            {/* Guests & beds */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 13,
                        color: "#484848",
                    }}
                >
                    <GuestIcon />
                    {room.guests} guests
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 13,
                        color: "#484848",
                    }}
                >
                    <BedIcon />
                    {room.bedSize}
                </div>
            </div>

            {/* Pricing */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#222222",
                    }}
                >
                    ₹{room.weekday.toLocaleString("en-IN")}
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 400,
                            color: "#717171",
                            marginLeft: 4,
                        }}
                    >
                        /wkday
                    </span>
                </div>
                <div style={{ fontSize: 12, color: "#717171" }}>
                    ₹{room.weekend.toLocaleString("en-IN")}
                    <span style={{ marginLeft: 4 }}>/wkend</span>
                </div>
            </div>

            {/* Status chip */}
            <div>
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        backgroundColor: status.bg,
                        color: status.text,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "3px 10px",
                        borderRadius: 100,
                    }}
                >
                    {status.label}
                </span>
            </div>

            {/* Actions */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "flex-end",
                }}
            >
                <button
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: "1px solid #EBEBEB",
                        backgroundColor: "#FFFFFF",
                        color: "#484848",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                    }}
                >
                    <EditIcon />
                    Edit
                </button>
                <button
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "1px solid #FFCDD0",
                        backgroundColor: "#FFF5F5",
                        cursor: "pointer",
                    }}
                >
                    <DeleteIcon />
                </button>
            </div>
        </div>
    )
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function RoomsPage({
    pageBackground = "#FAFAFA",
}: {
    pageBackground?: string
}) {
    return (
        <div
            style={{
                flex: 1,
                padding: "32px",
                backgroundColor: pageBackground,
                fontFamily:
                    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                minWidth: 0,
                overflow: "auto",
            }}
        >
            {/* Page header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 24,
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: 24,
                            fontWeight: 600,
                            color: "#222222",
                            margin: 0,
                            lineHeight: "32px",
                        }}
                    >
                        Rooms
                    </h1>
                    <p
                        style={{
                            fontSize: 14,
                            color: "#717171",
                            margin: "4px 0 0 0",
                            lineHeight: "20px",
                        }}
                    >
                        Manage your property's room inventory
                    </p>
                </div>
                <button
                    style={{
                        backgroundColor: "#FF5A5F",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 16px",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 8px rgba(255,90,95,0.3)",
                    }}
                >
                    + Add room
                </button>
            </div>

            {/* Room list card */}
            <div
                style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    border: "1px solid #EBEBEB",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    overflow: "hidden",
                }}
            >
                {/* Column headers */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1fr 80px",
                        padding: "12px 16px",
                        borderBottom: "1px solid #F0F0F0",
                        gap: 16,
                        backgroundColor: "#FAFAFA",
                    }}
                >
                    {[
                        "ROOM",
                        "TYPE",
                        "GUESTS & BEDS",
                        "PRICING",
                        "STATUS",
                        "ACTIONS",
                    ].map((col) => (
                        <div
                            key={col}
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#717171",
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                            }}
                        >
                            {col}
                        </div>
                    ))}
                </div>

                {/* Room rows */}
                {SAMPLE_ROOMS.map((room, i) => (
                    <RoomRow
                        key={room.name}
                        room={room}
                        isLast={i === SAMPLE_ROOMS.length - 1}
                    />
                ))}
            </div>
        </div>
    )
}

addPropertyControls(RoomsPage, {
    pageBackground: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#FAFAFA",
    },
})
```

- [ ] **Step 2: Note the returned `insertUrl`** for use in Task 6.

---

## Task 6: Compose Dashboard Layout on Canvas

**Purpose:** Insert both components side-by-side on the Framer canvas to show the full dashboard.

- [ ] **Step 1: Get current page XML**

Call `getNodeXml` with nodeId `augiA20Il` to check what currently exists on the canvas.

- [ ] **Step 2: Insert dashboard wrapper frame**

Call `updateXmlForNode` with nodeId `augiA20Il`. Create a wrapper frame that holds sidebar + rooms page side by side:

```xml
<Frame
  nodeId="augiA20Il"
  width="1280px"
  height="900px"
  position="absolute"
  top="0px"
  left="0px"
  backgroundColor="rgb(250,250,250)"
  layout="stack"
  stackDirection="horizontal"
  stackDistribution="start"
  stackAlignment="start"
  overflow="hidden">

  <ComponentInstance
    insertUrl="SIDEBAR_INSERT_URL_FROM_TASK_4"
    width="240px"
    height="900px"
  />

  <ComponentInstance
    insertUrl="ROOMS_PAGE_INSERT_URL_FROM_TASK_5"
    width="1040px"
    height="900px"
  />
</Frame>
```

> Replace `SIDEBAR_INSERT_URL_FROM_TASK_4` and `ROOMS_PAGE_INSERT_URL_FROM_TASK_5` with the actual `insertUrl` values returned by `createCodeFile` in Tasks 4 and 5.

- [ ] **Step 3: Zoom into the result**

Call `mcp__framer__zoomIntoView` with the nodeId of the wrapper frame to visually confirm the layout looks correct in Framer.

- [ ] **Step 4: Visual check — Sidebar**

Confirm in Framer:
- [ ] White background, coral left bar on "Rooms" active item
- [ ] Property avatar with gradient and first letter
- [ ] All 5 nav items with icons and labels
- [ ] User footer with avatar, name, email

- [ ] **Step 5: Visual check — Rooms page**

Confirm in Framer:
- [ ] "Rooms" title + subtitle + coral "+ Add room" button
- [ ] White card with column headers in uppercase gray
- [ ] 4 sample room rows with thumbnails, type badges, pricing, status chips, actions
- [ ] Active = green chip, Maintenance = amber chip, Inactive = gray chip

---

## Task 7: Commit

- [ ] **Step 1: Commit the design**

```bash
git add docs/superpowers/specs/2026-04-16-sidebar-rooms-redesign.md
git add docs/superpowers/plans/2026-04-16-sidebar-rooms-framer-redesign.md
git commit -m "feat: Airbnb-style sidebar and rooms page redesign in Framer"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Sidebar (header, nav items, active state, footer) ✓ | Rooms page (header, CTA, column headers, room rows, status chips, actions) ✓ | Color tokens ✓ | Typography ✓
- [x] **No placeholders:** All steps contain exact tool call parameters or full code
- [x] **Type consistency:** `RoomStatus` type defined and used consistently, `STATUS_CONFIG` keys match type values, `SAMPLE_ROOMS` uses `as const` for status values
