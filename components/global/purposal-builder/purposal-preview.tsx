"use client";

import type { PurposalBuilderFormState, PurposalComputed } from "@/components/global/purposal-builder/types";
import { formatInr } from "@/components/global/purposal-builder/calculations";
import { cn } from "@/lib/utils";

type PurposalPreviewProps = {
  form: PurposalBuilderFormState;
  computed: PurposalComputed;
  className?: string;
};

function Row({ left, right, strong = false }: { left: string; right: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1 text-sm", strong && "font-semibold")}>
      <span className={cn("text-zinc-300", strong && "text-zinc-100")}>{left}</span>
      <span className={cn("text-zinc-100", strong && "text-lime-400")}>{right}</span>
    </div>
  );
}

export function PurposalPreview({ form, computed, className }: PurposalPreviewProps) {
  return (
    <section className={cn("rounded-2xl bg-[#121212] p-4 text-zinc-100", className)}>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-4">
          <div className="mb-2 inline-flex rounded-md bg-zinc-800 px-3 py-1 text-sm font-semibold">
            {form.title}
          </div>
          <p className="mb-3 text-zinc-300">{form.subtitle}</p>
          <p className="mb-1 text-xs font-bold tracking-wider text-zinc-500 uppercase">Rooms</p>
          {computed.roomRows.length === 0 ? (
            <Row left="No rooms selected" right={formatInr(0)} />
          ) : (
            computed.roomRows.map((row) => (
              <div key={`${row.label}-${row.ratePerNight}-${row.quantity}`}>
                <Row left={`${row.label} (×${row.quantity})`} right={`${formatInr(row.ratePerNight)}/night`} />
                <Row
                  left={`${Math.max(1, Math.round(form.nights))} night${Math.round(form.nights) === 1 ? "" : "s"} × ${row.quantity} room${row.quantity === 1 ? "" : "s"}`}
                  right={formatInr(row.total)}
                />
              </div>
            ))
          )}

          <div className="my-2 h-px bg-zinc-700/70" />
          <p className="mb-1 text-xs font-bold tracking-wider text-zinc-500 uppercase">{form.mattressLabel}</p>
          <Row left="Rate" right={`${formatInr(form.mattressRatePerDay)}/day/count`} />
          <Row
            left={`${Math.max(1, Math.round(form.nights))} night${Math.round(form.nights) === 1 ? "" : "s"} × ${Math.max(0, Math.round(form.mattressCount))} mattress${Math.round(form.mattressCount) === 1 ? "" : "es"}`}
            right={formatInr(computed.mattressTotal)}
          />

          <div className="my-2 h-px bg-zinc-700/70" />
          <p className="mb-1 text-xs font-bold tracking-wider text-zinc-500 uppercase">Booking options</p>
          {computed.bookingOptionRows.length === 0 ? (
            <Row left="No booking options selected" right={formatInr(0)} />
          ) : (
            computed.bookingOptionRows.map((row) => (
              <div key={`${row.label}-${row.frequency}`}>
                <Row
                  left={`${row.label} × ${row.quantity}`}
                  right={`${formatInr(row.pricePerUnit)}/${row.frequency === "day" ? "day" : "booking"}`}
                />
                <Row right={formatInr(row.total)} left={row.frequency === "day" ? `× ${Math.max(1, Math.round(form.nights))} nights` : "Per booking"} />
              </div>
            ))
          )}

          <div className="my-2 h-px bg-zinc-700/70" />
          <p className="mb-1 text-xs font-bold tracking-wider text-zinc-500 uppercase">Summary</p>
          <Row left="Rooms" right={formatInr(computed.roomTotal)} />
          <Row left="Mattresses" right={formatInr(computed.mattressTotal)} />
          <Row left="Booking options" right={formatInr(computed.bookingOptionsTotal)} />
          <div className="mt-2 h-px bg-zinc-500/70" />
          <Row left="Total" right={formatInr(computed.normalTotal)} strong />
        </article>

        <article className="rounded-2xl border border-lime-600/80 bg-zinc-900/50 p-4">
          <div className="mb-2 inline-flex rounded-md bg-lime-900/40 px-3 py-1 text-sm font-semibold text-lime-400">
            {form.b2bTitle}
          </div>
          <p className="mb-3 text-zinc-300">{form.b2bSubtitle}</p>
          <p className="mb-1 text-xs font-bold tracking-wider text-zinc-500 uppercase">Rate</p>
          <Row left="Per person per night" right={formatInr(form.b2bRatePerPersonNight)} />
          <Row
            left={`${Math.max(1, Math.round(form.guests))} person${Math.round(form.guests) === 1 ? "" : "s"} × 1 night`}
            right={formatInr(form.b2bRatePerPersonNight * Math.max(1, Math.round(form.guests)))}
          />
          <Row
            left={`× ${Math.max(1, Math.round(form.nights))} night${Math.round(form.nights) === 1 ? "" : "s"}`}
            right={formatInr(computed.b2bTotal)}
          />
          <div className="my-2 h-px bg-zinc-700/70" />
          <p className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-200">{form.b2bNote}</p>
          <div className="mt-3 h-px bg-zinc-500/70" />
          <Row left="Total" right={formatInr(computed.b2bTotal)} strong />
        </article>
      </div>

      <div className="mt-4 rounded-lg bg-lime-900/70 px-4 py-2 text-center text-sm font-semibold text-lime-300">
        B2B saves {formatInr(computed.savingsAmount)} vs normal plan · {computed.savingsPercent}% discount
      </div>
      <p className="mt-3 text-sm text-zinc-200">
        The B2B rate saves {formatInr(computed.savingsAmount)} ({computed.savingsPercent}% off) vs the
        normal plan.
      </p>
    </section>
  );
}
