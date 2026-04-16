/**
 * UTC calendar `YYYY-MM-DD` for a `Date` (no timezone conversion — uses UTC fields).
 * Align booking `checkIn`/`checkOut` with the same convention when slicing nights.
 */
export function formatDateKeyUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Each **night** in `[checkIn, checkOut)` using UTC calendar days (half-open interval).
 */
export function eachUtcNightDateKeysBetween(checkIn: Date, checkOut: Date): string[] {
  const start = Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate());
  const end = Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate());
  const keys: string[] = [];
  for (let t = start; t < end; t += 86_400_000) {
    keys.push(formatDateKeyUtc(new Date(t)));
  }
  return keys;
}

/** True if `dateKey` is one of the booked nights in `[checkIn, checkOut)` (UTC). */
export function bookingIncludesUtcNight(
  checkInIso: string,
  checkOutIso: string,
  dateKey: string,
): boolean {
  const nights = eachUtcNightDateKeysBetween(new Date(checkInIso), new Date(checkOutIso));
  return nights.includes(dateKey);
}
