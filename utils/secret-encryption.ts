import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PLAIN_PREFIX = "plaintext:v1:";

function deriveKey(): Buffer {
  const raw = process.env.PROPERTY_SECRET_ENCRYPTION_KEY;
  if (!raw?.trim()) {
    throw new Error("PROPERTY_SECRET_ENCRYPTION_KEY is not set");
  }
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return scryptSync(raw, "staymod-property-email-secrets", 32);
}

/**
 * Encrypts a secret for storage. When PROPERTY_SECRET_ENCRYPTION_KEY is unset,
 * stores with a prefix (still protected by org-scoped API access).
 */
export function encryptOptionalSecret(plain: string): string {
  if (!process.env.PROPERTY_SECRET_ENCRYPTION_KEY?.trim()) {
    return `${PLAIN_PREFIX}${plain}`;
  }
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptOptionalSecret(stored: string): string {
  if (stored.startsWith(PLAIN_PREFIX)) {
    return stored.slice(PLAIN_PREFIX.length);
  }
  if (!process.env.PROPERTY_SECRET_ENCRYPTION_KEY?.trim()) {
    throw new Error("PROPERTY_SECRET_ENCRYPTION_KEY is required to read encrypted API keys.");
  }
  const key = deriveKey();
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const enc = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
