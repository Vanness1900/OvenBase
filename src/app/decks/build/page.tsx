import cards from "@/data/cards.json";
import { DeckBuilder } from "@/components/deck-builder";
import type { Card } from "@/lib/types";

export const metadata = { title: "Deck builder — OvenBase" };

export default function DeckBuildPage() {
  const all = cards as Card[];

  const products = [...new Set(all.map((c) => c.productTitle).filter(Boolean))] as string[];
  products.sort((a, b) => {
    const rank = (s: string) => (s.startsWith("BOOSTER") ? 0 : s.startsWith("Starter") ? 1 : 2);
    return rank(a) - rank(b) || a.localeCompare(b);
  });

  const maxPrice = Math.max(...all.map((c) => c.pricePHP ?? 0));

  return <DeckBuilder cards={all} products={products} maxPricePHP={maxPrice} />;
}
