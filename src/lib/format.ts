/**
 * Locale-stable formatters.
 *
 * Bare `toLocaleString()` / `toLocaleDateString()` resolve against the host's
 * default locale, which differs between the Node server and the visitor's
 * browser and shows up as a hydration mismatch. Pinning the locale keeps server
 * and client markup identical.
 */

const COUNT = new Intl.NumberFormat("en-US");
const DATE = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function formatCount(n: number): string {
  return COUNT.format(n);
}

export function formatDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : DATE.format(d);
}
