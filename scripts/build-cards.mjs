/**
 * Turns the official Braverse catalog dump into OvenBase's typed dataset.
 *
 * Input : data/raw/cardList_en.json   (official, 2093 printings)
 *         data/raw/banlist.json       (scraped from notice 1380)
 *         data/raw/hitseekr/prices.json (optional, PHP singles prices)
 * Output: src/data/cards.json
 *         data/reports/filter-coverage.json
 *
 * The official data is dirty in ways that matter for filtering, so most of the
 * work here is normalisation: full-width digits, typo'd enums, "\r\n" prefixes,
 * and stats that only exist inside the rendered card text (damage, cost colors,
 * keywords). See FIXUPS below -- every one of them is a real value observed in
 * the live dump, not defensive guessing.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const RAW = 'data/raw/cardList_en.json';
const BANLIST = 'data/raw/banlist.json';
const PRICES = 'data/raw/hitseekr/prices.json';
const PRICES_AGORA = 'data/raw/agora/prices.json';
const PRICES_GA = 'data/raw/game-academia/prices.json';
const TAGS = 'data/raw/hitseekr/tags.json';
const OUT_CARDS = 'src/data/cards.json';
const OUT_REPORT = 'data/reports/filter-coverage.json';

/* ------------------------------------------------------------------ fixups */

const TYPE_FIXUPS = { EXRTA: 'EXTRA' };
const COLOR_FIXUPS = { PULPLE: 'PURPLE', null: null, '': null };
const GROUP_FIXUPS = { AREMA: 'ARENA' };
const GRADE_FIXUPS = { 'ULTLA RARE': 'ULTRA RARE', UOMMON: 'UNCOMMON' };

/** Full-width and subscript variants the CMS lets through. */
const WIDE_DIGITS = { '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9' };
const PLUS_SIGNS = ['＋', '₊', '+'];

const COST_SYMBOLS = { R: 'RED', Y: 'YELLOW', G: 'GREEN', B: 'BLUE', P: 'PURPLE', K: 'BLACK', N: 'COLORLESS' };

/** Rarity preference when collapsing alternate arts to one "base" printing. */
const BASE_RARITY_ORDER = ['C', 'U', 'R', 'SR', 'UR', 'P'];

/* ----------------------------------------------------------------- helpers */

const clean = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\r/g, ' ').trim();
  return s === '' || s === 'null' ? null : s;
};

const asciiDigits = (s) => String(s).replace(/[０-９]/g, (d) => WIDE_DIGITS[d]);

/** "BS01-007" -> "BS1-007";  "BS2_058@2" -> "BS2-058" (+ variant 2). */
function parseCardNo(raw) {
  const s = String(raw).trim().replace(/_/g, '-');
  const [head, variantPart] = s.split('@');
  const m = head.match(/^([A-Za-z]+)0*(\d*)-0*(\d+)$/);
  const base = m ? `${m[1].toUpperCase()}${m[2]}-${m[3].padStart(3, '0')}` : head.toUpperCase();
  const variant = variantPart ? Number(variantPart) : null;
  return { base, variant, id: variant ? `${base}@${variant}` : base };
}

/** "＋2" -> {value:2, plus:true};  "5" -> {value:5, plus:false} */
function parseHp(raw) {
  const s = clean(raw);
  if (s === null) return null;
  const norm = asciiDigits(s).trim();
  const plus = PLUS_SIGNS.some((p) => norm.startsWith(p));
  const value = Number(norm.replace(/[^\d]/g, ''));
  return Number.isFinite(value) ? { value, plus } : null;
}

