import type { ObjectId } from "mongodb";

import type { OrganizationScope } from "@/types/organization";

export const BOOKING_CHECKINS_COLLECTION = "booking_checkins" as const;

export type BookingCheckinGuest = {
  name: string;
  email?: string;
  phone?: string;
  customerId?: ObjectId;
  identityDocuments: Array<{
    fileUrl: string;
    fileKey: string;
    fileName: string;
    contentType: string;
    source: "camera" | "photo" | "pdf";
    uploadedAt: Date;
  }>;
};

export type BookingCheckin = OrganizationScope & {
  _id: ObjectId;
  propertyId: ObjectId;
  bookingId: ObjectId;
  guests: BookingCheckinGuest[];
  checkedInAt: Date;
  createdAt: Date;
  updatedAt: Date;
};
