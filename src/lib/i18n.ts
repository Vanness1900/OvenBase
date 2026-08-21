/**
 * Lightweight i18n. Card text itself stays in English -- the official catalog
 * only publishes English and Traditional Chinese for the ASIA region, so
 * translating card rules text would mean inventing it. Only the OvenBase
 * interface is localised.
 */

export const LOCALES = ["en", "id", "ms", "tl"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",
  tl: "Tagalog",
};

export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  id: "ID",
  ms: "MS",
  tl: "TL",
};

const en = {
  "nav.home": "Home",
  "nav.cards": "Cards",
  "nav.decks": "Decks",
  "nav.products": "Products",
  "nav.stores": "Stores",
  "nav.contact": "Contact",
  "nav.discord": "Join our Discord",

  "home.heroTitle": "Know what your cards are really worth.",
  "home.heroBody":
    "A community price baseline for CookieRun: Braverse singles — averaged across trusted shops, in your own currency.",
  "home.viewCards": "View cards",
  "home.metaTitle": "Meta decks",
  "home.metaBody": "The five lists showing up most across recent events.",
  "home.coffeeTitle": "Treat us a coffee",
  "home.coffeeBody":
    "OvenBase is free and community-run. A small tip keeps the scrapers running and the servers awake.",
  "home.coffeeCta": "Buy us a coffee",
  "home.browseAll": "Browse all decks",

  "cards.title": "Card list",
  "cards.search": "Search cards",
  "cards.searchPlaceholder": "Card name or number…",
  "cards.results": "{n} cards",
  "cards.noResults": "No cards match these filters.",
  "cards.resetFilters": "Reset filters",
  "cards.filters": "Filters",
  "cards.done": "Done",
  "cards.currency": "Currency",
  "cards.store": "Store",
  "cards.sort": "Sort",
  "cards.loadMore": "Load more",

  "sort.default": "Newest",
  "sort.level": "Level",
  "sort.rarity": "Rarity",
  "sort.hp": "HP",
  "sort.damage": "Damage",
  "sort.priceLow": "Price: low to high",
  "sort.priceHigh": "Price: high to low",

  "filter.product": "Product",
  "filter.type": "Card type",
  "filter.color": "Card color",
  "filter.costColor": "Cost color",
  "filter.level": "Level",
  "filter.hp": "HP",
  "filter.damage": "Damage",
  "filter.keywords": "Keywords",
  "filter.rarity": "Rarity",
  "filter.groups": "Groups",
  "filter.exclusive": "Exclusive",
  "filter.priceRange": "Price range",
  "filter.min": "Min",
  "filter.max": "Max",
  "filter.hideDuplicates": "Hide duplicate arts",
  "filter.showRestricted": "Restricted only",
  "filter.showBanned": "Banned only",
  "filter.lockedToCookie": "Only for Cookie, Flip and Extra cards",
  "filter.lockedToExtra": "Only for Extra cards",

  "card.level": "Level",
  "card.hp": "HP",
  "card.type": "Type",
  "card.rarity": "Rarity",
  "card.color": "Color",
  "card.cost": "Attack cost",
  "card.damage": "Damage",
  "card.skill": "Skill",
  "card.attack": "Attack",
  "card.flip": "Flip",
  "card.product": "Product",
  "card.artist": "Artist",
  "card.prices": "Prices",
  "card.priceHistory": "Price history",
  "card.noPriceHistory": "History starts building from the first scrape.",
  "card.banned": "Banned",
  "card.restricted": "Restricted — 1 copy",
  "card.noPrice": "No price yet",

  "decks.title": "Decks",
  "decks.all": "All",
  "decks.featured": "Featured",
  "decks.champion": "Champion",
  "decks.bookmark": "Bookmark",
  "decks.mine": "My deck",
  "decks.create": "Create a deck",
  "decks.searchPlaceholder": "Search decks…",
  "decks.latest": "Latest",
  "decks.mostLiked": "Most liked",
  "decks.mostBookmarked": "Most bookmarked",
  "decks.cards": "{n} cards",
  "decks.illegal": "This deck is illegal",
  "decks.signInPrompt": "Sign in with Google to build and save decks.",
  "decks.empty": "Nothing here yet.",

  "products.title": "Products",
  "stores.title": "Stores",
  "stores.searchPlaceholder": "Search stores…",
  "stores.allCountries": "All countries",
  "contact.title": "Contact",

  "auth.signIn": "Sign in",
  "auth.signInGoogle": "Continue with Google",
  "auth.signOut": "Sign out",

  "common.language": "Language",
  "common.close": "Close",
} as const;

