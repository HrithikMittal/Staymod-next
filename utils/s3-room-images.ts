import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
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

function getFileExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "bin";
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function validateRoomImageInput(fileName: string, contentType: string, size: number): void {
  if (!fileName.trim()) {
    throw new Error("fileName is required.");
  }
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("Unsupported image type. Use jpg, png, webp, or gif.");
  }
  if (!Number.isFinite(size) || size < 1 || size > MAX_IMAGE_BYTES) {
    throw new Error("Image size must be between 1 byte and 10MB.");
  }
}

export async function createRoomImageUploadUrl(params: {
  orgId: string;
  propertyId: string;
  fileName: string;
  contentType: string;
}): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  const bucket = requiredEnv("S3_BUCKET_NAME");
  const region = requiredEnv("S3_REGION");
  const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("S3_SECRET_ACCESS_KEY");
  const publicBase = s3PublicBaseUrl(bucket, region);

  const ext = getFileExtension(params.fileName);
  const cleanName = sanitizeFileName(params.fileName).replace(/\.[^/.]+$/, "");
  const key = `orgs/${params.orgId}/properties/${params.propertyId}/rooms/${Date.now()}-${crypto.randomUUID()}-${cleanName}.${ext}`;

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 });
  return {
    uploadUrl,
    fileUrl: `${publicBase}/${key}`,
    key,
  };
}
