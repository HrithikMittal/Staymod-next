"use client";

import { BedDoubleIcon, LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PropertyHeaderSwitcher } from "@/components/global/property-header-switcher";
import { PropertySidebarFooter } from "@/components/global/property-sidebar-footer";
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
  ] as const;
}

type PropertySidebarProps = {
  propertyId: string;
};

export function PropertySidebar({ propertyId }: PropertySidebarProps) {
  const pathname = usePathname();
  const items = navItems(propertyId);

  return (
    <aside
      className={cn(
        "flex min-h-0 w-[220px] shrink-0 flex-col border-sidebar-border border-r bg-sidebar",
        "animate-[property-sidebar-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none",
      )}
    >
      <div className="shrink-0 border-sidebar-border border-b px-2 pt-1.5 pb-1.5">
        <PropertyHeaderSwitcher propertyId={propertyId} sidebar />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-2 py-3">
        <nav aria-label="Property" className="flex flex-col gap-px">
          {items.map(({ href, label, icon: Icon, match }, index) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                style={{ animationDelay: `${40 + index * 42}ms` }}
                className={cn(
                  "group relative flex items-center gap-2.5 overflow-hidden rounded-md py-1.5 pr-2 pl-2",
                  "text-[13px] font-medium leading-none tracking-[-0.01em]",
                  "animate-[property-sidebar-nav-item_0.34s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none",
                  "transition-[background-color,color,box-shadow] duration-200 ease-out",
                  "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                  active &&
                    "bg-sidebar-accent text-sidebar-foreground shadow-[inset_0_0_0_1px_oklch(0_0_0_/0.05)] hover:bg-sidebar-accent",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1/2 left-0 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary",
                    "origin-center transition-[opacity,transform] duration-200 ease-out",
                    active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0",
                  )}
                />
                <Icon
                  className={cn(
                    "relative size-[15px] shrink-0 stroke-[1.75] transition-transform duration-200 ease-out",
                    "text-muted-foreground group-hover:text-sidebar-foreground",
                    active && "text-sidebar-foreground",
                    "group-hover:translate-x-[0.5px]",
                  )}
                  aria-hidden
                />
                <span className="relative min-w-0 flex-1 truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <PropertySidebarFooter />
    </aside>
  );
}
