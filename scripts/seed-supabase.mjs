/**
 * Pushes the built catalog into Supabase.
 *
 *   node scripts/seed-supabase.mjs
 *
 * Needs SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env.local. The
 * publishable key can't write to the catalog tables -- RLS deliberately grants
 * them read-only to everyone, and the service role is what bypasses that.
 *
 * Safe to re-run: everything upserts on its primary key. Each run also appends
 * one row per (card, store) to price_history, which is how the price chart
 * accumulates a series over time.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CARDS = 'src/data/cards.json';
const CHUNK = 500;

function loadEnv(path = '.env.local') {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is missing from .env.local');
  process.exit(1);
}
if (!secret) {
  console.error(
    'No service key found.\n' +
      'Add SUPABASE_SECRET_KEY=... to .env.local (Supabase dashboard -> Project Settings -> API keys).\n' +
      'It is server-only: never prefix it with NEXT_PUBLIC_.',
  );
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false } });

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function upsert(table, rows, conflict) {
  let done = 0;
  for (const batch of chunk(rows, CHUNK)) {
    const { error } = await db.from(table).upsert(batch, { onConflict: conflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    done += batch.length;
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}`);
  }
  process.stdout.write('\n');
}

async function main() {
  const cards = JSON.parse(readFileSync(CARDS, 'utf8'));
  console.log(`read ${cards.length} printings from ${CARDS}`);

  const cardRows = cards.map((c) => ({
    id: c.id,
    card_no: c.cardNo,
    variant: c.variant,
    name: c.name,
    type: c.type,
    rarity: c.rarity,
    grade: c.grade,
    level: c.level,
    hp_value: c.hp?.value ?? null,
    hp_plus: c.hp?.plus ?? false,
    color: c.color,
    energy_colors: c.energyColors,
    energy_mix: c.energyMix,
    cost_colors: c.costColors,
    damage: c.damage,
    keywords: c.keywords,
    groups: c.groups,
    skill_name: c.skillName,
    skill_text: c.skillText,
    attack_text: c.attackText,
    flip_text: c.flipText,
    product_title: c.productTitle,
    product_idx: c.productIdx,
    exclusive: c.exclusive,
    artist: c.artist,
    image: c.image,
    is_extra: c.isExtra,
    legality: c.legality,
    is_preferred_printing: Boolean(c.isPreferredPrinting),
    released_at: c.createdAt,
    updated_at: c.updatedAt,
  }));

  const observedAt = new Date().toISOString();
  const observedOn = observedAt.slice(0, 10);

  const priceRows = [];
  const historyRows = [];
  for (const c of cards) {
    for (const [store, quote] of Object.entries(c.prices ?? {})) {
      if (!quote) continue;
      priceRows.push({
        card_id: c.id,
        store,
        amount: quote.amount,
        currency: quote.currency,
        observed_at: observedAt,
      });
      historyRows.push({
        card_id: c.id,
        store,
        amount: quote.amount,
        currency: quote.currency,
        observed_on: observedOn,
      });
    }
  }

  console.log(`upserting ${cardRows.length} cards, ${priceRows.length} prices`);
  await upsert('cards', cardRows, 'id');
  await upsert('card_prices', priceRows, 'card_id,store');
  await upsert('price_history', historyRows, 'card_id,store,observed_on');

  const { count } = await db.from('cards').select('*', { count: 'exact', head: true });
  console.log(`\ndone -- cards table now holds ${count} rows`);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
