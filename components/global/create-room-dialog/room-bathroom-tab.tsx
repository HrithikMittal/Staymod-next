"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BATHROOM_ITEM_DEFS } from "@/constants/room-creation-details";
import { cn } from "@/lib/utils";

type RoomBathroomTabProps = {
  privateBathroom: boolean;
  onPrivateChange: (value: boolean) => void;
  selectedItemIds: string[];
  onItemToggle: (id: string, checked: boolean) => void;
};

export function RoomBathroomTab({
  privateBathroom,
  onPrivateChange,
  selectedItemIds,
  onItemToggle,
}: RoomBathroomTabProps) {
  const selected = new Set(selectedItemIds);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Bathroom details</h3>
        <p className="mt-1 text-sm text-muted-foreground">Tell guests what to expect from the bathroom.</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
        <p className="text-sm font-semibold text-foreground">Is the bathroom private?</p>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="bathroom-private"
              className="size-4 accent-primary"
              checked={privateBathroom}
              onChange={() => onPrivateChange(true)}
            />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="bathroom-private"
              className="size-4 accent-primary"
              checked={!privateBathroom}
              onChange={() => onPrivateChange(false)}
            />
            <span className="text-sm">No, it&apos;s shared</span>
          </label>
        </div>

        <hr className="my-5 border-border/50" />

        <Label className="text-sm font-semibold text-foreground">
          Which bathroom items are available in this room?
        </Label>
        <div className="mt-3 flex flex-col divide-y divide-border/40 rounded-lg border border-border/50 bg-background/60">
          {BATHROOM_ITEM_DEFS.map((item) => {
            const id = `bath-item-${item.id}`;
            return (
              <label
                key={item.id}
                htmlFor={id}
                className={cn("flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/30")}
              >
                <Checkbox
                  id={id}
                  checked={selected.has(item.id)}
                  onCheckedChange={(next) => onItemToggle(item.id, Boolean(next))}
                  className="mt-0.5"
                />
                <span className="text-[15px] leading-snug text-foreground">{item.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
