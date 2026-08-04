# HANDOFF — Longevity Bar → cockpit ChatGPT

**Datum:** 4. 8. 2026 · **Předává:** Claude Code (Fable, architekt této
session) · **Přebírá:** ChatGPT/Codex cockpit · **Schvaluje:** Atrey.

Dle P&COS handoff v2.0.1: 1 task = 1 aktivní orchestrátor. Tímto dokumentem
se aktivním controllerem appky Longevity Bar stává **ChatGPT**; Claude
cockpit je od tohoto okamžiku pro toto repo read-only, dokud Atrey neurčí
jinak. (Repo nemá `.ai/CONTROL.json` — kontrolní stav nese tento Task Pack.)

## Cold-start: 5 věcí, které musíš vědět

1. **Cíl:** appka podporuje stánek Longevity Bar na Healing Festivalu
   (ST 5. 8. 15:00 – NE 9. 8., cíl tržeb 1 M Kč): věrnostní razítka
   u stánku + kvíz bavičů generující kupóny 21 % na e-shop (follow-up
   prodej po festivalu, kupóny platí do 31. 12. 2026).
2. **Ověřený stav:** viz `STATE.md` (co běží kde) a `EVIDENCE.md` (commity,
   testy, e2e důkazy). Produkce je živá a e2e ověřená k ránu 4. 8.
3. **Rizika:** ⛔ gates Filip/Tadeáš neproběhly (vědomá výjimka Atreye,
   `P&COS_REVIEW.md`); monitoring manuální; OAuth secret čeká na rotaci
   po festivalu; default větev má historický název — nepřejmenovávat
   za provozu.
4. **Schválení:** každý produkční zásah (deploy/env/DNS/DB) za festivalu =
   explicitní GO Atreye (v2.0.1 §GO gates). Texty kvízu a GDPR jsou
   Atreyem schválené 4. 8. — neměnit bez jeho GO.
5. **Další 3 kroky:**
   1. Vytisknout QR bavičů (`_data/healing-festival-bar/qr-vernostni/qr-kviz-bavici.html`)
      a denní QR; školení týmu ÚT 4. 8.
   2. Za festivalu: denní kontrola dle `RUNBOOK.md` §2 (kvíz 200, fallback
      notifikace, počet leadů).
   3. Po festivalu: úklid dle `RUNBOOK.md` §5 (kupóny, OAuth rotace, PII
      lhůty 3/6 měsíců) + doplnit chybějící gates, pokud appka pojede dál.

## Mapa dokumentů

| Dokument | K čemu |
|---|---|
| `README.md` | architektura, nasazení krok za krokem, kvíz (§9) |
| `ZADANI.md` | věrnostní mechanika (původní zadání) |
| `NASAZENI.md` | historický deploy playbook (splněno 3. 8.) |
| `RUNBOOK.md` | denní provoz, incidenty, deploy/rollback, úklid |
| `tasks/…/BRIEF·STATE·DECISIONS·P&COS_REVIEW·EVIDENCE` | tento Task Pack |
| `docs/TAHAK-POKLADNA.md` | tahák pro obsluhu pokladny |

## Kontext mimo repo (Atreyův stroj / _data)

- `_data/healing-festival-bar/kviz-kupony-mapping.md` — produkt↔CS kód
  (zdroj pravdy pro katalog kvízu a kupóny).
- `_data/healing-festival-bar/qr-vernostni/` — tisková QR.
- Týmová appka healing.peaceandcoco.com = repo `healing-festival-bar`
  (CF Worker + D1) — MIMO tento handoff, řízení zůstává, kde je.

## Kontrakt pro delegace

Při delegaci na agenty používej Agent Brief (TASK_ID, OBJECTIVE, CONTEXT
FILES, SCOPE, FILE OWNERSHIP, NON-GOALS, CONSTRAINTS, APPROVAL GATES,
ACCEPTANCE, VERIFICATION, RETURN_FORMAT) a vyžaduj Agent Return se
STATUS + evidencí testů — „complete" bez evidence není complete (v2.0.1 §5).
Gate před každým deployem: `npx tsc --noEmit` + `npx tsx scripts/check-kviz.ts`.
