import cards from "@/data/cards.json";
import { CardsBrowser } from "@/components/cards-browser";
import type { Card } from "@/lib/types";

export const metadata = {
  title: "Card list — OvenBase",
  description: "Every CookieRun: Braverse card with community price baselines.",
};

export default function CardsPage() {
  const all = cards as Card[];

  // Product options come from the data rather than a hardcoded list so new
  // boosters show up the moment the catalog is re-scraped.
  const products = [...new Set(all.map((c) => c.productTitle).filter(Boolean))] as string[];
  products.sort((a, b) => {
    const rank = (s: string) => (s.startsWith("BOOSTER") ? 0 : s.startsWith("Starter") ? 1 : 2);
    return rank(a) - rank(b) || a.localeCompare(b);
  });

  const maxPrice = Math.max(...all.map((c) => c.pricePHP ?? 0));

  return <CardsBrowser cards={all} products={products} maxPricePHP={maxPrice} />;
}
