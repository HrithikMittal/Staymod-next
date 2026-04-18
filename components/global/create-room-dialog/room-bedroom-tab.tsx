"use client";

import type { ReactNode } from "react";
import { BedDoubleIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BED_TYPE_PRIMARY,
  BED_TYPE_SECONDARY,
  type BedTypeId,
} from "@/constants/room-creation-details";

type RoomBedroomTabProps = {
  bedCounts: Record<BedTypeId, number>;
  onBedCountChange: (id: BedTypeId, next: number) => void;
  showMoreBedTypes: boolean;
  onShowMoreBedTypesChange: (value: boolean) => void;
};

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-border/70 bg-background shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 rounded-r-none"
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="Decrease"
      >
        −
      </Button>
      <span className="min-w-8 px-1 text-center text-sm font-medium tabular-nums">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 rounded-l-none"
        onClick={() => onChange(value + 1)}
        aria-label="Increase"
      >
        +
      </Button>
    </div>
  );
}

function BedRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Stepper value={value} onChange={onChange} />
    </div>
  );
}

export function RoomBedroomTab({
  bedCounts,
  onBedCountChange,
  showMoreBedTypes,
  onShowMoreBedTypesChange,
}: RoomBedroomTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Bedroom</h3>
        <p className="mt-1 text-sm text-muted-foreground">Which beds are available in this room?</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-col divide-y divide-border/40">
          {BED_TYPE_PRIMARY.map((bed) => (
            <BedRow
              key={bed.id}
              icon={<BedDoubleIcon className="size-5" strokeWidth={1.5} />}
              label={bed.label}
              description={bed.description}
              value={bedCounts[bed.id] ?? 0}
              onChange={(n) => onBedCountChange(bed.id, n)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => onShowMoreBedTypesChange(!showMoreBedTypes)}
          className="mt-2 flex w-full items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {showMoreBedTypes ? "Fewer bed options" : "More bed options"}
          {showMoreBedTypes ? (
            <ChevronUpIcon className="size-4" />
          ) : (
            <ChevronDownIcon className="size-4" />
          )}
        </button>

        {showMoreBedTypes ? (
          <div className="mt-2 flex flex-col divide-y divide-border/40 border-t border-border/40 pt-2">
            {BED_TYPE_SECONDARY.map((bed) => (
              <BedRow
                key={bed.id}
                icon={<BedDoubleIcon className="size-5" strokeWidth={1.5} />}
                label={bed.label}
                description={bed.description}
                value={bedCounts[bed.id] ?? 0}
                onChange={(n) => onBedCountChange(bed.id, n)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
