# OvenBase

A fan-made price database for **CookieRun: Braverse**, the CookieRun TCG.

The problem it solves: Braverse pulls in a lot of collectors and mobile-game
players who have no feel for what singles are worth, and the one site people
reference (HitSeekr) only quotes Philippine pesos. OvenBase gives a community
price baseline in **SGD, PHP, IDR and MYR**, alongside a full card database and
a deck builder.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. `Ctrl+C` stops the server.

On Windows you can also just **double-click `start-dev.bat`** — it installs
dependencies on first run, puts Node on the PATH itself (handy if your terminal
was open before Node was installed), and leaves a window you can `Ctrl+C`.

Requires Node 20+ (developed on 24.19).

## Data pipeline

Card data comes from the official site; prices are scraped. Everything lands in
`src/data/*.json`, which the app imports directly — there's no database yet.

```bash
npm run data:all
```

| Script | What it does |
| --- | --- |
| `npm run scrape:hitseekr` | ~1,900 singles prices (PHP), 161 server-rendered pages |
| `npm run scrape:tags` | HitSeekr's `card-type-2` taxonomy — the only source for the Exclusive facet |
| `npm run scrape:agora` | ~1,400 prices (SGD) from Agora Hobby |
| `npm run scrape:game-academia` | ~1,380 prices (SGD) from Game Academia's Shopify JSON |
| `npm run data:cards` | Normalises the catalog + ban list + all price feeds into `src/data/cards.json` |
| `npm run data:decks` | Turns the official public deck feed into seed decks |
| `npm run db:seed` | Pushes the built catalog into Supabase (needs `SUPABASE_SECRET_KEY`) |

### Where the data comes from

- **Cards** — `cookierunbraverse.com/data/json/cardList_en.json`, a static file
  holding all 2,093 printings with images, stats and rules text. Committed raw
  under `data/raw/` so builds are reproducible without re-fetching.
- **Ban list** — scraped from [notice 1380](https://cookierunbraverse.com/asia/notice/detail?id=1380)
  (5 banned, 11 restricted as of 13 Feb 2026). Stored in `data/raw/banlist.json`.
- **Prices** — three stores, each quoted in its own currency and converted at
  display time:
  - *HitSeekr* (PHP) — WordPress + JetEngine, server-rendered, paginates on
    `?jsf=jet-engine&pagenum=N`.
  - *Agora Hobby* (SGD) — ExpressionEngine + ExpressoStore. Category pages
    render nothing; the listing comes from `POST /v2embeds/cardlist`. Omitting
    `category_id` returns the whole Braverse channel, so we page straight
    through it.
  - *Game Academia* (SGD) — Shopify, so `collections/<handle>/products.json`.
- **Exclusive tags** — HitSeekr's `card-type-2` taxonomy. Five of the six
  categories in the spec exist there; **Cookie Party appears in no public
  source** and is shown disabled in the filter rather than silently dropped.
- **FX rates** — `open.er-api.com`, refreshed every 6 hours via `/api/rates`,
  with a committed snapshot as fallback.

### Normalisation

The official catalog is dirty in ways that break filtering, so `build-cards.mjs`
fixes it up. All of these are real values in the live dump:

- typo'd enums — `EXRTA`→`EXTRA`, `PULPLE`→`PURPLE`, `ULTLA RARE`, `UOMMON`, `Arema`
- full-width digits (`１`, `２`) and plus signs (`＋1`, `₊2`)
- `\r\n` prefixes on grade values, `"null"` as a literal colour
- card numbers written three ways — `BS1-049`, `BS01-057`, `BS2_058`
- **damage, attack cost colours and keywords aren't fields at all** — they're
  parsed out of the rendered rules text (`{da} 3`, `<{R}{R}{N}>`, `【Activate】`)

Alternate arts use an `@N` suffix (`BS10-024@1`), so 2,093 printings collapse to
1,549 distinct card numbers. Deck rules count printings together.

## Layout

```
src/app/          routes: /, /cards, /decks, /decks/build, /decks/[id],
                  /products, /stores, /contact, /api/rates
src/components/   UI
src/lib/          types, filters, deck rules, currency, i18n, formatters
src/data/         generated JSON the app imports
scripts/          scrapers and data builders
data/raw/         committed scrape output
data/reports/     filter coverage report
```

## Database

`supabase/migrations/0001_init.sql` holds the schema: catalog tables that are
world-readable and service-role-writable, plus owner-scoped deck tables behind
RLS. A check constraint enforces the rule that illegal decks can be saved but
never made public.

Run the migration once in the Supabase SQL editor, add `SUPABASE_SECRET_KEY` to
`.env.local`, then `npm run db:seed`.

## Notes

- **Font** — display type is [Fredoka](https://fonts.google.com/specimen/Fredoka)
  (SIL Open Font License), the closest freely-licensed match to CookieRun's
  rounded, heavy look. Body text is Inter. Both are self-hosted by `next/font`,
  so no runtime request leaves the site.
- **Colour** — achromatic base with a single warning yellow (`#F6D132`). The
  yellow means exactly one thing: "selected / active". Keeping it to roughly
  10% of the surface is what makes it read.
- **i18n** — the interface is translated (EN/ID/MS/TL); card rules text stays in
  English, since the official catalog only publishes English and Traditional
  Chinese for the ASIA region.
- Not affiliated with or endorsed by Devsisters. Card images and data belong to
  their respective owners.
