# RUNBOOK — Longevity Bar (bar.peaceandcoco.com)

Provozní příručka pro řídicí cockpit (ChatGPT/Claude) a službu konající osobu.
Stav k 4. 8. 2026 ráno (před otevřením festivalu). Kanonická dokumentace:
`README.md` (architektura + nasazení), `ZADANI.md` (věrnostní mechanika),
`tasks/2026-08-04-longevity-bar-handoff-chatgpt/` (aktuální Task Pack).

## 1. Co kde běží

| Vrstva | Služba | Identifikátor |
|---|---|---|
| Hosting | Vercel, team `wild-and-coco`, projekt `longevity-bar` | deploy: `npx vercel@latest deploy --prod --yes` z rootu repa |
| DB + auth | Supabase Free, org „Longevity Bar", ref `zrfbtrlrgsygpraetjog` (Frankfurt) | tabulky: profiles, stamps, rewards…, `quiz_leads` |
| E-maily | Resend, doména `updates.wildandcoco.com` | odesílatel `bar@updates.wildandcoco.com`; klíče `supabase-smtp` (auth kódy) a `vercel-kviz-kupony` (kupóny) |
| Kupóny | CloudSailor care-api `https://www.wildandcoco.com/care-api/v1/coupons` | HTTP Basic `CS_CARE_USER`/`CS_CARE_PASSWORD`; skupina HEALING-DYNAMIC (id 82) |
| DNS | Cloudflare zóna peaceandcoco.com | `bar` = A 76.76.21.21 (Vercel), DNS-only |
| OAuth | Google Cloud projekt wildncoco, klient `longevity-bar` (368622718692-…) | ⚠️ secret po festivalu ROTOVAT (prošel screenshotem) |

Secrets: hodnoty jsou POUZE ve Vercel env (marked sensitive — nejdou pullnout)
a v Atreyových trezorech. Nikdy je nedávat do repa, chatu ani logů.

## 2. Denní provoz na festivalu (ST 5. 8. – NE 9. 8.)

- **Ráno:** vyměnit papírový denní QR u pokladny (tisková stránka
  `/admin/dny` → „Tisk QR"; tokeny NEregenerovat — „Nový token" zneplatní
  vytištěné listy!).
- **Baviči fronty:** mají vlastní tištěné QR na `/kviz/<slug>`
  (zdroj: `_data/healing-festival-bar/qr-vernostni/qr-kviz-bavici.html`).
- **Kontrola zdraví (1× ráno):** otevřít `https://bar.peaceandcoco.com/kviz/d4`
  (200 + úvodka), `/pravidla`, a zkontrolovat schránku atrey@ na
  `⚠️ Kvíz: fallback…` notifikace (= care-api zlobí).
- **Leady:** Supabase → SQL editor →
  `select count(*), max(created_at) from quiz_leads;`

## 3. Známé chování a incidenty

| Symptom | Příčina | Zásah |
|---|---|---|
| Host dostal kód bez suffixu (`HEAL21-D4-CCG150`, 3 části) a podmínky „do 30. 9., 1×" | care-api selhalo → fallback na sdílený kupón; přišla notifikace na atrey@ | Zkontrolovat důvod v notifikaci; ověřit CS_CARE_* env ve Vercelu; jednorázově OK, hromadně = eskalace Atreymu |
| E-mail s kupónem nedošel | Resend výpadek / špatný klíč | Obrazovka kód zobrazuje vždy — host neztrácí nic; zkontrolovat Resend dashboard |
| „Kód je zadán ve špatném tvaru" v košíku | kupón má v CS visibility=false | V CS admin nastavit viditelný=ANO (všechny nové zakládáme visibility:true) |
| Auth kódy nechodí | Supabase SMTP se tiše odulozilo (známý bug UI — Save vrací 400) | Supabase → Auth → SMTP: znovu vyplnit a ověřit PATCH 200 + reload |
| Upsert do profiles tiše selhává po ALTER TABLE | PostgREST nezná nový sloupec | SQL editor: `notify pgrst, 'reload schema';` |
| Kvíz vrací málo produktů po úpravě pilířů | rozbité slugy v GUT/FORMAT/AKCENT_PILIR a v pilířích varianty „profil“ | `npm run check` (musí být 80/80 i 138240/138240) |
| Kvíz nečekaně chce/nechce přihlášení | přepnutá politika `quiz_policy.login_required` | `/admin` → sekce „Kvíz bavičů“ ukáže stav i kdo přepnul; změna jen přes interní API (README §9.1) |
| Host hlásí „tenhle kvíz už máš hotový“ | dokončil tu variantu dřív (`quiz_completions`) | Správně — pošli ho na druhou variantu, na tu nárok má |

## 4. Deploy a rollback

```bash
npm run typecheck && npm run check     # gate (tsc + kontroly kvízu)
npx vercel@latest deploy --prod --yes  # deploy
```

Rollback: Vercel dashboard → Deployments → předchozí Production →
„Promote to Production" (nebo `npx vercel rollback`). DB migrace jsou
aditivní (001–003, 006), rollback DB není za festivalu potřeba ani žádoucí.

⚠️ Migrace `006_quiz_policy.sql` se pouští stejně jako ostatní (Supabase →
SQL Editor → Run) a je idempotentní. Bez ní kvíz jede na výchozí politice
(přihlášení ANO) a evidence dokončených variant se tiše neukládá.

Deploy gate dle P&COS: produkční zásah za festivalu = explicitní GO Atreye.

## 5. Po festivalu (checklist úklidu)

1. Sdílené kupóny HEALING-DYNAMIC s usesCount=0 **smazat**, použité
   deaktivovat (Atrey potvrdil 4. 8.). Personalizované nechat doběhnout
   (do 31. 12. 2026).
2. Rotovat Google OAuth client secret (`longevity-bar`).
3. Věrnostní data smazat do 3 měsíců; kvízové kontakty (`quiz_leads`)
   nejpozději do 6 měsíců od získání — dle /pravidla. Marketing: max 6
   zpráv, pak jen zákazníci e-shopu.
4. Zvážit vypnutí kvízových rout (nebo nechat — kupóny expirují samy).
