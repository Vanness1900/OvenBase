/**
 * Pulls HitSeekr's `card-type-2` taxonomy, which is the only public source for
 * the "Exclusive" facet the spec asks for.
 *
 * The official Braverse catalog has no equivalent field. HitSeekr tags cards
 * with Serial / Anniversary / Brave League / Champion Cup / STAGE Prize, plus
 * a few things we already derive elsewhere (groups, Special Play, Equip).
 *
 * "Cookie Party" is NOT in their taxonomy -- there is no source for it.
 *
 * Output: data/raw/hitseekr/tags.json  { cardNo: [slug, ...] }
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'https://hitseekr.com/wp-json/wp/v2';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const DELAY_MS = 500;
const OUT = 'data/raw/hitseekr/tags.json';

/** Slugs worth importing. Groups are already in the official data, but having
 *  HitSeekr's view lets us cross-check coverage. */
const WANTED = new Set([
  'serial',
  'anniversary',
  'brave-league',
  'champion-cup',
  'stage-prize',
  'special-play',
  'equip',
  'ancient',
  'beast',
  'dragon',
  'arena',
  'extra',
  'flip',
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 3) throw err;
    await sleep(1500 * attempt);
    return getJson(url, attempt + 1);
  }
}

/** Post titles read "BS11-116 Dark Enchantress Cookie". */
function cardNoFromTitle(title) {
  const t = String(title).replace(/&#\d+;/g, '').trim();
  const m = t.match(/^([A-Za-z]+\d*-\d+)/);
  return m ? m[1].toUpperCase() : null;
}

async function main() {
  mkdirSync('data/raw/hitseekr', { recursive: true });

  const terms = await getJson(`${BASE}/card-type-2?per_page=100`);
  const wanted = terms.filter((t) => WANTED.has(t.slug) && t.count > 0);
  console.log(`terms: ${wanted.length} of ${terms.length}`);

  /** cardNo -> Set(slug) */
  const byCard = new Map();
  const perTerm = {};

  for (const term of wanted) {
    const found = new Set();
    for (let page = 1; page <= 20; page++) {
      const url = `${BASE}/cards?card-type-2=${term.id}&per_page=100&page=${page}&_fields=title,slug`;
      let batch;
      try {
        batch = await getJson(url);
      } catch {
        break; // WP returns 400 past the last page
      }
      if (!Array.isArray(batch) || batch.length === 0) break;

      for (const post of batch) {
        const cardNo = cardNoFromTitle(post.title?.rendered ?? '');
        if (!cardNo) continue;
        found.add(cardNo);
        if (!byCard.has(cardNo)) byCard.set(cardNo, new Set());
        byCard.get(cardNo).add(term.slug);
      }
      if (batch.length < 100) break;
      await sleep(DELAY_MS);
    }
    perTerm[term.slug] = found.size;
    console.log(`  ${term.slug.padEnd(14)} expected ${String(term.count).padStart(4)}  matched ${found.size}`);
    await sleep(DELAY_MS);
  }

  const tags = Object.fromEntries([...byCard].map(([k, v]) => [k, [...v].sort()]));

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        source: 'hitseekr.com/wp-json/wp/v2/card-type-2',
        scrapedAt: new Date().toISOString(),
        note: 'Cookie Party is not present in this taxonomy -- no public source found.',
        perTerm,
        tags,
      },
      null,
      2,
    ),
  );
  console.log(`\nwrote ${OUT}: ${Object.keys(tags).length} cards tagged`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
