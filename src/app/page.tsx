import decks from "@/data/decks.json";
import cards from "@/data/cards.json";
import { HomeHero, MetaDecks, CoffeeCta } from "@/components/home-sections";
import type { Card } from "@/lib/types";

/**
 * The hero fans out a fresh set of cards on every visit, so the page has to be
 * rendered per request rather than prerendered once at build time.
 *
 * Doing the shuffle on the server (instead of after hydration) keeps the markup
 * the browser receives identical to what it renders -- no mismatch, no flash of
 * a placeholder set being swapped out.
 */
export const dynamic = "force-dynamic";

/** Only these read as "chase cards" worth showing off. */
const SHOWCASE_RARITIES = new Set(["R", "SR", "UR"]);
const SHOWCASE_COUNT = 5;

function pickShowcase(all: Card[]): Card[] {
  const pool = all.filter((c) => c.image && SHOWCASE_RARITIES.has(c.rarity));

  // Partial Fisher-Yates: we only need the first few slots, not a full shuffle.
  const idx = pool.map((_, i) => i);
  const picked: Card[] = [];
  const usedCardNos = new Set<string>();

  for (let i = 0; i < idx.length && picked.length < SHOWCASE_COUNT; i++) {
    const j = i + Math.floor(Math.random() * (idx.length - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];

    const card = pool[idx[i]];
    // Two printings of one card would show near-identical art side by side.
    if (usedCardNos.has(card.cardNo)) continue;
    usedCardNos.add(card.cardNo);
    picked.push(card);
  }

  return picked;
}

export default function HomePage() {
  const all = cards as Card[];

  const showcase = pickShowcase(all);
  const meta = [...decks].sort((a, b) => b.likes - a.likes).slice(0, 5);

  return (
    <>
      <HomeHero showcase={showcase} totalCards={all.length} />
      <MetaDecks decks={meta} />
      <CoffeeCta />
    </>
  );
}