export type MessageKey = keyof typeof en;

/**
 * Non-English dictionaries are partial on purpose: anything missing falls back
 * to English rather than showing a raw key.
 */
const id: Partial<Record<MessageKey, string>> = {
  "nav.home": "Beranda",
  "nav.cards": "Kartu",
  "nav.decks": "Dek",
  "nav.products": "Produk",
  "nav.stores": "Toko",
  "nav.contact": "Kontak",
  "nav.discord": "Gabung Discord kami",
  "home.heroTitle": "Ketahui nilai asli kartumu.",
  "home.heroBody":
    "Acuan harga komunitas untuk kartu satuan CookieRun: Braverse — dirata-ratakan dari toko tepercaya, dalam mata uangmu.",
  "home.viewCards": "Lihat kartu",
  "home.metaTitle": "Dek meta",
  "home.metaBody": "Lima dek yang paling sering muncul di turnamen terbaru.",
  "home.coffeeTitle": "Traktir kami kopi",
  "home.coffeeBody":
    "OvenBase gratis dan dikelola komunitas. Sedikit dukungan membuat server tetap menyala.",
  "home.coffeeCta": "Traktir kopi",
  "home.browseAll": "Lihat semua dek",
  "cards.title": "Daftar kartu",
  "cards.search": "Cari kartu",
  "cards.searchPlaceholder": "Nama atau nomor kartu…",
  "cards.results": "{n} kartu",
  "cards.noResults": "Tidak ada kartu yang cocok.",
  "cards.resetFilters": "Atur ulang filter",
  "cards.filters": "Filter",
  "cards.done": "Selesai",
  "cards.currency": "Mata uang",
  "cards.store": "Toko",
  "cards.sort": "Urutkan",
  "cards.loadMore": "Muat lagi",
  "filter.type": "Tipe kartu",
  "filter.color": "Warna kartu",
  "filter.rarity": "Kelangkaan",
  "filter.priceRange": "Rentang harga",
  "decks.title": "Dek",
  "decks.create": "Buat dek",
  "decks.illegal": "Dek ini tidak legal",
  "products.title": "Produk",
  "stores.title": "Toko",
  "contact.title": "Kontak",
  "auth.signIn": "Masuk",
  "auth.signInGoogle": "Lanjutkan dengan Google",
  "auth.signOut": "Keluar",
  "common.language": "Bahasa",
};

