import type { LucideIcon } from "lucide-react";
import {
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
  icon: LucideIcon;
  match: (pathname: string, propertyId: string) => boolean;
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
      icon: LayoutDashboardIcon,
      match: (pathname, id) => pathname === `/${id}/dashboard`,
    },
    {
      id: "rooms",
      href: `${base}/rooms`,
      label: "Rooms",
      shortLabel: "Rooms",
      icon: BedDoubleIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/rooms`),
    },
    {
      id: "room_availability",
      href: `${base}/room-availability`,
      label: "Room availability",
      shortLabel: "Calendar",
      icon: CalendarRangeIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/room-availability`),
    },
    {
      id: "bookings",
      href: `${base}/bookings`,
      label: "Bookings",
      shortLabel: "Bookings",
      icon: ClipboardListIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/bookings`),
    },
    {
      id: "booking_options",
      href: `${base}/booking-options`,
      label: "Booking options",
      shortLabel: "Options",
      icon: HandCoinsIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/booking-options`),
    },
    {
      id: "room_tags",
      href: `${base}/room-tags`,
      label: "Room tags",
      shortLabel: "Tags",
      icon: TagsIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/room-tags`),
    },
    {
      id: "purposal_builder",
      href: `${base}/purposal-builder`,
      label: "Purposal builder",
      shortLabel: "Purposal",
      icon: FilePenLineIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/purposal-builder`),
    },
    {
      id: "customers",
      href: `${base}/customers`,
      label: "Customers",
      shortLabel: "Customers",
      icon: UserRoundIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/customers`),
    },
    {
      id: "team",
      href: `${base}/team/organization-members`,
      label: "Team",
      shortLabel: "Team",
      icon: UsersIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/team`),
    },
    {
      id: "integrations",
      href: `${base}/integrations`,
      label: "Integrations",
      shortLabel: "API",
      icon: PlugZapIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/integrations`),
    },
    {
      id: "settings",
      href: `${base}/settings`,
      label: "Property settings",
      shortLabel: "Settings",
      icon: SettingsIcon,
      match: (pathname, id) => pathname.startsWith(`/${id}/settings`),
    },
  ];
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
