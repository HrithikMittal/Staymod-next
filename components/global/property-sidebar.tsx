"use client";

import {
  BedDoubleIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PropertyHeaderSwitcher } from "@/components/global/property-header-switcher";
import { PropertySidebarFooter } from "@/components/global/property-sidebar-footer";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePropertySidebarCollapsed } from "@/hooks/use-property-sidebar-collapsed";
import { cn } from "@/lib/utils";

function navItems(propertyId: string) {
  return [
    {
      href: `/${propertyId}/dashboard`,
      label: "Dashboard",
      icon: LayoutDashboardIcon,
      match: (pathname: string) => pathname === `/${propertyId}/dashboard`,
    },
    {
      href: `/${propertyId}/rooms`,
      label: "Rooms",
      icon: BedDoubleIcon,
      match: (pathname: string) => pathname.startsWith(`/${propertyId}/rooms`),
    },
    {
      href: `/${propertyId}/room-availability`,
      label: "Room availability",
      icon: CalendarRangeIcon,
      match: (pathname: string) => pathname.startsWith(`/${propertyId}/room-availability`),
    },
    {
      href: `/${propertyId}/bookings`,
      label: "Bookings",
      icon: ClipboardListIcon,
      match: (pathname: string) => pathname.startsWith(`/${propertyId}/bookings`),
    },
  ] as const;
}

type PropertySidebarProps = {
  propertyId: string;
};

export function PropertySidebar({ propertyId }: PropertySidebarProps) {
  const pathname = usePathname();
  const items = navItems(propertyId);
  const { collapsed, toggleCollapsed } = usePropertySidebarCollapsed();

  return (
    <aside
      className={cn(
        "flex min-h-0 shrink-0 flex-col border-sidebar-border border-r bg-sidebar",
        "transition-[width] duration-200 ease-out motion-reduce:transition-none",
        collapsed ? "w-[52px]" : "w-[220px]",
        "animate-[property-sidebar-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 border-sidebar-border border-b",
          collapsed
            ? "flex-col gap-1 px-1.5 py-1.5"
            : "flex flex-row items-center gap-1 px-2 pt-1.5 pb-1.5",
        )}
      >
        <div
          className={cn(
            collapsed
              ? "group/avatar-expand relative grid w-full [grid-template-areas:'stack']"
              : "min-w-0 flex-1",
          )}
        >
          <div
            className={cn(
              collapsed &&
                "[grid-area:stack] relative z-0 w-full transition-opacity duration-150 motion-reduce:transition-none opacity-100 group-hover/avatar-expand:opacity-0 group-hover/avatar-expand:pointer-events-none",
            )}
          >
            <PropertyHeaderSwitcher
              propertyId={propertyId}
              sidebar
              sidebarCollapsed={collapsed}
            />
          </div>
          {collapsed ? (
            <Button
              type="button"
              variant="ghost"
              aria-label="Expand sidebar"
              onClick={toggleCollapsed}
              className={cn(
                "[grid-area:stack] relative z-10 h-8 w-full shrink-0 gap-0 px-0 font-medium",
                "text-muted-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
                "opacity-0 pointer-events-none transition-opacity duration-150 motion-reduce:transition-none",
                "group-hover/avatar-expand:pointer-events-auto group-hover/avatar-expand:opacity-100",
                "focus-visible:pointer-events-auto focus-visible:opacity-100",
              )}
            >
              <PanelLeftIcon className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
        {!collapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Collapse sidebar"
            onClick={toggleCollapsed}
            className="shrink-0 text-muted-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
          >
            <PanelLeftCloseIcon className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-auto py-3", collapsed ? "px-1.5" : "px-2")}>
        <nav aria-label="Property" className="flex flex-col gap-px">
          {items.map(({ href, label, icon: Icon, match }, index) => {
            const active = match(pathname);
            const linkClass = cn(
              "group relative flex items-center overflow-hidden rounded-md py-1.5",
              collapsed ? "justify-center px-0" : "gap-2.5 pr-2 pl-2",
              "text-[13px] font-medium leading-none tracking-[-0.01em]",
              "transition-[background-color,color,box-shadow] duration-200 ease-out",
              "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
              active &&
                "bg-sidebar-accent text-sidebar-foreground shadow-[inset_0_0_0_1px_oklch(0_0_0_/0.05)] hover:bg-sidebar-accent",
            );

            const bar = (
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 left-0 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary",
                  "origin-center transition-[opacity,transform] duration-200 ease-out",
                  active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0",
                )}
              />
            );

            const icon = (
              <Icon
                className={cn(
                  "relative size-[15px] shrink-0 stroke-[1.75] transition-transform duration-200 ease-out",
                  "text-muted-foreground group-hover:text-sidebar-foreground",
                  active && "text-sidebar-foreground",
                  "group-hover:translate-x-[0.5px]",
                )}
                aria-hidden
              />
            );

            return (
              <Tooltip key={href} disabled={!collapsed}>
                <TooltipTrigger
                  render={
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? label : undefined}
                      className={linkClass}
                    />
                  }
                >
                  {bar}
                  {icon}
                  {!collapsed ? (
                    <span className="relative min-w-0 flex-1 truncate">{label}</span>
                  ) : null}
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </div>
      <PropertySidebarFooter collapsed={collapsed} />
    </aside>
  );
}
