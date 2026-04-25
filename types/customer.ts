import type { ObjectId } from "mongodb";

import type { OrganizationScope } from "@/types/organization";

export const CUSTOMERS_COLLECTION = "customers" as const;

export type Customer = OrganizationScope & {
  _id: ObjectId;
  propertyId: ObjectId;
  email: string;
  emailNormalized: string;
  name?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  lastBookingAt?: Date;
};
