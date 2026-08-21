import decks from "@/data/decks.json";
import { DecksBrowser } from "@/components/decks-browser";

export const metadata = { title: "Decks — OvenBase" };

export default function DecksPage() {
  return <DecksBrowser decks={decks} />;
}
