-- ============================================================================
-- Migrace 004: druhá varianta kvízu („profil“) a konfigurace bavičů
--
--   a) quiz_leads.quiz_variant — ze které varianty kvízu lead vznikl,
--   b) quiz_hosts — jakou variantu ukazuje QR kód konkrétního baviče.
--
-- Odpovědi na otázky se NEUKLÁDAJÍ ani v jedné variantě (rozhodnutí 4. 8. 2026).
--
-- Spuštění: Supabase → SQL Editor → vlož celý obsah → Run.
-- Migrace je idempotentní (lze pustit opakovaně).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- quiz_leads.quiz_variant
-- ----------------------------------------------------------------------------
alter table public.quiz_leads
  add column if not exists quiz_variant text not null default 'microbiom';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.quiz_leads'::regclass
      and conname = 'quiz_leads_quiz_variant_check'
  ) then
    alter table public.quiz_leads
      add constraint quiz_leads_quiz_variant_check
      check (quiz_variant in ('microbiom', 'profil'));
  end if;
end $$;

comment on column public.quiz_leads.quiz_variant is
  'Varianta kvízu, ze které lead vznikl: microbiom (3 otázky) | profil (9 otázek).';

-- ----------------------------------------------------------------------------
-- quiz_hosts — nastavení varianty kvízu per bavič
-- ----------------------------------------------------------------------------
create table if not exists public.quiz_hosts (
  code        text primary key,
  variant     text not null default 'microbiom',
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- Hned po vytvoření tabulky, ne až na konci bloku — dokud RLS neběží, mají
-- `anon`/`authenticated` (výchozí Supabase oprávnění na nové tabulky ve
-- `public`) plný přístup. Čtení i zápis jde výhradně přes service role,
-- proto ŽÁDNÁ policy — RLS tím tabulku zavírá klientům úplně.
alter table public.quiz_hosts enable row level security;
revoke all on public.quiz_hosts from anon, authenticated;
grant select, insert, update on public.quiz_hosts to service_role;

comment on table public.quiz_hosts is
  'Konfigurace kvízu bavičů fronty: která varianta (microbiom | profil) se otevře z QR kódu daného baviče. '
  'Klíč je kód baviče z kupónu (A1–F6). Čte a zapisuje interní API bar.app, které volá healing.app.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.quiz_hosts'::regclass
      and conname = 'quiz_hosts_variant_check'
  ) then
    alter table public.quiz_hosts
      add constraint quiz_hosts_variant_check
      check (variant in ('microbiom', 'profil'));
  end if;
end $$;

insert into public.quiz_hosts (code, variant) values
  ('A1', 'microbiom'),
  ('B2', 'microbiom'),
  ('C3', 'microbiom'),
  ('D4', 'profil'),
  ('E5', 'microbiom'),
  ('F6', 'microbiom')
on conflict (code) do nothing;

-- Atrey (D4) má podle rozhodnutí z 4. 8. 2026 používat delší profilový kvíz.
-- Samostatný UPDATE je záměrný: migrace může běžet i nad již existujícím D4,
-- zatímco ostatním bavičům jejich individuální volbu nepřepisuje.
update public.quiz_hosts
set
  variant = 'profil',
  updated_at = now(),
  updated_by = 'Atrey — rozhodnutí 2026-08-04'
where code = 'D4'
  and variant is distinct from 'profil';
