"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "./settings-provider";
import { FilterPanel } from "./filter-panel";
import { SearchIcon } from "./icons";
import { EMPTY_FILTERS, filterCards, type CardFilters } from "@/lib/filters";
import {
  EMPTY_DECK,
  addCard,
  checkLegality,
  copiesOf,
  exportDeck,
  groupByType,
  importDeck,
  removeCard,
  totalCards,
  type DeckSlot,
  type DeckState,
} from "@/lib/deck";
import { priceBoundsToPhp } from "@/lib/currency";
import { usePersistentString } from "@/lib/persistent";
import { EXTRA_DECK_MAX, MAIN_DECK_SIZE, type Card } from "@/lib/types";

type Tab = "select" | "preview";
const DRAFT_KEY = "ob:deck-draft";

interface Draft {
  deck: DeckState;
  name: string;
  description: string;
  visibility: "private" | "public";
}

const BLANK_DRAFT: Draft = { deck: EMPTY_DECK, name: "", description: "", visibility: "private" };

function parseDraft(raw: string): Draft {
  if (!raw) return BLANK_DRAFT;
  try {
    const d = JSON.parse(raw) as Partial<Draft>;
    return {
      deck: d.deck?.main && d.deck?.extra ? d.deck : EMPTY_DECK,
      name: d.name ?? "",
      description: d.description ?? "",
      visibility: d.visibility === "public" ? "public" : "private",
    };
  } catch {
    return BLANK_DRAFT;
  }
}

