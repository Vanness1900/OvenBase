"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "./settings-provider";
import { FilterPanel } from "./filter-panel";
import { CardModal } from "./card-modal";
import { PriceTag } from "./home-sections";
import { SearchIcon } from "./icons";
import { countActive, EMPTY_FILTERS, filterCards, type CardFilters, type SortKey } from "@/lib/filters";
import { CURRENCIES, STORES, type Card, type CurrencyCode, type StoreId } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";
import { formatCount } from "@/lib/format";

const PAGE_SIZE = 60;

const SORTS: { value: SortKey; key: MessageKey }[] = [
  { value: "default", key: "sort.default" },
  { value: "level", key: "sort.level" },
  { value: "rarity", key: "sort.rarity" },
  { value: "hp", key: "sort.hp" },
  { value: "damage", key: "sort.damage" },
  { value: "priceLow", key: "sort.priceLow" },
  { value: "priceHigh", key: "sort.priceHigh" },
];

export function CardsBrowser({
  cards,
  products,
  maxPricePHP,
}: {
  cards: Card[];
  products: string[];
  maxPricePHP: number;
}) {
  const { t, currency, setCurrency, store, setStore } = useSettings();

  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [active, setActive] = useState<Card | null>(null);

  // Debounce typing so we aren't re-filtering 2,000 cards on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => ({ ...f, search: searchDraft })), 180);
    return () => clearTimeout(id);
  }, [searchDraft]);

  const update = useCallback((patch: Partial<CardFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setVisible(PAGE_SIZE);
  }, []);

  const reset = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearchDraft("");
    setVisible(PAGE_SIZE);
  }, []);

  const results = useMemo(() => filterCards(cards, filters), [cards, filters]);
  const shown = results.slice(0, visible);
  const activeCount = countActive(filters);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[28px] font-black sm:text-[34px]">{t("cards.title")}</h1>

        <div className="flex items-center gap-2">
          <Dropdown
            label={t("cards.store")}
            value={store}
            onChange={(v) => setStore(v as StoreId)}
            options={STORES.map((s) => ({ value: s.id, label: s.label }))}
          />
          <Dropdown
            label={t("cards.currency")}
            value={currency}
            onChange={(v) => setCurrency(v as CurrencyCode)}
            options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
          />
        </div>
      </div>

      {/* Search + sort row */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ob-text-faint)]" />
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={t("cards.searchPlaceholder")}
            aria-label={t("cards.search")}
            className="h-11 w-full rounded-full border border-[var(--ob-line)] bg-[var(--ob-surface)] pl-10 pr-4 text-[14.5px] outline-none transition-colors focus:border-[var(--ob-accent)]"
          />
        </label>

        <Dropdown
          label={t("cards.sort")}
          value={filters.sort}
          onChange={(v) => update({ sort: v as SortKey })}
          options={SORTS.map((s) => ({ value: s.value, label: t(s.key) }))}
        />

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--ob-line-strong)] bg-[var(--ob-surface)] px-4 text-[14px] font-semibold lg:hidden"
        >
          {t("cards.filters")}
          {activeCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-[var(--ob-accent)] text-[11px] font-bold text-[var(--ob-accent-ink)]">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <p className="mt-3 text-[13px] text-[var(--ob-text-soft)]">
        {t("cards.results", { n: formatCount(results.length) })}
      </p>

      <div className="mt-5 flex gap-7">
        {/* Desktop filter rail */}
        <aside className="ob-scroll sticky top-20 hidden h-[calc(100vh-6rem)] w-[264px] shrink-0 overflow-y-auto pr-2 lg:block">
          <FilterPanel
            filters={filters}
            update={update}
            reset={reset}
            products={products}
            maxPricePHP={maxPricePHP}
          />
        </aside>

        <div className="min-w-0 flex-1">
          {shown.length === 0 ? (
            <p className="py-20 text-center text-[14px] text-[var(--ob-text-soft)]">{t("cards.noResults")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {shown.map((c) => (
                <li key={c.id}>
                  <CardTile card={c} onOpen={() => setActive(c)} />
                </li>
              ))}
            </ul>
          )}

          {visible < results.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="h-11 rounded-full border border-[var(--ob-line-strong)] bg-[var(--ob-surface)] px-6 text-[14.5px] font-semibold transition-colors hover:bg-[var(--ob-surface-2)]"
              >
                {t("cards.loadMore")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/35" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 top-14 flex flex-col rounded-t-[var(--ob-radius-lg)] bg-[var(--ob-bg)] shadow-[var(--ob-shadow-lg)]">
            <div className="flex items-center justify-between border-b border-[var(--ob-line)] px-5 py-3.5">
              <h2 className="font-display text-[17px] font-black">{t("cards.filters")}</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-full bg-[var(--ob-surface-2)] px-4 py-1.5 text-[13.5px] font-semibold"
              >
                {t("cards.done")}
              </button>
            </div>
            <div className="ob-scroll flex-1 overflow-y-auto px-5 py-5">
              <FilterPanel
                filters={filters}
                update={update}
                reset={reset}
                products={products}
                maxPricePHP={maxPricePHP}
              />
            </div>
          </div>
        </div>
      )}

      {active && <CardModal card={active} allCards={cards} onClose={() => setActive(null)} />}
    </div>
  );
}

/* -------------------------------------------------------------------- tile */

function CardTile({ card, onOpen }: { card: Card; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full text-left"
      aria-label={`${card.name ?? card.id} — ${card.id}`}
    >
      <div className="relative overflow-hidden rounded-[12px] bg-[var(--ob-surface-2)] shadow-[var(--ob-shadow)] transition-transform duration-200 group-hover:-translate-y-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.image ?? ""}
          alt={card.name ?? card.id}
          loading="lazy"
          className="aspect-[5/7] w-full object-cover"
        />

        {card.legality !== "legal" && (
          <span
            className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
              card.legality === "banned" ? "bg-[var(--ob-danger)]" : "bg-[var(--ob-warn)]"
            }`}
          >
            {card.legality}
          </span>
        )}
      </div>

      <div className="mt-2 px-0.5">
        <p className="truncate text-[13px] font-semibold leading-tight">{card.name ?? "—"}</p>
        <p className="mt-0.5 flex items-center justify-between gap-2 text-[11.5px] text-[var(--ob-text-soft)]">
          <span className="truncate">
            {card.id} · {card.rarity}
          </span>
          <PriceTag card={card} className="shrink-0 font-semibold text-[var(--ob-text)]" />
        </p>
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------- dropdown */

function Dropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative inline-flex h-11 items-center rounded-full border border-[var(--ob-line)] bg-[var(--ob-surface)] pl-3.5 pr-8 transition-colors focus-within:border-[var(--ob-accent)]">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent text-[13.5px] font-semibold outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute right-3 size-3.5 text-[var(--ob-text-faint)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}
