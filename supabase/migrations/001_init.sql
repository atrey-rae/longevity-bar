-- ============================================================================
-- Longevity Bar — věrnostní aplikace (Wild & Coco / Peace & Coco)
-- Migrace 001: tabulky, RLS, trigger na profily, seed nastavení a produktů
--
-- Spuštění: Supabase → SQL Editor → vlož celý obsah → Run.
-- Migrace je idempotentní (lze pustit opakovaně).
-- ============================================================================

-- Pozn.: `gen_random_uuid()` je od PostgreSQL 13 součástí jádra,
-- migrace tedy nepotřebuje žádné rozšíření ani superuser práva.

-- ----------------------------------------------------------------------------
-- ENUMy
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_category') then
    create type public.product_category as enum ('cocofir', 'coco_water', 'drink');
  end if;
  if not exists (select 1 from pg_type where typname = 'reward_state') then
    create type public.reward_state as enum ('ready', 'selected', 'redeemed');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- profiles — 1:1 k auth.users
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Profil zákazníka, 1:1 k auth.users. Vytváří se triggerem při registraci.';

-- ----------------------------------------------------------------------------
-- event_days — festivalové dny a jejich denní tokeny (QR)
-- ----------------------------------------------------------------------------
create table if not exists public.event_days (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  label       text,
  -- náhodný URL-safe token (20 hex znaků ≈ 80 bitů entropie)
  token       text not null unique
                default substr(replace(gen_random_uuid()::text, '-', ''), 1, 20),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.event_days is 'Jeden řádek = jeden festivalový den. token je tajný, čte se jen přes service role.';

-- ----------------------------------------------------------------------------
-- stamps — razítka (1 nákup = 1 razítko)
-- ----------------------------------------------------------------------------
create table if not exists public.stamps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  day_id      uuid references public.event_days (id) on delete set null,
  source      text not null default 'qr',   -- 'qr' | 'admin'
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists stamps_user_created_idx on public.stamps (user_id, created_at desc);
create index if not exists stamps_created_idx      on public.stamps (created_at desc);
create index if not exists stamps_day_idx          on public.stamps (day_id);

-- ----------------------------------------------------------------------------
-- products — nabídka odměn po kategoriích
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  category     public.product_category not null,
  name         text not null,
  description  text,
  emoji        text,
  sort_order   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create unique index if not exists products_category_name_key on public.products (category, name);
create index if not exists products_category_sort_idx on public.products (category, sort_order);

-- ----------------------------------------------------------------------------
-- rewards — odměny uživatele
--   tier_index = 0-based pořadí odměny daného uživatele
--   kategorie  = tier_index % 3  (0 cocofir, 1 kokosová voda, 2 drink)
-- ----------------------------------------------------------------------------
create table if not exists public.rewards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  tier_index   integer not null,
  category     public.product_category not null,
  product_id   uuid references public.products (id) on delete set null,
  state        public.reward_state not null default 'ready',
  selected_at  timestamptz,
  redeemed_at  timestamptz,
  redeemed_by  text,               -- 'customer' | 'admin'
  created_at   timestamptz not null default now(),
  unique (user_id, tier_index)
);

-- Zákazník smí mít vždy nejvýše JEDNU nevyzvednutou odměnu (ready/selected).
-- Pojistka na úrovni DB proti souběžnému dvojímu založení.
create unique index if not exists rewards_one_open_per_user
  on public.rewards (user_id)
  where state in ('ready', 'selected');

create index if not exists rewards_user_idx    on public.rewards (user_id, tier_index);
create index if not exists rewards_state_idx   on public.rewards (state);
create index if not exists rewards_product_idx on public.rewards (product_id);

