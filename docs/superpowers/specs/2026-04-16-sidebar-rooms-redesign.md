# Sidebar & Rooms Page Redesign — Airbnb for Hosts Style

**Date:** 2026-04-16
**Scope:** `components/global/property-sidebar.tsx`, `app/[id]/rooms/page.tsx`, `components/global/room-list-item.tsx`
**Target:** Framer implementation using Framer MCP tools

---

## Design Direction

Airbnb for Hosts aesthetic: clean white surfaces, warm coral accent (`#FF5A5F`), soft shadows, Airbnb's gray text palette, and enriched list rows for room management. Zero learning curve for hospitality operators familiar with Airbnb.

---

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent` | `#FF5A5F` | Active nav, CTA buttons, type badges |
| `--color-accent-bg` | `#FFF0EF` | Active nav background, badge background |
| `--color-text-primary` | `#222222` | Headings, room names |
| `--color-text-secondary` | `#484848` | Body text, nav labels |
| `--color-text-muted` | `#717171` | Subtitles, column headers, email |
| `--color-border` | `#EBEBEB` | Card borders, sidebar border, row dividers |
| `--color-surface` | `#FFFFFF` | Sidebar, cards, page background |
| `--color-hover` | `#F7F7F7` | Nav item hover, thumbnail placeholder |
| `--color-divider` | `#F0F0F0` | Row dividers inside cards |

---

## Sidebar

### Structure
- Pure white background (`#FFFFFF`)
- `1px` right border in `#EBEBEB`
- Width: `240px` expanded, `64px` collapsed
- Three zones: property header / nav items / user footer

### Property Header
- `40×40px` rounded square avatar (coral gradient, first letter initial)
- Property name: `14px` semibold `#222222`
- Org switcher chevron on the right
- `1px` bottom border `#EBEBEB` separating from nav

### Nav Items
- Item height: `40px`, horizontal padding: `12px`, border-radius: `8px`
- Icon: `20px`, color `#717171` (inactive)
- Label: `14px` regular `#484848` (inactive)
- **Active state:** `3px` coral left bar, background `#FFF0EF`, icon + label `#FF5A5F`
- **Hover state:** background `#F7F7F7`
- Nav items: Dashboard · Rooms · Availability · Bookings · Integrations

### User Footer
- Separated by `1px` top border `#EBEBEB`
- `36px` Clerk UserButton avatar
- Name: `13px` semibold `#222222`
- Email: `12px` `#717171`
- Collapsed: avatar only

---

## Rooms Page

### Page Header
- Title: `"Rooms"` — `24px` semibold `#222222`
- Subtitle: `"Manage your property's room inventory"` — `14px` `#717171`
- CTA button top-right: `"+ Add room"`, coral `#FF5A5F` background, white label, `8px` border-radius, `14px` semibold

### Room List Container
- Background: `#FFFFFF`
- Border: `1px solid #EBEBEB`, border-radius: `12px`
- Shadow: `0 1px 4px rgba(0,0,0,0.08)`
- Column header row: `12px` uppercase `#717171` — ROOM / TYPE / GUESTS & BEDS / PRICING / STATUS / ACTIONS

### Room Row
- Height: `72px`, horizontal padding: `16px`
- Divider between rows: `1px solid #F0F0F0`

**Columns:**
1. **Thumbnail** — `48×48px`, background `#F7F7F7`, `BedDouble` icon `#BBBBBB`, `8px` border-radius
2. **Room info** — Name `14px` semibold `#222222`, tagline `12px` `#717171`
3. **Type badge** — pill, background `#FFF0EF`, text `#FF5A5F`, e.g. "Double"
4. **Guests & beds** — icon + number, `13px` `#484848`
5. **Pricing** — weekday `14px` semibold `#222222`, weekend `12px` `#717171`
6. **Status chip:**
   - Active: background `#E8F5E9`, text `#2E7D32`
   - Maintenance: background `#FFF3E0`, text `#E65100`
   - Out of order: background `#FCE4EC`, text `#C62828`
   - Inactive: background `#F5F5F5`, text `#9E9E9E`
7. **Actions** — Ghost `Edit` button + red `Delete` icon, visible on row hover

### Empty State
- Centered layout
- `"No rooms yet"` — `16px` semibold `#222222`
- `"Add your first room"` — coral link or button

---

## Implementation Target

Redesign is to be applied in **Framer** using the Framer MCP tools:
- Read current project XML to understand existing node structure
- Create/update code files for sidebar and rooms page components
- Apply color styles and text styles matching the tokens above
- Export or update nodes to reflect the new design
