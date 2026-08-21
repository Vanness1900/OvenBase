"use client";

import { useMemo, useState } from "react";
import { useSettings } from "./settings-provider";
import { convert, formatMoney } from "@/lib/currency";
import type { PriceHistoryEntry } from "@/lib/types";
import { formatDate } from "@/lib/format";

type Range = "1W" | "1M" | "3M" | "1Y" | "ALL";
const RANGES: { key: Range; days: number | null }[] = [
  { key: "1W", days: 7 },
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "1Y", days: 365 },
  { key: "ALL", days: null },
];

/**
 * Price over time, drawn as a plain SVG line so we don't ship a chart library
 * for one sparkline. Amounts arrive in PHP and are converted at render time.
 *
 * No source publishes historical Braverse prices, so history only exists from
 * OvenBase's first scrape forward -- with a single observation there is nothing
 * to plot yet and we say so instead of drawing a misleading flat line.
 */
export function PriceChart({ history }: { history: PriceHistoryEntry[] }) {
  const { currency, rates, t } = useSettings();
  const [range, setRange] = useState<Range>("ALL");

  const points = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? null;
    if (days === null || history.length === 0) return history;
    // Anchor ranges to the most recent reading rather than wall-clock time:
    // it keeps the render pure and reads better when a scrape is a few days old.
    const latest = new Date(history[history.length - 1].date).getTime();
    const cutoff = latest - days * 86_400_000;
    return history.filter((h) => new Date(h.date).getTime() >= cutoff);
  }, [history, range]);

  if (points.length < 2) {
    return (
      <div className="rounded-[var(--ob-radius-sm)] border border-dashed border-[var(--ob-line-strong)] px-4 py-8 text-center">
        <p className="text-[13px] text-[var(--ob-text-soft)]">{t("card.noPriceHistory")}</p>
        {points.length === 1 && (
          <p className="mt-1.5 text-[12px] text-[var(--ob-text-faint)]">
            First reading {formatDate(points[0].date)} ·{" "}
            {formatMoney(convert(points[0].amount, "PHP", currency, rates), currency)}
          </p>
        )}
      </div>
    );
  }

  const W = 560;
  const H = 160;
  const PAD = 8;

  const values = points.map((p) => convert(p.amount, "PHP", currency, rates) ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;

  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const pct = first ? (delta / first) * 100 : 0;
  const up = delta >= 0;
  const stroke = up ? "var(--ob-ok)" : "var(--ob-danger)";

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <span className="font-display text-[22px] font-black">{formatMoney(last, currency)}</span>
          <span className="ml-2 text-[13px] font-semibold" style={{ color: stroke }}>
            {up ? "▲" : "▼"} {formatMoney(Math.abs(delta), currency)} ({pct.toFixed(1)}%)
          </span>
        </div>

        <div className="ob-segment">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                range === r.key ? "bg-[var(--ob-surface)] shadow-sm" : "text-[var(--ob-text-soft)]"
              }`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Price history, ${formatMoney(first, currency)} to ${formatMoney(last, currency)}`}
      >
        <defs>
          <linearGradient id="ob-price-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.20" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ob-price-fill)" />
        <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(values.length - 1)} cy={y(last)} r="3.5" fill={stroke} />
      </svg>

      <div className="mt-1 flex justify-between text-[11px] text-[var(--ob-text-faint)]">
        <span>{formatDate(points[0].date)}</span>
        <span>{formatDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}
