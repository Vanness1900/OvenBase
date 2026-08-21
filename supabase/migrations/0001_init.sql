-- OvenBase initial schema.
--
-- Catalog tables (cards / card_prices / price_history) are world-readable and
-- written only by the scrapers using the service role key. User tables (decks
-- and friends) are owner-scoped through RLS.
--
-- Run this once in the Supabase SQL editor, or via `supabase db push`.

-- ───────────────────────────────────────────────────────────── catalog ────

create table if not exists public.cards (
  id                     text primary key,              -- printing, e.g. "BS10-024@2"
  card_no                text        not null,          -- base number; deck rules key off this
  variant                integer,
  name                   text,
  type                   text        not null,
  rarity                 text        not null,
  grade                  text,
  level                  integer,
  hp_value               integer,
  hp_plus                boolean     not null default false,  -- EXTRA "+N" modifier
  color                  text,
  energy_colors          text[]      not null default '{}',
  energy_mix             boolean     not null default false,
  cost_colors            text[]      not null default '{}',
  damage                 integer[]   not null default '{}',
  keywords               text[]      not null default '{}',
  groups                 text[]      not null default '{}',
  skill_name             text,
  skill_text             text,
  attack_text            text,
  flip_text              text,
  product_title          text,
  product_idx            integer,
  exclusive              text[]      not null default '{}',
  artist                 text,
  image                  text,
  is_extra               boolean     not null default false,
  legality               text        not null default 'legal'
                           check (legality in ('legal', 'restricted', 'banned')),
  is_preferred_printing  boolean     not null default false,
  released_at            timestamptz,
  updated_at             timestamptz
);

create index if not exists cards_card_no_idx   on public.cards (card_no);
create index if not exists cards_type_idx      on public.cards (type);
create index if not exists cards_rarity_idx    on public.cards (rarity);
create index if not exists cards_product_idx   on public.cards (product_title);
create index if not exists cards_legality_idx  on public.cards (legality);
create index if not exists cards_keywords_idx  on public.cards using gin (keywords);
create index if not exists cards_groups_idx    on public.cards using gin (groups);
create index if not exists cards_exclusive_idx on public.cards using gin (exclusive);
create index if not exists cards_cost_idx      on public.cards using gin (cost_colors);
-- Name/number search from the card list.
create index if not exists cards_search_idx
  on public.cards using gin (to_tsvector('simple', coalesce(name, '') || ' ' || id));

/** Latest known price per (card, store), in the store's own currency. */
create table if not exists public.card_prices (
  card_id     text        not null references public.cards (id) on delete cascade,
  store       text        not null,
  amount      numeric(12, 2) not null,
  currency    text        not null,
  observed_at timestamptz not null default now(),
  primary key (card_id, store)
);

create index if not exists card_prices_store_idx on public.card_prices (store);

/** Append-only daily observations -- this is what the price chart reads. */
create table if not exists public.price_history (
  id          bigserial primary key,
  card_id     text  not null references public.cards (id) on delete cascade,
  store       text  not null,
  amount      numeric(12, 2) not null,
  currency    text  not null,
  observed_on date  not null default current_date,
  unique (card_id, store, observed_on)
);

create index if not exists price_history_card_idx on public.price_history (card_id, observed_on);

