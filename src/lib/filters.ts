import type { Card, CardType } from "./types";

export type SortKey =
  | "default"
  | "newest"
  | "level"
  | "rarity"
  | "hp"
  | "damage"
  | "priceLow"
  | "priceHigh";

export interface CardFilters {
  search: string;
  products: string[];
  types: CardType[];
  colors: string[];
  costColors: string[];
  levels: number[];
  /** Plain HP values, e.g. 3. */
  hp: number[];
  /** EXTRA-only "+N" HP modifiers, e.g. 2 for "+2". */
  hpPlus: number[];
  damage: number[];
  effectDamage: number[];
  heal: number[];
  damageReduction: number[];
  keywords: string[];
  rarities: string[];
  groups: string[];
  exclusive: string[];
  priceMin: number | null;
  priceMax: number | null;
  hideDuplicates: boolean;
  /** When off, restricted cards are hidden from results. On by default. */
  showRestricted: boolean;
  /** When off, banned cards are hidden from results. On by default. */
  showBanned: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: CardFilters = {
  search: "",
  products: [],
  types: [],
  colors: [],
  costColors: [],
  levels: [],
  hp: [],
  hpPlus: [],
  damage: [],
  effectDamage: [],
  heal: [],
  damageReduction: [],
  keywords: [],
  rarities: [],
  groups: [],
  exclusive: [],
  priceMin: null,
  priceMax: null,
  hideDuplicates: false,
  showRestricted: true,
  showBanned: true,
  sort: "default",
};

/* --------------------------------------------------- facet option ordering */

/** Spec order, not data order -- these are the labels players expect. */
export const TYPE_OPTIONS: CardType[] = ["COOKIE", "FLIP", "ITEM", "TRAP", "STAGE", "EXTRA"];
export const COLOR_OPTIONS = ["RED", "YELLOW", "GREEN", "BLUE", "PURPLE", "BLACK", "PURE"];
export const COST_COLOR_OPTIONS = ["RED", "YELLOW", "GREEN", "BLUE", "PURPLE", "BLACK", "PURE"];
export const LEVEL_OPTIONS = [1, 2, 3, 5];
export const HP_OPTIONS = [1, 2, 3, 4, 5, 6];
export const HP_PLUS_OPTIONS = [0, 1, 2];
export const DAMAGE_OPTIONS = [1, 2, 3, 4, 5, 7];
export const EFFECT_DAMAGE_OPTIONS = [1, 2, 3, 4];
export const HEAL_OPTIONS = [1, 2, 3];
export const REDUCTION_OPTIONS = [1, 2, 3, 4];
export const KEYWORD_OPTIONS = [
  "Skill",
  "Blocker",
  "On Play",
  "Activate",
  "Once Per Turn",
  "Your Turn",
  "Equip",
  "Awaken",
  "Special Play",
];
export const RARITY_OPTIONS = ["C", "U", "R", "SEC", "SR", "SSR", "UR", "SUR", "EXR", "GXR", "P"];
export const GROUP_OPTIONS = ["ANCIENT", "BEAST", "DRAGON", "ARENA"];
/**
 * Spec order. "Cookie Party" is listed but permanently disabled: neither the
 * official catalog nor HitSeekr's taxonomy records it, so there is nothing to
 * filter on. Showing it greyed out is honest; silently dropping it is not.
 */
export const EXCLUSIVE_OPTIONS = [
  { key: "serial", label: "Serial" },
  { key: "brave-league", label: "Brave League" },
  { key: "cookie-party", label: "Cookie Party", unavailable: true },
  { key: "anniversary", label: "Anniversary" },
  { key: "champion-cup", label: "Champion Cup" },
  { key: "stage-prize", label: "Stage Prize" },
];

/** Rarity ordering for the "rarity" sort -- least to most scarce. */
const RARITY_RANK: Record<string, number> = Object.fromEntries(
  ["C", "U", "R", "SR", "SSR", "SEC", "UR", "SUR", "EXR", "GXR", "P"].map((r, i) => [r, i]),
);

/**
 * Level and HP only exist on Cookie / Flip / Extra cards, so those two facets
 * grey out unless the type selection can still include one of them. The "+N"
 * HP band is Extra-only.
 */
const STATTED_TYPES: CardType[] = ["COOKIE", "FLIP", "EXTRA"];

export function levelHpEnabled(types: CardType[]): boolean {
  if (types.length === 0) return true;
  return types.some((t) => STATTED_TYPES.includes(t));
}

/**
 * Only Cookies, Flips and Extras attack, so the attack-damage band greys out
 * when the selection is limited to Trap / Item / Stage.
 *
 * Keywords deliberately never grey out: Equip appears only on Items, and
 * Activate is common on Stages, so disabling them would hide real matches.
 */
export function attackDamageEnabled(types: CardType[]): boolean {
  if (types.length === 0) return true;
  return types.some((t) => STATTED_TYPES.includes(t));
}

export function hpPlusEnabled(types: CardType[]): boolean {
  if (types.length === 0) return true;
  return types.includes("EXTRA");
}

/* ------------------------------------------------------------- the filter */

/**
 * Everything a search should look at: name, numbers, and the full rules text
 * including keywords, so typing "equip" finds every card with 【Equip】 rather
 * than only cards with "equip" in their name.
 *
 * The blob is built once per card and cached -- recomputing it for 2,000 cards
 * on every keystroke would be wasteful, and the cards array never mutates.
 */
const searchCache = new Map<string, string>();

function searchBlob(c: Card): string {
  const hit = searchCache.get(c.id);
  if (hit !== undefined) return hit;

  const blob = [
    c.name,
    c.id,
    c.cardNo,
    c.type,
    c.rarity,
    c.skillName,
    c.skillText,
    c.attackText,
    c.flipText,
    c.keywords.join(" "),
    c.groups.join(" "),
    c.productTitle,
  ]
    .filter(Boolean)
    .join(" ")
    // Strip the cost/icon tokens ({R}, {da}, {sk}) so their letters can't
    // produce phantom matches, but keep the words inside 【 】.
    .replace(/\{[A-Za-z]+\}/g, " ")
    .replace(/[【】<>]/g, " ")
    .toLowerCase();

  searchCache.set(c.id, blob);
  return blob;
}

export function filterCards(cards: Card[], f: CardFilters): Card[] {
  const q = f.search.trim().toLowerCase();
  const levelHpOn = levelHpEnabled(f.types);
  const hpPlusOn = hpPlusEnabled(f.types);
  const attackDamageOn = attackDamageEnabled(f.types);

  let out = cards.filter((c) => {
    if (f.hideDuplicates && !c.isPreferredPrinting) return false;

    if (!f.showBanned && c.legality === "banned") return false;
    if (!f.showRestricted && c.legality === "restricted") return false;

    if (q && !searchBlob(c).includes(q)) return false;

    if (f.products.length && (!c.productTitle || !f.products.includes(c.productTitle))) return false;
    if (f.types.length && !f.types.includes(c.type)) return false;
    if (f.colors.length && (!c.color || !f.colors.includes(c.color))) return false;
    if (f.costColors.length && !f.costColors.some((x) => c.costColors.includes(x as never))) return false;

    if (levelHpOn && f.levels.length && (c.level === null || !f.levels.includes(c.level))) return false;

    if (levelHpOn && f.hp.length) {
      if (!c.hp || c.hp.plus || !f.hp.includes(c.hp.value)) return false;
    }
    if (hpPlusOn && f.hpPlus.length) {
      if (!c.hp || !c.hp.plus || !f.hpPlus.includes(c.hp.value)) return false;
    }

    if (attackDamageOn && f.damage.length && !f.damage.some((d) => c.damage.includes(d))) return false;
    if (f.effectDamage.length && !f.effectDamage.some((d) => c.effectDamage.includes(d))) return false;
    if (f.heal.length && !f.heal.some((d) => c.heal.includes(d))) return false;
    if (f.damageReduction.length && !f.damageReduction.some((d) => c.damageReduction.includes(d)))
      return false;

    if (f.keywords.length) {
      const lower = c.keywords.map((k) => k.toLowerCase());
      if (!f.keywords.some((k) => lower.includes(k.toLowerCase()))) return false;
    }

    if (f.rarities.length && !f.rarities.includes(c.rarity)) return false;
    if (f.groups.length && !f.groups.some((g) => c.groups.includes(g))) return false;
    if (f.exclusive.length && !f.exclusive.some((e) => c.exclusive.includes(e))) return false;

    if (f.priceMin !== null || f.priceMax !== null) {
      if (c.pricePHP === null) return false;
      if (f.priceMin !== null && c.pricePHP < f.priceMin) return false;
      if (f.priceMax !== null && c.pricePHP > f.priceMax) return false;
    }

    return true;
  });

  out = sortCards(out, f.sort);
  return out;
}

function sortCards(cards: Card[], sort: SortKey): Card[] {
  const arr = [...cards];
  const nullsLast = (v: number | null) => (v === null ? Number.POSITIVE_INFINITY : v);

  switch (sort) {
    case "level":
      return arr.sort((a, b) => nullsLast(a.level) - nullsLast(b.level) || a.cardNo.localeCompare(b.cardNo));
    case "rarity":
      return arr.sort(
        (a, b) => (RARITY_RANK[a.rarity] ?? 99) - (RARITY_RANK[b.rarity] ?? 99) || a.cardNo.localeCompare(b.cardNo),
      );
    case "hp":
      return arr.sort(
        (a, b) => nullsLast(a.hp?.value ?? null) - nullsLast(b.hp?.value ?? null) || a.cardNo.localeCompare(b.cardNo),
      );
    case "damage":
      return arr.sort((a, b) => {
        const am = a.damage.length ? Math.max(...a.damage) : null;
        const bm = b.damage.length ? Math.max(...b.damage) : null;
        return nullsLast(am) - nullsLast(bm) || a.cardNo.localeCompare(b.cardNo);
      });
    case "priceLow":
      return arr.sort((a, b) => nullsLast(a.pricePHP) - nullsLast(b.pricePHP));
    case "priceHigh":
      return arr.sort((a, b) => (b.pricePHP ?? -1) - (a.pricePHP ?? -1));
    case "newest":
      // When the card was added to the catalog, most recent first.
      return arr.sort(
        (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || b.cardNo.localeCompare(a.cardNo),
      );
    case "default":
    default:
      // The official site's own ordering, preserved as the source array index.
      return arr.sort((a, b) => a.sourceIndex - b.sourceIndex);
  }
}

export function countActive(f: CardFilters): number {
  let n = 0;
  if (f.search.trim()) n++;
  n += f.products.length ? 1 : 0;
  n += f.types.length ? 1 : 0;
  n += f.colors.length ? 1 : 0;
  n += f.costColors.length ? 1 : 0;
  n += f.levels.length ? 1 : 0;
  n += f.hp.length ? 1 : 0;
  n += f.hpPlus.length ? 1 : 0;
  n += f.damage.length ? 1 : 0;
  n += f.effectDamage.length ? 1 : 0;
  n += f.heal.length ? 1 : 0;
  n += f.damageReduction.length ? 1 : 0;
  n += f.keywords.length ? 1 : 0;
  n += f.rarities.length ? 1 : 0;
  n += f.groups.length ? 1 : 0;
  n += f.exclusive.length ? 1 : 0;
  if (f.priceMin !== null || f.priceMax !== null) n++;
  if (f.hideDuplicates) n++;
  // These default to on, so only a switched-off toggle counts as a filter.
  if (!f.showRestricted) n++;
  if (!f.showBanned) n++;
  return n;
}
