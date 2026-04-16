import { eachUtcNightDateKeysBetween } from "@/utils/date-key";

type RoomPricing = {
  priceWeekday?: number;
  priceWeekend?: number;
};

function isWeekendNight(dateKey: string): boolean {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const day = date.getUTCDay();
  return day === 5 || day === 6 || day === 0;
}

export function calculateNightsCount(checkInIso: string, checkOutIso: string): number {
  const checkIn = new Date(checkInIso);
  const checkOut = new Date(checkOutIso);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return 0;
  }
  return eachUtcNightDateKeysBetween(checkIn, checkOut).length;
}

export function calculateBookingAmount(
  checkInIso: string,
  checkOutIso: string,
  quantity: number,
  pricing?: RoomPricing,
): number {
  if (!pricing) {
    return 0;
  }

  const nights = eachUtcNightDateKeysBetween(new Date(checkInIso), new Date(checkOutIso));
  const safeQty = Math.max(1, quantity || 1);

  const totalForOneRoom = nights.reduce((sum, dateKey) => {
    const isWeekend = isWeekendNight(dateKey);
    const nightly = isWeekend ? pricing.priceWeekend : pricing.priceWeekday;
    return sum + (nightly ?? 0);
  }, 0);

  return totalForOneRoom * safeQty;
}

export function formatMoney(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString()}`;
}
