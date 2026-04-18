"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { PropertyHeaderSwitcher } from "@/components/global/property-header-switcher";
import { getMobileBottomNavItems, getMoreMenuNavItems } from "@/components/global/property-nav-config";
import { PropertySidebarFooter } from "@/components/global/property-sidebar-footer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type PropertyMobileNavProps = {
  propertyId: string;
};

export function PropertyMobileNav({ propertyId }: PropertyMobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const bottomItems = getMobileBottomNavItems(propertyId);
  const moreItems = getMoreMenuNavItems(propertyId);
  const moreRouteActive = moreItems.some((item) => item.match(pathname, propertyId));

  return (
    <>
      <nav
        className={cn(
          "fixed right-0 bottom-0 left-0 z-40 flex border-t border-border/80 bg-background/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden",
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
        <SheetContent side="bottom" className="max-h-[min(85vh,560px)] gap-0 overflow-hidden rounded-t-2xl p-0">
          <SheetHeader className="border-b border-border/60 px-4 pt-4 pb-3 text-left">
            <SheetTitle className="text-base">Menu</SheetTitle>
          </SheetHeader>
          <div className="border-b border-border/60 px-4 py-3">
            <PropertyHeaderSwitcher propertyId={propertyId} />
          </div>
          <nav aria-label="Additional property pages" className="overflow-y-auto px-2 py-2">
            <ul className="flex flex-col gap-0.5">
              {moreItems.map(({ id, href, label, icon: Icon, match }) => {
                const active = match(pathname, propertyId);
                return (
                  <li key={id}>
                    <Link
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted/80",
                      )}
                    >
                      <Icon className="size-5 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-auto border-t border-border/60 bg-muted/20 px-2 py-2">
            <PropertySidebarFooter collapsed={false} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
