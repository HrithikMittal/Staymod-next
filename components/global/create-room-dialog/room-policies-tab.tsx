"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type RoomPoliciesTabProps = {
  smokingAllowed: boolean;
  partiesAllowed: boolean;
  onSmokingChange: (value: boolean) => void;
  onPartiesChange: (value: boolean) => void;
};

export function RoomPoliciesTab({
  smokingAllowed,
  partiesAllowed,
  onSmokingChange,
  onPartiesChange,
}: RoomPoliciesTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">House rules</h3>
        <p className="mt-1 text-sm text-muted-foreground">Set expectations for guest behavior in this room.</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-1 sm:p-2">
        <div
          className={cn(
            "flex items-center justify-between gap-4 px-3 py-4",
            "border-b border-border/40",
          )}
        >
          <span id="policy-smoking-label" className="text-[15px] text-foreground">
            Smoking allowed
          </span>
          <Switch
            aria-labelledby="policy-smoking-label"
            checked={smokingAllowed}
            onCheckedChange={onSmokingChange}
          />
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-4">
          <span id="policy-parties-label" className="text-[15px] text-foreground">
            Parties/events allowed
          </span>
          <Switch
            aria-labelledby="policy-parties-label"
            checked={partiesAllowed}
            onCheckedChange={onPartiesChange}
          />
        </div>
      </div>
    </div>
  );
}
