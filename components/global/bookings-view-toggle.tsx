"use client";

import { CalendarIcon, ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BookingsViewToggleProps = {
  activeView: "list" | "calendar";
  onViewChange: (view: "list" | "calendar") => void;
};

/**
 * Toggle buttons for switching between list and calendar views.
 */
export function BookingsViewToggle({ activeView, onViewChange }: BookingsViewToggleProps) {
  return (
    <div className="inline-flex gap-1">
      <button
        type="button"
        onClick={() => onViewChange("list")}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
          activeView === "list"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <ListIcon className="size-4" />
        <span>List View</span>
      </button>
      <button
        type="button"
        onClick={() => onViewChange("calendar")}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
          activeView === "calendar"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <CalendarIcon className="size-4" />
        <span>Calendar View</span>
      </button>
    </div>
  );
}
