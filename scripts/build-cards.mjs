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

const COST_SYMBOLS = { R: 'RED', Y: 'YELLOW', G: 'GREEN', B: 'BLUE', P: 'PURPLE', K: 'BLACK', N: 'PURE' };

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
  const value = Number(norm.replace(/[^\d]/g, ''));
  // An absolute 0 HP is meaningless, so a bare "0" is an awakening that grants
  // no extra HP -- printed as "+0" on the card (e.g. BS9-088 Pure Vanilla).
  const plus = PLUS_SIGNS.some((p) => norm.startsWith(p)) || value === 0;
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

/**
 * Older sets write keywords as icon tokens instead of 【brackets】, so a purely
 * bracket-based reader misses them entirely -- searching "Blocker" found the 20
 * modern printings and none of the 19 older ones.
 *
 * No card in the catalog uses both forms for the same keyword (verified across
 * all 2,093 printings), which is what confirms these are the same thing drawn
 * two ways rather than distinct mechanics.
 */
const TOKEN_KEYWORDS = {
  ap: 'On Play',
  mob: 'Activate',
  t1: 'Once Per Turn',
  bl: 'Blocker',
  mou: 'Equip',
  mt: 'Your Turn',
};

/** Keywords come from 【 】 brackets plus the old-set icon tokens. */
function parseKeywords(...texts) {
  const out = new Set();
  for (const t of texts) {
    if (!t) continue;
    for (const m of t.matchAll(/【([^】]+)】/g)) {
      const k = m[1].trim();
      // Skip the CJK duplicates the asia dump leaves behind.
      if (/^[\x20-\x7E'’:.\- ]+$/.test(k)) out.add(k);
    }
    for (const [token, label] of Object.entries(TOKEN_KEYWORDS)) {
      if (t.includes(`{${token}}`)) out.add(label);
    }
  }
  return [...out];
}

/**
 * Cost blocks are payments, not output, so they're stripped before reading
 * effect values -- "<Place 1 card from the top of your Cookie's HP...>" is a
 * price you pay, and counting it as damage dealt would be wrong. 53 of the 125
 * HP-removal phrases in the catalog sit inside a cost block.
 */
const stripCosts = (t) => String(t ?? '').replace(/<[^>]*>/g, ' ').replace(/《[^》]*》/g, ' ');

/**
 * Damage a card deals through effects rather than attacking, including the two
 * forms that reduce HP without the word "damage": moving cards off the top of a
 * Cookie's HP into the trash, or onto the bottom of the deck. Both cost the
 * defender HP just as a hit would.
 */
function parseEffectDamage(...texts) {
  const body = texts.map(stripCosts).join(' ');
  const out = new Set();
  const add = (v) => {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out.add(n);
  };

  for (const m of body.matchAll(/receives?\s+(\d+)\s+damage/gi)) add(m[1]);
  for (const m of body.matchAll(/deals?\s+(\d+)\s+damage/gi)) add(m[1]);
  for (const m of body.matchAll(/(\d+)\s+cards?\s+from the top of[^.]{0,70}?HP/gi)) add(m[1]);

  return [...out].sort((a, b) => a - b);
}

/** Healing, shown as +N. */
function parseHeal(...texts) {
  const body = texts.map(stripCosts).join(' ');
  const out = new Set();
  for (const m of body.matchAll(/gains?\s+\+(\d+)\s*HP/gi)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** Attack-damage reduction, shown as -N. Overwhelmingly a Trap effect. */
function parseDamageReduction(...texts) {
  const body = texts.map(stripCosts).join(' ');
  const out = new Set();
  for (const m of body.matchAll(/[-−]\s*(\d+)\s+attack damage/gi)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
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

/**
 * Indexes one store's feed.
 *
 * Two separate maps, and the split matters: `byRarity` holds listings the store
 * labelled with a rarity, `byCardNo` only holds listings with NO rarity at all.
 *
 * Collapsing them lets a store's UR price leak onto a promo printing it never
 * stocked -- Agora lists Longan Dragon Fruit Cookie as SUR and UR only, so the
 * P promos were inheriting the UR price and inventing a listing that does not
 * exist. A rarity-labelled row must now match a rarity exactly.
 */
const KNOWN_RARITIES = new Set(['C', 'U', 'R', 'SEC', 'SR', 'SSR', 'UR', 'SUR', 'EXR', 'GXR', 'P']);

/**
 * Recovers a rarity from a store's image filename.
 *
 * The scrapers anchor on "<cardNo>_<RARITY>", which fails whenever the shop
 * files a card slightly differently -- HitSeekr has "ST2_020_U_watermark.png"
 * (underscores, not hyphens) and "BS4_056_P_watermark.png" (Longan filed under
 * the wrong set number). Those failures made the rarity null, and a null rarity
 * used to spray one listing's price across every printing of the card.
 *
 * Reading the filename independently of the card number recovers both.
 */
function rarityFromImage(image) {
  if (!image) return '';
  const file = decodeURIComponent(String(image).split('/').pop() ?? '')
    .toUpperCase()
    .replace(/_/g, '-');
  // Drop the leading card-number so its own letters can't be read as a rarity
  // ("P-036-P-ENG" must yield P from the second field, not the first).
  const body = file.replace(/^[A-Z]+\d*-\d+/, '');
  for (const m of body.matchAll(/[-.]([A-Z]{1,3})(?=[-._])/g)) {
    if (KNOWN_RARITIES.has(m[1])) return m[1];
  }
  return '';
}

function loadStore(path, currency, amountKey) {
  if (!existsSync(path)) {
    console.log(`prices: ${path} not found -- skipping`);
    return null;
  }
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const byRarity = new Map();
  const byCardNo = new Map();
  let recovered = 0;

  for (const row of data.rows ?? []) {
    const amount = row[amountKey];
    if (!row.cardNo || amount === null || amount === undefined) continue;
    const { base } = parseCardNo(row.cardNo);
    let rarity = row.rarity ? String(row.rarity).toUpperCase().trim() : '';
    if (!KNOWN_RARITIES.has(rarity)) {
      const fromImage = rarityFromImage(row.image);
      if (fromImage) {
        rarity = fromImage;
        recovered++;
      } else if (!rarity) {
        rarity = '';
      }
    }

    // Cheapest listing wins -- Agora lists the same card in several conditions.
    const put = (map, k) => {
      const prev = map.get(k);
      if (prev === undefined || amount < prev) map.set(k, amount);
    };

    if (rarity) put(byRarity, `${base}|${rarity}`);
    else put(byCardNo, base);
  }

  console.log(
    `prices: ${path} -> ${byRarity.size} rarity keys + ${byCardNo.size} unlabelled` +
      ` (${recovered} rarities recovered from filenames, ${currency})`,
  );
  return { byRarity, byCardNo };
}

/**
 * Exact rarity match wins. A listing the store left unlabelled is attributed to
 * the base printing only -- it represents one specific listing, and without a
 * rarity there's nothing to justify copying it onto every alternate art.
 */
function storeLookup(index, base, rarity, isPreferred) {
  if (!index) return null;
  const exact = index.byRarity.get(`${base}|${rarity}`);
  if (exact !== undefined) return exact;
  if (isPreferred) return index.byCardNo.get(base) ?? null;
  return null;
}

const agora = loadStore(PRICES_AGORA, 'SGD', 'priceSGD');
const gameAcademia = loadStore(PRICES_GA, 'SGD', 'priceSGD');

let tags = {};
if (existsSync(TAGS)) {
  tags = JSON.parse(readFileSync(TAGS, 'utf8')).tags ?? {};
  console.log(`tags: ${Object.keys(tags).length} cards tagged from HitSeekr`);
}

// HitSeekr goes through the same two-map treatment as the other stores.
const prices = loadStore(PRICES, 'PHP', 'pricePHP');
if (!prices) {
  console.log(`prices: ${PRICES} not found -- building catalog without prices`);
}

const cards = raw.cardList.map((c, sourceIndex) => {
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

  // Prices are filled in by a second pass, once we know which printing of each
  // card number is the base one.
  return {
    id,
    /**
     * Position in the official catalog file. That array order IS the official
     * site's default sort -- newest set first, card number ascending, and the
     * alternate art listed before its base printing. The last part can't be
     * re-derived by sorting on any field, so we carry the index through.
     */
    sourceIndex,
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
    effectDamage: parseEffectDamage(skillText, attackText, flipText),
    heal: parseHeal(skillText, attackText, flipText),
    damageReduction: parseDamageReduction(skillText, attackText, flipText),
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
    pricePHP: null,
    prices: null,
    createdAt: c.create_dt ?? null,
    updatedAt: c.update_dt ?? null,
  };
});

/*
 * The official catalog lists Wind Archer Cookie's promo variants twice -- once
 * with an underscore (BS2_058@2) and again with a hyphen (BS2-058@2). Both
 * normalise to the same printing, so keep the first occurrence and drop the
 * repeat; otherwise the same card renders twice and collides on its key.
 */
const seenIds = new Set();
const deduped = [];
const droppedDuplicates = [];
for (const c of cards) {
  if (seenIds.has(c.id)) {
    droppedDuplicates.push(c.id);
    continue;
  }
  seenIds.add(c.id);
  deduped.push(c);
}
if (droppedDuplicates.length) {
  console.log(`deduped ${droppedDuplicates.length} repeated printing(s): ${droppedDuplicates.join(', ')}`);
}
cards.length = 0;
cards.push(...deduped);

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

/* ---------------------------------------------------------- catalog fixups */

/*
 * The official catalog gets a few cards plainly wrong, and the filters inherit
 * every mistake. These are all of them, verified individually:
 *
 *  - P-036@1 GingerBrave is typed TRAP but has LEVEL 3, HP 5 and a colour, and
 *    the printed card reads "LEVEL 3 GingerBrave HP 5". It showed up under
 *    "Red + Trap", which is what surfaced it.
 *  - BS6-028/029/030 are typed NPC. "TBD" is the in-universe company name, not
 *    a placeholder; they have level, HP and colour, so they're Cookies.
 *
 * The rule is stated as a property rather than a hardcoded id list: carrying a
 * level AND HP is what makes something a Cookie, so a future mistyped card is
 * caught without another patch.
 */
let retyped = 0;
for (const c of cards) {
  if (c.level !== null && c.hp !== null && !['COOKIE', 'FLIP', 'EXTRA'].includes(c.type)) {
    console.log(`  retyped ${c.id} ${c.type} -> COOKIE (has LV.${c.level} / HP ${c.hp.value})`);
    c.type = 'COOKIE';
    retyped++;
  }
}
if (retyped) console.log(`fixups: retyped ${retyped} mislabelled card(s) as COOKIE`);

/*
 * A printing occasionally drops a stat its siblings have (BS2-061@1 has HP but
 * no level). Backfill from another printing of the same card number.
 */
let backfilled = 0;
for (const [, group] of byBase) {
  const withLevel = group.find((c) => c.level !== null);
  const withHp = group.find((c) => c.hp !== null);
  for (const c of group) {
    if (c.level === null && withLevel && ['COOKIE', 'FLIP', 'EXTRA'].includes(c.type)) {
      c.level = withLevel.level;
      backfilled++;
    }
    if (c.hp === null && withHp && ['COOKIE', 'FLIP', 'EXTRA'].includes(c.type)) {
      c.hp = withHp.hp;
      backfilled++;
    }
  }
}
if (backfilled) console.log(`fixups: backfilled ${backfilled} missing stat(s) from sibling printings`);

/* ------------------------------------------------------------- price pass */

for (const c of cards) {
  const preferred = Boolean(c.isPreferredPrinting);
  const hitseekrPrice = storeLookup(prices, c.cardNo, c.rarity, preferred);
  const agoraPrice = storeLookup(agora, c.cardNo, c.rarity, preferred);
  const gaPrice = storeLookup(gameAcademia, c.cardNo, c.rarity, preferred);
  const quote = (amount, currency) => (amount === null ? null : { amount, currency });

  c.pricePHP = hitseekrPrice;
  c.prices = {
    // Per the spec OvenBase mirrors HitSeekr until we have our own averages.
    ovenbase: quote(hitseekrPrice, 'PHP'),
    hitseekr: quote(hitseekrPrice, 'PHP'),
    agora: quote(agoraPrice, 'SGD'),
    'game-academia': quote(gaPrice, 'SGD'),
    tcgplayer: null,
  };
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
