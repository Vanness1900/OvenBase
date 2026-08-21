import { CURRENCIES, type Card, type CurrencyCode, type CurrencyMeta, type StoreId } from "./types";

/**
 * Every scraped price is stored in the currency its store quotes in, then
 * converted at display time. Rates are expressed against PHP because HitSeekr
 * (our primary source) is peso-denominated.
 *
 * FALLBACK_RATES is a snapshot so the site renders sensibly offline; the live
 * values come from /api/rates and override these on the client.
 */
export const RATE_BASE = "PHP" as const;

export type RateTable = Record<string, number>;

/** 1 PHP expressed in each currency. Snapshot taken 2026-08-21. */
export const FALLBACK_RATES: RateTable = {
  PHP: 1,
  SGD: 0.0225,
  IDR: 279.0,
  MYR: 0.0742,
  USD: 0.0175,
};

export const RATES_SNAPSHOT_DATE = "2026-08-21";

export function convert(amount: number, from: string, to: string, rates: RateTable): number | null {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;
  // amount -> PHP -> target
  return (amount / fromRate) * toRate;
}

export function currencyMeta(code: CurrencyCode): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function formatMoney(amount: number | null, code: CurrencyCode): string {
  if (amount === null || !Number.isFinite(amount)) return "—";
  const meta = currencyMeta(code);
  const rounded = amount.toFixed(meta.decimals);
  const [whole, frac] = rounded.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${meta.symbol}${grouped}${frac ? `.${frac}` : ""}`;
}

/**
 * Picks a starting currency from the browser's region, per the spec: someone in
 * Singapore should land on SGD without touching the dropdown. Falls back to SGD.
 */
export function guessCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "SGD";
  const stored = window.localStorage.getItem("ob:currency");
  if (stored && CURRENCIES.some((c) => c.code === stored)) return stored as CurrencyCode;

  const region = regionFromLocale() ?? regionFromTimeZone();
  switch (region) {
    case "PH":
      return "PHP";
    case "ID":
      return "IDR";
    case "MY":
      return "MYR";
    case "SG":
      return "SGD";
    default:
      return "SGD";
  }
}

function regionFromLocale(): string | null {
  try {
    const locale = new Intl.Locale(navigator.language);
    // `region` is undefined for bare tags like "en", hence the timezone backup.
    return locale.region ?? null;
  } catch {
    return null;
  }
}

const TZ_REGION: Record<string, string> = {
  "Asia/Singapore": "SG",
  "Asia/Manila": "PH",
  "Asia/Jakarta": "ID",
  "Asia/Pontianak": "ID",
  "Asia/Makassar": "ID",
  "Asia/Jayapura": "ID",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Kuching": "MY",
};

function regionFromTimeZone(): string | null {
  try {
    return TZ_REGION[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? null;
  } catch {
    return null;
  }
}

/**
 * A card's price at one store, converted into the display currency.
 * Returns null when that store has no quote for the card.
 */
export function storePriceIn(
  card: Card,
  store: StoreId,
  currency: CurrencyCode,
  rates: RateTable,
): number | null {
  const quote = card.prices?.[store];
  if (!quote) return null;
  return convert(quote.amount, quote.currency, currency, rates);
}
