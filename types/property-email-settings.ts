import type { ObjectId } from "mongodb";

import type { OrganizationScope } from "@/types/organization";

/** MongoDB collection for per-property Resend / guest email configuration. */
export const PROPERTY_EMAIL_SETTINGS_COLLECTION = "property_email_settings" as const;

export type PropertyEmailSettings = OrganizationScope & {
  _id: ObjectId;
  propertyId: ObjectId;
  /** AES-256-GCM ciphertext (base64) or `plaintext:v1:`-prefixed when no server encryption key is set. */
  resendApiKeyStored: string;
  /** Verified sender address in Resend (e.g. bookings@yourdomain.com). */
  fromEmail: string;
  /** Optional always-on CC recipient for guest notifications. */
  ccEmail?: string;
  notifyOnConfirmation: boolean;
  notifyOnUpdate: boolean;
  notifyOnCancellation: boolean;
  createdAt: Date;
  updatedAt: Date;
};
