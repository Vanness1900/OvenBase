"use client";

import Link from "next/link";
import { useSettings } from "./settings-provider";
import { CoffeeIcon, HeartIcon, ChevronIcon } from "./icons";
import { formatMoney, storePriceIn } from "@/lib/currency";
import type { Card } from "@/lib/types";
import { formatCount } from "@/lib/format";

interface SeedDeck {
  id: string;
  name: string;
  authorName: string;
  authorImage: string | null;
  likes: number;
  cardCount: number;
  coverImage: string | null;
  previewImages: string[];
  updatedAt: string;
}

export function HomeHero({ showcase, totalCards }: { showcase: Card[]; totalCards: number }) {
  const { t } = useSettings();

  return (
    <section className="relative overflow-hidden">
      {/* Soft tinted wash behind the hero, kept subtle so card art stays the focus. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(80% 60% at 15% 0%, var(--ob-accent-soft) 0%, transparent 60%), radial-gradient(60% 50% at 100% 10%, rgba(10,132,255,0.10) 0%, transparent 65%)",
        }}
      />

      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ob-line)] bg-[var(--ob-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ob-text-soft)]">
            <span className="size-1.5 rounded-full bg-[var(--ob-accent)]" />
            {formatCount(totalCards)} cards tracked
          </span>

          <h1 className="font-display mt-5 text-[34px] font-black leading-[1.1] tracking-tight sm:text-[52px]">
            {t("home.heroTitle")}
          </h1>

          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--ob-text-soft)] sm:text-[17px]">
            {t("home.heroBody")}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/cards"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--ob-text)] px-6 text-[15px] font-semibold text-[var(--ob-bg)] transition-transform active:scale-[0.97]"
            >
              {t("home.viewCards")}
              <ChevronIcon className="size-4" />
            </Link>
            <Link
              href="/decks"
              className="inline-flex h-12 items-center rounded-full border border-[var(--ob-line-strong)] bg-[var(--ob-surface)] px-6 text-[15px] font-semibold transition-colors hover:bg-[var(--ob-surface-2)]"
            >
              {t("home.browseAll")}
            </Link>
          </div>
        </div>

        {/* Fanned card spread. Hidden on small screens where it would crowd the copy. */}
        <div className="relative hidden h-[340px] lg:block">
          {showcase.map((c, i) => {
            const spread = i - (showcase.length - 1) / 2;
            return (
              <div
                key={c.id}
                className="absolute left-1/2 top-1/2 w-[190px] transition-transform duration-500 hover:-translate-y-3"
                style={{
                  transform: `translate(-50%, -50%) translateX(${spread * 96}px) rotate(${spread * 7}deg)`,
                  zIndex: 10 - Math.abs(spread),
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image ?? ""}
                  alt={c.name ?? c.id}
                  loading={i < 3 ? "eager" : "lazy"}
                  className="w-full rounded-[14px] shadow-[var(--ob-shadow-lg)]"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function MetaDecks({ decks }: { decks: SeedDeck[] }) {
  const { t } = useSettings();

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[24px] font-black sm:text-[30px]">{t("home.metaTitle")}</h2>
          <p className="mt-1.5 text-[14px] text-[var(--ob-text-soft)]">{t("home.metaBody")}</p>
        </div>
        <Link
          href="/decks"
          className="hidden shrink-0 items-center gap-1 text-[14px] font-semibold text-[var(--ob-text-soft)] transition-colors hover:text-[var(--ob-text)] sm:inline-flex"
        >
          {t("home.browseAll")}
          <ChevronIcon className="size-3.5" />
        </Link>
      </div>

      {/*
        Five across on desktop, one row. On mobile that would squash to nothing,
        so it becomes a 2x2 grid and the fifth deck drops out rather than
        stranding one tile alone on a third row.
      */}
      <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {decks.map((d, i) => (
          <li key={d.id} className={i >= 4 ? "hidden lg:block" : undefined}>
            <Link
              href={`/decks/${d.id}`}
              className="ob-card group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[var(--ob-shadow-lg)]"
            >
              <div className="relative aspect-[5/7] overflow-hidden bg-[var(--ob-surface-2)]">
                {d.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.coverImage}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-[12px] text-[var(--ob-text-faint)]">
                    No art
                  </div>
                )}

                <span className="font-display absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-[var(--ob-text)]/85 text-[12px] font-black text-[var(--ob-bg)] backdrop-blur-sm">
                  {i + 1}
                </span>

                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[var(--ob-text)]/85 px-2 py-0.5 text-[11px] font-semibold text-[var(--ob-bg)] backdrop-blur-sm">
                  <HeartIcon className="size-3" />
                  {d.likes}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-0.5 p-3">
                <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{d.name}</p>
                <p className="mt-auto truncate pt-1 text-[12px] text-[var(--ob-text-soft)]">
                  {d.authorName}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CoffeeCta() {
  const { t } = useSettings();

  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6">
      <div className="ob-card flex flex-col items-start gap-5 overflow-hidden p-7 sm:flex-row sm:items-center sm:gap-7 sm:p-9">
        <div className="grid size-14 shrink-0 place-items-center rounded-[var(--ob-radius-sm)] bg-[var(--ob-accent-soft)] text-[var(--ob-text)] ring-1 ring-[var(--ob-accent-line)]">
          <CoffeeIcon className="size-7" />
        </div>

        <div className="flex-1">
          <h2 className="font-display text-[20px] font-black sm:text-[24px]">{t("home.coffeeTitle")}</h2>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-[var(--ob-text-soft)]">
            {t("home.coffeeBody")}
          </p>
        </div>

        <a
          href="https://ko-fi.com/"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-11 shrink-0 items-center rounded-full bg-[var(--ob-text)] px-5 text-[14.5px] font-semibold text-[var(--ob-bg)] transition-transform active:scale-[0.97]"
        >
          {t("home.coffeeCta")}
        </a>
      </div>
    </section>
  );
}

/** Shared by the card grid and modal so a price never renders two ways. */
export function PriceTag({ card, className }: { card: Card; className?: string }) {
  const { currency, store, rates, t } = useSettings();
  const value = storePriceIn(card, store, currency, rates);
  if (value === null) {
    return <span className={`${className ?? ""} opacity-60`}>{t("card.noPrice")}</span>;
  }
  return <span className={className}>{formatMoney(value, currency)}</span>;
}
