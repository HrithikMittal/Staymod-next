"use client";

import { BookOpenIcon } from "lucide-react";
import Link from "next/link";

import { HomeToolbar } from "@/components/global/home-toolbar";
import { buttonVariants } from "@/components/ui/button";

import { CodeSample } from "./code-sample";

function GuideSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ScopeTable() {
  const rows = [
    { scope: "*", note: "All public endpoints below." },
    { scope: "rooms:read", note: "List rooms for a property." },
    { scope: "availability:read", note: "Room availability and nightly prices." },
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

  const availabilityExample = `curl -s \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "${baseUrl}/properties/YOUR_PROPERTY_ID/room-availability?from=2026-04-01&to=2026-04-14"`;

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
    "status": "pending"
  }' \\
  "${baseUrl}/properties/YOUR_PROPERTY_ID/bookings"`;

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-gradient-to-b from-muted/45 via-background to-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 md:px-8">
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
                Use versioned HTTP endpoints to list rooms, read availability with nightly pricing, and create
                bookings from your website. Authenticate with an API key you create under each property&apos;s{" "}
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

        <div className="flex flex-col gap-6">
          <GuideSection
            title="Base URL"
            description="All public routes share this prefix. Replace YOUR_PROPERTY_ID with the property’s id from the dashboard."
          >
            <CodeSample code={`${baseUrl}/properties/{propertyId}/...`} />
          </GuideSection>

          <GuideSection
            title="Authentication"
            description="Send the secret key as a Bearer token. Create keys in Integrations and select the scopes you need."
          >
            <p className="mb-3 text-sm text-muted-foreground">
              Header: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer &lt;api_key&gt;</code>
            </p>
            <ScopeTable />
          </GuideSection>

          <GuideSection
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
            title="GET — List rooms"
            description="Scope: rooms:read. Returns active rooms with serialized tags and images."
          >
            <CodeSample title="Example" code={listRoomsExample} />
          </GuideSection>

          <GuideSection
            title="GET — Room availability"
            description="Scope: availability:read. Query params from and to are YYYY-MM-DD (UTC). Defaults: from today, through 29 nights ahead. Maximum range: 62 nights."
          >
            <CodeSample title="Example" code={availabilityExample} />
          </GuideSection>

          <GuideSection
            title="POST — Create booking"
            description="Scope: bookings:write. Guest fields, ISO checkIn/checkOut, and rooms (array items: roomId, quantity, optional roomNumbers). Optional: status — pending, confirmed, cancelled, or no_show (default pending). Optional advanceAmount, selectedOptions, customItems."
          >
            <CodeSample title="Example" code={createBookingExample} />
          </GuideSection>

          <GuideSection title="Managing API keys" description="Keys are created per property and organization.">
            <p className="text-sm text-muted-foreground">
              Open a property, then choose <span className="text-foreground/90">Integrations</span> in the sidebar (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/[propertyId]/integrations</code>
              ). Pick scopes and optionally restrict origins or IPs. The raw secret is shown only once when the key is
              created.
            </p>
          </GuideSection>
        </div>
      </div>
    </main>
  );
}
