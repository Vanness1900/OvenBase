/**
 * Turns the official public deck feed into OvenBase seed decks.
 *
 * The official endpoint (/api/decks?site_lang=asia) only returns the current
 * public page and exposes no working pagination or per-deck card list, so these
 * seeds carry metadata and thumbnails but not full 60-card contents. They give
 * the Decks page and the home "meta decks" strip something real to render until
 * OvenBase has its own user decks.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const IN = 'data/raw/official-decks.json';
const OUT = 'src/data/decks.json';

const raw = JSON.parse(readFileSync(IN, 'utf8'));

const decks = raw.data.map((d, i) => ({
  id: d.deck_code,
  name: d.deck_title?.trim() || 'Untitled deck',
  description: '',
  authorName: d.user_nickname?.trim() || 'Anonymous',
  authorId: null,
  authorImage: d.user_image ?? null,
  visibility: 'public',
  main: [],
  extra: [],
  likes: d.deck_favorite_count ?? 0,
  bookmarks: 0,
  updatedAt: (d.update_dt ?? d.create_dt ?? '').replace(' ', 'T') || new Date().toISOString(),
  // The official feed has no shelf concept; treat the two most-liked as
  // champion imports and the rest as community until curation exists.
  shelf: i < 2 ? 'champion' : 'community',
  cardCount: d.deck_card_count ?? 0,
  coverImage: d.deck_thumbnail_card_images ?? null,
  previewImages: (d.card_images ?? []).slice(0, 3),
  source: 'cookierunbraverse.com',
  /** No card list available upstream -- the builder can't open these yet. */
  contentsAvailable: false,
}));

mkdirSync('src/data', { recursive: true });
writeFileSync(OUT, JSON.stringify(decks, null, 2));
console.log(`wrote ${OUT}: ${decks.length} seed decks`);