function parseLevel(raw) {
  const s = clean(raw);
  if (s === null) return null;
  const n = Number(asciiDigits(s).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Damage lives only in the rendered attack text as "{da} 3". */
function parseDamage(attackText) {
  if (!attackText) return [];
  const out = [];
  for (const m of attackText.matchAll(/\{da\}\s*([0-9０-９]+)/g)) {
    const n = Number(asciiDigits(m[1]));
    if (Number.isFinite(n)) out.push(n);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/** Attack costs are rendered as "<{R}{R}{N}>" before the attack name. */
function parseCostColors(attackText) {
  if (!attackText) return [];
  const out = [];
  for (const block of attackText.matchAll(/<([^>]*)>/g)) {
    for (const sym of block[1].matchAll(/\{([A-Za-z]+)\}/g)) {
      const color = COST_SYMBOLS[sym[1]];
      if (color) out.push(color);
    }
  }
  return [...new Set(out)];
}

/** Keywords are rendered inside 【 】 across skill / attack / flip text. */
function parseKeywords(...texts) {
  const out = new Set();
  for (const t of texts) {
    if (!t) continue;
    for (const m of t.matchAll(/【([^】]+)】/g)) {
      const k = m[1].trim();
      // Skip the CJK duplicates the asia dump leaves behind.
      if (/^[\x20-\x7E'’:.\- ]+$/.test(k)) out.add(k);
    }
  }
  return [...out];
}

function normaliseGroup(raw) {
  const s = clean(raw);
  if (s === null) return [];
  const up = s.toUpperCase();
  return [GROUP_FIXUPS[up] || up];
}

/** "RED MIX" / "BLUE RED YELLOW GREEN PURPLE" -> ["RED", ...] + mix flag */
function parseEnergyType(raw) {
  const s = clean(raw);
  if (s === null) return { colors: [], mix: false, raw: null };
  const up = s.toUpperCase();
  const mix = up.includes('MIX');
  const colors = up
    .replace(/MIX/g, '')
    .split(/\s+/)
    .map((t) => COLOR_FIXUPS[t] ?? t)
    .filter((t) => t && t !== 'null');
  return { colors: [...new Set(colors)], mix, raw: up };
}

/** Promo product titles differ only by case/punctuation across the dump. */
function normaliseProduct(raw) {
  const s = clean(raw);
  if (s === null) return null;
  if (/^promotion[\s-]?card$/i.test(s)) return 'PROMOTION CARD';
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * The "Exclusive" facet. The official catalog has no such field, so the tags
 * come from HitSeekr's `card-type-2` taxonomy (see scrape-hitseekr-tags.mjs).
 *
 * Five of the six categories in the spec exist there. "Cookie Party" does not
 * appear in any public source, so it stays unavailable and is reported as such.
 */
const EXCLUSIVE_SLUGS = ['serial', 'brave-league', 'anniversary', 'champion-cup', 'stage-prize'];

/** Product-title fallback, for cards HitSeekr hasn't tagged. */
const TITLE_RULES = [
  { key: 'brave-league', test: /brave league/i },
  { key: 'champion-cup', test: /champion cup/i },
  { key: 'anniversary', test: /anniversar/i },
];

function deriveExclusive(productTitle, tagList) {
  const out = new Set();
  for (const slug of tagList ?? []) {
    if (EXCLUSIVE_SLUGS.includes(slug)) out.add(slug);
  }
  if (productTitle) {
    for (const r of TITLE_RULES) {
      if (r.test.test(productTitle)) out.add(r.key);
    }
  }
  return [...out];
}

/* -------------------------------------------------------------------- main */

const raw = JSON.parse(readFileSync(RAW, 'utf8'));
const banlist = JSON.parse(readFileSync(BANLIST, 'utf8'));

const bannedIds = new Set(banlist.banned.map((b) => parseCardNo(b.id).base));
const restrictedIds = new Set(banlist.restricted.map((b) => parseCardNo(b.id).base));

/** Store feeds key on card number + rarity; fall back to the number alone. */
function loadStore(path, currency, amountKey) {
  if (!existsSync(path)) {
    console.log(`prices: ${path} not found -- skipping`);
    return null;
  }
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const map = new Map();
  for (const row of data.rows ?? []) {
    const amount = row[amountKey];
    if (!row.cardNo || amount === null || amount === undefined) continue;
    const { base } = parseCardNo(row.cardNo);
    const rarity = row.rarity ? String(row.rarity).toUpperCase() : null;
    // Cheapest listing wins -- Agora lists the same card in several conditions.
    const put = (k) => {
      const prev = map.get(k);
      if (prev === undefined || amount < prev) map.set(k, amount);
    };
    if (rarity) put(`${base}|${rarity}`);
    put(base);
  }
  console.log(`prices: ${path} -> ${map.size} keys (${currency})`);
  return map;
}

const agora = loadStore(PRICES_AGORA, 'SGD', 'priceSGD');
const gameAcademia = loadStore(PRICES_GA, 'SGD', 'priceSGD');

let tags = {};
if (existsSync(TAGS)) {
  tags = JSON.parse(readFileSync(TAGS, 'utf8')).tags ?? {};
  console.log(`tags: ${Object.keys(tags).length} cards tagged from HitSeekr`);
}

let prices = null;
if (existsSync(PRICES)) {
  const p = JSON.parse(readFileSync(PRICES, 'utf8'));
  prices = new Map();
  for (const row of p.rows) {
    if (!row.cardNo || row.pricePHP === null) continue;
    const { base } = parseCardNo(row.cardNo);
    const key = row.rarity ? `${base}|${row.rarity}` : base;
    // Keep the first price seen for a given (card, rarity) pair.
    if (!prices.has(key)) prices.set(key, row.pricePHP);
    if (!prices.has(base)) prices.set(base, row.pricePHP);
  }
  console.log(`prices: loaded ${prices.size} keys from ${PRICES}`);
} else {
  console.log(`prices: ${PRICES} not found -- building catalog without prices`);
}

const cards = raw.cardList.map((c) => {
  const { base, variant, id } = parseCardNo(c.card_no);
  const attackText = clean(c.card_attack_text);
  const skillText = clean(c.card_skill_text);
  const flipText = clean(c.card_flip);

  const typeRaw = (clean(c.card_type) || '').toUpperCase();
  const type = TYPE_FIXUPS[typeRaw] || typeRaw;

  const rarityRaw = (clean(c.card_rare) || '').toUpperCase();
  const rarity = rarityRaw.replace(/\s*\(.*\)\s*/, '').trim();

  const gradeRaw = (clean(c.card_grade) || '').toUpperCase();
  const grade = GRADE_FIXUPS[gradeRaw] || gradeRaw;

  const colorRaw = (clean(c.card_color) || '').toUpperCase();
  const color = COLOR_FIXUPS[colorRaw] ?? (colorRaw || null);

  const energy = parseEnergyType(c.card_energy_type);
  const productTitle = normaliseProduct(c.card_product_title);
  const isExtra = String(c.card_is_extra) === '1' || type === 'EXTRA';

  const lookup = (map) => (map ? (map.get(`${base}|${rarity}`) ?? map.get(base) ?? null) : null);
  const hitseekrPrice = prices ? (prices.get(`${base}|${rarity}`) ?? prices.get(base) ?? null) : null;
  const storePrices = {
    // Per the spec OvenBase mirrors HitSeekr until we have our own averages.
    ovenbase: hitseekrPrice === null ? null : { amount: hitseekrPrice, currency: 'PHP' },
    hitseekr: hitseekrPrice === null ? null : { amount: hitseekrPrice, currency: 'PHP' },
    agora: lookup(agora) === null ? null : { amount: lookup(agora), currency: 'SGD' },
    'game-academia': lookup(gameAcademia) === null ? null : { amount: lookup(gameAcademia), currency: 'SGD' },
    tcgplayer: null,
  };

  return {
    id,
    cardNo: base,
    variant,
    name: clean(c.card_name),
    type,
    rarity,
    grade,
    level: parseLevel(c.card_level),
    hp: parseHp(c.card_hp),
    color,
    energyColors: energy.colors,
    energyMix: energy.mix,
    costColors: parseCostColors(attackText),
    damage: parseDamage(attackText),
    keywords: parseKeywords(skillText, attackText, flipText),
    groups: normaliseGroup(c.card_keyword),
    skillName: clean(c.card_skill_name),
    skillText,
    attackText,
    flipText,
    productTitle,
    productIdx: c.category_product_idx ?? null,
    exclusive: deriveExclusive(productTitle, tags[base]),
    artist: clean(c.card_artist_title),
    image: clean(c.card_image),
    isExtra,
    legality: bannedIds.has(base) ? 'banned' : restrictedIds.has(base) ? 'restricted' : 'legal',
    pricePHP: hitseekrPrice,
    prices: storePrices,
    createdAt: c.create_dt ?? null,
    updatedAt: c.update_dt ?? null,
  };
});

/* Mark the preferred printing per base card number (drives "hide duplicates"). */
const byBase = new Map();
for (const c of cards) {
  if (!byBase.has(c.cardNo)) byBase.set(c.cardNo, []);
  byBase.get(c.cardNo).push(c);
}
for (const [, group] of byBase) {
  const rank = (c) => {
    const i = BASE_RARITY_ORDER.indexOf(c.rarity);
    // Prefer a real base rarity; fall back to P only when nothing else exists.
    return i === -1 ? 99 : c.rarity === 'P' ? 50 : i;
  };
  const sorted = [...group].sort((a, b) => rank(a) - rank(b) || (a.variant ?? 0) - (b.variant ?? 0));
  sorted.forEach((c, i) => {
    c.isPreferredPrinting = i === 0;
  });
}

/* ------------------------------------------------------------- the report */

const tally = (fn) => {
  const m = {};
  for (const c of cards) {
    for (const v of [].concat(fn(c) ?? [])) {
      const k = v === null || v === undefined || v === '' ? '(none)' : String(v);
      m[k] = (m[k] || 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
};

const report = {
  generatedAt: new Date().toISOString(),
  totalPrintings: cards.length,
  distinctCardNumbers: byBase.size,
  withPrice: cards.filter((c) => c.pricePHP !== null).length,
  priceCoverage: {
    hitseekr: cards.filter((c) => c.prices.hitseekr).length,
    agora: cards.filter((c) => c.prices.agora).length,
    'game-academia': cards.filter((c) => c.prices['game-academia']).length,
    tcgplayer: cards.filter((c) => c.prices.tcgplayer).length,
  },
  facets: {
    type: tally((c) => c.type),
    rarity: tally((c) => c.rarity),
    level: tally((c) => c.level),
    hp: tally((c) => (c.hp ? (c.hp.plus ? `+${c.hp.value}` : c.hp.value) : null)),
    color: tally((c) => c.color),
    costColor: tally((c) => (c.costColors.length ? c.costColors : null)),
    damage: tally((c) => (c.damage.length ? c.damage : null)),
    keywords: tally((c) => (c.keywords.length ? c.keywords : null)),
    groups: tally((c) => (c.groups.length ? c.groups : null)),
    product: tally((c) => c.productTitle),
    exclusive: tally((c) => (c.exclusive.length ? c.exclusive : null)),
    legality: tally((c) => c.legality),
  },
};

mkdirSync('src/data', { recursive: true });
mkdirSync('data/reports', { recursive: true });
writeFileSync(OUT_CARDS, JSON.stringify(cards));
writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2));

console.log(`\nwrote ${OUT_CARDS}`);
console.log(`  printings          : ${cards.length}`);
console.log(`  distinct card nos  : ${byBase.size}`);
console.log(`  banned / restricted: ${cards.filter((c) => c.legality === 'banned').length} / ${cards.filter((c) => c.legality === 'restricted').length}`);
console.log(`  with a price       : ${report.withPrice}`);
for (const [store, n] of Object.entries(report.priceCoverage)) {
  console.log(`    ${store.padEnd(15)}: ${n}`);
}
console.log(`wrote ${OUT_REPORT}`);
