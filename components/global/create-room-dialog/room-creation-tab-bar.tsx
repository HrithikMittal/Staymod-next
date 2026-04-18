"use client";

import { cn } from "@/lib/utils";

export type RoomCreationTabId =
  | "basics"
  | "amenities"
  | "bathroom"
  | "bedroom"
  | "policies"
  | "images"
  | "more";

const TABS: Array<{ id: RoomCreationTabId; label: string }> = [
  { id: "basics", label: "Basics" },
  { id: "amenities", label: "Amenities" },
  { id: "bathroom", label: "Bathroom" },
  { id: "bedroom", label: "Beds" },
  { id: "policies", label: "Policies" },
  { id: "images", label: "Images" },
  { id: "more", label: "Tags & rates" },
];

type RoomCreationTabBarProps = {
  value: RoomCreationTabId;
  onValueChange: (id: RoomCreationTabId) => void;
};

export function RoomCreationTabBar({ value, onValueChange }: RoomCreationTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Room sections"
      className="-mx-1 flex gap-0.5 overflow-x-auto pb-2 scrollbar-thin"
    >
      {TABS.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`room-tab-${tab.id}`}
            onClick={() => onValueChange(tab.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function roomTabPanelProps(id: RoomCreationTabId, active: RoomCreationTabId) {
  return {
    role: "tabpanel" as const,
    id: `room-panel-${id}`,
    "aria-labelledby": `room-tab-${id}`,
    hidden: active !== id,
  };
}
