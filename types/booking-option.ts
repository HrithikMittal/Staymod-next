import type { ObjectId } from "mongodb";

import type { OrganizationScope } from "@/types/organization";

/** MongoDB collection name for chargeable booking extras. */
export const BOOKING_OPTIONS_COLLECTION = "booking_options" as const;

export const BOOKING_OPTION_APPLIES_TO = ["user", "room"] as const;
export const BOOKING_OPTION_FREQUENCY = ["day", "booking"] as const;

export type BookingOptionAppliesTo = (typeof BOOKING_OPTION_APPLIES_TO)[number];
export type BookingOptionFrequency = (typeof BOOKING_OPTION_FREQUENCY)[number];

export type BookingOption = OrganizationScope & {
  _id: ObjectId;
  propertyId: ObjectId;
  /** Example: Food Plan, Heater, Extra Mattress. */
  name: string;
  /** Optional helper copy shown in UI. */
  description?: string;
  /** What the charge is applied to in calculation logic. */
  appliesTo: BookingOptionAppliesTo;
  /** Billing interval (kept explicit for future extension). */
  frequency: BookingOptionFrequency;
  /** Non-negative amount in property currency (major units). */
  pricePerUnit: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBookingOptionInput = Omit<
  BookingOption,
  "_id" | "orgId" | "propertyId" | "createdAt" | "updatedAt"
>;
