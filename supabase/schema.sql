-- ============================================================
-- SawahVerse — Supabase schema
-- ============================================================
-- Run this once in the Supabase SQL editor.
--
-- Access model: ALL writes go through the app's server functions
-- (src/lib/api/game.functions.ts) using the SERVICE ROLE key, which
-- bypasses RLS. Set these env vars on the server to activate it:
--
--   SUPABASE_URL=https://<project>.supabase.co
--   SUPABASE_SERVICE_ROLE_KEY=<service role key — server only, never VITE_>
--
-- Without them the app falls back to a local file store, so dev
-- works with zero configuration.
--
-- RLS below allows public READS only; anon clients can never write.
-- ============================================================

-- ---------- users ----------
-- One row per player, keyed by Solana wallet address.
create table if not exists public.users (
  wallet_address text primary key,
  username text,
  level int not null default 1,
  xp int not null default 0,
  coins int not null default 50,
  rice_harvested int not null default 0,
  fish_caught int not null default 0,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists users_coins_idx on public.users (coins desc);

-- ---------- farms ----------
-- Tile layout per player (the client also keeps a local copy).
create table if not exists public.farms (
  wallet_address text primary key references public.users(wallet_address) on delete cascade,
  size int not null default 9,
  tiles jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- inventory ----------
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.users(wallet_address) on delete cascade,
  item_type text not null check (item_type in ('rice', 'seed', 'fish', 'rare_item')),
  item_name text not null,
  rarity text check (rarity in ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary')),
  quantity int not null default 1 check (quantity >= 0),
  metadata jsonb not null default '{}'::jsonb,
  acquired_at timestamptz not null default now()
);
create index if not exists inventory_wallet_idx on public.inventory (wallet_address);

-- ---------- fish_catches ----------
-- Append-only log of every catch; powers the activity feed.
create table if not exists public.fish_catches (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.users(wallet_address) on delete cascade,
  fish_name text not null,
  rarity text not null check (rarity in ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary')),
  value int not null default 0,
  caught_at timestamptz not null default now()
);
create index if not exists fish_catches_time_idx on public.fish_catches (caught_at desc);

-- ---------- chat_messages ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.users(wallet_address) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists chat_created_idx on public.chat_messages (created_at desc);

-- ---------- leaderboard ----------
-- A view, not a table: it can never drift out of sync with users.
create or replace view public.leaderboard as
select
  u.wallet_address,
  coalesce(nullif(trim(u.username), ''),
           left(u.wallet_address, 4) || '…' || right(u.wallet_address, 4)) as display_name,
  u.level,
  u.coins,
  u.fish_caught,
  u.last_seen_at
from public.users u
order by u.coins desc
limit 100;

-- ============================================================
-- Row Level Security: public read, no anon writes.
-- The server's service-role key bypasses RLS for writes.
-- ============================================================
alter table public.users enable row level security;
alter table public.farms enable row level security;
alter table public.inventory enable row level security;
alter table public.fish_catches enable row level security;
alter table public.chat_messages enable row level security;

create policy "public read users" on public.users for select using (true);
create policy "public read farms" on public.farms for select using (true);
create policy "public read catches" on public.fish_catches for select using (true);
create policy "public read chat" on public.chat_messages for select using (true);
-- inventory stays private: no anon select policy.

-- ---------- world_presence ----------
-- Live player positions in the explorable world. Rows older than ~12s
-- are treated as offline by the API; this table stays tiny.
create table if not exists public.world_presence (
  wallet_address text primary key,
  name text not null,
  x numeric not null default 0,
  y numeric not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists world_presence_time_idx on public.world_presence (updated_at desc);

alter table public.world_presence enable row level security;
create policy "public read presence" on public.world_presence for select using (true);

-- Level shown above heads in the world (added for Ansem Land).
alter table public.world_presence add column if not exists level int not null default 1;

-- ---------- world_plots ----------
-- The shared town field: anyone can plant on free soil tiles, only the
-- planter may harvest, and a ready crop withers 2h after maturing
-- (expired rows are cleaned up by the API on read).
create table if not exists public.world_plots (
  plot_key text primary key, -- "x:y"
  x int not null,
  y int not null,
  wallet_address text not null,
  crop text not null,
  planted_at timestamptz not null default now(),
  ready_at timestamptz not null,
  expires_at timestamptz not null
);
create index if not exists world_plots_expiry_idx on public.world_plots (expires_at);

alter table public.world_plots enable row level security;
create policy "public read plots" on public.world_plots for select using (true);

-- ---------- leaderboard_winners ----------
-- Top-3 snapshot recorded every 3h reward epoch. Winners sit out the
-- rankings for 24h; the team sends prizes to these wallets manually.
create table if not exists public.leaderboard_winners (
  id uuid primary key default gen_random_uuid(),
  epoch timestamptz not null,
  rank int not null check (rank between 1 and 3),
  wallet_address text not null,
  name text not null,
  coins int not null default 0,
  created_at timestamptz not null default now(),
  unique (epoch, rank)
);
create index if not exists winners_epoch_idx on public.leaderboard_winners (epoch desc);

alter table public.leaderboard_winners enable row level security;
create policy "public read winners" on public.leaderboard_winners for select using (true);

-- Holding tier shown above heads in the world (added with token tiers).
alter table public.world_presence add column if not exists tier text not null default 'sprout';
