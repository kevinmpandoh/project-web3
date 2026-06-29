
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

create table if not exists public.fish_catches (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.users(wallet_address) on delete cascade,
  fish_name text not null,
  rarity text not null check (rarity in ('Common','Uncommon','Rare','Epic','Legendary')),
  value int not null default 0,
  caught_at timestamptz not null default now()
);
create index if not exists fish_catches_time_idx on public.fish_catches (caught_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.users(wallet_address) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists chat_created_idx on public.chat_messages (created_at desc);

create table if not exists public.world_presence (
  wallet_address text primary key,
  name text not null,
  level int not null default 1,
  x numeric not null default 0,
  y numeric not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists world_presence_time_idx on public.world_presence (updated_at desc);

create table if not exists public.world_plots (
  plot_key text primary key,
  x int not null,
  y int not null,
  wallet_address text not null,
  crop text not null,
  planted_at timestamptz not null default now(),
  ready_at timestamptz not null,
  expires_at timestamptz not null
);
create index if not exists world_plots_expiry_idx on public.world_plots (expires_at);

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

-- Grants: public read via anon, full access for server (service_role).
grant select on public.users, public.fish_catches, public.chat_messages,
  public.world_presence, public.world_plots, public.leaderboard_winners to anon, authenticated;
grant all on public.users, public.fish_catches, public.chat_messages,
  public.world_presence, public.world_plots, public.leaderboard_winners to service_role;

alter table public.users enable row level security;
alter table public.fish_catches enable row level security;
alter table public.chat_messages enable row level security;
alter table public.world_presence enable row level security;
alter table public.world_plots enable row level security;
alter table public.leaderboard_winners enable row level security;

create policy "public read users" on public.users for select using (true);
create policy "public read catches" on public.fish_catches for select using (true);
create policy "public read chat" on public.chat_messages for select using (true);
create policy "public read presence" on public.world_presence for select using (true);
create policy "public read plots" on public.world_plots for select using (true);
create policy "public read winners" on public.leaderboard_winners for select using (true);
