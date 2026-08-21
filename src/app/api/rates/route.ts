import { NextResponse } from "next/server";
import { FALLBACK_RATES, RATES_SNAPSHOT_DATE } from "@/lib/currency";

/**
 * Live FX rates, PHP-based to match how HitSeekr quotes.
 *
 * open.er-api.com is keyless and updates daily, which is plenty for card
 * prices. If it's unreachable we serve the committed snapshot rather than
 * failing the page -- a slightly stale rate beats no prices at all.
 */
export const revalidate = 21600; // 6 hours

const WANTED = ["PHP", "SGD", "IDR", "MYR", "USD"];

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/PHP", {
      next: { revalidate },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
    if (data.result !== "success" || !data.rates) throw new Error("unexpected payload");

    const rates: Record<string, number> = {};
    for (const code of WANTED) {
      const v = data.rates[code];
      if (typeof v === "number" && Number.isFinite(v)) rates[code] = v;
    }
    if (!rates.PHP) rates.PHP = 1;

    // If the upstream shape drifts and we lost currencies, prefer the snapshot.
    if (Object.keys(rates).length < WANTED.length) throw new Error("incomplete rates");

    return NextResponse.json({
      base: "PHP",
      rates,
      source: "open.er-api.com",
      updatedAt: data.time_last_update_utc ?? null,
    });
  } catch {
    return NextResponse.json({
      base: "PHP",
      rates: FALLBACK_RATES,
      source: "snapshot",
      updatedAt: RATES_SNAPSHOT_DATE,
    });
  }
}
