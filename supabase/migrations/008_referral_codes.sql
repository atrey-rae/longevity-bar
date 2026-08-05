-- ============================================================================
-- Migrace 008: sledovatelné osobní QR („Dárek přátelům“)
--
--   a) `profiles.referral_code` — krátký stabilní kód zákazníka. Přiděluje se
--      líně, při prvním zobrazení `/darek` přihlášenému hostovi (service role),
--      takže drtivá většina profilů zůstane s NULL. Unikátní index proto musí
--      snést libovolný počet NULL hodnot — v Postgresu to `unique index` umí,
--      `unique constraint` na jednom sloupci se chová stejně, ale index jde
--      založit idempotentně přes `if not exists`.
--
--   b) `quiz_leads.referral_code` — kód z parametru `?od=` na `/kviz/<slug>`.
--      Ukládá se JEN když projde validací (`src/lib/referral.ts`), jinak
--      zůstává NULL a host o ničem neví. Nic dalšího o kamarádovi ani
--      o odpovědích z kvízu se sem nepřidává (rozhodnutí 4. 8. 2026 platí).
--
-- Obě tabulky jsou zavřené RLS a čte/zapisuje je jen service role, takže
-- migrace nemění ani jednu policy.
--
-- Spuštění: Supabase → SQL Editor → vlož celý obsah → Run.
-- Migrace je idempotentní (lze pustit opakovaně).
-- ============================================================================

/* --- a) Kód zákazníka ------------------------------------------------------ */

alter table public.profiles
  add column if not exists referral_code text;

comment on column public.profiles.referral_code is
  'Osobní referral kód zákazníka pro sledovatelné QR v sekci „Dárek přátelům“. '
  '8 znaků z abecedy [A-HJ-NP-Z2-9] (bez I, O, 0, 1). NULL = kód ještě nebyl potřeba. '
  'Přiděluje server při prvním zobrazení /darek; do URL jde jako ?od=<KOD>.';

-- Unikátní index (ne constraint): `if not exists` ho udrží idempotentní.
-- NULL hodnoty se v Postgresu do unikátnosti nepočítají, takže nepřidělené
-- kódy se navzájem neblokují.
create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code);

-- Tvar kódu hlídáme i v databázi — appka validuje totéž, ale ruční UPDATE
-- v SQL editoru by jinak mohl založit kód, který se do QR nikdy nedostane.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_referral_code_format'
  ) then
    alter table public.profiles
      add constraint profiles_referral_code_format
      check (referral_code is null or referral_code ~ '^[A-HJ-NP-Z2-9]{4,12}$');
  end if;
end $$;

/* --- b) Kód u leadu z kvízu ------------------------------------------------ */

alter table public.quiz_leads
  add column if not exists referral_code text;

comment on column public.quiz_leads.referral_code is
  'Referral kód z parametru ?od= — od kterého zákazníka kamarád QR dostal. '
  'NULL = kvíz přišel bez referralu nebo byl kód neplatný (tichy fallback). '
  'Odkazuje na profiles.referral_code, ale bez FK: leady musí přežít i smazání profilu.';

-- Počítadlo „tvým QR prošlo X kamarádů“ = COUNT(*) přes tenhle index.
-- Částečný index: drtivá většina leadů referral nemá a do indexu nepatří.
create index if not exists quiz_leads_referral_code_idx
  on public.quiz_leads (referral_code)
  where referral_code is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.quiz_leads'::regclass
      and conname = 'quiz_leads_referral_code_format'
  ) then
    alter table public.quiz_leads
      add constraint quiz_leads_referral_code_format
      check (referral_code is null or referral_code ~ '^[A-HJ-NP-Z2-9]{4,12}$');
  end if;
end $$;
