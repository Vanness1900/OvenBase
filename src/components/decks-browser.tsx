"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSettings } from "./settings-provider";
import { HeartIcon, SearchIcon, StarIcon } from "./icons";
import type { MessageKey } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export interface SeedDeck {
  id: string;
  name: string;
  description: string;
  authorName: string;
  authorImage: string | null;
  likes: number;
  bookmarks: number;
  cardCount: number;
  coverImage: string | null;
  previewImages: string[];
  updatedAt: string;
  shelf: string;
  contentsAvailable: boolean;
}

type Shelf = "all" | "featured" | "champion" | "bookmark" | "mine";
type DeckSort = "latest" | "liked" | "bookmarked";

const SHELVES: { key: Shelf; label: MessageKey }[] = [
  { key: "all", label: "decks.all" },
  { key: "featured", label: "decks.featured" },
  { key: "champion", label: "decks.champion" },
  { key: "bookmark", label: "decks.bookmark" },
  { key: "mine", label: "decks.mine" },
];

const SORTS: { key: DeckSort; label: MessageKey }[] = [
  { key: "latest", label: "decks.latest" },
  { key: "liked", label: "decks.mostLiked" },
  { key: "bookmarked", label: "decks.mostBookmarked" },
];

export function DecksBrowser({ decks }: { decks: SeedDeck[] }) {
  const { t } = useSettings();
  const [shelf, setShelf] = useState<Shelf>("all");
  const [sort, setSort] = useState<DeckSort>("latest");
  const [query, setQuery] = useState("");

  // Bookmarks live in the browser until Supabase auth is wired up.
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = decks.filter((d) => {
      if (shelf === "champion" && d.shelf !== "champion") return false;
      if (shelf === "featured" && d.shelf !== "featured") return false;
      if (shelf === "bookmark" && !bookmarked.has(d.id)) return false;
      if (shelf === "mine") return false; // requires sign-in
      if (q && !`${d.name} ${d.authorName}`.toLowerCase().includes(q)) return false;
      return true;
    });

    out = [...out].sort((a, b) => {
      if (sort === "liked") return b.likes - a.likes;
      if (sort === "bookmarked") return b.bookmarks - a.bookmarks;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return out;
  }, [decks, shelf, sort, query, bookmarked]);

  const toggleBookmark = (id: string) =>
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[28px] font-black sm:text-[34px]">{t("decks.title")}</h1>
        <Link
          href="/decks/build"
          className="inline-flex h-11 items-center rounded-full bg-[var(--ob-text)] px-5 text-[14.5px] font-semibold text-[var(--ob-bg)] transition-transform active:scale-[0.97]"
        >
          {t("decks.create")}
        </Link>
      </div>

      <label className="relative mt-5 block">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ob-text-faint)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("decks.searchPlaceholder")}
          className="h-11 w-full rounded-full border border-[var(--ob-line)] bg-[var(--ob-surface)] pl-10 pr-4 text-[14.5px] outline-none focus:border-[var(--ob-accent)]"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="ob-segment overflow-x-auto">
          {SHELVES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setShelf(s.key)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                shelf === s.key ? "bg-[var(--ob-surface)] shadow-sm" : "text-[var(--ob-text-soft)]"
              }`}
            >
              {t(s.label)}
            </button>
          ))}
        </div>

        <div className="ob-segment">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                sort === s.key ? "bg-[var(--ob-surface)] shadow-sm" : "text-[var(--ob-text-soft)]"
              }`}
            >
              {t(s.label)}
            </button>
          ))}
        </div>
      </div>

      {shelf === "mine" ? (
        <div className="ob-card mt-6 px-6 py-14 text-center">
          <p className="text-[14.5px] font-semibold">{t("decks.signInPrompt")}</p>
          <button
            type="button"
            disabled
            className="mt-4 inline-flex h-11 cursor-not-allowed items-center rounded-full border border-[var(--ob-line-strong)] px-5 text-[14px] font-semibold opacity-60"
          >
            {t("auth.signInGoogle")}
          </button>
          <p className="mt-3 text-[12px] text-[var(--ob-text-faint)]">
            Google sign-in needs a Supabase OAuth client before this works.
          </p>
        </div>
      ) : list.length === 0 ? (
        <p className="py-20 text-center text-[14px] text-[var(--ob-text-soft)]">{t("decks.empty")}</p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {list.map((d) => (
            <li key={d.id}>
              <DeckCard deck={d} bookmarked={bookmarked.has(d.id)} onBookmark={() => toggleBookmark(d.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeckCard({
  deck,
  bookmarked,
  onBookmark,
}: {
  deck: SeedDeck;
  bookmarked: boolean;
  onBookmark: () => void;
}) {
  const { t } = useSettings();

  return (
    <div className="ob-card flex gap-4 p-4 transition-shadow hover:shadow-[var(--ob-shadow-lg)]">
      <div className="min-w-0 flex-1">
        <Link href={`/decks/${deck.id}`} className="block">
          <h2 className="truncate text-[16px] font-semibold">{deck.name}</h2>
          <p className="mt-1 truncate text-[12.5px] text-[var(--ob-text-soft)]">
            {deck.authorName} · {t("decks.cards", { n: deck.cardCount })}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--ob-text-faint)]">
            {formatDate(deck.updatedAt)}
          </p>
        </Link>

        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={onBookmark}
            aria-pressed={bookmarked}
            className="flex flex-col items-center gap-0.5 text-[var(--ob-text-soft)] transition-colors hover:text-[var(--ob-text)]"
          >
            <StarIcon className="size-[18px]" filled={bookmarked} />
            <span className="text-[11px] font-semibold">{deck.bookmarks + (bookmarked ? 1 : 0)}</span>
          </button>

          <div className="flex flex-col items-center gap-0.5 text-[var(--ob-text-soft)]">
            <HeartIcon className="size-[18px]" />
            <span className="text-[11px] font-semibold">{deck.likes}</span>
          </div>
        </div>
      </div>

      {/* Cover card with two smaller previews, mirroring the official layout. */}
      <Link href={`/decks/${deck.id}`} className="flex shrink-0 items-end gap-1.5">
        <div className="flex flex-col gap-1.5">
          {deck.previewImages.slice(1, 3).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" loading="lazy" className="h-[42px] w-[30px] rounded-[5px] object-cover" />
          ))}
        </div>
        {deck.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={deck.coverImage}
            alt=""
            loading="lazy"
            className="h-[110px] w-[79px] rounded-[8px] object-cover shadow-[var(--ob-shadow)]"
          />
        )}
      </Link>
    </div>
  );
}
