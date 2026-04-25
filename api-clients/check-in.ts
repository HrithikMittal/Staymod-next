import { apiFetch } from "@/utils/api-fetch";

export type UploadedIdentity = {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  contentType: string;
  source: "camera" | "photo" | "pdf";
};

export type CheckinGuestPayload = {
  name: string;
  email?: string;
  phone?: string;
  identityDocuments: UploadedIdentity[];
};

export type BookingCheckinResponse = {
  checkin: null | {
    guests: Array<{
      name: string;
      email?: string;
      phone?: string;
      identityDocuments: UploadedIdentity[];
    }>;
  };
};

export function fetchBookingCheckin(propertyId: string, bookingId: string) {
  return apiFetch<BookingCheckinResponse>(
    `/api/properties/${propertyId}/bookings/${bookingId}/check-in`,
  );
}

export function saveBookingCheckin(
  propertyId: string,
  bookingId: string,
  payload: { guests: CheckinGuestPayload[] },
) {
  return apiFetch(`/api/properties/${propertyId}/bookings/${bookingId}/check-in`, {
    method: "POST",
    json: payload,
  });
}

export function createCheckinUploadUrl(
  propertyId: string,
  bookingId: string,
  payload: { fileName: string; contentType: string; size: number },
) {
  return apiFetch<{ uploadUrl: string; fileUrl: string; key: string }>(
    `/api/properties/${propertyId}/bookings/${bookingId}/check-in/upload-url`,
    {
      method: "POST",
      json: payload,
    },
  );
}
