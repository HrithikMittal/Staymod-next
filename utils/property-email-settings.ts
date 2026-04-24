import { ObjectId } from "mongodb";

import type { PropertyEmailSettings } from "@/types/property-email-settings";
import { PROPERTY_EMAIL_SETTINGS_COLLECTION } from "@/types/property-email-settings";
import { getDb } from "@/utils/mongodb";
import { decryptOptionalSecret, encryptOptionalSecret } from "@/utils/secret-encryption";

export function maskResendApiKey(key: string): string {
  const t = key.trim();
  if (t.length <= 6) return "••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export async function getPropertyEmailSettings(
  orgId: string,
  propertyId: ObjectId,
): Promise<PropertyEmailSettings | null> {
  const db = await getDb();
  return db.collection<PropertyEmailSettings>(PROPERTY_EMAIL_SETTINGS_COLLECTION).findOne({
    orgId,
    propertyId,
  });
}

export type DecryptedPropertyEmailSettings = {
  resendApiKey: string;
  fromEmail: string;
  ccEmail?: string;
  notifyOnConfirmation: boolean;
  notifyOnUpdate: boolean;
  notifyOnCancellation: boolean;
};

export async function loadDecryptedEmailSettings(
  orgId: string,
  propertyId: ObjectId,
): Promise<DecryptedPropertyEmailSettings | null> {
  const doc = await getPropertyEmailSettings(orgId, propertyId);
  if (!doc?.resendApiKeyStored?.trim() || !doc.fromEmail?.trim()) {
    return null;
  }
  try {
    const resendApiKey = decryptOptionalSecret(doc.resendApiKeyStored);
    if (!resendApiKey.trim()) {
      return null;
    }
    return {
      resendApiKey,
      fromEmail: doc.fromEmail.trim(),
      ccEmail: doc.ccEmail?.trim() || undefined,
      notifyOnConfirmation: doc.notifyOnConfirmation,
      notifyOnUpdate: doc.notifyOnUpdate,
      notifyOnCancellation: doc.notifyOnCancellation,
    };
  } catch {
    return null;
  }
}

export type UpsertPropertyEmailSettingsInput = {
  resendApiKey?: string | null;
  fromEmail?: string;
  ccEmail?: string;
  notifyOnConfirmation?: boolean;
  notifyOnUpdate?: boolean;
  notifyOnCancellation?: boolean;
};

export async function upsertPropertyEmailSettings(
  orgId: string,
  propertyId: ObjectId,
  input: UpsertPropertyEmailSettingsInput,
): Promise<PropertyEmailSettings> {
  const db = await getDb();
  const existing = await getPropertyEmailSettings(orgId, propertyId);
  const now = new Date();

  let resendApiKeyStored = existing?.resendApiKeyStored ?? "";
  if (input.resendApiKey !== undefined) {
    if (input.resendApiKey === null || input.resendApiKey.trim() === "") {
      resendApiKeyStored = "";
    } else {
      resendApiKeyStored = encryptOptionalSecret(input.resendApiKey.trim());
    }
  }

  const fromEmail =
    input.fromEmail !== undefined ? input.fromEmail.trim() : (existing?.fromEmail ?? "");
  const ccEmail = input.ccEmail !== undefined ? input.ccEmail.trim() : (existing?.ccEmail ?? "");
  const notifyOnConfirmation =
    input.notifyOnConfirmation ?? existing?.notifyOnConfirmation ?? true;
  const notifyOnUpdate = input.notifyOnUpdate ?? existing?.notifyOnUpdate ?? true;
  const notifyOnCancellation =
    input.notifyOnCancellation ?? existing?.notifyOnCancellation ?? true;

  const doc: Omit<PropertyEmailSettings, "_id"> = {
    orgId,
    propertyId,
    resendApiKeyStored,
    fromEmail,
    ccEmail: ccEmail || undefined,
    notifyOnConfirmation,
    notifyOnUpdate,
    notifyOnCancellation,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    await db.collection(PROPERTY_EMAIL_SETTINGS_COLLECTION).updateOne(
      { _id: existing._id },
      { $set: { ...doc, updatedAt: now } },
    );
    const next = await getPropertyEmailSettings(orgId, propertyId);
    if (!next) {
      throw new Error("Failed to save email settings.");
    }
    return next;
  }

  const insertResult = await db.collection<Omit<PropertyEmailSettings, "_id">>(
    PROPERTY_EMAIL_SETTINGS_COLLECTION,
  ).insertOne(doc);
  const inserted = await db.collection<PropertyEmailSettings>(PROPERTY_EMAIL_SETTINGS_COLLECTION).findOne({
    _id: insertResult.insertedId,
  });
  if (!inserted) {
    throw new Error("Failed to save email settings.");
  }
  return inserted;
}

export function serializePropertyEmailSettingsPublic(doc: PropertyEmailSettings | null) {
  if (!doc) {
    return {
      configured: false,
      hasApiKey: false,
      apiKeyMasked: null as string | null,
      fromEmail: "",
      ccEmail: "",
      notifyOnConfirmation: true,
      notifyOnUpdate: true,
      notifyOnCancellation: true,
      updatedAt: null as string | null,
    };
  }
  let apiKeyMasked: string | null = null;
  if (doc.resendApiKeyStored) {
    try {
      const raw = decryptOptionalSecret(doc.resendApiKeyStored);
      if (raw.trim()) {
        apiKeyMasked = maskResendApiKey(raw);
      }
    } catch {
      apiKeyMasked = "••••";
    }
  }
  return {
    configured: Boolean(doc.resendApiKeyStored && doc.fromEmail?.trim()),
    hasApiKey: Boolean(doc.resendApiKeyStored),
    apiKeyMasked,
    fromEmail: doc.fromEmail ?? "",
    ccEmail: doc.ccEmail ?? "",
    notifyOnConfirmation: doc.notifyOnConfirmation,
    notifyOnUpdate: doc.notifyOnUpdate,
    notifyOnCancellation: doc.notifyOnCancellation,
    updatedAt: doc.updatedAt.toISOString(),
  };
}
