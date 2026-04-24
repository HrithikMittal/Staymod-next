"use client";

import type { BookingListItem, ListBookingsResponse } from "@/api-clients/bookings";
import type { ListRoomsResponse } from "@/api-clients/rooms";
import { CreateBookingDialog } from "@/components/global/create-booking-dialog";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks";
import {
  bookingRoomSummary,
  computeDashboardMetrics,
  dateKeyInTimeZone,
  todayKeyInTimeZone,
} from "@/lib/property-dashboard-stats";
import { cn } from "@/lib/utils";
import {
  ArrowRightIcon,
  BedDoubleIcon,
  CalendarClockIcon,
  CalendarRangeIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  CoinsIcon,
  DoorOpenIcon,
  HandCoinsIcon,
  PlusIcon,
  SettingsIcon,
  SunIcon,
  TagIcon,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

type PropertyPayload = {
  property: {
    _id: string;
    name: string;
    currency: string;
    timezone: string;
  };
};

function formatCurrency(amount: number, currency: string): string {
  const code = currency?.trim() || "INR";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${Math.round(amount).toLocaleString()}`;
  }
}

function formatShortDate(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function PropertyDashboardPage() {
  const params = useParams();
  const propertyId = typeof params.id === "string" ? params.id : "";

  const [dialog, setDialog] = useState<{
    open: boolean;
    booking: BookingListItem | null;
  }>({ open: false, booking: null });

  const propertyQuery = useApiQuery<PropertyPayload>(
    ["property", propertyId],
    `/api/properties/${propertyId}`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const bookingsQuery = useApiQuery<ListBookingsResponse>(
    ["bookings", propertyId],
    `/api/properties/${propertyId}/bookings`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const roomsQuery = useApiQuery<ListRoomsResponse>(
    ["rooms", propertyId],
    `/api/properties/${propertyId}/rooms`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const timeZone = propertyQuery.data?.property.timezone ?? "UTC";
  const currency = propertyQuery.data?.property.currency ?? "INR";
  const propertyName = propertyQuery.data?.property.name;

  const roomNameById = useMemo(() => {
    const m = new Map<string, string>();
    roomsQuery.data?.rooms.forEach((r) => m.set(r._id, r.name));
    return m;
  }, [roomsQuery.data?.rooms]);

  const metrics = useMemo(() => {
    const list = bookingsQuery.data?.bookings ?? [];
    const rooms = roomsQuery.data?.rooms ?? [];
    return computeDashboardMetrics(list, rooms, timeZone);
  }, [bookingsQuery.data?.bookings, roomsQuery.data?.rooms, timeZone]);

  const upcomingArrivals = useMemo(() => {
    const list = bookingsQuery.data?.bookings ?? [];
    const todayKey = todayKeyInTimeZone(timeZone);
    const filtered = list.filter((b) => {
      if (b.status === "cancelled") {
        return false;
      }
      const inKey = dateKeyInTimeZone(b.checkIn, timeZone);
      return inKey >= todayKey;
    });
    return [...filtered].sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()).slice(0, 10);
  }, [bookingsQuery.data?.bookings, timeZone]);

  const recentBookings = useMemo(() => {
    const list = bookingsQuery.data?.bookings ?? [];
    return [...list]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [bookingsQuery.data?.bookings]);

  const loading =
    propertyQuery.isLoading || bookingsQuery.isLoading || roomsQuery.isLoading;
  const error = propertyQuery.error ?? bookingsQuery.error ?? roomsQuery.error;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pt-3 pb-10 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          {propertyName ? (
            <p className="text-sm text-muted-foreground">{propertyName}</p>
          ) : propertyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading property…</p>
          ) : (
            <p className="font-mono text-sm text-muted-foreground">{propertyId}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setDialog({ open: true, booking: null })} disabled={!propertyId}>
            <PlusIcon data-icon="inline-start" />
            New booking
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">At a glance</h2>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <MetricCard
                icon={CalendarClockIcon}
                label="Upcoming (7 days)"
                value={metrics.upcomingStaysNext7Days}
                hint="Confirmed or pending, check-in in the next week"
              />
              <MetricCard
                icon={ClipboardListIcon}
                label="Pending"
                value={metrics.pendingCount}
                hint="Bookings awaiting action"
              />
              <MetricCard
                icon={SunIcon}
                label="Arrivals today"
                value={metrics.arrivalsToday}
                hint="Guests checking in today"
              />
              <MetricCard
                icon={DoorOpenIcon}
                label="Departures today"
                value={metrics.departuresToday}
                hint="Guests checking out today"
              />
            </motion.div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              <MetricCard
                icon={BedDoubleIcon}
                label="Room inventory"
                value={`${metrics.roomTypes} types · ${metrics.physicalUnits} units`}
                hint="Active room listings"
                valueClassName="text-lg tabular-nums"
              />
              <MetricCard
                icon={CoinsIcon}
                label="Advance (this month)"
                value={formatCurrency(metrics.advanceCollectedThisMonth, currency)}
                hint="Sum of advance amounts on bookings created this calendar month"
                valueClassName="text-lg tabular-nums"
              />
            </motion.div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">Next arrivals</h2>
                <Link
                  href={`/${propertyId}/bookings`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View all
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </div>
              <div className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-[0_0_0_1px_oklch(1_0_0_/_0.02),_0_4px_12px_oklch(0_0_0_/_0.2)]">
                {upcomingArrivals.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-muted-foreground">No upcoming arrivals.</p>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {upcomingArrivals.map((b) => (
                      <li key={b._id} className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{b.guestName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {bookingRoomSummary(b, roomNameById)}
                          </p>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                          <span className="text-foreground">{formatShortDate(b.checkIn, timeZone)}</span>
                          {" → "}
                          <span>{formatShortDate(b.checkOut, timeZone)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">Recent bookings</h2>
                <Link
                  href={`/${propertyId}/bookings`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View all
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </div>
              <div className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
                {recentBookings.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-muted-foreground">No bookings yet.</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {recentBookings.map((b) => (
                      <li key={b._id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{b.guestName}</p>
                          <p className="truncate text-xs capitalize text-muted-foreground">{b.status.replace(/_/g, " ")}</p>
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {formatShortDate(b.createdAt, timeZone)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Shortcuts</h2>
            <div className="flex flex-wrap gap-2">
              <ShortcutLink href={`/${propertyId}/bookings`} icon={ClipboardListIcon} label="Bookings" />
              <ShortcutLink href={`/${propertyId}/room-availability`} icon={CalendarRangeIcon} label="Room availability" />
              <ShortcutLink href={`/${propertyId}/rooms`} icon={BedDoubleIcon} label="Rooms" />
              <ShortcutLink href={`/${propertyId}/booking-options`} icon={HandCoinsIcon} label="Booking options" />
              <ShortcutLink href={`/${propertyId}/room-tags`} icon={TagIcon} label="Room tags" />
              <ShortcutLink href={`/${propertyId}/settings`} icon={SettingsIcon} label="Property settings" />
            </div>
          </section>
        </>
      )}

      <CreateBookingDialog
        propertyId={propertyId}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        booking={dialog.booking}
        rooms={roomsQuery.data?.rooms ?? []}
        roomsLoading={roomsQuery.isLoading}
      />
    </main>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className="group rounded-xl border border-border/50 bg-card px-4 py-3.5 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-[0_0_0_1px_oklch(1_0_0_/_0.04),_0_8px_24px_oklch(0_0_0_/_0.25)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/50 text-muted-foreground transition-colors duration-200 group-hover:border-primary/20 group-hover:bg-primary/8 group-hover:text-primary">
          <Icon className="size-4" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-0.5 text-2xl font-semibold tabular-nums text-foreground", valueClassName)}>{value}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ShortcutLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <motion.div whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-all duration-150 hover:border-border/80 hover:bg-muted/30 hover:shadow-md"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" strokeWidth={1.5} />
        <span className="min-w-0 flex-1">{label}</span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
      </Link>
    </motion.div>
  );
}
