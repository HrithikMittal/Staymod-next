"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROOM_AMENITY_PRESET_LABELS } from "@/constants/room-amenity-presets";
import { cn } from "@/lib/utils";

type RoomAmenityChecklistProps = {
  selected: string[];
  onToggle: (label: string, checked: boolean) => void;
  extraText: string;
  onExtraTextChange: (value: string) => void;
  /** Nested “milestone” panel style (minimal chrome, used inside a bordered card). */
  embedded?: boolean;
};

function presetFieldId(label: string): string {
  return `room-amenity-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function RoomAmenityChecklist({
  selected,
  onToggle,
  extraText,
  onExtraTextChange,
  embedded = false,
}: RoomAmenityChecklistProps) {
  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-col gap-3">
      {!embedded ? (
        <div className="flex flex-col gap-0.5">
          <Label className="text-foreground">Amenities (optional)</Label>
          <p className="text-sm text-muted-foreground">
            Select what this room offers. Add anything else in the field below.
          </p>
        </div>
      ) : null}

      <div className="grid gap-1.5 sm:grid-cols-2">
        {ROOM_AMENITY_PRESET_LABELS.map((label) => {
          const id = presetFieldId(label);
          return (
            <label
              key={label}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 transition-colors",
                embedded
                  ? "hover:bg-background/80"
                  : "border border-transparent hover:bg-muted/40",
              )}
            >
              <Checkbox
                id={id}
                checked={selectedSet.has(label)}
                onCheckedChange={(checked) => onToggle(label, Boolean(checked))}
                className="mt-0.5"
              />
              <span
                className={cn("leading-snug", embedded ? "text-[13px] text-foreground/90" : "text-sm")}
              >
                {label}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        <Label
          htmlFor="room-amenities-extra"
          className={cn(embedded ? "text-xs font-normal text-muted-foreground" : undefined)}
        >
          Additional amenities (optional)
        </Label>
        <Input
          id="room-amenities-extra"
          value={extraText}
          onChange={(event) => onExtraTextChange(event.target.value)}
          placeholder="e.g. In-room safe, minibar, bathtub"
          className={cn(
            embedded &&
              "h-9 border-border/60 bg-background/50 shadow-none focus-visible:ring-1",
          )}
        />
      </div>
    </div>
  );
}
