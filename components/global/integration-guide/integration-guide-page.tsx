import { BookOpenIcon } from "lucide-react";
import Link from "next/link";

import { HomeToolbar } from "@/components/global/home-toolbar";
import { buttonVariants } from "@/components/ui/button";

import { CodeSample } from "./code-sample";

const GUIDE_SECTION_NAV = [
  { id: "base-url", label: "Base URL" },
  { id: "authentication", label: "Authentication" },
  { id: "origin-ip-rules", label: "Origin & IP rules" },
  { id: "get-list-rooms", label: "GET List rooms" },
  { id: "get-booking-options", label: "GET Booking options" },
  { id: "get-room-availability", label: "GET Room availability" },
  { id: "get-bookings-by-email", label: "GET Bookings by email" },
  { id: "get-booking-by-id", label: "GET Booking by id" },
  { id: "post-create-booking", label: "POST Create booking" },
  { id: "managing-api-keys", label: "Managing API keys" },
] as const;

function GuideSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function GuideSideNav() {
  return (
    <aside className="sticky top-4 hidden h-fit lg:block">
      <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">On this page</p>
        <nav aria-label="Integration guide sections" className="space-y-1">
          {GUIDE_SECTION_NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function ScopeTable() {
  const rows = [
    { scope: "*", note: "All public endpoints below." },
    { scope: "rooms:read", note: "List rooms for a property." },
    { scope: "availability:read", note: "Room availability and nightly prices." },
    { scope: "booking-options:read", note: "List active booking options for a property." },
    {
      scope: "bookings:read",
      note: "List bookings by guest email (guestEmail query) or get one booking by id (path).",
    },
    { scope: "bookings:write", note: "Create bookings." },
  ];
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="px-3 py-2 font-medium">Scope</th>
            <th className="px-3 py-2 font-medium">Allows</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.scope} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2 font-mono text-xs">{row.scope}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type IntegrationGuidePageProps = {
  /** From the server request so SSR and hydration match `window.location` in the browser. */
  publicApiBaseUrl: string;
};

export function IntegrationGuidePage({ publicApiBaseUrl }: IntegrationGuidePageProps) {
  const baseUrl = publicApiBaseUrl;

  const listRoomsExample = `curl -s \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "${baseUrl}/properties/YOUR_PROPERTY_ID/rooms"`;

  const listBookingOptionsExample = `curl -s \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "${baseUrl}/properties/YOUR_PROPERTY_ID/booking-options"`;

  const availabilityExample = `curl -s \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "${baseUrl}/properties/YOUR_PROPERTY_ID/room-availability?from=2026-04-01&to=2026-04-14"`;

  const listBookingsByEmailExample = `curl -s \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "${baseUrl}/properties/YOUR_PROPERTY_ID/bookings?guestEmail=jane%40example.com"`;

  const getBookingByIdExample = `curl -s \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "${baseUrl}/properties/YOUR_PROPERTY_ID/bookings/BOOKING_OBJECT_ID"`;

  const createBookingExample = `curl -s -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "guestName": "Jane Guest",
    "guestEmail": "jane@example.com",
    "checkIn": "2026-05-01T14:00:00.000Z",
    "checkOut": "2026-05-04T11:00:00.000Z",
    "numberOfGuests": 2,
    "rooms": [
      { "roomId": "ROOM_OBJECT_ID", "quantity": 1 }
    ],
    "selectedOptions": [
      {
        "bookingOptionId": "BOOKING_OPTION_OBJECT_ID",
        "name": "Breakfast",
        "appliesTo": "user",
        "frequency": "day",
        "pricePerUnit": 350,
        "quantity": 2
      }
    ],
    "status": "pending"
  }' \\
  "${baseUrl}/properties/YOUR_PROPERTY_ID/bookings"`;

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-gradient-to-b from-muted/45 via-background to-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <HomeToolbar />

        <header className="flex flex-col gap-4 border-b border-border/60 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpenIcon className="size-5 shrink-0" aria-hidden />
                <span className="text-xs font-medium uppercase tracking-wide">Documentation</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Public API integration</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Use versioned HTTP endpoints to list rooms and booking options, read availability with nightly pricing,
                create bookings, and look up bookings by guest email or booking id from your website. Authenticate with
                an API key you create under each property&apos;s{" "}
                <span className="text-foreground/90">Integrations</span> page.
              </p>
            </div>
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}
            >
              Back to properties
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <GuideSideNav />
          <div className="flex flex-col gap-6">
          <GuideSection
            id="base-url"
            title="Base URL"
            description="All public routes share this prefix. Replace YOUR_PROPERTY_ID with the property’s id from the dashboard."
          >
            <CodeSample code={`${baseUrl}/properties/{propertyId}/...`} />
          </GuideSection>

          <GuideSection
            id="authentication"
            title="Authentication"
            description="Send the secret key as a Bearer token. Create keys in Integrations and select the scopes you need."
          >
            <p className="mb-3 text-sm text-muted-foreground">
              Header: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer &lt;api_key&gt;</code>
            </p>
            <ScopeTable />
          </GuideSection>

          <GuideSection
            id="origin-ip-rules"
            title="Origin and IP rules"
            description="Optional restrictions configured per key in Integrations."
          >
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground/90">Allowed origins</span> — If set, browser requests must send a
                matching <code className="rounded bg-muted px-1 font-mono text-[0.8rem]">Origin</code> header. Requests
                without Origin (typical server-to-server) are still allowed.
              </li>
              <li>
                <span className="text-foreground/90">Allowed IPs</span> — If set, the client IP (first entry in{" "}
                <code className="rounded bg-muted px-1 font-mono text-[0.8rem]">X-Forwarded-For</code>) must match.
              </li>
            </ul>
          </GuideSection>

          <GuideSection
            id="get-list-rooms"
            title="GET — List rooms"
            description="Scope: rooms:read. Returns active rooms with serialized tags and images."
          >
            <CodeSample title="Example" code={listRoomsExample} />
          </GuideSection>

          <GuideSection
            id="get-booking-options"
            title="GET — Booking options"
            description="Scope: booking-options:read. Returns active booking options for this property."
          >
            <CodeSample title="Example" code={listBookingOptionsExample} />
          </GuideSection>

          <GuideSection
            id="get-room-availability"
            title="GET — Room availability"
            description="Scope: availability:read. Query params from and to are YYYY-MM-DD (UTC). Defaults: from today, through 29 nights ahead. Maximum range: 62 nights."
          >
            <CodeSample title="Example" code={availabilityExample} />
          </GuideSection>

          <GuideSection
            id="get-bookings-by-email"
            title="GET — Bookings by guest email"
            description="Scope: bookings:read. Query param guestEmail is required (URL-encoded). Returns bookings for this property whose guest email matches, case-insensitive. Does not list all bookings without an email filter."
          >
            <CodeSample title="Example" code={listBookingsByEmailExample} />
          </GuideSection>

          <GuideSection
            id="get-booking-by-id"
            title="GET — Booking by id"
            description="Scope: bookings:read. Path segment is the booking’s MongoDB id. Returns full booking details for this property, or 404 if missing."
          >
            <CodeSample title="Example" code={getBookingByIdExample} />
          </GuideSection>

          <GuideSection
            id="post-create-booking"
            title="POST — Create booking"
            description="Scope: bookings:write. Guest fields, ISO checkIn/checkOut, and rooms (array items: roomId, quantity, optional roomNumbers). Optional status enum: pending | confirmed | cancelled | no_show (default: pending). Optional advanceAmount, selectedOptions, customItems. For selectedOptions, send full snapshot fields (bookingOptionId, name, appliesTo, frequency, pricePerUnit, quantity), not just the id."
          >
            <CodeSample title="Example" code={createBookingExample} />
            <p className="mt-3 text-sm text-muted-foreground">
              Tip: fetch option definitions first from{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                GET /api/public/v1/properties/YOUR_PROPERTY_ID/booking-options
              </code>{" "}
              and copy the option fields into <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">selectedOptions</code>.
            </p>
          </GuideSection>

          <GuideSection id="managing-api-keys" title="Managing API keys" description="Keys are created per property and organization.">
            <p className="text-sm text-muted-foreground">
              Open a property, then choose <span className="text-foreground/90">Integrations</span> in the sidebar (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/[propertyId]/integrations</code>
              ). Pick scopes and optionally restrict origins or IPs. The raw secret is shown only once when the key is
              created.
            </p>
          </GuideSection>
          </div>
        </div>
      </div>
    </main>
  );
}
