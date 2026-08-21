import Link from "next/link";
import { notFound } from "next/navigation";
import decks from "@/data/decks.json";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return decks.map((d) => ({ id: d.id }));
}

export default async function DeckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = decks.find((d) => d.id === id);
  if (!deck) notFound();

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
      <Link href="/decks" className="text-[13px] font-semibold text-[var(--ob-text-soft)] hover:text-[var(--ob-text)]">
        ← Decks
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-black sm:text-[32px]">{deck.name}</h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--ob-text-soft)]">
            {deck.authorName} · {deck.cardCount} cards · {formatDate(deck.updatedAt)}
          </p>
        </div>
        {deck.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deck.coverImage} alt="" className="h-[150px] w-[107px] rounded-[10px] object-cover shadow-[var(--ob-shadow)]" />
        )}
      </div>

      {deck.description && (
        <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-[var(--ob-text-soft)]">{deck.description}</p>
      )}

      {/*
        The official deck feed exposes metadata and thumbnails but no card list,
        so imported decks can't be previewed card-by-card or copied yet.
      */}
      {!deck.contentsAvailable && (
        <div className="mt-8 rounded-[var(--ob-radius-sm)] border border-dashed border-[var(--ob-line-strong)] px-5 py-8 text-center">
          <p className="text-[14px] font-semibold">Card list not available</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] text-[var(--ob-text-soft)]">
            This deck was imported from the official site, which publishes deck metadata but not the
            60-card contents. Decks built in OvenBase will show their full list here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <a
              href={`https://cookierunbraverse.com/asia/decks`}
              target="_blank"
              rel="noreferrer noopener"
              className="h-10 rounded-full border border-[var(--ob-line-strong)] px-4 text-[13.5px] font-semibold leading-10"
            >
              View on official site
            </a>
            <Link
              href="/decks/build"
              className="h-10 rounded-full bg-[var(--ob-text)] px-4 text-[13.5px] font-semibold leading-10 text-[var(--ob-bg)]"
            >
              Build your own
            </Link>
          </div>
        </div>
      )}

      {deck.previewImages.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">
            Featured cards
          </h2>
          <ul className="flex flex-wrap gap-2.5">
            {deck.previewImages.map((src, i) => (
              <li key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="h-[168px] w-[120px] rounded-[10px] object-cover" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
