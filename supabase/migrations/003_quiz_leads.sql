-- ============================================================================
-- Migrace 003: quiz_leads — leady z „Kvízu bavičů fronty“ (/kviz/<bavic>)
--
-- Veřejný endpoint bez přihlášení. Zápis i čtení jde výhradně přes service role
-- (server action), proto tabulka nemá ŽÁDNOU policy — RLS ji tím zavírá klientům.
--
-- Spuštění: Supabase → SQL Editor → vlož celý obsah → Run.
-- Migrace je idempotentní (lze pustit opakovaně).
-- ============================================================================

create table if not exists public.quiz_leads (
  id            uuid primary key default gen_random_uuid(),
  -- kód baviče z kupónu (A1–F6)
  bavic         text not null,
  product_slug  text not null,
  product_name  text not null,
  coupon_code   text not null,
  first_name    text not null,
  email         text not null,
  phone         text not null,
  created_at    timestamptz default now()
);

comment on table public.quiz_leads is 'Leady z kvízu bavičů fronty (Healing Festival 2026) — kontakt + vybraný produkt + kód kupónu 21 %.';

-- Index pro rate-limit dotaz (stejný e-mail u stejného baviče za posledních 10 min).
create index if not exists quiz_leads_email_bavic_idx
  on public.quiz_leads (email, bavic, created_at desc);

create index if not exists quiz_leads_created_idx
  on public.quiz_leads (created_at desc);

alter table public.quiz_leads enable row level security;
