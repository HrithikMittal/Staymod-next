import { ObjectId } from "mongodb";

import type { RoomTag } from "@/types/room-tag";

function ensureTagName(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("name is required.");
  }
  return value.trim();
}

export function slugifyRoomTag(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function normalizeRoomTagNames(tagNames: string[]): string[] {
  return [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
}

export function createRoomTagDocument(
  orgId: string,
  propertyId: ObjectId,
  name: string,
): Omit<RoomTag, "_id"> {
  const now = new Date();
  return {
    orgId,
    propertyId,
    name: name.trim(),
    slug: slugifyRoomTag(name),
    createdAt: now,
    updatedAt: now,
  };
}

export function parseCreateRoomTagInput(payload: unknown): { name: string } {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload.");
  }
  const input = payload as Record<string, unknown>;
  return { name: ensureTagName(input.name) };
}

export function parseRoomTagId(value: unknown): ObjectId {
  if (typeof value !== "string" || !ObjectId.isValid(value)) {
    throw new Error("tagId must be a valid id.");
  }
  return new ObjectId(value);
}
