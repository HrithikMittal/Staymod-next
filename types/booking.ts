import type { ObjectId } from "mongodb";

import type { BookingOptionAppliesTo, BookingOptionFrequency } from "@/types/booking-option";
import type { OrganizationScope } from "@/types/organization";
import type { RoomType } from "@/types/room";

/** MongoDB collection name for reservations. */
export const BOOKINGS_COLLECTION = "bookings" as const;

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "no_show"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingRoomAllocation = {
  /** Denormalized from Room for availability buckets. */
  roomType: RoomType;
  /** Number of units from this room listing. */
  quantity: number;
  /** Optional selected physical room numbers/labels. */
  roomNumbers?: string[];
};

/** Map keyed by roomId string to requested allocation for that listing. */
export type BookingRoomsMap = Record<string, BookingRoomAllocation>;

export type BookingSelectedOption = {
  bookingOptionId: ObjectId;
  name: string;
  appliesTo: BookingOptionAppliesTo;
  frequency: BookingOptionFrequency;
  pricePerUnit: number;
  quantity: number;
};

export type BookingCustomItem = {
  name: string;
  amount: number;
};

/**
 * A reservation against a specific {@link Room} listing row. Inventory is tracked per
 * `roomType` on {@link RoomAvailability}; `roomType` is denormalized from each selected room.
 */
export type Booking = OrganizationScope & {
  _id: ObjectId;
  propertyId: ObjectId;
  /** Multi-room allocation map keyed by roomId. */
  rooms: BookingRoomsMap;
  /** @deprecated legacy single-room shape retained for backward compatibility. */
  roomId?: ObjectId;
  /** @deprecated legacy single-room shape retained for backward compatibility. */
  roomType?: RoomType;
  guestName: string;
  guestEmail?: string;
  /** First night (inclusive), property/UTC policy should match `dateKey` generation. */
  checkIn: Date;
  /** Last morning / departure (exclusive): nights are `[checkIn, checkOut)`. */
  checkOut: Date;
  /** Headcount for this reservation. */
  numberOfGuests?: number;
  /** Snapshot of selected configured booking options. */
  selectedOptions?: BookingSelectedOption[];
  /** Free-form extra line items added at booking time. */
  customItems?: BookingCustomItem[];
  /** @deprecated legacy single-room shape retained for backward compatibility. */
  quantity?: number;
  /** Amount received in advance from guest at booking time. */
  advanceAmount?: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBookingRoomInput = {
  roomId: ObjectId;
  quantity: number;
  roomNumbers?: string[];
};

/** Payload before server attaches org/timestamps and computes denormalized roomType map. */
export type CreateBookingInput = {
  propertyId: ObjectId;
  guestName: string;
  guestEmail?: string;
  checkIn: Date;
  checkOut: Date;
  numberOfGuests?: number;
  rooms: CreateBookingRoomInput[];
  selectedOptions?: BookingSelectedOption[];
  customItems?: BookingCustomItem[];
  advanceAmount?: number;
  status: BookingStatus;
};
