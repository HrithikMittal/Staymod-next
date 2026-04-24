import type { PurposalBuilderFormState, PurposalComputed } from "@/components/global/purposal-builder/types";
import type { BookingOptionItem } from "@/api-clients/booking-options";
import type { RoomListItem } from "@/api-clients/rooms";

export const defaultPurposalForm: PurposalBuilderFormState = {
  title: "Normal plan",
  subtitle: "Standard pricing",
  nights: 2,
  guests: 6,
  roomSelections: [],
  mattressLabel: "Extra mattress",
  mattressRatePerDay: 500,
  mattressCount: 2,
  bookingOptionSelections: [],
  b2bRatePerPersonNight: 1600,
  b2bTitle: "Special B2B price",
  b2bSubtitle: "Discounted all-inclusive rate",
  b2bNote: "Rooms + mattresses + booking options included in flat per-person rate",
};

function safe(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, v);
}

function roomRate(room: RoomListItem): number {
  return safe(room.priceWeekday ?? room.priceWeekend ?? 0);
}

export function computePurposal(
  state: PurposalBuilderFormState,
  rooms: RoomListItem[],
  bookingOptions: BookingOptionItem[],
): PurposalComputed {
  const nights = Math.max(1, Math.round(safe(state.nights)));
  const guests = Math.max(1, Math.round(safe(state.guests)));
  const mattressCount = Math.max(0, Math.round(safe(state.mattressCount)));
  const mattressRate = safe(state.mattressRatePerDay);
  const b2bRate = safe(state.b2bRatePerPersonNight);

  const roomById = new Map(rooms.map((room) => [room._id, room]));
  const optionById = new Map(bookingOptions.map((opt) => [opt._id, opt]));

  const roomRows = state.roomSelections
    .map((selection) => {
      const room = roomById.get(selection.roomId);
      if (!room) return null;
      const quantity = Math.max(1, Math.round(safe(selection.quantity)));
      const ratePerNight = roomRate(room);
      return {
        label: room.name,
        quantity,
        ratePerNight,
        total: ratePerNight * quantity * nights,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const bookingOptionRows = state.bookingOptionSelections
    .map((selection) => {
      const option = optionById.get(selection.bookingOptionId);
      if (!option) return null;
      const quantity = Math.max(0, Math.round(safe(selection.quantity)));
      if (quantity <= 0) return null;
      const multiplier = option.frequency === "day" ? nights : 1;
      return {
        label: option.name,
        quantity,
        pricePerUnit: safe(option.pricePerUnit),
        frequency: option.frequency,
        total: safe(option.pricePerUnit) * quantity * multiplier,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const roomTotal = roomRows.reduce((sum, row) => sum + row.total, 0);
  const mattressTotal = mattressRate * nights * mattressCount;
  const bookingOptionsTotal = bookingOptionRows.reduce((sum, row) => sum + row.total, 0);
  const normalTotal = roomTotal + mattressTotal + bookingOptionsTotal;
  const b2bTotal = b2bRate * nights * guests;
  const savingsAmount = Math.max(0, normalTotal - b2bTotal);
  const savingsPercent = normalTotal > 0 ? Math.round((savingsAmount / normalTotal) * 100) : 0;

  return {
    roomRows,
    bookingOptionRows,
    roomTotal,
    mattressTotal,
    bookingOptionsTotal,
    normalTotal,
    b2bTotal,
    savingsAmount,
    savingsPercent,
  };
}

export function formatInr(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;
}
