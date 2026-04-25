"use client";

import { ChevronDownIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { PropertyHeaderSwitcher } from "@/components/global/property-header-switcher";
import {
  getGroupedMoreMenuNavItems,
  getMobileBottomNavItems,
  getMoreMenuNavItems,
} from "@/components/global/property-nav-config";
import { PropertySidebarFooter } from "@/components/global/property-sidebar-footer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type PropertyMobileNavProps = {
  propertyId: string;
};

export function PropertyMobileNav({ propertyId }: PropertyMobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({
    daily: true,
    setup: true,
    admin: true,
  });

  const bottomItems = getMobileBottomNavItems(propertyId);
  const moreItems = getMoreMenuNavItems(propertyId);
  const groupedMoreItems = getGroupedMoreMenuNavItems(propertyId);
  const moreRouteActive = moreItems.some((item) => item.match(pathname, propertyId));

  return (
    <>
      <nav
        className={cn(
          "fixed right-0 bottom-0 left-0 z-40 flex border-t border-border/40 bg-background/85 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden",
          "shadow-[0_-1px_0_0_oklch(1_0_0_/_0.04),_0_-8px_24px_oklch(0_0_0_/_0.2)]",
        )}
        aria-label="Property navigation"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-around gap-0.5 pt-1">
          {bottomItems.map(({ id, href, shortLabel, icon: Icon, match }) => {
            const active = match(pathname, propertyId);
            return (
              <Link
                key={id}
                href={href}
                onClick={() => setMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-5 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="max-w-full truncate px-0.5">{shortLabel}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-label="Open more navigation"
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
              moreRouteActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MenuIcon
              className={cn("size-5 shrink-0", moreRouteActive ? "text-primary" : "text-muted-foreground")}
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="max-w-full truncate px-0.5">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[min(85vh,560px)] gap-0 overflow-hidden rounded-t-2xl border-border/50 bg-card p-0 shadow-[0_-8px_40px_oklch(0_0_0_/_0.5)]">
          <SheetHeader className="border-b border-border/40 px-4 pt-4 pb-3 text-left">
            <SheetTitle className="text-base">Menu</SheetTitle>
          </SheetHeader>
          <div className="border-b border-border/40 px-4 py-3">
            <PropertyHeaderSwitcher propertyId={propertyId} />
          </div>
          <nav aria-label="Additional property pages" className="overflow-y-auto px-2 py-2">
            <ul className="flex flex-col gap-3">
              {groupedMoreItems.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setGroupOpen((prev) => ({
                        ...prev,
                        [group.id]: !(prev[group.id] ?? true),
                      }))
                    }
                    className="flex w-full items-center justify-between rounded-md px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase hover:bg-muted/40"
                  >
                    <span>{group.label}</span>
                    <ChevronDownIcon
                      className={cn(
                        "size-3 transition-transform",
                        (groupOpen[group.id] ?? true) ? "rotate-0" : "-rotate-90",
                      )}
                      aria-hidden
                    />
                  </button>
                  {(groupOpen[group.id] ?? true) ? (
                    <ul className="flex flex-col gap-0.5">
                      {group.items.map(({ id, href, label, icon: Icon, match }) => {
                        const active = match(pathname, propertyId);
                        return (
                          <li key={id}>
                            <Link
                              href={href}
                              onClick={() => setMoreOpen(false)}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors duration-150",
                                active
                                  ? "bg-primary/12 text-primary"
                                  : "text-foreground hover:bg-muted/50",
                              )}
                            >
                              <Icon className="size-5 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
                              {label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto border-t border-border/40 bg-muted/10 px-2 py-2">
            <PropertySidebarFooter collapsed={false} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
