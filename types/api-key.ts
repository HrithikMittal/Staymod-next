import type { ObjectId } from "mongodb";

import type { OrganizationScope } from "@/types/organization";

export const API_KEYS_COLLECTION = "api_keys" as const;

export const API_KEY_SCOPES = [
  "*",
  "rooms:read",
  "availability:read",
  "bookings:read",
  "bookings:write",
] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export type ApiKey = OrganizationScope & {
  _id: ObjectId;
  name?: string;
  /** SHA-256 hash of the raw API key token. */
  keyHash: string;
  /** Prefix shown in UI/logs (e.g. `sk_live_abc...`). */
  keyPrefix: string;
  /** Optional property restrictions. Empty/undefined means all org properties. */
  propertyIds?: ObjectId[];
  scopes: ApiKeyScope[];
  allowedOrigins?: string[];
  allowedIps?: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
