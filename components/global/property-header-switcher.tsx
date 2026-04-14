"use client";

import { ChevronDownIcon, SettingsIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import type { PropertyListItem } from "@/api-clients";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApiQuery } from "@/hooks";
import { cn } from "@/lib/utils";

/** First path segment when it looks like a Mongo ObjectId (property routes). */
export function getPropertyIdFromPathname(pathname: string): string | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment || !/^[a-f\d]{24}$/i.test(segment)) {
    return null;
  }
  return segment;
}

function propertyInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

type PropertyHeaderSwitcherProps = {
  propertyId: string;
  /** Full-width trigger for the property sidebar rail. */
  sidebar?: boolean;
};

export function PropertyHeaderSwitcher({
  propertyId,
  sidebar = false,
}: PropertyHeaderSwitcherProps) {
  const router = useRouter();

  const propertyQuery = useApiQuery<{ property: PropertyListItem }>(
    ["property", propertyId],
    `/api/properties/${propertyId}`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const property = propertyQuery.data?.property;
  const label = property?.name ?? "Property";
  const initial = property ? propertyInitial(property.name) : "P";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size={sidebar ? "xs" : "sm"}
            className={cn(
              "font-medium has-data-[icon=inline-end]:pr-1",
              sidebar
                ? "h-7 w-full gap-1 rounded-md px-1.5 py-0 text-left text-sidebar-foreground hover:bg-sidebar-accent/80"
                : "h-9 gap-2 rounded-lg px-2 has-data-[icon=inline-end]:pr-1.5 text-foreground hover:bg-muted/80",
            )}
          />
        }
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 font-semibold text-white shadow-sm",
            sidebar ? "size-5 text-[9px]" : "size-7 text-[11px]",
          )}
          aria-hidden
        >
          {initial}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate tracking-[-0.02em]",
            sidebar ? "text-left text-[12px] leading-tight" : "text-[13px] max-w-[160px] sm:max-w-[220px]",
          )}
        >
          {propertyQuery.isLoading ? "…" : label}
        </span>
        <ChevronDownIcon
          data-icon="inline-end"
          className={cn(
            "shrink-0 text-muted-foreground opacity-80",
            sidebar ? "size-3" : "size-3.5",
          )}
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]" sideOffset={6}>
        <DropdownMenuItem
          onClick={() => {
            router.push(`/${propertyId}/settings`);
          }}
        >
          <SettingsIcon className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            router.push("/");
          }}
        >
          All properties
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

