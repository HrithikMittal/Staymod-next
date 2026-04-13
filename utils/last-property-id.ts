/** localStorage key for resuming last opened property after refresh on `/`. */
export const LAST_PROPERTY_ID_KEY = "staymod:lastPropertyId";

export function readLastPropertyId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_PROPERTY_ID_KEY);
  } catch {
    return null;
  }
}

export function writeLastPropertyId(id: string): void {
  try {
    localStorage.setItem(LAST_PROPERTY_ID_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearLastPropertyId(): void {
  try {
    localStorage.removeItem(LAST_PROPERTY_ID_KEY);
  } catch {
    /* ignore */
  }
}

/** True when this document load was triggered by the user reloading the page. */
export function isNavigationReload(): boolean {
  if (typeof window === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}
