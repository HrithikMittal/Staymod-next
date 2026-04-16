import { apiFetch } from "@/utils/api-fetch";

export type RoomTagItem = {
  _id: string;
  propertyId: string;
  orgId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type ListRoomTagsResponse = {
  tags: RoomTagItem[];
};

export type UpsertRoomTagPayload = {
  name: string;
};

export function fetchRoomTags(propertyId: string) {
  return apiFetch<ListRoomTagsResponse>(`/api/properties/${propertyId}/room-tags`);
}

export function createRoomTag(propertyId: string, payload: UpsertRoomTagPayload) {
  return apiFetch<{ tag: RoomTagItem }>(`/api/properties/${propertyId}/room-tags`, {
    method: "POST",
    json: payload,
  });
}

export function updateRoomTag(propertyId: string, tagId: string, payload: UpsertRoomTagPayload) {
  return apiFetch<{ tag: RoomTagItem }>(`/api/properties/${propertyId}/room-tags/${tagId}`, {
    method: "PATCH",
    json: payload,
  });
}

export function deleteRoomTag(propertyId: string, tagId: string) {
  return apiFetch<{ deleted: boolean }>(`/api/properties/${propertyId}/room-tags/${tagId}`, {
    method: "DELETE",
  });
}
