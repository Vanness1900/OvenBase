/**
 * Scrapes singles prices (SGD) from Game Academia.
 *
 * They run Shopify, which exposes every collection as JSON, so there's no HTML
 * parsing involved:
 *   /collections.json                       -> find the Braverse singles
 *   /collections/<handle>/products.json     -> paginated product list
 *
 * Product titles look like "CRB-BS1-001 C Goblin Cookie" -- card number,
 * rarity, then name.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'https://game-academia.myshopify.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const DELAY_MS = 600;
const OUT = 'data/raw/game-academia/prices.json';

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

/** "CRB-BS1-001 C Goblin Cookie" -> { cardNo: "BS1-001", rarity: "C", name: "Goblin Cookie" } */
function parseTitle(title) {
  const t = String(title).trim();
  const m = t.match(/^CRB[-\s]*([A-Za-z]+\d*-\d+[A-Za-z]?)\s+([A-Za-z]+)?\s*(.*)$/i);
  if (!m) return { cardNo: null, rarity: null, name: t };
  return {
    cardNo: m[1].toUpperCase(),
    rarity: m[2] ? m[2].toUpperCase() : null,
    name: (m[3] || '').trim() || t,
  };
}

async function collectionProducts(handle) {
  const rows = [];
  for (let page = 1; page <= 20; page++) {
    const data = await getJson(`${BASE}/collections/${handle}/products.json?limit=250&page=${page}`);
    const products = data.products ?? [];
    if (!products.length) break;

    for (const p of products) {
      const variant = (p.variants ?? [])[0];
      if (!variant) continue;
      const { cardNo, rarity, name } = parseTitle(p.title);
      const price = Number(variant.price);
      rows.push({
        cardNo,
        name,
        rarity,
        priceSGD: Number.isFinite(price) ? price : null,
        available: Boolean(variant.available),
        sku: variant.sku ?? null,
        collection: handle,
        url: `${BASE}/products/${p.handle}`,
      });
    }

    if (products.length < 250) break;
    await sleep(DELAY_MS);
  }
  return rows;
}

async function main() {
  mkdirSync('data/raw/game-academia', { recursive: true });

  const all = await getJson(`${BASE}/collections.json?limit=250`);
  // Singles only -- boxes, starter decks and pre-orders aren't singles prices.
  const handles = (all.collections ?? [])
    .map((c) => c.handle)
    .filter((h) => /^cookierun-braverse-bs\d+/i.test(h) && /singles/i.test(h));

  console.log(`singles collections: ${handles.length}`);

  const rows = [];
  for (const handle of handles) {
    const got = await collectionProducts(handle);
    console.log(`  ${handle} -> ${got.length}`);
    rows.push(...got);
    await sleep(DELAY_MS);
  }

  const withPrice = rows.filter((r) => r.priceSGD !== null).length;
  const matched = rows.filter((r) => r.cardNo).length;

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        source: 'game-academia.myshopify.com',
        currency: 'SGD',
        scrapedAt: new Date().toISOString(),
        count: rows.length,
        withPrice,
        withCardNo: matched,
        rows,
      },
      null,
      2,
    ),
  );
  console.log(`\nwrote ${OUT}: ${rows.length} rows, ${withPrice} priced, ${matched} with a card number`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
