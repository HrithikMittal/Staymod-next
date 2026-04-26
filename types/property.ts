import type { ObjectId } from "mongodb";

import type { OrganizationScope } from "@/types/organization";

export const PROPERTY_TYPES = [
  "hotel",
  "farmhouse",
  "villa",
  "homestay",
  "resort",
  "other",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export type PropertyAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
};

export type PropertyContact = {
  email?: string;
  phone?: string;
};

export type Property = OrganizationScope & {
  _id: ObjectId;
  name: string;
  slug: string;
  type: PropertyType;
  gstEnabled?: boolean;
  gstNumber?: string;
  description?: string;
  address: PropertyAddress;
  contact: PropertyContact;
  timezone: string;
  currency: string;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePropertyInput = Omit<
  Property,
  "_id" | "createdAt" | "updatedAt" | "orgId"
>;
