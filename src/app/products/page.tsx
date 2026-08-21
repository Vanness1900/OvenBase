import Link from "next/link";
import products from "@/data/products.json";
import cards from "@/data/cards.json";
import type { Card } from "@/lib/types";
import { formatCount } from "@/lib/format";

export const metadata = { title: "Products — OvenBase" };

const KIND_LABEL: Record<string, string> = {
  BOOSTERPACK: "Booster packs",
  STARTERDECK: "Starter decks",
  OTHER: "Other products",
};

export default function ProductsPage() {
  const all = cards as Card[];

  // Use each set's rarest card as the shelf image -- it's the recognisable one.
  const coverFor = (title: string) => {
    const inSet = all.filter((c) => c.productTitle === title && c.image);
    if (!inSet.length) return null;
    const rank = ["SUR", "UR", "SEC", "SSR", "SR", "R", "U", "C", "P"];
    return [...inSet].sort((a, b) => rank.indexOf(a.rarity) - rank.indexOf(b.rarity))[0]?.image ?? null;
  };

  const groups = ["BOOSTERPACK", "STARTERDECK", "OTHER"] as const;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-[28px] font-black sm:text-[34px]">Products</h1>
      <p className="mt-1.5 text-[14px] text-[var(--ob-text-soft)]">
        Every set in the ASIA catalog, with how many cards OvenBase tracks from each.
      </p>

      {groups.map((kind) => {
        const list = products.filter((p) => p.kind === kind);
        if (!list.length) return null;

        return (
          <section key={kind} className="mt-9">
            <h2 className="font-display text-[19px] font-black">{KIND_LABEL[kind]}</h2>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => {
                const cover = coverFor(p.title);
                return (
                  <li key={`${p.id}-${p.title}`}>
                    <Link
                      href={`/cards?product=${encodeURIComponent(p.title)}`}
                      className="ob-card flex h-full gap-4 p-4 transition-shadow hover:shadow-[var(--ob-shadow-lg)]"
                    >
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt=""
                          loading="lazy"
                          className="h-[92px] w-[66px] shrink-0 rounded-[8px] object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[14.5px] font-semibold leading-snug">{p.title}</h3>
                        <p className="mt-1.5 text-[12.5px] text-[var(--ob-text-soft)]">
                          {formatCount(p.cardCount)} cards
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