-- ─────────────────────────────────────────────────────────────── users ────

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table if not exists public.decks (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references auth.users (id) on delete cascade,
  name          text        not null,
  description   text        not null default '',
  visibility    text        not null default 'private'
                  check (visibility in ('private', 'public')),
  shelf         text        not null default 'community'
                  check (shelf in ('community', 'featured', 'champion')),
  is_legal      boolean     not null default false,
  cover_card_id text references public.cards (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Illegal decks can be saved, but never shared publicly.
  constraint decks_illegal_stays_private check (visibility = 'private' or is_legal)
);

create index if not exists decks_owner_idx      on public.decks (owner_id);
create index if not exists decks_visibility_idx on public.decks (visibility, shelf);

create table if not exists public.deck_cards (
  deck_id     uuid    not null references public.decks (id) on delete cascade,
  slot        text    not null check (slot in ('main', 'extra')),
  printing_id text    not null references public.cards (id),
  card_no     text    not null,
  count       integer not null check (count > 0),
  primary key (deck_id, slot, printing_id)
);

create table if not exists public.deck_likes (
  deck_id    uuid not null references public.decks (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deck_id, user_id)
);

create table if not exists public.deck_bookmarks (
  deck_id    uuid not null references public.decks (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deck_id, user_id)
);

-- ───────────────────────────────────────────────────────────────── RLS ────

alter table public.cards          enable row level security;
alter table public.card_prices    enable row level security;
alter table public.price_history  enable row level security;
alter table public.profiles       enable row level security;
alter table public.decks          enable row level security;
alter table public.deck_cards     enable row level security;
alter table public.deck_likes     enable row level security;
alter table public.deck_bookmarks enable row level security;

-- Catalog: readable by everyone, writable only by the service role (which
-- bypasses RLS), so no write policies are defined on purpose.
drop policy if exists cards_read on public.cards;
create policy cards_read on public.cards for select using (true);

drop policy if exists card_prices_read on public.card_prices;
create policy card_prices_read on public.card_prices for select using (true);

drop policy if exists price_history_read on public.price_history;
create policy price_history_read on public.price_history for select using (true);

-- Profiles: public to read, self to write.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);

drop policy if exists profiles_write_own on public.profiles;
create policy profiles_write_own on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Decks: public ones are visible to anyone; private ones only to their owner.
drop policy if exists decks_read on public.decks;
create policy decks_read on public.decks
  for select using (visibility = 'public' or owner_id = auth.uid());

drop policy if exists decks_write_own on public.decks;
create policy decks_write_own on public.decks
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Deck contents inherit their deck's visibility.
drop policy if exists deck_cards_read on public.deck_cards;
create policy deck_cards_read on public.deck_cards
  for select using (
    exists (
      select 1 from public.decks d
      where d.id = deck_id and (d.visibility = 'public' or d.owner_id = auth.uid())
    )
  );

drop policy if exists deck_cards_write_own on public.deck_cards;
create policy deck_cards_write_own on public.deck_cards
  for all using (
    exists (select 1 from public.decks d where d.id = deck_id and d.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.decks d where d.id = deck_id and d.owner_id = auth.uid())
  );

-- Likes and bookmarks: counts are public, rows are self-owned.
drop policy if exists deck_likes_read on public.deck_likes;
create policy deck_likes_read on public.deck_likes for select using (true);

drop policy if exists deck_likes_write_own on public.deck_likes;
create policy deck_likes_write_own on public.deck_likes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists deck_bookmarks_read on public.deck_bookmarks;
create policy deck_bookmarks_read on public.deck_bookmarks for select using (true);

drop policy if exists deck_bookmarks_write_own on public.deck_bookmarks;
create policy deck_bookmarks_write_own on public.deck_bookmarks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────────────────────────────────────────────────── helpers ────

/** Deck list with like/bookmark counts, so the Decks page is one query. */
create or replace view public.decks_with_counts as
  select
    d.*,
    (select count(*) from public.deck_likes     l where l.deck_id = d.id) as like_count,
    (select count(*) from public.deck_bookmarks b where b.deck_id = d.id) as bookmark_count,
    (select coalesce(sum(dc.count), 0) from public.deck_cards dc
       where dc.deck_id = d.id and dc.slot = 'main')  as main_count,
    (select coalesce(sum(dc.count), 0) from public.deck_cards dc
       where dc.deck_id = d.id and dc.slot = 'extra') as extra_count
  from public.decks d;

/** Create a profile row automatically on sign-up. */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
