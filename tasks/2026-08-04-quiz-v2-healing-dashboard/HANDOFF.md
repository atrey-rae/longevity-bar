# HANDOFF — Kvíz v2 a healing dashboard (bar.app)

- **Předává:** Claude Code, bounded brief
  `bar-healing-contract-final-review-2026-08-04`
- **Přebírá:** ChatGPT/Codex (jediný aktivní controller tohoto tasku)
- **Datum:** 2026-08-04T15:53:29+02:00
- **P&COS Release ID:** `PCOS-HANDOFF-2026-08-04-v2.0.2`
- **Produkce:** NEDOTČENA. Žádný deploy, žádná vzdálená migrace, žádné čtení
  ani nastavení env hodnot, žádný `git add`/`commit`/`push`.
- **Stav:** lokální checkpoint, **není release-ready** (viz `EVIDENCE.md` E-005).

## Odpovědnosti (P&COS)

| Role | Kdo | Stav |
|---|---|---|
| Accountable (rozhoduje, dává GO) | **Atrey Rae** | aktivní |
| Review (tech) | **Filip Páral** | ⛔ neproběhlo |
| Konzultace, test, předání týmu | **Tadeáš** | ⛔ neproběhlo |
| Orchestrace tasku | ChatGPT/Codex | aktivní |
| Exekuce v tomto briefu | Claude Code (bounded, file ownership) | dokončeno |

## Cold-start: 6 věcí, které musíš vědět

1. **Kde jsi.** Repo `longevity-bar` (bar.peaceandcoco.com, Next.js 15 +
   Supabase). Větev `claude/longevity-bar-loyalty-app-m1px95`, `HEAD`
   `0e94f479028fd7565dfba7bcf464d64858b81f7f` (= `origin/…`), working tree
   **dirty** od více souběžných session. Přesný výpis: `STATE.md`.
2. **Co se v tomto briefu zavřelo.** `GET /api/internal/healing-dashboard`
   dřív každou chybu Supabase převedl na `[]` a vrátil HTTP 200 s nulami —
   falešné provozní KPI. Nově je kritičnost zdroje **data** v
   `HEALING_DASHBOARD_SOURCES` (`src/lib/healing-dashboard.ts`):
   `quiz_leads`, `rewards`, `products` = `critical` → `HealingSourceError` →
   route vrátí 500; `quiz_hosts` = `degradable` → jen se zaloguje.
3. **Proč je `quiz_hosts` výjimka.** Nese jen volbu varianty kvízu. Dokud
   neproběhne migrace 004, tabulka nemusí existovat — a zákaznický kvíz
   **musí zůstat dostupný**. Bez ní jedou všichni baviči na
   `DEFAULT_QUIZ_VARIANT` (`microbiom`) a počty kupónů/odměn zůstávají správné.
4. **Zdravotní odpovědi se nikdy neukládají.** Obě varianty kvízu se skórují
   v prohlížeči. Na server jde jen bavič, varianta kvízu, vybraný produkt,
   kupón a kontakt (8 klíčů, hlídá `scripts/check-quiz-lead-payload.ts`).
   Interní API pro healing.app vrací jen agregované počty a názvy produktů —
   žádné osobní údaje (hlídá `scripts/check-healing-bridge.ts`).
5. **Nic není nasazené.** Migrace 004 je jen soubor, `HEALING_BRIDGE_SECRET`
   není nastavený nikde, endpointy nikdy neběžely proti databázi.
6. **`tsc --noEmit` není zelený.** Běhy se v iCloud filesystemu zasekly na I/O
   a byly přerušeny; brief měl zakázáno je opakovat. Nikdo nesmí tvrdit, že je
   checkpoint typově ověřený.

## Přesný kontrakt endpointů

Obojí: `runtime = "nodejs"`, `dynamic = "force-dynamic"`, autorizace hlavičkou
`Authorization: Bearer <HEALING_BRIDGE_SECRET>`, porovnání timing-safe,
**fail closed** (chybí-li nebo je-li prázdný secret na serveru, projde nikdo).
Klientovi se nikdy nevrací název tabulky, detail z databáze, stack ani secret.

### `GET /api/internal/healing-dashboard`

- **200:**
  ```json
  {
    "generatedAt": "2026-08-04T13:53:29.000Z",
    "hosts": [
      {
        "code": "A1",
        "slug": "a1",
        "name": "Ivona",
        "variant": "microbiom | profil",
        "coupons": 0,
        "products": [{ "slug": "NTR250", "name": "…", "count": 0 }]
      }
    ],
    "loyalty": {
      "redeemedTotal": 0,
      "byProduct": [{ "id": "<uuid produktu>", "name": "…", "count": 0 }]
    }
  }
  ```
  - `hosts` má **vždy všech 6 bavičů** v pořadí `A1, B2, C3, D4, E5, F6`
    (Ivona, Denisa, Amae, Atrey, Kateřina, Leonardo) — i když pro ně nejsou
    žádná data.
  - `variant` je z `quiz_hosts`; neznámá nebo chybějící hodnota → `microbiom`.
  - `products` řadí počet klesající, při remíze `slug` vzestupně;
    `loyalty.byProduct` stejně, při remíze `id` vzestupně.
  - `loyalty.redeemedTotal` počítá **všechny** `rewards.state === "redeemed"`
    (i bez `product_id`); `byProduct` jen ty s produktem, který existuje.
  - `generatedAt` stampuje route handler, ne agregace.
