/** Weekday/weekend base fields (room document or API shape). */
export type RoomBaseRates = {
  priceWeekday?: number;
  priceWeekend?: number;
};

/** Fri–Sat UTC (matches room-availability grid weekend highlight). */
export function isWeekendNightUtc(dateKey: string): boolean {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  const day = d.getUTCDay();
  return day === 5 || day === 6;
}

/** Base rate from weekday/weekend fields only (no per-day overrides). */
export function defaultNightlyPrice(room: RoomBaseRates, dateKey: string): number | null {
  const isWeekend = isWeekendNightUtc(dateKey);
  const p = isWeekend ? room.priceWeekend : room.priceWeekday;
  return p ?? null;
}
