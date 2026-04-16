"use client";

import { HashIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const fieldClass = cn(
  "w-full rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 text-sm text-foreground",
  "placeholder:text-muted-foreground/50 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
);

type RoomNumberFieldsProps = {
  unitCount: number;
  values: string[];
  onChange: (next: string[]) => void;
};

/** One input per physical unit; labels like “Room 1”, “Room 2” for reference (e.g. 101, G-2). */
export function RoomNumberFields({ unitCount, values, onChange }: RoomNumberFieldsProps) {
  const n = Math.max(1, unitCount);
  const padded = Array.from({ length: n }, (_, i) => values[i] ?? "");

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-2">
        <div
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/80 text-muted-foreground"
          aria-hidden
        >
          <HashIcon className="size-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="text-sm font-medium text-foreground">Room numbers</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Enter a reference for each physical room when &quot;No. of rooms&quot; is greater than one
            (for example three Deluxe units: 101, 102, 103). Leave all fields empty if you do not use
            numbers yet.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {padded.map((val, index) => (
          <div key={index} className="space-y-1">
            <label
              className="text-[11px] font-medium text-muted-foreground"
              htmlFor={`room-number-${index}`}
            >
              Unit {index + 1}
            </label>
            <input
              id={`room-number-${index}`}
              name={`roomNumber-${index}`}
              value={val}
              onChange={(event) => {
                const next = [...padded];
                next[index] = event.target.value;
                onChange(next);
              }}
              placeholder={`e.g. ${101 + index}`}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
