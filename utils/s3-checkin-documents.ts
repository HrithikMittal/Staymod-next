import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function s3PublicBaseUrl(bucket: string, region: string): string {
  const explicit = process.env.S3_PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionFromFile(fileName: string, contentType: string): string {
  const fromName = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (fromName) return fromName;
  if (contentType === "application/pdf") return "pdf";
  return "jpg";
}

export function validateCheckinDocumentInput(fileName: string, contentType: string, size: number): void {
  if (!fileName.trim()) throw new Error("fileName is required.");
  if (!ALLOWED_TYPES.has(contentType)) throw new Error("Unsupported file type. Use image or PDF.");
  if (!Number.isFinite(size) || size < 1 || size > MAX_DOCUMENT_BYTES) {
    throw new Error("File size must be between 1 byte and 15MB.");
  }
}

export async function createCheckinDocumentUploadUrl(params: {
  orgId: string;
  propertyId: string;
  bookingId: string;
  fileName: string;
  contentType: string;
}): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  const bucket = requiredEnv("S3_BUCKET_NAME");
  const region = requiredEnv("S3_REGION");
  const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("S3_SECRET_ACCESS_KEY");
  const publicBase = s3PublicBaseUrl(bucket, region);

  const ext = extensionFromFile(params.fileName, params.contentType);
  const cleanName = sanitizeFileName(params.fileName).replace(/\.[^/.]+$/, "");
  const key = `orgs/${params.orgId}/properties/${params.propertyId}/bookings/${params.bookingId}/check-in/${Date.now()}-${crypto.randomUUID()}-${cleanName}.${ext}`;

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: params.contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 });
  return { uploadUrl, fileUrl: `${publicBase}/${key}`, key };
}
