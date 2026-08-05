-- ============================================================================
-- Migrace 007: noví baviči fronty (G7, H8, I9) a sdílený týmový vstup (TYM)
--
--   a) G7 Zuzanna, H8 Filip, I9 Veronika — tři nové QR kódy bavičů
--      (zadání Atreye 5. 8. 2026),
--   b) TYM — sdílený vstup pro členy týmu bez vlastního kódu; QR na něj vede
--      ze záložky Healing.app. Není bavič: v dashboardu healing.app se
--      nezobrazuje (ten jede z `BAVICI` v `src/lib/kviz.ts`), řádek tady drží
--      jen volbu varianty kvízu,
--   c) VIT — osobní vstup VIP hosta Víta, taky mimo baviče fronty; vlastní kód
--      kvůli oddělenému trackingu leadů a kupónů.
--
-- Všech pět nastupuje s výchozí variantou 'microbiom' (3 otázky).
-- Sdílené předgenerované kupóny `HEAL21-<KOD>-<SLUG>` pro tyhle kódy v e-shopu
-- NEEXISTUJÍ — appka jim zakládá výhradně osobní kupón přes care-api a při
-- jeho selhání vrací chybu (viz `KODY_BEZ_SDILENYCH_KUPONU` v `src/lib/kviz.ts`).
--
-- Vyžaduje migraci 004 (tabulka `quiz_hosts`).
-- Spuštění: Supabase → SQL Editor → vlož celý obsah → Run.
-- Migrace je idempotentní (lze pustit opakovaně) a nepřepisuje variantu,
-- kterou si host mezitím nastavil přes healing.app.
-- ============================================================================

do $$
begin
  if to_regclass('public.quiz_hosts') is null then
    raise exception
      'Tabulka public.quiz_hosts neexistuje — spusť nejdřív migraci 004_quiz_v2_hosts.sql.';
  end if;
end $$;

insert into public.quiz_hosts (code, variant) values
  ('G7', 'microbiom'),
  ('H8', 'microbiom'),
  ('I9', 'microbiom'),
  ('TYM', 'microbiom'),
  ('VIT', 'microbiom')
on conflict (code) do nothing;

comment on table public.quiz_hosts is
  'Konfigurace kvízu bavičů fronty: která varianta (microbiom | profil) se otevře z QR kódu daného hosta. '
  'Klíč je kód z kupónu — baviči A1–I9 plus samostatné vstupy TYM (tým) a VIT (VIP host). '
  'Veřejný vstup WEB tady záměrně NENÍ: rozcestník Bar.app má microbiom napevno. '
  'Čte a zapisuje interní API bar.app, které volá healing.app.';
