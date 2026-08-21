import type { Card, CardType } from "./types";

export type SortKey = "default" | "level" | "rarity" | "hp" | "damage" | "priceLow" | "priceHigh";

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
  keywords: string[];
  rarities: string[];
  groups: string[];
  exclusive: string[];
  priceMin: number | null;
  priceMax: number | null;
  hideDuplicates: boolean;
  restrictedOnly: boolean;
  bannedOnly: boolean;
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
  keywords: [],
  rarities: [],
  groups: [],
  exclusive: [],
  priceMin: null,
  priceMax: null,
  hideDuplicates: false,
  restrictedOnly: false,
  bannedOnly: false,
  sort: "default",
};

/* --------------------------------------------------- facet option ordering */

/** Spec order, not data order -- these are the labels players expect. */
export const TYPE_OPTIONS: CardType[] = ["COOKIE", "FLIP", "ITEM", "TRAP", "STAGE", "EXTRA"];
export const COLOR_OPTIONS = ["RED", "YELLOW", "GREEN", "BLUE", "PURPLE", "BLACK", "PURE"];
export const COST_COLOR_OPTIONS = ["RED", "YELLOW", "GREEN", "BLUE", "PURPLE", "BLACK", "COLORLESS"];
export const LEVEL_OPTIONS = [1, 2, 3, 5];
export const HP_OPTIONS = [1, 2, 3, 4, 5, 6];
export const HP_PLUS_OPTIONS = [1, 2];
export const DAMAGE_OPTIONS = [1, 2, 3, 4, 5, 7];
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

export function hpPlusEnabled(types: CardType[]): boolean {
  if (types.length === 0) return true;
  return types.includes("EXTRA");
}

/* ------------------------------------------------------------- the filter */

export function filterCards(cards: Card[], f: CardFilters): Card[] {
  const q = f.search.trim().toLowerCase();
  const levelHpOn = levelHpEnabled(f.types);
  const hpPlusOn = hpPlusEnabled(f.types);

  let out = cards.filter((c) => {
    if (f.hideDuplicates && !c.isPreferredPrinting) return false;

    if (f.bannedOnly && c.legality !== "banned") return false;
    if (f.restrictedOnly && c.legality !== "restricted") return false;

    if (q) {
      const hay = `${c.name ?? ""} ${c.id} ${c.cardNo} ${c.skillName ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

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

    if (f.damage.length && !f.damage.some((d) => c.damage.includes(d))) return false;

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
    case "default":
    default:
      // Newest first: the catalog's own creation date, then card number.
      return arr.sort(
        (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || b.cardNo.localeCompare(a.cardNo),
      );
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
  n += f.keywords.length ? 1 : 0;
  n += f.rarities.length ? 1 : 0;
  n += f.groups.length ? 1 : 0;
  n += f.exclusive.length ? 1 : 0;
  if (f.priceMin !== null || f.priceMax !== null) n++;
  if (f.hideDuplicates) n++;
  if (f.restrictedOnly) n++;
  if (f.bannedOnly) n++;
  return n;
}
