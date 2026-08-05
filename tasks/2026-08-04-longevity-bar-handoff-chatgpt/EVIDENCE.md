# EVIDENCE — Longevity Bar (release + verifikace)

Vše ověřeno živě 4. 8. 2026 v noci/ráno (Europe/Prague), pokud není uvedeno
jinak. Poslední sekce se doplňuje při každém dalším release.

## Kód a git

- Repo `atrey-rae/longevity-bar` (private), default větev
  `claude/longevity-bar-loyalty-app-m1px95`, working tree clean, pushnuto.
- Klíčové commity: `5236d8b` kvíz v1 · `9316c3e` kvíz v2 (zdraví/trávení)
  + fallback notifikace · `0d4a15c` Q3 snídaně snů + nesnídám + zkratka ·
  `303673e` mikrobiom framing + GDPR.
- Gitleaks: **no leaks** (1 dřívější hit = dummy placeholder v
  `.env.example`, allowlist `.gitleaks.toml`).

## Testy a kontroly (poslední zelené běhy)

- `npx tsc --noEmit` → EXIT 0.
- `npx tsx scripts/check-kviz.ts` → **80/80 kombinací OK** (6–8 produktů,
  unikátní, všechny slugy v katalogu, ≥2 z gut pilíře).
- Security: app-security-reviewer (agent) na kvíz — PASS-with-notes,
  LOW hardeningy zapracované (3. 8.).

## E2E důkazy (produkce)

- **Kvíz D4** (3. 8. 23:41): celý flow → personalizovaný kupón
  `HEAL21-D4-CCG150-W74A` vznikl v CS (id 15592) s dependentEmail
  atrey@wildandcoco.com, validTo 2026-12-31, bez maxUses, min 500 Kč,
  visibility true, skupina HEALING-DYNAMIC; lead v `quiz_leads`
  (telefon normalizován +420…); e-mail doručen.
- **Kvíz A1 v2** (4. 8. 00:14): nové otázky → kupón `HEAL21-A1-HISTA60-K9HA`
  (id 15593) ověřen a poté smazán (testovací, usesCount 0).
- **Mikrobiom framing + GDPR** (4. 8. ráno): intro „Odemkni potenciál
  svého mikrobiomu!" živě; /pravidla obsahuje telefon + marketing
  6 zpráv/6 měsíců + domény .com/.de/.sk/.at/.ch.
- Věrnostní část: Google login → /admin OK; scan mimo den → „QR dnes
  neplatí" bez razítka (3. 8.).

## Kupónová vrstva (CloudSailor)

- 402 aktivních sdílených kupónů (6 bavičů × 67 slugů), skupina
  HEALING-DYNAMIC (id 82); zrušené produkty deaktivované (29 ks).
  Po festivalu: usesCount=0 smazat, použité deaktivovat (DECISIONS 4. 8.).

## Release log

| Datum/čas | Co | Verze/commit | Ověření |
|---|---|---|---|
| 3. 8. večer | věrnostní appka live (bar.peaceandcoco.com) | 8366944 | login+scan e2e |
| 4. 8. ~01:45 | kvíz v1 + personalizované kupóny | 5236d8b | e2e kupón 15592 |
| 4. 8. ~02:40 | kvíz v2 otázky + fallback notifikace | 9316c3e | e2e kupón 15593, 64/64 |
| 4. 8. ~03:10 | Q3 nesnídám + zkratka oblíbený | 0d4a15c | 80/80 + live klik |
| 4. 8. ~07:30 | mikrobiom framing + GDPR | 303673e | live intro + /pravidla |
| 4. 8. ~09:45 | W&C design pass (mobil ~6,0→~8,9, a11y AA, texty beze změny) | 07f8d79 | tsc EXIT 0 · check-kviz 80/80 · live mobil screenshoty úvod+Q2 · /dev-vyhra smazána |
| 4. 8. ~09:50 | handoff dokumentace (Task Pack, RUNBOOK, README §9) | 5bcf32c | gitleaks no leaks · cold-start soubory kompletní |

## Codex takeover read-back (4. 8. 2026)

- Git fetch/read-back: lokální `HEAD` = vzdálená výchozí větev =
  `0e94f479028fd7565dfba7bcf464d64858b81f7f`; před dokumentačním zápisem
  byl working tree čistý.
- Read-only HTTP smoke test: `https://bar.peaceandcoco.com/` 200,
  `/kviz/d4` 200, `/pravidla` 200, `https://peaceandcoco.com/` 200.
- Produkční HTML kvízu obsahovalo „Odemkni potenciál svého mikrobiomu“;
  `/pravidla` obsahovala telefon, 6 měsíců a 6 přátelských zpráv.
- Pokus o nový lokální gate a nezávislý Claude code scan byl bezpečně
  ukončen po dlouhém čekání na I/O. Výsledek se **nezapočítává** jako test;
  před dalším deployem zůstává povinné znovu spustit oba gate příkazy.