export function DeckBuilder({
  cards,
  products,
  maxPricePHP,
}: {
  cards: Card[];
  products: string[];
  maxPricePHP: number;
}) {
  const { t, currency, rates } = useSettings();

  const [tab, setTab] = useState<Tab>("select");
  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [visible, setVisible] = useState(48);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // The whole in-progress deck lives in localStorage so a refresh doesn't wipe
  // the build. Backing it with the persistent store (rather than restoring via
  // an effect) keeps reads and writes in one place.
  const [draftRaw, setDraftRaw] = usePersistentString(DRAFT_KEY, "");
  const draft = useMemo(() => parseDraft(draftRaw), [draftRaw]);
  const { deck, name, description, visibility } = draft;

  const patchDraft = useCallback(
    (patch: Partial<Draft>) => setDraftRaw(JSON.stringify({ ...draft, ...patch })),
    [draft, setDraftRaw],
  );

  const setDeck = useCallback(
    (next: DeckState | ((d: DeckState) => DeckState)) =>
      patchDraft({ deck: typeof next === "function" ? next(draft.deck) : next }),
    [draft.deck, patchDraft],
  );
  const setName = useCallback((v: string) => patchDraft({ name: v }), [patchDraft]);
  const setDescription = useCallback((v: string) => patchDraft({ description: v }), [patchDraft]);
  const setVisibility = useCallback(
    (v: "private" | "public") => patchDraft({ visibility: v }),
    [patchDraft],
  );

  /** Look-ups by both base number and printing id, so either resolves a card. */
  const index = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards) {
      m.set(c.id, c);
      // Prefer the base printing when several share a number.
      if (!m.has(c.cardNo) || c.isPreferredPrinting) m.set(c.cardNo, c);
    }
    return m;
  }, [cards]);

  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => ({ ...f, search: searchDraft })), 180);
    return () => clearTimeout(id);
  }, [searchDraft]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const update = useCallback((patch: Partial<CardFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setVisible(48);
  }, []);

  const reset = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearchDraft("");
  }, []);

  const effectiveFilters = useMemo(() => {
    const { min, max } = priceBoundsToPhp(filters.priceMin, filters.priceMax, currency, rates);
    return { ...filters, priceMin: min, priceMax: max };
  }, [filters, currency, rates]);

  const results = useMemo(() => filterCards(cards, effectiveFilters), [cards, effectiveFilters]);
  const legality = useMemo(() => checkLegality(deck, index), [deck, index]);

  const mainCount = totalCards(deck.main);
  const extraCount = totalCards(deck.extra);

  const handleSave = () => {
    if (!name.trim()) {
      // Spec: an unnamed deck jumps to preview with the name field highlighted.
      setTab("preview");
      setNameError(true);
      requestAnimationFrame(() => nameRef.current?.focus());
      return;
    }
    setNameError(false);
    setToast("Saved locally — sign-in is needed to publish.");
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-black sm:text-[28px]">{t("decks.create")}</h1>

        <div className="ob-segment">
          {(["select", "preview"] as Tab[]).map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => setTab(tb)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
                tab === tb ? "bg-[var(--ob-surface)] shadow-sm" : "text-[var(--ob-text-soft)]"
              }`}
            >
              {tb === "select" ? "Select cards" : "Preview"}
            </button>
          ))}
        </div>
      </div>

      <LegalityBar legality={legality} mainCount={mainCount} extraCount={extraCount} />

      {tab === "select" ? (
        <div className="mt-4 flex gap-5">
          <aside className="ob-scroll sticky top-20 hidden h-[calc(100vh-7rem)] w-[240px] shrink-0 overflow-y-auto pr-2 xl:block">
            <FilterPanel
              filters={filters}
              update={update}
              reset={reset}
              products={products}
              maxPricePHP={maxPricePHP}
            />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[200px] flex-1">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ob-text-faint)]" />
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder={t("cards.searchPlaceholder")}
                  className="h-10 w-full rounded-full border border-[var(--ob-line)] bg-[var(--ob-surface)] pl-10 pr-4 text-[14px] outline-none focus:border-[var(--ob-accent)]"
                />
              </label>

              <LoadDeckButton index={index} onLoad={setDeck} onToast={setToast} />

              <button
                type="button"
                onClick={handleSave}
                className="h-10 rounded-full bg-[var(--ob-text)] px-4 text-[13.5px] font-semibold text-[var(--ob-bg)]"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="h-10 rounded-full border border-[var(--ob-line-strong)] px-4 text-[13.5px] font-semibold xl:hidden"
              >
                {t("cards.filters")}
              </button>
            </div>

            <p className="mt-2.5 text-[12.5px] text-[var(--ob-text-soft)]">
              {t("cards.results", { n: String(results.length) })}
            </p>

            <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
              {results.slice(0, visible).map((c) => (
                <li key={c.id}>
                  <PickTile
                    card={c}
                    copies={copiesOf(deck, c.cardNo)}
                    onAdd={() => setDeck((d) => addCard(d, c))}
                  />
                </li>
              ))}
            </ul>

            {visible < results.length && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + 48)}
                  className="h-10 rounded-full border border-[var(--ob-line-strong)] px-5 text-[13.5px] font-semibold"
                >
                  {t("cards.loadMore")}
                </button>
              </div>
            )}
          </div>

          {/* deck rail */}
          <aside className="ob-scroll sticky top-20 hidden h-[calc(100vh-7rem)] w-[300px] shrink-0 overflow-y-auto lg:block">
            <DeckRail deck={deck} index={index} onRemove={(id, slot) => setDeck((d) => removeCard(d, id, slot))} />
          </aside>
        </div>
      ) : (
        <PreviewTab
          deck={deck}
          index={index}
          legality={legality}
          name={name}
          setName={setName}
          nameError={nameError}
          nameRef={nameRef}
          description={description}
          setDescription={setDescription}
          visibility={visibility}
          setVisibility={setVisibility}
          onSave={handleSave}
          onToast={setToast}
          onImport={setDeck}
        />
      )}

      {/* Mobile deck summary bar */}
      <div className="ob-blur fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-[var(--ob-line)] px-4 py-2.5 lg:hidden">
        <span className="text-[13px] font-semibold">
          Main {mainCount}/{MAIN_DECK_SIZE} · Extra {extraCount}/{EXTRA_DECK_MAX}
        </span>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className="rounded-full bg-[var(--ob-text)] px-4 py-1.5 text-[13px] font-semibold text-[var(--ob-bg)]"
        >
          Preview
        </button>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-[60] xl:hidden">
          <div className="absolute inset-0 bg-black/35" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 top-14 flex flex-col rounded-t-[var(--ob-radius-lg)] bg-[var(--ob-bg)]">
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

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[var(--ob-text)] px-4 py-2.5 text-[13px] font-semibold text-[var(--ob-bg)] shadow-[var(--ob-shadow-lg)]">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function LegalityBar({
  legality,
  mainCount,
  extraCount,
}: {
  legality: ReturnType<typeof checkLegality>;
  mainCount: number;
  extraCount: number;
}) {
  const ok = legality.legal;
  return (
    <div
      className={`mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[var(--ob-radius-sm)] border px-4 py-3 text-[13px] ${
        ok
          ? "border-[var(--ob-ok)]/40 bg-[var(--ob-ok)]/8"
          : "border-[var(--ob-warn)]/40 bg-[var(--ob-warn)]/8"
      }`}
    >
      <span className="font-semibold">
        {ok ? "Legal deck" : "This deck is illegal"}
      </span>
      <span className={mainCount === MAIN_DECK_SIZE ? "" : "text-[var(--ob-warn)]"}>
        Main {mainCount}/{MAIN_DECK_SIZE}
      </span>
      <span className={extraCount <= EXTRA_DECK_MAX ? "" : "text-[var(--ob-warn)]"}>
        Extra {extraCount}/{EXTRA_DECK_MAX}
      </span>
      {!ok && legality.problems.length > 0 && (
        <span className="w-full text-[12.5px] text-[var(--ob-text-soft)]">
          {legality.problems.slice(0, 3).join(" · ")}
          {legality.problems.length > 3 ? ` · +${legality.problems.length - 3} more` : ""}
        </span>
      )}
    </div>
  );
}

function PickTile({ card, copies, onAdd }: { card: Card; copies: number; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group relative block w-full overflow-hidden rounded-[10px] transition-transform duration-150 hover:scale-[1.03] active:scale-95"
      aria-label={`Add ${card.name ?? card.id}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.image ?? ""}
        alt={card.name ?? card.id}
        loading="lazy"
        className="aspect-[5/7] w-full bg-[var(--ob-surface-2)] object-cover"
      />

      {/* Desktop: darken + plus on hover. Touch devices get the tap feedback
          from the active:scale above instead, since hover never fires there. */}
      <span className="pointer-events-none absolute inset-0 hidden place-items-center bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:grid">
        <svg viewBox="0 0 24 24" className="size-9 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>

      {copies > 0 && (
        <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-[var(--ob-accent)] text-[11.5px] font-bold text-[var(--ob-accent-ink)]">
          {copies}
        </span>
      )}

      {card.legality !== "legal" && (
        <span
          className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-white ${
            card.legality === "banned" ? "bg-[var(--ob-danger)]" : "bg-[var(--ob-warn)]"
          }`}
        >
          {card.legality === "banned" ? "ban" : "1×"}
        </span>
      )}
    </button>
  );
}

function DeckRail({
  deck,
  index,
  onRemove,
}: {
  deck: DeckState;
  index: Map<string, Card>;
  onRemove: (printingId: string, slot: DeckSlot) => void;
}) {
  const sections: { slot: DeckSlot; title: string; limit: string }[] = [
    { slot: "main", title: "Main deck", limit: `${totalCards(deck.main)}/${MAIN_DECK_SIZE}` },
    { slot: "extra", title: "Extra deck", limit: `${totalCards(deck.extra)}/${EXTRA_DECK_MAX}` },
  ];

  return (
    <div className="space-y-5">
      {sections.map((s) => {
        const groups = groupByType(deck[s.slot], index);
        return (
          <section key={s.slot} className="ob-card overflow-hidden">
            <header className="flex items-center justify-between border-b border-[var(--ob-line)] px-3.5 py-2.5">
              <h3 className="text-[13px] font-bold">{s.title}</h3>
              <span className="text-[12px] font-semibold text-[var(--ob-text-soft)]">{s.limit}</span>
            </header>

            {groups.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[12.5px] text-[var(--ob-text-faint)]">
                Tap cards to add them.
              </p>
            ) : (
              <div className="divide-y divide-[var(--ob-line)]">
                {groups.map((g) => (
                  <div key={g.type} className="px-3.5 py-2">
                    <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">
                      {g.label} · {g.count}
                    </p>
                    <ul className="space-y-0.5">
                      {g.rows.map((r) => (
                        <li key={r.card.id} className="flex items-center gap-2 text-[12.5px]">
                          <span className="w-5 shrink-0 font-bold tabular-nums">{r.count}</span>
                          <span className="min-w-0 flex-1 truncate">{r.card.name}</span>
                          <button
                            type="button"
                            onClick={() => onRemove(r.card.id, s.slot)}
                            aria-label={`Remove one ${r.card.name}`}
                            className="shrink-0 rounded-full px-1.5 text-[var(--ob-text-faint)] hover:text-[var(--ob-danger)]"
                          >
                            −
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function LoadDeckButton({
  index,
  onLoad,
  onToast,
}: {
  index: Map<string, Card>;
  onLoad: (d: DeckState) => void;
  onToast: (s: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          const { deck, unknown } = importDeck(text, index);
          onLoad(deck);
          onToast(unknown.length ? `Loaded — ${unknown.length} line(s) unrecognised` : "Deck loaded");
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="h-10 rounded-full border border-[var(--ob-line-strong)] px-4 text-[13.5px] font-semibold"
      >
        Load deck
      </button>
    </>
  );
}

function PreviewTab({
  deck,
  index,
  legality,
  name,
  setName,
  nameError,
  nameRef,
  description,
  setDescription,
  visibility,
  setVisibility,
  onSave,
  onToast,
  onImport,
}: {
  deck: DeckState;
  index: Map<string, Card>;
  legality: ReturnType<typeof checkLegality>;
  name: string;
  setName: (v: string) => void;
  nameError: boolean;
  nameRef: React.RefObject<HTMLInputElement | null>;
  description: string;
  setDescription: (v: string) => void;
  visibility: "private" | "public";
  setVisibility: (v: "private" | "public") => void;
  onSave: () => void;
  onToast: (s: string) => void;
  onImport: (d: DeckState) => void;
}) {
  const { t } = useSettings();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const mainGroups = groupByType(deck.main, index);
  const extraGroups = groupByType(deck.extra, index);

  const doExport = async () => {
    const text = exportDeck(deck, index);
    try {
      await navigator.clipboard.writeText(text);
      onToast("Deck list copied");
    } catch {
      onToast("Copy failed — select the text manually");
    }
  };

  const doShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onToast("Link copied");
    } catch {
      onToast("Copy failed");
    }
  };

  return (
    <div className="mt-4 pb-24">
      <div className="flex flex-wrap gap-2">
        <ToolButton onClick={() => setImportOpen(true)}>Import deck</ToolButton>
        <ToolButton onClick={doExport}>Export deck</ToolButton>
        <ToolButton onClick={() => onToast("Deck image export is not built yet")}>Save image</ToolButton>
        <ToolButton onClick={doShare}>Share</ToolButton>
        <button
          type="button"
          onClick={onSave}
          className="h-10 rounded-full bg-[var(--ob-text)] px-5 text-[13.5px] font-semibold text-[var(--ob-bg)]"
        >
          Save
        </button>
      </div>

      <div className="mt-5 max-w-2xl space-y-4">
        <div>
          <label htmlFor="deck-name" className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">
            Deck name
          </label>
          <input
            id="deck-name"
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your deck"
            aria-invalid={nameError}
            className={`h-11 w-full rounded-[var(--ob-radius-sm)] border bg-[var(--ob-surface)] px-3.5 text-[14.5px] outline-none transition-colors ${
              nameError
                ? "border-[var(--ob-danger)] ring-2 ring-[var(--ob-danger)]/25"
                : "border-[var(--ob-line)] focus:border-[var(--ob-accent)]"
            }`}
          />
          {nameError && (
            <p className="mt-1.5 text-[12.5px] text-[var(--ob-danger)]">Give your deck a name before saving.</p>
          )}
        </div>

        <div>
          <label htmlFor="deck-desc" className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">
            Description
          </label>
          <textarea
            id="deck-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="How does the deck play?"
            className="w-full rounded-[var(--ob-radius-sm)] border border-[var(--ob-line)] bg-[var(--ob-surface)] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--ob-accent)]"
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">
            Visibility
          </legend>
          <div className="flex gap-4">
            {(["private", "public"] as const).map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 text-[14px] capitalize">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                  disabled={v === "public" && !legality.legal}
                  className="accent-[var(--ob-accent)]"
                />
                {v}
              </label>
            ))}
          </div>
          {!legality.legal && (
            <p className="mt-1.5 text-[12.5px] text-[var(--ob-text-soft)]">
              Illegal decks can be saved, but not shared publicly.
            </p>
          )}
        </fieldset>
      </div>

      {!legality.legal && (
        <div className="mt-6 rounded-[var(--ob-radius-sm)] border border-[var(--ob-danger)]/40 bg-[var(--ob-danger)]/8 px-4 py-3.5">
          <p className="text-[13.5px] font-bold text-[var(--ob-danger)]">{t("decks.illegal")}</p>
          <ul className="mt-1.5 space-y-0.5 text-[12.5px] text-[var(--ob-text-soft)]">
            {legality.problems.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 space-y-8">
        <DeckSection title="Main deck" groups={mainGroups} total={totalCards(deck.main)} />
        {totalCards(deck.extra) > 0 && (
          <DeckSection title="Extra deck" groups={extraGroups} total={totalCards(deck.extra)} />
        )}
      </div>

      {importOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-5">
          <div className="absolute inset-0 bg-black/45" onClick={() => setImportOpen(false)} />
          <div className="ob-card relative w-full max-w-lg p-5">
            <h3 className="font-display text-[17px] font-black">Import deck</h3>
            <p className="mt-1 text-[12.5px] text-[var(--ob-text-soft)]">
              Paste a list in the <code>4 Card Name [BS11-002]</code> format.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              className="ob-scroll mt-3 w-full rounded-[var(--ob-radius-sm)] border border-[var(--ob-line)] bg-[var(--ob-surface)] p-3 font-mono text-[12.5px] outline-none focus:border-[var(--ob-accent)]"
              placeholder={"~~Cookie~~\n4 Macaron Cookie [BS11-002]"}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="h-10 rounded-full border border-[var(--ob-line-strong)] px-4 text-[13.5px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { deck: d, unknown } = importDeck(importText, index);
                  onImport(d);
                  setImportOpen(false);
                  setImportText("");
                  onToast(unknown.length ? `Imported — ${unknown.length} line(s) unrecognised` : "Deck imported");
                }}
                className="h-10 rounded-full bg-[var(--ob-text)] px-4 text-[13.5px] font-semibold text-[var(--ob-bg)]"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeckSection({
  title,
  groups,
  total,
}: {
  title: string;
  groups: ReturnType<typeof groupByType>;
  total: number;
}) {
  return (
    <section>
      <h2 className="font-display text-[18px] font-black">
        {title} <span className="text-[var(--ob-text-faint)]">· {total}</span>
      </h2>

      {groups.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--ob-text-faint)]">Nothing here yet.</p>
      ) : (
        groups.map((g) => (
          <div key={g.type} className="mt-4">
            <h3 className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">
              {g.label} · {g.count}
            </h3>
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
              {g.rows.map((r) => (
                <li key={r.card.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.card.image ?? ""}
                    alt={r.card.name ?? r.card.id}
                    loading="lazy"
                    className="aspect-[5/7] w-full rounded-[8px] bg-[var(--ob-surface-2)] object-cover"
                  />
                  <span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-full bg-[var(--ob-accent)] text-[10.5px] font-bold text-[var(--ob-accent-ink)]">
                    {r.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function ToolButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-full border border-[var(--ob-line-strong)] bg-[var(--ob-surface)] px-4 text-[13.5px] font-semibold transition-colors hover:bg-[var(--ob-surface-2)]"
    >
      {children}
    </button>
  );
}
