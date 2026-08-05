# EVIDENCE — Kvíz v2, healing dashboard (bar.app)

Evidence je append-only. Neúspěšné a přerušené kontroly zůstávají zapsané.
Žádný záznam níže neopravňuje k deployi.

- **P&COS Release ID:** `PCOS-HANDOFF-2026-08-04-v2.0.2`
- **Větev:** `claude/longevity-bar-loyalty-app-m1px95`
- **`HEAD`:** `0e94f479028fd7565dfba7bcf464d64858b81f7f` (shodný s `origin/…`)
- **Produkce:** nedotčena — žádný deploy, vzdálená migrace, zápis do env ani
  `git add`/`commit`/`push`.

## E-001 — Baseline lokálních gate PŘED změnou

- **Čas:** 2026-08-04T15:40+02:00
- **Provedl:** Claude Code, bounded brief
  `bar-healing-contract-final-review-2026-08-04`
- **Příkazy:** `npx tsx scripts/check-kviz.ts`,
  `npx tsx scripts/check-kviz-profil.ts`,
  `npx tsx scripts/check-quiz-lead-payload.ts`,
  `npx tsx scripts/check-healing-bridge.ts`, `git diff --check`
- **Skutečný výsledek:**
  - `check-kviz`: **80/80** kombinací OK
  - `check-kviz-profil`: **15552/15552** kombinací OK (remíz 2633, max 8 produktů,
    determinismus OK)
  - `check-quiz-lead-payload`: **32/32** kontrol OK
  - `check-healing-bridge`: **31/31** kontrol OK
  - `git diff --check`: čistý, bez whitespace chyb
- **Status:** pass (baseline, ne důkaz o novém kódu)

## E-002 — RED: chybějící hranice kritických zdrojů

- **Čas:** 2026-08-04T15:44+02:00
- **Provedl:** Claude Code (stejný brief)
- **Nalezená chyba:** `GET /api/internal/healing-dashboard` měl v route
  handleru helper `radky()`, který **každou** chybu Supabase převedl na `[]`.
  Protože `buildHealingDashboard` vždy vypíše všech 6 bavičů z konstanty
  `BAVICI`, výpadek databáze vracel strukturálně platnou odpověď HTTP 200
  s nulami — nerozeznatelnou od „na baru je klid“. Falešné provozní KPI.
- **Procedura:** do `scripts/check-healing-bridge.ts` přidáno 14 kontrol nové
  hranice (`collectHealingDashboardInput`, `HEALING_DASHBOARD_SOURCES`,
  `HealingSourceError`) **před** implementací a spuštěny.
- **Skutečný výsledek:** běh spadl podle očekávání, protože API neexistovalo:
  `TypeError: (0 , import_healing_dashboard.collectHealingDashboardInput) is not
  a function` na `scripts/check-healing-bridge.ts:223`. Selhání je na úrovni
  importu (tsx skript, ne test runner) — jednotlivé assertions se v tomto kroku
  neuplatnily; jejich rozlišovací schopnost je doložena až v E-004.
- **Status:** fail (očekávaný RED)

## E-003 — GREEN: kritické vs. degradovatelné zdroje

- **Čas:** 2026-08-04T15:47+02:00
- **Provedl:** Claude Code (stejný brief)
- **Scope:** `src/lib/healing-dashboard.ts` (nová sekce „Zdroje dat“),
  `src/app/api/internal/healing-dashboard/route.ts`,
  `scripts/check-healing-bridge.ts`
- **Procedura:** kritičnost zdroje zapsána jako data
  (`HEALING_DASHBOARD_SOURCES`: `quiz_hosts: "degradable"`,
  `quiz_leads`/`rewards`/`products`: `"critical"`), sběr řádků přesunut do
  čisté funkce `collectHealingDashboardInput`, která u kritického zdroje hází
  `HealingSourceError` (route ji svým `catch` mění na 500) a degradovaný zdroj
  vrací v poli `degraded`, aby modul zůstal bez I/O a testovatelný. Route jen
  loguje. Kritický zdroj s `data: null` bez chyby se také považuje za selhání —
  prázdno se nikdy nedovozuje, jen skutečně čte.
- **Skutečný výsledek:** `npx tsx scripts/check-healing-bridge.ts` →
  **45/45 kontrol OK** (31/31 před briefem + 14 nových). Ostatní tři gate
  přeběhly znovu beze změny: **80/80**, **15552/15552**, **32/32**.
  `git diff --check` čistý.
- **Status:** pass

## E-004 — Mutační test: nové kontroly skutečně chytí regresi

