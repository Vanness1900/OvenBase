/**
 * Scrapes singles prices (SGD) from Agora Hobby.
 *
 * Agora runs ExpressionEngine + the ExpressoStore add-on. Their category pages
 * render nothing server-side; the listing arrives from a POST that the "Load
 * More" button drives:
 *
 *   POST /v2embeds/cardlist
 *   category=&channel=product_crb&offset=N&rarity=All&finishing=All
 *   &stock=All&sorttype=title&is_asc=asc
 *
 * Passing a `category_id` scopes it to one set, but omitting it returns the
 * whole CookieRun Braverse channel, so we just page through everything.
 *
 * Each chunk carries both rendered markup and an inline ExpressoStore.products
 * blob. We read the markup for titles and the blob for SKU/stock, since the SKU
 * ("BS1-003-SSR") is the cleanest card-number + rarity pair available.
 */
import { load } from 'cheerio';
import { writeFileSync, mkdirSync } from 'node:fs';

const URL = 'https://agorahobby.com/v2embeds/cardlist';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const PAGE = 20;
const DELAY_MS = 700;
const OUT = 'data/raw/agora/prices.json';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchChunk(offset, attempt = 1) {
  const body = new URLSearchParams({
    category: '',
    channel: 'product_crb',
    offset: String(offset),
    color: '',
    cardtype: '',
    rarity: 'All',
    finishing: 'All',
    language: '',
    stock: 'All',
    sorttype: 'title',
    is_asc: 'asc',
  });

  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: 'https://agorahobby.com/store/crb/BS1BS2',
      },
      body,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt >= 3) throw err;
    await sleep(1800 * attempt);
    return fetchChunk(offset, attempt + 1);
  }
}

/** "BS1-003 SSR Dark Choco Cookie (Parallel)" -> parts */
function parseTitle(title) {
  const t = title.replace(/\s+/g, ' ').trim();
  const m = t.match(/^([A-Za-z]+\d*-\d+[A-Za-z]?)\s+(?:([A-Z]{1,3})\s+)?(.*)$/);
  if (!m) return { cardNo: null, rarity: null, name: t, parallel: /\(parallel\)/i.test(t) };
  return {
    cardNo: m[1].toUpperCase(),
    rarity: m[2] ?? null,
    name: (m[3] || '').replace(/\s*\(Parallel\)\s*/i, '').trim(),
    parallel: /\(parallel\)/i.test(t),
  };
}

function parseChunk(html) {
  const $ = load(html);
  const rows = [];

  $('.store-item').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.store-item-title').first().text().replace(/\s+/g, ' ').trim();
    if (!title) return;

    const priceText = $el.find('.store-item-price').first().text();
    // Their template prints the currency symbol twice ("$$0.25").
    const price = Number(priceText.replace(/[^\d.]/g, ''));
    const stockText = $el.find('.store-item-stock').first().text();
    const stock = Number((stockText.match(/(\d+)/) || [])[1] ?? 0);
    const condition = ($el.find('.store-item-cat').first().text().split('-').pop() || '').trim();

    const { cardNo, rarity, name, parallel } = parseTitle(title);
    rows.push({
      cardNo,
      name,
      rarity,
      parallel,
      priceSGD: Number.isFinite(price) ? price : null,
      stock: Number.isFinite(stock) ? stock : 0,
      condition: condition || null,
      image: $el.find('.store-item-img').first().attr('data-img') || null,
    });
  });

  return rows;
}

async function main() {
  mkdirSync('data/raw/agora', { recursive: true });

  const rows = [];
  const seen = new Set();
  let offset = 0;

  // Guard against an endpoint that keeps happily returning the same page.
  for (let guard = 0; guard < 300; guard++) {
    const html = await fetchChunk(offset);
    const chunk = parseChunk(html);
    if (chunk.length === 0) break;

    let added = 0;
    for (const r of chunk) {
      const key = `${r.cardNo}|${r.rarity}|${r.parallel}|${r.condition}|${r.priceSGD}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(r);
      added++;
    }
    if (added === 0) break;

    offset += PAGE;
    if (offset % 200 === 0) console.log(`  offset ${offset} -> ${rows.length} rows`);
    await sleep(DELAY_MS);
  }

  const withPrice = rows.filter((r) => r.priceSGD !== null).length;
  const matched = rows.filter((r) => r.cardNo).length;

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        source: 'agorahobby.com',
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
