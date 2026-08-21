import decks from "@/data/decks.json";
import cards from "@/data/cards.json";
import { HomeHero, MetaDecks, CoffeeCta } from "@/components/home-sections";
import type { Card } from "@/lib/types";

export default function HomePage() {
  const all = cards as Card[];

  // The hero art uses the highest-value cards we have prices for -- they're the
  // ones people come here to look up.
  const showcase = all
    .filter((c) => c.pricePHP !== null && c.image)
    .sort((a, b) => (b.pricePHP ?? 0) - (a.pricePHP ?? 0))
    .slice(0, 5);

  const meta = [...decks].sort((a, b) => b.likes - a.likes).slice(0, 5);

  return (
    <>
      <HomeHero showcase={showcase} totalCards={all.length} />
      <MetaDecks decks={meta} />
      <CoffeeCta />
    </>
  );
}
