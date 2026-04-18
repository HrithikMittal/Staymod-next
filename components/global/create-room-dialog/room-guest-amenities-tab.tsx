"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { GUEST_AMENITY_GROUPS } from "@/constants/room-creation-details";
import { cn } from "@/lib/utils";

type RoomGuestAmenitiesTabProps = {
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
};

function fieldId(groupId: string, itemId: string): string {
  return `guest-amenity-${groupId}-${itemId}`;
}

export function RoomGuestAmenitiesTab({ selectedIds, onToggle }: RoomGuestAmenitiesTabProps) {
  const selected = new Set(selectedIds);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">What can guests use in this room?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose amenities by category. These are saved with the room listing.
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
        {GUEST_AMENITY_GROUPS.map((group, groupIdx) => (
          <div key={group.id}>
            {groupIdx > 0 ? <hr className="my-4 border-border/50" /> : null}
            <p className="mb-3 text-sm font-semibold text-foreground">{group.title}</p>
            <div className="flex flex-col divide-y divide-border/40 rounded-lg border border-border/50 bg-background/60">
              {group.items.map((item) => {
                const id = fieldId(group.id, item.id);
                const checked = selected.has(item.id);
                return (
                  <label
                    key={item.id}
                    htmlFor={id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors",
                      "hover:bg-muted/30",
                    )}
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(next) => onToggle(item.id, Boolean(next))}
                      className="mt-0.5"
                    />
                    <span className="text-[15px] leading-snug text-foreground">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
