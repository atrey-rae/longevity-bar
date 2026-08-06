-- ============================================================================
-- Migrace 010: oznámení (Web Push) v Bar.app
--
--   Jeden řádek = jedno zařízení, které si oznámení zapnulo. Ne uživatel:
--   host může mít telefon i tablet a odhlásit se z každého zvlášť.
--
--   `endpoint` je unikátní adresa push služby (FCM/APNs/Mozilla) — je to
--   zároveň jediný spolehlivý identifikátor zařízení, proto `unique`. Když
--   host oznámení vypne a zase zapne, dostane nový endpoint a starý řádek
--   umře na 410 při prvním odeslání (uklidí ho `lib/push.ts`).
--
--   `user_id` je NULLABLE schválně: oznámení jde zapnout i nepřihlášenému
--   hostovi (sortiment, kvíz). Když se přihlásí, spáruje se to při dalším
--   `POST /api/push/subscribe`.
--
--   `p256dh` + `auth` jsou VEŘEJNÉ šifrovací klíče prohlížeče pro tenhle
--   endpoint. Nejsou to přihlašovací údaje k účtu, ale bez nich nelze
--   oznámení zašifrovat — a s nimi lze zařízení posílat push. Proto stejný
--   režim jako u ostatních citlivých tabulek: RLS bez policies, service role.
--
--   `lang` drží jazyk, ve kterém si host appku zapnul, aby mu oznámení
--   nechodilo v druhém jazyce než zbytek rozhraní.
--
-- Spuštění: Supabase → SQL Editor → vlož celý obsah → Run.
-- Migrace je idempotentní (lze pustit opakovaně).
-- ============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  lang text not null default 'cs' check (lang in ('cs', 'en')),
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  failed_at timestamptz
);

-- „Pošli všem přihlášeným" a „pošli tomuhle hostovi" jsou nejčastější dotazy.
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Žádné policies = přes anon/authenticated klíč se k řádkům nedostane nikdo.
-- Zápis i čtení jde výhradně přes service role z route handlerů a server actions.
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

comment on table public.push_subscriptions is
  'Web Push odběry (jeden řádek = jedno zařízení). user_id je NULL u nepřihlášených hostů.';
