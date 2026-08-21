"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSettings } from "./settings-provider";
import { CardText, CostPips } from "./card-text";
import { PriceChart } from "./price-chart";
import { formatMoney, storePriceIn } from "@/lib/currency";
import { STORES, type Card, type PriceHistoryEntry } from "@/lib/types";

const COLOR_SWATCH: Record<string, string> = {
  RED: "var(--ob-red)",
  YELLOW: "var(--ob-yellow)",
  GREEN: "var(--ob-green)",
  BLUE: "var(--ob-blue)",
  PURPLE: "var(--ob-purple)",
  BLACK: "var(--ob-black)",
  PURE: "var(--ob-pure)",
};

const COST_LETTER: Record<string, string> = {
  RED: "R",
  YELLOW: "Y",
  GREEN: "G",
  BLUE: "B",
  PURPLE: "P",
  BLACK: "K",
  COLORLESS: "N",
};

export function CardModal({
  card,
  allCards,
  onClose,
}: {
  card: Card;
  allCards: Card[];
  onClose: () => void;
}) {
  const { t, currency, rates } = useSettings();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  /** Other printings of the same card number -- alternate arts and rarities. */
  const printings = useMemo(
    () => allCards.filter((c) => c.cardNo === card.cardNo).sort((a, b) => (a.variant ?? 0) - (b.variant ?? 0)),
    [allCards, card.cardNo],
  );

  /**
   * Every store side by side in one currency, so the comparison is the point of
   * the modal. Stores with no quote for this card are shown rather than hidden,
   * so a gap reads as "not listed" instead of silently disappearing.
   */
  const storeRows = STORES.map((s) => {
    const amount = storePriceIn(card, s.id, currency, rates);
    return { ...s, amount, native: card.prices?.[s.id] ?? null };
  });
  const quoted = storeRows.filter((r) => r.amount !== null).map((r) => r.amount as number);
  const cheapest = quoted.length ? Math.min(...quoted) : null;

  const history: PriceHistoryEntry[] = useMemo(() => {
    if (card.pricePHP === null) return [];
    return [{ date: new Date().toISOString().slice(0, 10), amount: card.pricePHP }];
  }, [card.pricePHP]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={card.name ?? card.id}
        className="ob-scroll relative max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-t-[var(--ob-radius-lg)] bg-[var(--ob-bg)] shadow-[var(--ob-shadow-lg)] sm:rounded-[var(--ob-radius-lg)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="ob-blur sticky right-0 top-0 z-10 ml-auto mr-3 mt-3 grid size-9 place-items-center rounded-full border border-[var(--ob-line)] text-[var(--ob-text-soft)] transition-colors hover:text-[var(--ob-text)]"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="grid gap-7 px-5 pb-8 pt-1 sm:px-8 md:grid-cols-[300px_1fr]">
          {/* ---------------------------------------------------------- art */}
          <div className="md:sticky md:top-4 md:self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image ?? ""}
              alt={card.name ?? card.id}
              className="w-full rounded-[14px] shadow-[var(--ob-shadow-lg)]"
            />

            {printings.length > 1 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">
                  {printings.length} printings
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {printings.map((p) => (
                    <span
                      key={p.id}
                      className={`rounded-full border px-2 py-1 text-[11px] ${
                        p.id === card.id
                          ? "border-transparent bg-[var(--ob-accent)] font-semibold text-[var(--ob-accent-ink)]"
                          : "border-[var(--ob-line)] text-[var(--ob-text-soft)]"
                      }`}
                    >
                      {p.rarity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------- detail */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--ob-surface-2)] px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide">
                {card.type}
              </span>
              {card.color && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ob-surface-2)] px-2.5 py-1 text-[11.5px] font-semibold">
                  <span
                    className="size-2.5 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ background: COLOR_SWATCH[card.color] }}
                  />
                  {card.color}
                </span>
              )}
              {card.legality !== "legal" && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold text-white ${
                    card.legality === "banned" ? "bg-[var(--ob-danger)]" : "bg-[var(--ob-warn)]"
                  }`}
                >
                  {card.legality === "banned" ? t("card.banned") : t("card.restricted")}
                </span>
              )}
            </div>

            <h2 className="font-display mt-2.5 text-[26px] font-black leading-tight">{card.name ?? "—"}</h2>
            <p className="mt-1 text-[13px] text-[var(--ob-text-soft)]">
              {card.id} · {card.rarity} · {card.grade}
            </p>

            {/* stat strip */}
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-3 rounded-[var(--ob-radius-sm)] bg-[var(--ob-surface)] p-4 ring-1 ring-[var(--ob-line)]">
              {card.level !== null && <Stat label={t("card.level")} value={String(card.level)} />}
              {card.hp && (
                <Stat label={t("card.hp")} value={card.hp.plus ? `+${card.hp.value}` : String(card.hp.value)} />
              )}
              {card.damage.length > 0 && <Stat label={t("card.damage")} value={card.damage.join(" / ")} />}
              {card.costColors.length > 0 && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">
                    {t("card.cost")}
                  </dt>
                  <dd className="mt-1">
                    <CostPips symbols={card.costColors.map((c) => COST_LETTER[c] ?? "N")} />
                  </dd>
                </div>
              )}
              {card.groups.length > 0 && <Stat label="Group" value={card.groups.join(", ")} />}
            </dl>

            {/* rules text */}
            <div className="mt-5 space-y-4 text-[13.5px] leading-relaxed">
              {card.skillName && (
                <Block label={t("card.skill")}>
                  <p className="font-semibold">
                    <CardText text={card.skillName} className="inline" />
                  </p>
                  <CardText text={card.skillText} className="mt-1 text-[var(--ob-text-soft)]" />
                </Block>
              )}
              {!card.skillName && card.skillText && (
                <Block label={t("card.skill")}>
                  <CardText text={card.skillText} className="text-[var(--ob-text-soft)]" />
                </Block>
              )}
              {card.attackText && (
                <Block label={t("card.attack")}>
                  <CardText text={card.attackText} className="text-[var(--ob-text-soft)]" />
                </Block>
              )}
              {card.flipText && (
                <Block label={t("card.flip")}>
                  <CardText text={card.flipText} className="text-[var(--ob-text-soft)]" />
                </Block>
              )}
            </div>

            {/* ------------------------------------------------------ prices */}
            <div className="mt-7">
              <h3 className="font-display text-[16px] font-black">{t("card.prices")}</h3>
              <ul className="mt-2.5 divide-y divide-[var(--ob-line)] rounded-[var(--ob-radius-sm)] bg-[var(--ob-surface)] ring-1 ring-[var(--ob-line)]">
                {storeRows.map((s) => {
                  const best = s.amount !== null && s.amount === cheapest && quoted.length > 1;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="flex items-center gap-2 text-[13.5px] font-medium">
                        {s.label}
                        {best && (
                          <span className="rounded-full bg-[var(--ob-accent)] px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wide text-[var(--ob-accent-ink)]">
                            Cheapest
                          </span>
                        )}
                      </span>
                      {s.amount === null ? (
                        <span className="text-[12.5px] text-[var(--ob-text-faint)]">
                          {s.id === "tcgplayer" ? "not scraped yet" : "not listed"}
                        </span>
                      ) : (
                        <span className="font-display text-[15px] font-black">
                          {formatMoney(s.amount, currency)}
                          <span className="ml-1.5 text-[11px] font-medium text-[var(--ob-text-faint)]">
                            {s.native?.currency}
                          </span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ----------------------------------------------- price history */}
            <div className="mt-6">
              <h3 className="font-display mb-2.5 text-[16px] font-black">{t("card.priceHistory")}</h3>
              <PriceChart history={history} />
            </div>

            <dl className="mt-6 space-y-1.5 text-[12.5px] text-[var(--ob-text-soft)]">
              {card.productTitle && (
                <div className="flex gap-2">
                  <dt className="font-semibold">{t("card.product")}:</dt>
                  <dd>{card.productTitle}</dd>
                </div>
              )}
              {card.artist && (
                <div className="flex gap-2">
                  <dt className="font-semibold">{t("card.artist")}:</dt>
                  <dd>{card.artist}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">{label}</dt>
      <dd className="font-display mt-0.5 text-[18px] font-black leading-none">{value}</dd>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">
        {label}
      </h4>
      {children}
    </section>
  );
}
