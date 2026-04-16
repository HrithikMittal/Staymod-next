"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Local calendar date → `YYYY-MM-DD` (same convention as `<input type="date">`). */
export function toDateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` as a local calendar date (no UTC shift). */
export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Limits which days can be picked (react-day-picker matchers). */
  calendarDisabled?: Matcher | Matcher[];
};

/**
 * shadcn-style date picker: outline trigger + calendar popover.
 * Value is always `YYYY-MM-DD` in the local timezone.
 */
export function DatePicker({
  value,
  onChange,
  id,
  disabled,
  className,
  calendarDisabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDateKey(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            className={cn(
              "h-11 w-full justify-start gap-1.5 font-normal",
              className,
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        <span className="truncate">{format(selected, "PPP")}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <PopoverTitle className="sr-only">Choose a date</PopoverTitle>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={calendarDisabled}
          onSelect={(d) => {
            if (d) {
              onChange(toDateKeyLocal(d));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
