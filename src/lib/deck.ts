import {
  EXTRA_DECK_MAX,
  MAIN_DECK_SIZE,
  MAX_COPIES,
  type Card,
  type DeckEntry,
  type DeckLegality,
} from "./types";

/**
 * Deck rules, per the official Banned & Restricted policy:
 *   - main deck must be exactly 60 cards
 *   - extra deck may hold 0-6 cards
 *   - at most 4 copies of a given card number (printings share a number)
 *   - restricted cards are capped at 1 copy; banned cards can't be used at all
 * Illegal decks can still be saved -- they just can't be shared publicly.
 */

export type DeckSlot = "main" | "extra";

export interface DeckState {
  main: DeckEntry[];
  extra: DeckEntry[];
}

export const EMPTY_DECK: DeckState = { main: [], extra: [] };

/** EXTRA-type cards belong in the extra deck; everything else in the main deck. */
export function slotFor(card: Card): DeckSlot {
  return card.type === "EXTRA" || card.isExtra ? "extra" : "main";
}

export function countIn(entries: DeckEntry[], cardNo: string): number {
  return entries.filter((e) => e.cardNo === cardNo).reduce((n, e) => n + e.count, 0);
}

export function totalCards(entries: DeckEntry[]): number {
  return entries.reduce((n, e) => n + e.count, 0);
}

/** Copies across BOTH slots -- the 4-copy rule doesn't reset per deck half. */
export function copiesOf(deck: DeckState, cardNo: string): number {
  return countIn(deck.main, cardNo) + countIn(deck.extra, cardNo);
}

export function addCard(deck: DeckState, card: Card): DeckState {
  const slot = slotFor(card);
  const entries = [...deck[slot]];
  const existing = entries.findIndex((e) => e.printingId === card.id);

  if (existing >= 0) {
    entries[existing] = { ...entries[existing], count: entries[existing].count + 1 };
  } else {
    entries.push({ cardNo: card.cardNo, printingId: card.id, count: 1 });
  }
  return { ...deck, [slot]: entries };
}

export function removeCard(deck: DeckState, printingId: string, slot: DeckSlot): DeckState {
  const entries = deck[slot]
    .map((e) => (e.printingId === printingId ? { ...e, count: e.count - 1 } : e))
    .filter((e) => e.count > 0);
  return { ...deck, [slot]: entries };
}

export function setCount(deck: DeckState, printingId: string, slot: DeckSlot, count: number): DeckState {
  const entries = deck[slot]
    .map((e) => (e.printingId === printingId ? { ...e, count: Math.max(0, count) } : e))
    .filter((e) => e.count > 0);
  return { ...deck, [slot]: entries };
}

export function checkLegality(deck: DeckState, index: Map<string, Card>): DeckLegality {
  const problems: string[] = [];
  const mainCount = totalCards(deck.main);
  const extraCount = totalCards(deck.extra);

  if (mainCount !== MAIN_DECK_SIZE) {
    problems.push(`Main deck has ${mainCount} cards — it must have exactly ${MAIN_DECK_SIZE}.`);
  }
  if (extraCount > EXTRA_DECK_MAX) {
    problems.push(`Extra deck has ${extraCount} cards — the limit is ${EXTRA_DECK_MAX}.`);
  }

  const perNumber = new Map<string, number>();
  for (const e of [...deck.main, ...deck.extra]) {
    perNumber.set(e.cardNo, (perNumber.get(e.cardNo) ?? 0) + e.count);
  }

  for (const [cardNo, n] of perNumber) {
    const card = index.get(cardNo);
    const name = card?.name ?? cardNo;

    if (card?.legality === "banned") {
      problems.push(`${name} (${cardNo}) is banned.`);
      continue;
    }
    const cap = card?.legality === "restricted" ? 1 : MAX_COPIES;
    if (n > cap) {
      problems.push(
        card?.legality === "restricted"
          ? `${name} (${cardNo}) is restricted to 1 copy — you have ${n}.`
          : `${name} (${cardNo}) — ${n} copies, the limit is ${MAX_COPIES}.`,
      );
    }
  }

  return { legal: problems.length === 0, problems, mainCount, extraCount };
}

/* ------------------------------------------------------- import / export */

