"use client";

import { format } from "date-fns";
import { CalendarRangeIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { parseLocalDateKey, toDateKeyLocal } from "@/components/ui/date-picker";

export type DateRangePickerProps = {
  from: string;
  to: string;
  onRangeChange: (from: string, to: string) => void;
  disabled?: boolean;
  className?: string;
  /** Max inclusive days in the range (matches API caps). */
  maxDays?: number;
};

function formatRangeLabel(fromKey: string, toKey: string): string {
  const a = parseLocalDateKey(fromKey);
  const b = parseLocalDateKey(toKey);
  if (fromKey === toKey) {
    return format(a, "PPP");
  }
  return `${format(a, "MMM d, yyyy")} – ${format(b, "MMM d, yyyy")}`;
}

/**
 * Single control: outline trigger + two-month range calendar popover.
 * Values are `YYYY-MM-DD` in the local timezone.
 */
export function DateRangePicker({
  from,
  to,
  onRangeChange,
  disabled,
  className,
  maxDays = 62,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);

  const selected = draft ?? {
    from: parseLocalDateKey(from),
    to: parseLocalDateKey(to),
  };

  const defaultMonth = selected.from ?? parseLocalDateKey(from);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDraft({
        from: parseLocalDateKey(from),
        to: parseLocalDateKey(to),
      });
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-11 w-full justify-start gap-1.5 font-normal md:max-w-md",
              className,
            )}
          />
        }
      >
        <CalendarRangeIcon data-icon="inline-start" />
        <span className="truncate text-left">{formatRangeLabel(from, to)}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-1.5rem)] p-0" align="start">
        <PopoverTitle className="sr-only">Choose a date range</PopoverTitle>
        <Calendar
          mode="range"
          max={maxDays}
          numberOfMonths={2}
          defaultMonth={defaultMonth}
          selected={selected}
          onSelect={(r) => {
            setDraft(r);
            if (r?.from && r?.to) {
              onRangeChange(toDateKeyLocal(r.from), toDateKeyLocal(r.to));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
