import type { Booking } from "@/types/booking";

/** JSON shape for public API booking responses (create, list by email, get by id). */
export function serializePublicBooking(b: Booking) {
  const normalizedRooms =
    b.rooms && Object.keys(b.rooms).length > 0
      ? b.rooms
      : b.roomId && b.roomType
        ? {
            [b.roomId.toString()]: {
              roomType: b.roomType,
              quantity: b.quantity ?? 1,
            },
          }
        : {};

  return {
    _id: b._id.toString(),
    orgId: b.orgId,
    propertyId: b.propertyId.toString(),
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    checkIn: b.checkIn.toISOString(),
    checkOut: b.checkOut.toISOString(),
    numberOfGuests: b.numberOfGuests,
    selectedOptions: b.selectedOptions?.map((o) => ({
      ...o,
      bookingOptionId: o.bookingOptionId.toString(),
    })),
    customItems: b.customItems,
    advanceAmount: b.advanceAmount,
    status: b.status,
    rooms: normalizedRooms,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