/** Section order in exported lists, matching how players write them out. */
const EXPORT_ORDER = ["COOKIE", "FLIP", "ITEM", "TRAP", "STAGE", "EXTRA", "NPC"];

const TYPE_LABEL: Record<string, string> = {
  COOKIE: "Cookie",
  FLIP: "Flip",
  ITEM: "Item",
  TRAP: "Trap",
  STAGE: "Stage",
  EXTRA: "Extra",
  NPC: "NPC",
};

/**
 * Emits the agreed text format:
 *   ~~Cookie~~
 *   4 Macaron Cookie [BS11-002]
 */
export function exportDeck(deck: DeckState, index: Map<string, Card>): string {
  const byType = new Map<string, { name: string; cardNo: string; count: number }[]>();

  for (const e of [...deck.main, ...deck.extra]) {
    const card = index.get(e.cardNo) ?? index.get(e.printingId);
    const type = card?.type ?? "COOKIE";
    if (!byType.has(type)) byType.set(type, []);
    const bucket = byType.get(type)!;
    const found = bucket.find((b) => b.cardNo === e.cardNo);
    if (found) found.count += e.count;
    else bucket.push({ name: card?.name ?? e.cardNo, cardNo: e.cardNo, count: e.count });
  }

  const sections: string[] = [];
  for (const type of EXPORT_ORDER) {
    const rows = byType.get(type);
    if (!rows?.length) continue;
    rows.sort((a, b) => b.count - a.count || a.cardNo.localeCompare(b.cardNo));
    sections.push(
      `~~${TYPE_LABEL[type] ?? type}~~\n` + rows.map((r) => `${r.count} ${r.name} [${r.cardNo}]`).join("\n"),
    );
  }
  return sections.join("\n\n");
}

export interface ImportResult {
  deck: DeckState;
  unknown: string[];
}

/** Parses the same format back. Section headers are advisory -- the card's own
 *  type decides which half of the deck it lands in. */
export function importDeck(text: string, index: Map<string, Card>): ImportResult {
  const deck: DeckState = { main: [], extra: [] };
  const unknown: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("~~")) continue;

    // "4 Macaron Cookie [BS11-002]" -- the bracketed id is what we trust.
    const m = line.match(/^(\d+)\s+(.*?)\s*\[([^\]]+)\]\s*,?$/);
    if (!m) {
      unknown.push(line);
      continue;
    }

    const count = Number(m[1]);
    const cardNo = normaliseCardNo(m[3]);
    const card = index.get(cardNo);
    if (!card || !Number.isFinite(count) || count <= 0) {
      unknown.push(line);
      continue;
    }

    const slot = slotFor(card);
    const entries = deck[slot];
    const existing = entries.find((e) => e.printingId === card.id);
    if (existing) existing.count += count;
    else entries.push({ cardNo: card.cardNo, printingId: card.id, count });
  }

  return { deck, unknown };
}

/** "BS01-007" and "bs1-7" both mean BS1-007. */
export function normaliseCardNo(raw: string): string {
  const s = raw.trim().replace(/_/g, "-").split("@")[0];
  const m = s.match(/^([A-Za-z]+)0*(\d*)-0*(\d+)$/);
  return m ? `${m[1].toUpperCase()}${m[2]}-${m[3].padStart(3, "0")}` : s.toUpperCase();
}

/** Groups a deck half by card type for the preview columns. */
export function groupByType(
  entries: DeckEntry[],
  index: Map<string, Card>,
): { type: string; label: string; count: number; rows: { card: Card; count: number }[] }[] {
  const buckets = new Map<string, { card: Card; count: number }[]>();

  for (const e of entries) {
    const card = index.get(e.printingId) ?? index.get(e.cardNo);
    if (!card) continue;
    if (!buckets.has(card.type)) buckets.set(card.type, []);
    buckets.get(card.type)!.push({ card, count: e.count });
  }

  return EXPORT_ORDER.filter((t) => buckets.has(t)).map((type) => {
    const rows = buckets.get(type)!.sort((a, b) => b.count - a.count || a.card.cardNo.localeCompare(b.card.cardNo));
    return {
      type,
      label: TYPE_LABEL[type] ?? type,
      count: rows.reduce((n, r) => n + r.count, 0),
      rows,
    };
  });
}
