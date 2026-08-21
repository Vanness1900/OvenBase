/** Shapes shared across OvenBase. Card records are produced by scripts/build-cards.mjs. */

export type CardType = "COOKIE" | "FLIP" | "ITEM" | "TRAP" | "STAGE" | "EXTRA" | "NPC";

export type Rarity = "C" | "U" | "R" | "SEC" | "SR" | "SSR" | "UR" | "SUR" | "EXR" | "GXR" | "P";

export type CardColor = "RED" | "YELLOW" | "GREEN" | "BLUE" | "PURPLE" | "PURE" | "BLACK";

/** The colourless {N} cost is called "Pure" in Braverse. */
export type CostColor = CardColor;

export type Legality = "legal" | "restricted" | "banned";

export interface CardHp {
  value: number;
  /** EXTRA cards show "+N" -- an HP modifier rather than an absolute value. */
  plus: boolean;
}

export interface Card {
  /** Unique printing, e.g. "BS10-024@2". */
  id: string;
  /** Base card number shared by every printing, e.g. "BS10-024". Deck rules key off this. */
  cardNo: string;
  /** Position in the official catalog file; reproduces the official default sort. */
  sourceIndex: number;
  variant: number | null;
  name: string | null;
  type: CardType;
  rarity: Rarity | string;
  grade: string;
  level: number | null;
  hp: CardHp | null;
  color: CardColor | null;
  energyColors: string[];
  energyMix: boolean;
  costColors: CostColor[];
  /** Damage printed on an attack ({da} N). */
  damage: number[];
  /** Damage dealt by effects, including HP moved to trash or bottom of deck. */
  effectDamage: number[];
  /** Healing granted, shown as +N. */
  heal: number[];
  /** Attack-damage reduction, shown as -N. Mostly Traps. */
  damageReduction: number[];
  keywords: string[];
  groups: string[];
  skillName: string | null;
  skillText: string | null;
  attackText: string | null;
  flipText: string | null;
  productTitle: string | null;
  productIdx: number | null;
  exclusive: string[];
  artist: string | null;
  image: string | null;
  isExtra: boolean;
  legality: Legality;
  /** OvenBase's baseline in PHP (currently mirrors HitSeekr) -- drives sorting
   *  and the price-range filter, which need one comparable number. */
  pricePHP: number | null;
  /** Per-store quotes in each store's own currency. */
  prices: Record<StoreId, StorePrice | null>;
  createdAt: string | null;
  updatedAt: string | null;
  /** True for the printing we show when "hide duplicates" is on. */
  isPreferredPrinting?: boolean;
}

/* --------------------------------------------------------------- currency */

export type CurrencyCode = "SGD" | "PHP" | "IDR" | "MYR";

export interface CurrencyMeta {
  code: CurrencyCode;
  /** What the dropdown shows -- the spec calls PHP "PESO". */
  label: string;
  symbol: string;
  /** Digits after the decimal point; IDR is conventionally shown whole. */
  decimals: number;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "SGD", label: "SGD", symbol: "S$", decimals: 2 },
  { code: "PHP", label: "PESO", symbol: "₱", decimals: 2 },
  { code: "IDR", label: "IDR", symbol: "Rp", decimals: 0 },
  { code: "MYR", label: "MYR", symbol: "RM", decimals: 2 },
];

/** Country -> default currency, used for the geo-based initial pick. */
export const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  SG: "SGD",
  PH: "PHP",
  ID: "IDR",
  MY: "MYR",
};

/* ------------------------------------------------------------------ store */

export type StoreId = "ovenbase" | "hitseekr" | "agora" | "game-academia" | "tcgplayer";

export interface StoreMeta {
  id: StoreId;
  label: string;
  /** Currency the store natively quotes in. */
  currency: CurrencyCode | "USD";
  site: string;
}

export const STORES: StoreMeta[] = [
  { id: "ovenbase", label: "OvenBase", currency: "PHP", site: "" },
  { id: "hitseekr", label: "HitSeekr", currency: "PHP", site: "https://hitseekr.com" },
  { id: "agora", label: "Agora Hobby", currency: "SGD", site: "https://agorahobby.com" },
  { id: "game-academia", label: "Game Academia", currency: "SGD", site: "https://game-academia.myshopify.com" },
  { id: "tcgplayer", label: "TCGplayer", currency: "USD", site: "https://www.tcgplayer.com" },
];

/** One observed price for a card at a store, in that store's native currency. */
export interface StorePrice {
  amount: number;
  currency: CurrencyCode | "USD";
}

export interface PricePoint {
  store: StoreId;
  currency: CurrencyCode | "USD";
  amount: number;
  observedAt: string;
}

export interface PriceHistoryEntry {
  date: string;
  amount: number;
}

/* ------------------------------------------------------------------ decks */

export interface DeckEntry {
  /** Base card number -- the 4-copy rule counts printings together. */
  cardNo: string;
  /** Specific printing the builder picked, for art in the preview. */
  printingId: string;
  count: number;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  authorName: string;
  authorId: string | null;
  visibility: "private" | "public";
  main: DeckEntry[];
  extra: DeckEntry[];
  likes: number;
  bookmarks: number;
  updatedAt: string;
  /** "featured" and "champion" are curated; "community" is user-made. */
  shelf: "community" | "featured" | "champion";
  coverCardId?: string | null;
}

export interface DeckLegality {
  legal: boolean;
  problems: string[];
  mainCount: number;
  extraCount: number;
}

export const MAIN_DECK_SIZE = 60;
export const EXTRA_DECK_MAX = 6;
export const MAX_COPIES = 4;
