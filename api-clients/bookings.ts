import { apiFetch } from "@/utils/api-fetch";

export type BookingListItem = {
  _id: string;
  propertyId: string;
  orgId: string;
  rooms: Record<string, { roomType: string; quantity: number; roomNumbers?: string[] }>;
  guestName: string;
  guestEmail?: string;
  checkIn: string;
  checkOut: string;
  numberOfGuests?: number;
  selectedOptions?: Array<{
    bookingOptionId: string;
    name: string;
    appliesTo: "user" | "room";
    frequency: "day" | "booking";
    pricePerUnit: number;
    quantity: number;
  }>;
  customItems?: Array<{ name: string; amount: number }>;
  advanceAmount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ListBookingsResponse = {
  bookings: BookingListItem[];
};

export type CreateBookingPayload = {
  roomId?: string;
  rooms?: Record<string, { quantity: number; roomNumbers?: string[] }>;
  guestName: string;
  guestEmail?: string;
  /** ISO date string (e.g. from `<input type="date">` or full ISO). */
  checkIn: string;
  checkOut: string;
  numberOfGuests?: number;
  selectedOptions?: Array<{
    bookingOptionId: string;
    name: string;
    appliesTo: "user" | "room";
    frequency: "day" | "booking";
    pricePerUnit: number;
    quantity: number;
  }>;
  customItems?: Array<{ name: string; amount: number }>;
  quantity?: number;
  roomNumbers?: string[];
  advanceAmount?: number;
  status?: "pending" | "confirmed" | "cancelled" | "no_show";
};

export function fetchBookings(propertyId: string) {
  return apiFetch<ListBookingsResponse>(`/api/properties/${propertyId}/bookings`);
}

export function createBooking(propertyId: string, payload: CreateBookingPayload) {
  return apiFetch<{ booking: BookingListItem }>(`/api/properties/${propertyId}/bookings`, {
    method: "POST",
    json: payload,
  });
}

export function updateBooking(propertyId: string, bookingId: string, payload: CreateBookingPayload) {
  return apiFetch<{ booking: BookingListItem }>(
    `/api/properties/${propertyId}/bookings/${bookingId}`,
    {
      method: "PATCH",
      json: payload,
    },
  );
}

export function resendConfirmationEmail(propertyId: string, bookingId: string) {
  return apiFetch<{ sent: boolean }>(
    `/api/properties/${propertyId}/bookings/${bookingId}/resend-confirmation-email`,
    { method: "POST" },
  );
}
