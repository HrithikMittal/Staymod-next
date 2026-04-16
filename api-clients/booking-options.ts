import { apiFetch } from "@/utils/api-fetch";

export type BookingOptionItem = {
  _id: string;
  propertyId: string;
  orgId: string;
  name: string;
  description?: string;
  appliesTo: "user" | "room";
  frequency: "day" | "booking";
  pricePerUnit: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ListBookingOptionsResponse = {
  bookingOptions: BookingOptionItem[];
};

export type UpsertBookingOptionPayload = {
  name: string;
  description?: string;
  appliesTo: "user" | "room";
  frequency: "day" | "booking";
  pricePerUnit: number;
  isActive?: boolean;
  sortOrder?: number;
};

export function fetchBookingOptions(propertyId: string) {
  return apiFetch<ListBookingOptionsResponse>(`/api/properties/${propertyId}/booking-options`);
}

export function createBookingOption(propertyId: string, payload: UpsertBookingOptionPayload) {
  return apiFetch<{ bookingOption: BookingOptionItem }>(`/api/properties/${propertyId}/booking-options`, {
    method: "POST",
    json: payload,
  });
}

export function updateBookingOption(
  propertyId: string,
  bookingOptionId: string,
  payload: UpsertBookingOptionPayload,
) {
  return apiFetch<{ bookingOption: BookingOptionItem }>(
    `/api/properties/${propertyId}/booking-options/${bookingOptionId}`,
    {
      method: "PATCH",
      json: payload,
    },
  );
}

export function deleteBookingOption(propertyId: string, bookingOptionId: string) {
  return apiFetch<{ deleted: boolean }>(
    `/api/properties/${propertyId}/booking-options/${bookingOptionId}`,
    {
      method: "DELETE",
    },
  );
}