- **Čas:** 2026-08-04T15:49+02:00
- **Provedl:** Claude Code (stejný brief)
- **Procedura:** v `HEALING_DASHBOARD_SOURCES` dočasně přepnuto
  `quiz_leads: "critical"` → `"degradable"` (záloha souboru mimo repo),
  gate spuštěn, soubor obnoven ze zálohy a gate spuštěn znovu.
- **Skutečný výsledek:** mutant → `✗ check-healing-bridge: 4 chyby z 45 kontrol`
  (chyba `quiz_leads` nevyhodila `HealingSourceError`; `HealingSourceError`
  nepojmenovala tabulku; kritický zdroj bez řádků a bez chyby neselhal;
  degradovat se smí jen `quiz_hosts`). Po obnovení opět **45/45 OK**;
  `git status` ukazuje soubor ve stavu jako po E-003.
- **Status:** pass

## E-005 — TypeScript typecheck: NEPROVEDEN, není zelený

- **Čas:** 2026-08-04
- **Provedl:** Claude Code (stejný brief) — na základě dřívějších běhů
  controllera
- **Příkaz:** `tsc --noEmit` (`npm run typecheck`)
- **Skutečný výsledek:** **nespuštěn v tomto briefu.** Předchozí běhy se
  v lokálním iCloud filesystemu opakovaně nedokončily (zablokované I/O) a byly
  přerušeny — viz `tasks/2026-08-04-longevity-bar-handoff-chatgpt/STATE.md`
  a E-003 v `healing-festival-bar/tasks/2026-08-04-healing-app-chatgpt-takeover/EVIDENCE.md`.
  Zadání briefu proto opakování zakázalo. **Neexistuje zelený typecheck ani
  build tohoto checkpointu.**
- **Důsledek:** typová správnost nového kódu je posouzena jen čtením:
  odpovědi `PostgrestResponse` (union `{data: T[]; error: null}` |
  `{data: null; error: PostgrestError}`) jsou přiřaditelné do
  `HealingSourceResponse<T>`, protože `PostgrestError` má `message: string`;
  řádkové typy pro `quiz_hosts`/`quiz_leads`/`rewards`/`products` se derivují
  z `HealingDashboardInput`, takže nemohou odejít od agregace. **Toto není
  náhrada kompilátoru.**
- **Status:** fail / neověřeno

## E-006 — `.env.example`: `HEALING_BRIDGE_SECRET`

- **Čas:** 2026-08-04T15:52+02:00
- **Provedl:** Claude Code (stejný brief)
- **Procedura:** doplněn zástupný text s popisem, že jde o server-only sdílený
  secret pro interní API, stejnou hodnotu musí mít Worker healing.app, generuje
  se `openssl rand -hex 32` a ukládá do Vercelu / secretů Workeru; bez hodnoty
  je API fail-closed (401).
- **Skutečný výsledek:** v repu je jen nízkoentropický zástupný text
  (`nahrad-nahodnym-tokenem-openssl-rand-hex-32`). **Žádná reálná hodnota
  secretu nebyla přečtena, zapsána ani nastavena** — `.env.local` ani produkční
  env se v tomto briefu nečetly.
- **Status:** pass

## Co evidence NEdokazuje

- Neexistuje důkaz o chování nasazeného endpointu (žádný běh proti Supabase,
  žádný request na produkci nebo preview).
- Neexistuje důkaz, že `quiz_hosts` v databázi existuje — migrace 004 je jen
  soubor.
- Neexistuje zelený `tsc --noEmit` ani `next build` (E-005).
- Checkpoint tedy **není release-ready**.

## E-007 — Controller security and diff read-back

- **Čas:** 2026-08-04T16:10+02:00
- **Provedl:** ChatGPT/Codex
- **Výsledek:** `check-healing-bridge` znovu **45/45 OK** a
  `git diff --check` čistý. Gitleaks nad `src`, `scripts`, `supabase` a `tasks`
  nenašel žádný leak. `.env.example` původně vyvolal false-positive na
  tokenově vypadajícím dummy Supabase anon klíči; oba Supabase příklady byly
  změněny na netokenové `replace-with-…` placeholdery a opakovaný scan prošel
  bez nálezu. Žádný skutečný secret se nečetl ani nezapisoval.
- **Status:** pass

## Release checklist

- [ ] Controller prošel finální diffy v obou repozitářích.
- [ ] Mapování profil → produkt schválil Atrey (teď DRAFT).
- [ ] `tsc --noEmit` dokončen a zapsán (mimo iCloud nebo v CI).
- [ ] Filip Páral: tech review zapsané.
- [ ] Tadeáš: konzultace, test a předání týmu zapsané.
- [ ] Migrace 004 aplikovaná na Supabase (po GO).
- [ ] `HEALING_BRIDGE_SECRET` nastavený ve Vercelu i ve Workeru healing.app.
- [ ] Explicitní produkční GO Atreye + post-deploy read-back.
