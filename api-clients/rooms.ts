import { apiFetch } from "@/utils/api-fetch";

export type RoomListItem = {
  _id: string;
  propertyId: string;
  orgId: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  tagline?: string;
  description?: string;
  floor?: string;
  maxGuests: number;
  /** Physical beds / sleep surfaces (e.g. bunks each count). */
  bedCount: number;
  /** Identical rooms of this type (e.g. 2 Deluxe rooms). */
  unitCount: number;
  /** Reference label per physical unit (e.g. room numbers), same length as `unitCount` when set. */
  roomNumbers?: string[];
  bedSize?: string;
  /** @deprecated Prefer `bedSize` */
  bedSummary?: string;
  priceWeekday?: number;
  priceWeekend?: number;
  imageUrls?: string[];
  roomImages?: Array<{
    url: string;
    sortOrder: number;
    tagIds?: string[];
    tags?: Array<{ _id: string; name: string; slug: string }>;
  }>;
  tags?: Array<{ _id: string; name: string; slug: string }>;
  amenities: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ListRoomsResponse = {
  rooms: RoomListItem[];
};

export type CreateRoomPayload = {
  name: string;
  type:
    | "single"
    | "double"
    | "twin"
    | "triple"
    | "quad"
    | "suite"
    | "studio"
    | "dorm_bed"
    | "family"
    | "other";
  slug?: string;
  status?: "active" | "inactive" | "maintenance" | "out_of_order";
  tagline?: string;
  description?: string;
  floor?: string;
  maxGuests?: number;
  bedCount?: number;
  unitCount?: number;
  roomNumbers?: string[];
  bedSize?: string;
  /** Legacy; server maps to `bedSize` if `bedSize` is omitted */
  bedSummary?: string;
  priceWeekday?: number;
  priceWeekend?: number;
  imageUrls?: string[];
  roomImages?: Array<{ url: string; tagIds?: string[]; sortOrder: number }>;
  tagNames?: string[];
  amenities?: string[];
  isActive?: boolean;
  sortOrder?: number;
};

export function fetchRooms(propertyId: string) {
  return apiFetch<ListRoomsResponse>(`/api/properties/${propertyId}/rooms`);
}

export function createRoom(propertyId: string, payload: CreateRoomPayload) {
  return apiFetch<{ room: RoomListItem }>(`/api/properties/${propertyId}/rooms`, {
    method: "POST",
    json: payload,
  });
}

export function updateRoom(propertyId: string, roomId: string, payload: CreateRoomPayload) {
  return apiFetch<{ room: RoomListItem }>(`/api/properties/${propertyId}/rooms/${roomId}`, {
    method: "PATCH",
    json: payload,
  });
}

export function updateRoomDailyPrice(
  propertyId: string,
  roomId: string,
  payload: { dateKey: string; price: number | null },
) {
  return apiFetch<{ room: RoomListItem }>(`/api/properties/${propertyId}/rooms/${roomId}/daily-price`, {
    method: "PATCH",
    json: payload,
  });
}

export function createRoomImageUploadUrl(
  propertyId: string,
  payload: { fileName: string; contentType: string; size: number },
) {
  return apiFetch<{ uploadUrl: string; fileUrl: string; key: string }>(
    `/api/properties/${propertyId}/rooms/image-upload-url`,
    {
      method: "POST",
      json: payload,
    },
  );
}

export function deleteRoom(propertyId: string, roomId: string) {
  return apiFetch<{ deleted: boolean }>(`/api/properties/${propertyId}/rooms/${roomId}`, {
    method: "DELETE",
  });
}
