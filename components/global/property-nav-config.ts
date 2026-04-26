import type { LucideIcon } from "lucide-react";
import {
  BarChart3Icon,
  BedDoubleIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  FilePenLineIcon,
  HandCoinsIcon,
  LayoutDashboardIcon,
  PlugZapIcon,
  SettingsIcon,
  TagsIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

export type PropertyNavItem = {
  id: string;
  href: string;
  label: string;
  /** Compact label under icons on the mobile bottom bar */
  shortLabel: string;
  group: "daily" | "setup" | "admin";
  icon: LucideIcon;
  match: (pathname: string, propertyId: string) => boolean;
};

export type PropertyNavGroup = {
  id: "daily" | "setup" | "admin";
  label: string;
  items: PropertyNavItem[];
};

/** Primary destinations on the mobile bottom bar (remaining items live under “More”). */
const MOBILE_BOTTOM_IDS = ["dashboard", "bookings", "room_availability", "rooms"] as const;

export function getPropertyNavItems(propertyId: string): PropertyNavItem[] {
  const base = `/${propertyId}`;
  return [
    {
      id: "dashboard",
      href: `${base}/dashboard`,
      label: "Dashboard",
      shortLabel: "Home",
      group: "daily",
      icon: LayoutDashboardIcon,
      match: (pathname, id) => pathname === `/${id}/dashboard`,
    },
    {
      id: "bookings",
      href: `${base}/bookings`,
      label: "Bookings",
      shortLabel: "Bookings",
      group: "daily",
      icon: ClipboardListIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/bookings`),
    },
    {
      id: "room_availability",
      href: `${base}/room-availability`,
      label: "Room availability",
      shortLabel: "Calendar",
      group: "daily",
      icon: CalendarRangeIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/room-availability`),
    },
    {
      id: "customers",
      href: `${base}/customers`,
      label: "Customers",
      shortLabel: "Customers",
      group: "daily",
      icon: UserRoundIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/customers`),
    },
    {
      id: "report",
      href: `${base}/report`,
      label: "Report",
      shortLabel: "Report",
      group: "daily",
      icon: BarChart3Icon,
      match: (pathname, id) => pathname.startsWith(`/${id}/report`),
    },
    {
      id: "rooms",
      href: `${base}/rooms`,
      label: "Rooms",
      shortLabel: "Rooms",
      group: "setup",
      icon: BedDoubleIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/rooms`),
    },
    {
      id: "booking_options",
      href: `${base}/booking-options`,
      label: "Booking options",
      shortLabel: "Options",
      group: "setup",
      icon: HandCoinsIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/booking-options`),
    },
    {
      id: "room_tags",
      href: `${base}/room-tags`,
      label: "Room tags",
      shortLabel: "Tags",
      group: "setup",
      icon: TagsIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/room-tags`),
    },
    {
      id: "purposal_builder",
      href: `${base}/purposal-builder`,
      label: "Purposal builder",
      shortLabel: "Purposal",
      group: "setup",
      icon: FilePenLineIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/purposal-builder`),
    },
    {
      id: "integrations",
      href: `${base}/integrations`,
      label: "Integrations",
      shortLabel: "API",
      group: "admin",
      icon: PlugZapIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/integrations`),
    },
    {
      id: "settings",
      href: `${base}/settings`,
      label: "Property settings",
      shortLabel: "Settings",
      group: "admin",
      icon: SettingsIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/settings`),
    },
    {
      id: "team",
      href: `${base}/team/organization-members`,
      label: "Team",
      shortLabel: "Team",
      group: "admin",
      icon: UsersIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/team`),
    },
  ];
}

export function groupPropertyNavItems(items: PropertyNavItem[]): PropertyNavGroup[] {
  const groups: PropertyNavGroup[] = [
    { id: "daily", label: "Daily", items: [] },
    { id: "setup", label: "Setup", items: [] },
    { id: "admin", label: "Admin", items: [] },
  ];
  const byId = new Map(groups.map((group) => [group.id, group]));
  for (const item of items) {
    byId.get(item.group)?.items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

export function getMobileBottomNavItems(propertyId: string): PropertyNavItem[] {
  const all = getPropertyNavItems(propertyId);
  return MOBILE_BOTTOM_IDS.map((id) => all.find((item) => item.id === id)).filter(
    (item): item is PropertyNavItem => Boolean(item),
  );
}

export function getMoreMenuNavItems(propertyId: string): PropertyNavItem[] {
  const all = getPropertyNavItems(propertyId);
  const set = new Set<string>(MOBILE_BOTTOM_IDS);
  return all.filter((item) => !set.has(item.id));
}

export function getGroupedPropertyNavItems(propertyId: string): PropertyNavGroup[] {
  return groupPropertyNavItems(getPropertyNavItems(propertyId));
}

export function getGroupedMoreMenuNavItems(propertyId: string): PropertyNavGroup[] {
  return groupPropertyNavItems(getMoreMenuNavItems(propertyId));
}
