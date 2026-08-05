# STATE — Longevity Bar (k 4. 8. 2026, předání)

## Co appka je

Next.js 15 (App Router) + Tailwind v4 + Supabase. Dvě funkce:

1. **Věrnostní program** (`/`, `/scan/<token>`, `/admin`): razítka za nákupy
   skenem denního QR, odměna za každá 4 razítka (Cocofir → voda → drink),
   výdejová „vstupenka" s živými hodinami + hold-to-confirm. Login Google
   OAuth nebo e-mail+kód. Admin: Atrey (viz `/admin` allowlist v kódu).
2. **Kvíz bavičů** (`/kviz/<a1|b2|c3|d4|e5|f6>`): „Odemkni potenciál svého
   mikrobiomu!" — 3 otázky → doporučení 6–8 produktů (3 pilíře, gut první)
   → kontakt → kupón 21 % (personalizovaný přes CS care-api; fallback
   sdílený kód + e-mail notifikace na atrey@). Zkratka „Už mám svůj
   oblíbený produkt" → celý katalog 66. Detaily README §9.

## Ověřený stav (evidence v EVIDENCE.md)

- Produkce: https://bar.peaceandcoco.com (Vercel `longevity-bar`,
  team wild-and-coco). Kvíz e2e ověřen 4. 8. vč. vzniku kupónu v CS
  (id 15592) a leadu v `quiz_leads`.
- Supabase ref `zrfbtrlrgsygpraetjog`; migrace 001–003 aplikované.
- Git: `atrey-rae/longevity-bar`, default větev
  `claude/longevity-bar-loyalty-app-m1px95` (⚠️ historický název, je to
  JEDINÁ a výchozí větev; nepřejmenovávat za festivalu). Working tree
  clean, vše pushnuté.
- Gitleaks: no leaks (allowlist `.gitleaks.toml` pro dummy `.env.example`).

## Převzetí orchestrace cockpitem ChatGPT/Codex

- **4. 8. 2026:** Codex načetl celý Task Pack a potvrdil roli jediného
  aktivního orchestrátora podle `HANDOFF.md`; Claude zůstává exekutivní
  read-only/review vrstvou, dokud Atrey nerozhodne jinak.
- Projektový Task Pack vznikl pod P&COS handoffem v2.0.1; převzetí bylo
  provedeno proti aktuálnímu kanonickému release
  `PCOS-HANDOFF-2026-08-04-v2.0.2`. Pro tento read-only takeover nebyl
  nalezen konflikt; před další write/produkční akcí se řídíme v2.0.2.
- Lokální `HEAD`, výchozí větev i vzdálená větev byly při převzetí shodně
  na `0e94f479028fd7565dfba7bcf464d64858b81f7f`; working tree byl čistý.
- Read-only smoke test potvrdil HTTP 200 pro `/`, `/kviz/d4`, `/pravidla`
  i hlavní `https://peaceandcoco.com/`; schválený mikrobiom framing a GDPR
  text byly v produkčním HTML přítomné.
- Nový lokální běh TypeScript/kvíz gate se při převzetí nedokončil kvůli
  blokovanému I/O lokálního filesystemu a byl bezpečně ukončen; nejde tedy
  o nový zelený ani červený důkaz. Platí poslední dokončené testy z
  `EVIDENCE.md`, dokud gate nebude zopakován před případnou změnou/deployem.

## Infrastruktura a secrets (jen umístění, nikdy hodnoty)

| Co | Kde |
|---|---|
| Env produkce (Supabase klíče, RESEND_API_KEY, CS_CARE_*) | Vercel → longevity-bar → Environment Variables (sensitive) |
| CS care-api heslo | Atreyův stroj `~/.claude.json` (cloudsailor MCP) + Vercel env |
| Google OAuth klient | GCP projekt wildncoco, klient `longevity-bar` — ⚠️ secret po festivalu rotovat |
| Resend klíče | Resend účet W&C (`supabase-smtp`, `vercel-kviz-kupony`) |
| DNS | CF zóna peaceandcoco.com, `bar` A 76.76.21.21 DNS-only |

## Vazby mimo repo

- Sdílené kupóny (402 ks) + skupina HEALING-DYNAMIC žijí v CloudSailor;
  mapování produkt↔kód: `_data/healing-festival-bar/kviz-kupony-mapping.md`.
- QR k tisku: `_data/healing-festival-bar/qr-vernostni/` (denní + bavičské).
- Týmová appka healing.peaceandcoco.com = jiné repo (`healing-festival-bar`),
  jiný stack (CF Worker+D1); sdílí jen branding a festival.

## Známá omezení / dluh

- Filip Páral tech review a Tadeášova acceptance NEPROBĚHLY (viz
  P&COS_REVIEW.md) — appka šla live pod festivalovým časovým tlakem
  s explicitními GO Atreye per krok.
- Monitoring je manuální (RUNBOOK §2); žádný alerting kromě fallback
  e-mailů kvízu.
- Rate-limit kvízu: 10 min/e-mail+bavič (obejitelný změnou e-mailu — vědomě
  přijato, kupóny jsou vázané na e-mail).
- `.env.local` lokálně neobsahuje klíče (jen Vercel OIDC) — lokální dev
  neumí server actions; pro vývoj si vyžádej klíče od Atreye.
