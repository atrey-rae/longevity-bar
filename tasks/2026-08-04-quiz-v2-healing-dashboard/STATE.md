# STATE — Kvíz v2, healing dashboard (bar.app)

- **Aktivní controller:** ChatGPT/Codex (Claude session zde jedná jen na
  výslovný pokyn Atreye, viz `CLAUDE.md`)
- **Fáze:** implementace probíhá, čeká na review — **NENÍ release-ready**
- **P&COS Release ID:** `PCOS-HANDOFF-2026-08-04-v2.0.2`
- **Poslední aktualizace:** 2026-08-04T15:53:29+02:00
- **Produkce:** NEDOTČENA (žádný deploy, migrace, env ani commit/push)

## Přesný stav repozitáře

| Co | Hodnota |
|---|---|
| Repo | `/Users/atrey/Documents/Coding.AI/longevity-bar` |
| Větev | `claude/longevity-bar-loyalty-app-m1px95` (jediná a výchozí; historický název — nepřejmenovávat) |
| `HEAD` | `0e94f479028fd7565dfba7bcf464d64858b81f7f` |
| `origin/claude/longevity-bar-loyalty-app-m1px95` | `0e94f479028fd7565dfba7bcf464d64858b81f7f` (shodné s `HEAD`) |
| Working tree | **dirty** — nic nebylo staged, commitnuto ani pushnuto |

Dirty stav k času této aktualizace (`git status --porcelain`):

```
 M .env.example
 M package.json
 M src/app/kviz/[bavic]/page.tsx
 M src/app/kviz/actions.ts
 M src/app/pravidla/page.tsx
 M src/components/KvizFlow.tsx
 M src/lib/kviz.ts
 M src/lib/types.ts
 M tasks/2026-08-04-longevity-bar-handoff-chatgpt/EVIDENCE.md
 M tasks/2026-08-04-longevity-bar-handoff-chatgpt/STATE.md
?? scripts/check-healing-bridge.ts
?? scripts/check-kviz-profil.ts
?? scripts/check-quiz-lead-payload.ts
?? src/app/api/internal/
?? src/components/KvizFlowProfil.tsx
?? src/lib/healing-bridge.ts
?? src/lib/healing-dashboard.ts
?? src/lib/kviz-hosts.ts
?? src/lib/kviz-lead.ts
?? src/lib/kviz-profil.ts
?? supabase/migrations/004_quiz_v2_hosts.sql
?? tasks/2026-08-04-quiz-v2-healing-dashboard/
?? tmp/
```

Změny jsou práce **více souběžných session** (Codex cockpit + bounded Claude
briefy). Poslední bounded brief `bar-healing-contract-final-review-2026-08-04`
vlastnil jen: `src/lib/healing-dashboard.ts`,
`src/app/api/internal/healing-dashboard/route.ts`,
`scripts/check-healing-bridge.ts`, `.env.example` a tento Task Pack
(STATE/EVIDENCE/HANDOFF). Nic jiného nesahal — `tmp/`, `package.json`,
kvízové soubory a starý handoff pack zůstaly, jak byly přijaty.

## Hotovo (ověřeno lokálně)

- Druhá varianta kvízu („profil“) se skóruje **v prohlížeči**
  (`src/lib/kviz-profil.ts`, `src/components/KvizFlowProfil.tsx`).
- Payload leadu je uzamčený na 8 klíčů bez odpovědí z kvízu
  (`src/lib/kviz-lead.ts`, gate `scripts/check-quiz-lead-payload.ts`).
- Migrace `supabase/migrations/004_quiz_v2_hosts.sql` existuje **jako soubor**
  (`quiz_leads.quiz_variant`, tabulka `quiz_hosts`); idempotentní.
- Interní API pro healing.app existuje a je fail-closed:
  `GET /api/internal/healing-dashboard`,
  `POST /api/internal/healing-dashboard/quiz-variant`
  (`src/lib/healing-bridge.ts` — timing-safe porovnání sdíleného secretu).
- **Uzavřená korektnostní chyba (tento brief):** GET už netiší chyby databáze.
  Kritičnost zdroje je data v `HEALING_DASHBOARD_SOURCES`
  (`src/lib/healing-dashboard.ts`): `quiz_leads`, `rewards` a `products` jsou
  `critical` → chyba vyhodí `HealingSourceError` a route vrátí 500; jen
  `quiz_hosts` je `degradable` → chyba se zaloguje, dashboard i zákaznický kvíz
  jedou dál (migrace 004 nemusela proběhnout). Dřív každá chyba končila jako
  HTTP 200 s nulami, tedy jako falešné provozní KPI.
- `HEALING_BRIDGE_SECRET` je popsaný v `.env.example` jako server-only
  zástupný text (žádná reálná hodnota v repu).
- Lokální gate: `check-kviz` 80/80, `check-kviz-profil` 15552/15552,
  `check-quiz-lead-payload` 32/32, `check-healing-bridge` **45/45**
  (před tímto briefem 31/31), `git diff --check` čistý. Detaily v `EVIDENCE.md`.

## Blokované / neověřené

- **TypeScript `tsc --noEmit` NENÍ zelený.** Běh v lokálním iCloud filesystemu
  se opakovaně zasekl na I/O a byl ukončen; podle zadání se znovu nepouštěl.
  Typová správnost nového kódu je posouzena jen čtením, ne kompilátorem.
- `npm run build` ze stejného důvodu neproběhl.
- Mapování profil → produkt je **DRAFT** a čeká na schválení Atreye
  (`SOURCE_QUIZ_MATRIX.md`).
- Manažerská část UI v healing.app je mimo tento repo a není tady ověřená.
- Migrace 004 **není** aplikovaná na vzdálenou Supabase; `HEALING_BRIDGE_SECRET`
  není nastavený ve Vercelu ani ve Workeru healing.app; nic není nasazené.
- Gates: Filip Páral (tech review) a Tadeáš (konzultace, test, předání týmu)
  **neproběhly**. Produkční GO Atreye neexistuje.

## Jediný další krok

- **Owner:** ChatGPT/Codex (controller)
- **Akce:** dát Atreyovi ke schválení mapování profil → produkt a poté zajistit
  dokončený typecheck mimo iCloud (kopie repa na lokální disk nebo CI), než
  cokoli půjde na review Filipovi.
- **Hotovo, když:** mapování je schválené a existuje dokončený (zelený nebo
  červený) výsledek `tsc --noEmit` zapsaný v `EVIDENCE.md`.
