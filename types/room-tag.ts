import type { ObjectId } from "mongodb";

import type { OrganizationScope } from "@/types/organization";

export const ROOM_TAGS_COLLECTION = "room_tags" as const;

export type RoomTag = OrganizationScope & {
  _id: ObjectId;
  propertyId: ObjectId;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};