- **401:** `{ "error": "unauthorized" }`
- **500:** `{ "error": "dashboard selhal" }` — selhal kritický zdroj
  (`quiz_leads`, `rewards`, `products`) nebo klient Supabase. Název tabulky jde
  jen do serverového logu (`[healing-bridge] …`).

### `POST /api/internal/healing-dashboard/quiz-variant`

- **Tělo:** `{ "bavic": "A1", "variant": "microbiom" | "profil", "actor": "Atrey" }`
  - `bavic` je case-sensitive kód `A1`–`F6` (v DB je velkými).
  - `actor` je jen popiska do auditu, zkrátí se na 200 znaků; oprávnění řeší
    healing.app.
- **200:** `{ "ok": true, "host": { "code", "variant", "updated_at", "updated_by" } }`
- **400:** `{"error":"čekáme JSON objekt"}` · `{"error":"chybí kód baviče (bavic)"}`
  · `{"error":"chybí actor"}` ·
  `{"error":"neznámá varianta kvízu, čekáme microbiom | profil"}`
- **404:** `{ "error": "neznámý bavič" }`
- **500:** `{ "error": "zápis se nepodařil" }` (typicky chybějící `quiz_hosts`,
  tj. neaplikovaná migrace 004)

## Hranice zdrojů pravdy

| Data | Zdroj pravdy | Kdo smí zapisovat |
|---|---|---|
| Kvízové leady, kupóny, věrnostní razítka a odměny, volba varianty (`quiz_hosts`) | **Supabase / bar.app** | bar.app; healing.app jen přes interní API |
| Uživatelé, směny, týmové poznámky, personální stravenky | **D1 / healing.app** | healing.app |
| Odpovědi na zdravotní otázky | **nikde** — zůstávají v prohlížeči | nikdo |
| Katalog kupónů a skupina HEALING-DYNAMIC | CloudSailor | mimo tento repo |

healing.app je pro bar.app **jen klient interního API** — nikdy nesmí sahat do
Supabase přímo a nikdy nedostane osobní údaje.

## Pořadí migrace a deploye (až po GO Atreye)

1. **Migrace 004** na Supabase (`supabase/migrations/004_quiz_v2_hosts.sql`,
   idempotentní, SQL Editor). Bez ní: `GET` jede degradovaně (varianty
   `microbiom`), `POST /quiz-variant` vrací 500.
2. **`HEALING_BRIDGE_SECRET`** — vygenerovat (`openssl rand -hex 32`) a nastavit
   **stejnou hodnotu** ve Vercelu (bar.app, sensitive) i v secretech Workeru
   healing.app. Dokud chybí na jedné straně, healing.app dostává 401 (fail
   closed, není to porucha).
3. **Deploy bar.app** (Vercel) — endpointy začnou existovat. Bezpečné i před
   krokem 1, právě proto je `quiz_hosts` degradovatelná.
4. **Deploy healing.app Workeru** — až teď se dashboard rozsvítí.
5. **Post-deploy read-back** do `EVIDENCE.md` (HTTP kódy, ne obsah secretu).

Rollback: Vercel → předchozí deployment. Migrace 004 je aditivní, není třeba ji
vracet.

## Otevřené gates (nic z toho nesmí přeskočit)

1. **Mapování profil → produkt je DRAFT** a čeká na schválení Atreye
   (`SOURCE_QUIZ_MATRIX.md`).
2. **Filip Páral** — tech review neproběhla.
3. **Tadeáš** — konzultace, test a předání týmu neproběhly.
4. **`tsc --noEmit`** nebyl dokončen (iCloud I/O); potřeba doběhnout mimo
   iCloud nebo v CI.
5. Migrace, secrety a deploy neaplikované; produkční GO Atreye neexistuje.

## Kontrola pochopení (cold-start)

Přebírající musí umět říct: větev a `HEAD`; že je working tree dirty od více
session; že chyba `quiz_leads`/`rewards`/`products` musí skončit 500 a jen
`quiz_hosts` se smí degradovat; že zdravotní odpovědi neopouštějí prohlížeč;
že `tsc` není zelený; a že žádná produkční akce není schválená.

## Jak si stav ověřit (read-only, bez sítě)

```bash
git status --porcelain && git rev-parse HEAD
npx tsx scripts/check-kviz.ts              # 80/80
npx tsx scripts/check-kviz-profil.ts       # 15552/15552
npx tsx scripts/check-quiz-lead-payload.ts # 32/32
npx tsx scripts/check-healing-bridge.ts    # 45/45
git diff --check
```

`npm run typecheck` / `npm run build` **nespouštěj v iCloud adresáři** — dokud
neexistuje dokončený běh, zaseknuté I/O je známý stav, ne nový důkaz.
