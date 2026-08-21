/**
 * Scrapes singles prices (PHP) from HitSeekr.
 *
 * HitSeekr is WordPress + JetEngine. The card listing is server-rendered and
 * paginated with a plain query param, so no browser or AJAX replay is needed:
 *   https://hitseekr.com/cards/?jsf=jet-engine&pagenum=N
 *
 * Each grid item gives us:
 *   h2                                 -> "BS11-100 Agar Agar Cookie"
 *   img filename                       -> "..._BS11-100_C_simulation.png"  (rarity)
 *   .jet-listing-dynamic-field__content -> "PHP 20.00"
 */
import { load } from 'cheerio';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'https://hitseekr.com/cards/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const DELAY_MS = 700;
const OUT = 'data/raw/hitseekr/prices.json';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPage(n, attempt = 1) {
  const url = `${BASE}?jsf=jet-engine&pagenum=${n}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt >= 3) throw err;
    await sleep(2000 * attempt);
    return getPage(n, attempt + 1);
  }
}

/** "BS11-100 Agar Agar Cookie" -> { cardNo, name } */
function splitTitle(title) {
  const m = title.match(/^\s*([A-Za-z]+\d*-\d+[A-Za-z]?)\s+(.*)$/);
  return m ? { cardNo: m[1], name: m[2].trim() } : { cardNo: null, name: title.trim() };
}

/** "수정_BS11-099_C_simulation.png" -> "C" */
function rarityFromFilename(src, cardNo) {
  if (!src || !cardNo) return null;
  const file = decodeURIComponent(src.split('/').pop() || '');
  const at = file.indexOf(cardNo + '_');
  if (at === -1) return null;
  const m = file.slice(at + cardNo.length + 1).match(/^([A-Za-z]+)/);
  return m ? m[1].toUpperCase() : null;
}

function parsePage(html) {
  const $ = load(html);
  const rows = [];
  $('.jet-listing-grid__item').each((_, el) => {
    const $el = $(el);
    const title = $el.find('h2').first().text().replace(/\s+/g, ' ').trim();
    if (!title) return;
    const { cardNo, name } = splitTitle(title);

    const priceText = $el
      .find('.jet-listing-dynamic-field__content')
      .map((__, f) => $(f).text().trim())
      .get()
      .find((t) => /[\u20b1]|PHP/i.test(t));

    const price = priceText ? Number(priceText.replace(/[^\d.]/g, '')) : null;
    const img = $el.find('img').first().attr('src') || null;

    rows.push({
      cardNo,
      name,
      rarity: rarityFromFilename(img, cardNo),
      pricePHP: Number.isFinite(price) ? price : null,
      image: img,
    });
  });
  const totalPages = Number($('[data-pages]').first().attr('data-pages')) || null;
  return { rows, totalPages };
}

async function main() {
  mkdirSync('data/raw/hitseekr', { recursive: true });

  const first = parsePage(await getPage(1));
  const totalPages = first.totalPages || 1;
  console.log(`total pages: ${totalPages} (${first.rows.length} per page)`);

  const all = [...first.rows];
  for (let p = 2; p <= totalPages; p++) {
    await sleep(DELAY_MS);
    try {
      const { rows } = parsePage(await getPage(p));
      all.push(...rows);
      if (p % 20 === 0 || p === totalPages) {
        console.log(`  page ${p}/${totalPages} -> ${all.length} rows`);
      }
    } catch (err) {
      console.error(`  page ${p} FAILED: ${err.message}`);
    }
  }

  const withPrice = all.filter((r) => r.pricePHP !== null).length;
  const payload = {
    source: 'hitseekr.com',
    currency: 'PHP',
    scrapedAt: new Date().toISOString(),
    totalPages,
    count: all.length,
    withPrice,
    rows: all,
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`\nwrote ${OUT}: ${all.length} rows, ${withPrice} with a price`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
