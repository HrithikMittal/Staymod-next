"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApiQuery } from "@/hooks";
import { formatMoney } from "@/utils/booking-pricing";

type DatePreset = "today" | "last7" | "last30" | "thisMonth" | "lastMonth" | "custom";
type DateMode = "stay" | "booked";

type ReportResponse = {
  kpis: {
    total: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  revenue: {
    totalBilled: number;
    advanceCollected: number;
    dueUpcoming: number;
  };
  occupancy: {
    nightsBooked: number;
  };
};

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function resolvePresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (preset === "today") {
    return { from: toYmd(today), to: toYmd(today) };
  }
  if (preset === "last7") {
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - 6);
    return { from: toYmd(from), to: toYmd(today) };
  }
  if (preset === "last30") {
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - 29);
    return { from: toYmd(from), to: toYmd(today) };
  }
  if (preset === "lastMonth") {
    const lastMonthRef = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    return { from: toYmd(startOfMonth(lastMonthRef)), to: toYmd(endOfMonth(lastMonthRef)) };
  }
  return { from: toYmd(startOfMonth(today)), to: toYmd(endOfMonth(today)) };
}

function donutStyle(data: Array<{ value: number; color: string }>) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) {
    return { background: "conic-gradient(var(--muted) 0 100%)" };
  }
  let acc = 0;
  const slices: string[] = [];
  for (const d of data) {
    const start = (acc / total) * 100;
    acc += d.value;
    const end = (acc / total) * 100;
    slices.push(`${d.color} ${start}% ${end}%`);
  }
  return { background: `conic-gradient(${slices.join(", ")})` };
}

export function PropertyReportPage() {
  const params = useParams();
  const propertyId = typeof params.id === "string" ? params.id : "";
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [mode, setMode] = useState<DateMode>("stay");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const effectiveRange = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return resolvePresetRange(preset);
  }, [preset, customFrom, customTo]);

  const reportQuery = useApiQuery<ReportResponse>(
    ["report", propertyId, mode, preset, effectiveRange.from, effectiveRange.to],
    `/api/properties/${propertyId}/report?mode=${mode}&from=${effectiveRange.from}&to=${effectiveRange.to}`,
    undefined,
    {
      enabled:
        Boolean(propertyId) &&
        Boolean(effectiveRange.from) &&
        Boolean(effectiveRange.to),
    },
  );

  const kpis = reportQuery.data?.kpis;
  const revenue = reportQuery.data?.revenue;
  const occupancy = reportQuery.data?.occupancy;
  const reconciledAdvanceCollected = Math.max(
    0,
    (revenue?.totalBilled ?? 0) - (revenue?.dueUpcoming ?? 0),
  );
  const donutData = [
    { label: "Pending", value: kpis?.pending ?? 0, color: "#f59e0b" },
    { label: "Confirmed", value: kpis?.confirmed ?? 0, color: "#10b981" },
    { label: "Checked-in", value: kpis?.checkedIn ?? 0, color: "#0ea5e9" },
    { label: "Completed", value: kpis?.completed ?? 0, color: "#6366f1" },
    { label: "Cancelled", value: kpis?.cancelled ?? 0, color: "#94a3b8" },
    { label: "No-show", value: kpis?.noShow ?? 0, color: "#ef4444" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Report</h1>
        <p className="text-sm text-muted-foreground">
          Booking and revenue insights for this property.
        </p>
      </div>

      <section className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Date filter</Label>
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value as DatePreset)}
              className="h-8 rounded-md border border-border/70 bg-background px-2 text-sm"
            >
              <option value="today">Today</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="thisMonth">This month</option>
              <option value="lastMonth">Last month</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label>Date mode</Label>
              <Tooltip>
                <TooltipTrigger
                  aria-label="Date mode information"
                  className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <InfoIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  Stay date uses booking check-in date; Booked date uses when the booking was created.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="inline-flex rounded-md border border-border/70 bg-muted/30 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={mode === "stay" ? "default" : "ghost"}
                onClick={() => setMode("stay")}
              >
                Stay date
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "booked" ? "default" : "ghost"}
                onClick={() => setMode("booked")}
              >
                Booked date
              </Button>
            </div>
          </div>
          {preset === "custom" ? (
            <>
              <label className="space-y-1.5">
                <span className="text-xs text-muted-foreground">From</span>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-muted-foreground">To</span>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </label>
            </>
          ) : null}
        </div>
      </section>

      {reportQuery.isLoading ? (
        <section className="rounded-lg border border-border/70 bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Loading report…</p>
        </section>
      ) : reportQuery.isError ? (
        <section className="rounded-lg border border-border/70 bg-card p-5 shadow-sm">
          <p className="text-sm text-destructive">{reportQuery.error.message}</p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Total bookings</p>
              <p className="text-xl font-semibold">{kpis?.total ?? 0}</p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="text-xl font-semibold">{kpis?.confirmed ?? 0}</p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Checked-in</p>
              <p className="text-xl font-semibold">{kpis?.checkedIn ?? 0}</p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-xl font-semibold">{kpis?.completed ?? 0}</p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-semibold">{kpis?.pending ?? 0}</p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Cancelled</p>
              <p className="text-xl font-semibold">{kpis?.cancelled ?? 0}</p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">No-show</p>
              <p className="text-xl font-semibold">{kpis?.noShow ?? 0}</p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Nights booked</p>
              <p className="text-xl font-semibold">{occupancy?.nightsBooked ?? 0}</p>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">Total billed</p>
                <p className="text-xl font-semibold">{formatMoney(revenue?.totalBilled ?? 0)}</p>
              </article>
              <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">Advance collected</p>
                <p className="text-xl font-semibold">{formatMoney(reconciledAdvanceCollected)}</p>
              </article>
              <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">Due (upcoming)</p>
                <p className="text-xl font-semibold">{formatMoney(revenue?.dueUpcoming ?? 0)}</p>
              </article>
            </div>

            <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
              <p className="mb-3 text-sm font-medium">Status breakdown</p>
              <div className="flex items-center gap-4">
                <div
                  className="relative size-36 rounded-full"
                  style={donutStyle(donutData)}
                  aria-label="Booking status donut chart"
                >
                  <div className="absolute inset-5 rounded-full bg-card" />
                </div>
                <ul className="space-y-1.5">
                  {donutData.map((row) => (
                    <li key={row.label} className="flex items-center gap-2 text-sm">
                      <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </section>
        </>
      )}
    </main>
  );
}