const ms: Partial<Record<MessageKey, string>> = {
  "nav.home": "Utama",
  "nav.cards": "Kad",
  "nav.decks": "Dek",
  "nav.products": "Produk",
  "nav.stores": "Kedai",
  "nav.contact": "Hubungi",
  "nav.discord": "Sertai Discord kami",
  "home.heroTitle": "Ketahui nilai sebenar kad anda.",
  "home.heroBody":
    "Rujukan harga komuniti untuk kad tunggal CookieRun: Braverse — purata daripada kedai dipercayai, dalam mata wang anda.",
  "home.viewCards": "Lihat kad",
  "home.metaTitle": "Dek meta",
  "home.metaBody": "Lima dek yang paling kerap muncul dalam pertandingan terkini.",
  "home.coffeeTitle": "Belanja kami kopi",
  "home.coffeeBody":
    "OvenBase percuma dan dikendalikan komuniti. Sumbangan kecil memastikan pelayan terus hidup.",
  "home.coffeeCta": "Belanja kopi",
  "home.browseAll": "Lihat semua dek",
  "cards.title": "Senarai kad",
  "cards.search": "Cari kad",
  "cards.searchPlaceholder": "Nama atau nombor kad…",
  "cards.results": "{n} kad",
  "cards.noResults": "Tiada kad yang sepadan.",
  "cards.resetFilters": "Set semula penapis",
  "cards.filters": "Penapis",
  "cards.done": "Selesai",
  "cards.currency": "Mata wang",
  "cards.store": "Kedai",
  "cards.sort": "Susun",
  "cards.loadMore": "Muat lagi",
  "filter.type": "Jenis kad",
  "filter.color": "Warna kad",
  "filter.rarity": "Kejarangan",
  "filter.priceRange": "Julat harga",
  "decks.title": "Dek",
  "decks.create": "Cipta dek",
  "decks.illegal": "Dek ini tidak sah",
  "products.title": "Produk",
  "stores.title": "Kedai",
  "contact.title": "Hubungi",
  "auth.signIn": "Log masuk",
  "auth.signInGoogle": "Teruskan dengan Google",
  "auth.signOut": "Log keluar",
  "common.language": "Bahasa",
};

const tl: Partial<Record<MessageKey, string>> = {
  "nav.home": "Home",
  "nav.cards": "Mga Card",
  "nav.decks": "Mga Deck",
  "nav.products": "Mga Produkto",
  "nav.stores": "Mga Tindahan",
  "nav.contact": "Kontak",
  "nav.discord": "Sumali sa Discord namin",
  "home.heroTitle": "Alamin ang tunay na halaga ng iyong mga card.",
  "home.heroBody":
    "Batayang presyo mula sa komunidad para sa CookieRun: Braverse singles — average ng mga mapagkakatiwalaang tindahan, nasa sarili mong pera.",
  "home.viewCards": "Tingnan ang mga card",
  "home.metaTitle": "Meta decks",
  "home.metaBody": "Ang limang deck na pinakamadalas makita sa mga kamakailang event.",
  "home.coffeeTitle": "Ilibre kami ng kape",
  "home.coffeeBody":
    "Libre at pinapatakbo ng komunidad ang OvenBase. Malaking tulong ang kahit maliit na donasyon.",
  "home.coffeeCta": "Ilibre kami ng kape",
  "home.browseAll": "Tingnan lahat ng deck",
  "cards.title": "Listahan ng card",
  "cards.search": "Maghanap ng card",
  "cards.searchPlaceholder": "Pangalan o numero ng card…",
  "cards.results": "{n} card",
  "cards.noResults": "Walang card na tumugma.",
  "cards.resetFilters": "I-reset ang filter",
  "cards.filters": "Mga filter",
  "cards.done": "Tapos",
  "cards.currency": "Pera",
  "cards.store": "Tindahan",
  "cards.sort": "Ayusin",
  "cards.loadMore": "Magpakita pa",
  "filter.type": "Uri ng card",
  "filter.color": "Kulay ng card",
  "filter.rarity": "Rarity",
  "filter.priceRange": "Saklaw ng presyo",
  "decks.title": "Mga Deck",
  "decks.create": "Gumawa ng deck",
  "decks.illegal": "Illegal ang deck na ito",
  "products.title": "Mga Produkto",
  "stores.title": "Mga Tindahan",
  "contact.title": "Kontak",
  "auth.signIn": "Mag-sign in",
  "auth.signInGoogle": "Magpatuloy gamit ang Google",
  "auth.signOut": "Mag-sign out",
  "common.language": "Wika",
};

const DICTS: Record<Locale, Partial<Record<MessageKey, string>>> = { en, id, ms, tl };

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = DICTS[locale]?.[key] ?? en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