-- ----------------------------------------------------------------------------
-- settings — klíč/hodnota (jsonb)
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- Trigger: vytvoření profilu po registraci uživatele
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (id) do update
    set email     = excluded.email,
        full_name = coalesce(profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Udržení e-mailu v profilu při změně v auth.users
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- RLS — uživatel čte JEN svá data, žádné zápisy z klienta.
-- Všechny zápisy jdou přes service-role klíč v serverových route handlerech,
-- který RLS obchází. Absence INSERT/UPDATE/DELETE policy = zákaz pro klienta.
-- ============================================================================
alter table public.profiles   enable row level security;
alter table public.event_days enable row level security;
alter table public.stamps     enable row level security;
alter table public.products   enable row level security;
alter table public.rewards    enable row level security;
alter table public.settings   enable row level security;

-- profiles: čtu jen svůj profil
drop policy if exists "profil: ctu jen svuj" on public.profiles;
create policy "profil: ctu jen svuj"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- stamps: čtu jen svá razítka
drop policy if exists "razitka: ctu jen sva" on public.stamps;
create policy "razitka: ctu jen sva"
  on public.stamps for select
  to authenticated
  using (auth.uid() = user_id);

-- rewards: čtu jen své odměny
drop policy if exists "odmeny: ctu jen sve" on public.rewards;
create policy "odmeny: ctu jen sve"
  on public.rewards for select
  to authenticated
  using (auth.uid() = user_id);

-- products: přihlášený vidí aktivní produkty (mřížka výběru odměny)
drop policy if exists "produkty: aktivni jsou verejne pro prihlasene" on public.products;
create policy "produkty: aktivni jsou verejne pro prihlasene"
  on public.products for select
  to authenticated
  using (active = true);

-- event_days a settings: ŽÁDNÁ policy → z klienta nepřístupné.
-- (event_days.token je tajemství dne, settings obsahují admin e-maily a PIN.)

-- ============================================================================
-- SEED — nastavení
-- ============================================================================
insert into public.settings (key, value) values
  ('cooldown_minutes', '10'::jsonb),
  ('daily_limit',      '4'::jsonb),
  ('repeat_cycle',     'true'::jsonb),
  ('admin_emails',     '["atrey@wildandcoco.com"]'::jsonb),
  ('staff_pin',        'null'::jsonb)
on conflict (key) do nothing;

comment on table public.settings is
  'cooldown_minutes = minuty mezi razítky | daily_limit = max razítek/den (0 = bez limitu) | '
  'repeat_cycle = po 3. odměně začít znovu od tieru 1 | admin_emails = pole e-mailů s přístupem do /admin | '
  'staff_pin = volitelný PIN obsluhy pro výdej (null = vypnuto)';

-- ============================================================================
-- SEED — produkty (FINÁLNÍ ceník Longevity Bar, viz ZADANI.md §8)
-- Průběžnou správu (vypnutí vyprodaných, doplnění novinek) řeší obsluha
-- v aplikaci na /admin/produkty — v SQL už není potřeba nic měnit.
-- ============================================================================
insert into public.products (category, name, description, emoji, sort_order, active) values
  -- Tier 1 — Cocofir 250 ml (6 příchutí)
  ('cocofir',    'Young Coconut',        'Cocofir 250 ml',        '🥥',  10, true),
  ('cocofir',    'Mango',                'Cocofir 250 ml',        '🥭',  20, true),
  ('cocofir',    'Rybíz',                'Cocofir 250 ml',        '🍇',  30, true),
  ('cocofir',    'Čoko',                 'Cocofir 250 ml',        '🍫',  40, true),
  ('cocofir',    'Banana Lemon',         'Cocofir 250 ml',        '🍌',  50, true),
  ('cocofir',    'Slaný karamel',        'Cocofir 250 ml',        '🍮',  60, true),

  -- Tier 2 — Kokosová voda 500 ml (2 varianty)
  ('coco_water', 'Wild Raw',             'Kokosová voda 500 ml',  '🥥',  10, true),
  ('coco_water', 'Thai Raw',             'Kokosová voda 500 ml',  '💧',  20, true),

  -- Tier 3 — Drinky (celé menu)
  ('drink',      'Espresso',             'Káva',                  '☕',  10, true),
  ('drink',      'Doppio',               'Káva',                  '☕',  20, true),
  ('drink',      'Lungo',                'Káva',                  '☕',  30, true),
  ('drink',      'Cappuccino',           'Káva',                  '☕',  40, true),
  ('drink',      'Flat white',           'Káva',                  '☕',  50, true),
  ('drink',      'Batch brew',           'Filtrovaná káva',       '☕',  60, true),
  ('drink',      'Cold brew',            'Studená káva',          '🧊',  70, true),
  ('drink',      'Matcha latté',         'Matcha',                '🍵',  80, true),
  ('drink',      'Matcha mango latté',   'Matcha',                '🍵',  90, true),
  ('drink',      'Cacao magic',          'Kakao',                 '🍫', 100, true),
  ('drink',      'Wild ceremony cacao',  'Ceremoniální kakao',    '🍫', 110, true),
  ('drink',      'Longevity drink',      'Signature nápoj',       '✨', 120, true),
  ('drink',      'Longevito mocktail',   'Nealko mocktail',       '🍹', 130, true),
  ('drink',      'Coconut Cuvée',        'Kokosové bublinky',     '🥂', 140, true),
  ('drink',      'Kombucha levandule',   'Kombucha',              '🌿', 150, true)
on conflict (category, name) do nothing;

-- ============================================================================
-- SEED — festivalové dny (Healing Festival 5. 8. – 9. 8. 2026)
-- Token se generuje náhodně z DEFAULTu sloupce (20 hex znaků, URL-safe).
-- QR kódy k tisku najde obsluha v /admin/dny → „Tisk QR“.
-- ============================================================================
insert into public.event_days (date, label, active) values
  ('2026-08-05', 'Healing Festival — středa', true),
  ('2026-08-06', 'Healing Festival — čtvrtek', true),
  ('2026-08-07', 'Healing Festival — pátek', true),
  ('2026-08-08', 'Healing Festival — sobota', true),
  ('2026-08-09', 'Healing Festival — neděle', true)
on conflict (date) do nothing;
