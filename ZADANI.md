# ZADÁNÍ — Věrnostní appka „Longevity Bar“ (Healing Festival)

Webová věrnostní aplikace pro návštěvníky stánku **Longevity Bar** (Wild & Coco / Peace & Coco) na Healing Festivalu. Zákazník sbírá razítka za nákupy skrze QR kód u pokladny a za každá 4 razítka získává odměnu dle vlastního výběru.

---

## 1. Věrnostní mechanika

- **1 nákup (transakce) = 1 razítko.** Razítko se načte otevřením URL z QR kódu vytištěného u pokladny.
- Odměny po úrovních (tzv. „tiery“), vždy po 4 razítkách:

| Tier | Razítka | Odměna (výběr zákazníka) |
|------|---------|--------------------------|
| 1 | 1.–4. | **Cocofir 250 ml** — libovolná příchuť |
| 2 | 5.–8. | **Kokosová voda** — libovolná varianta |
| 3 | 9.–12. | **Drink** — libovolný nápoj z nabídky |

- Po vyzvednutí 3. odměny se cyklus **opakuje od tieru 1** (konfigurovatelné v nastavení: opakovat / ukončit poděkováním).
- Razítka se počítají průběžně — zákazník může nakupovat dál i s nevyzvednutou odměnou (razítka se mu střádají na další tier, nevyzvednutá odměna nepropadá).

## 2. Uživatelský flow (zákazník)

1. **Nákup** → pokladní ukáže zákazníkovi vytištěný QR kód (denní).
2. **Sken QR** telefonem → otevře se URL `https://<doména>/scan/<denní-token>`.
3. **Přihlášení** (jen poprvé): Google účet (1 klik, preferovaná cesta) nebo e-mail + 6místný ověřovací kód. Token ze skenu se uchová a razítko se připíše hned po přihlášení.
4. **Připsání razítka**: konfety + karta se 4 políčky (např. „2 / 4“). Pod kartou vidí, jaká odměna ho čeká.
5. **4. razítko** → oslavná obrazovka **„Vyhráváš! Vyber si:“** → mřížka produktů daného tieru (jen aktivní/nevyprodané) → klik na produkt.
6. **„Vstupenka“ na odměnu**: obrazovka s názvem a obrázkem produktu, živou animací + běžícími hodinami (ochrana proti screenshotu) a textem „Ukaž u pokladny“.
7. **Výdej u pokladny**: obsluha zkontroluje obrazovku, vydá produkt a **podrží 3 s tlačítko „VYDAT (jen obsluha)“** na telefonu zákazníka → stav „Vydáno ✓“.
8. Tlačítko **„Chci dál sbírat odměny“** → zpět na kartu, začíná další tier.
9. **Ztracená obrazovka**: veškerý stav je na serveru — stačí znovu sejmout QR u pokladny nebo otevřít appku; nevyzvednutá odměna se zobrazí znovu automaticky.

## 3. Flow obsluhy (pokladna)

- U pokladny je pouze **papírový QR kód** — obsluha nepotřebuje žádné zařízení.
- Každý festivalový den má **vlastní QR** (jiný token). Ráno se vymění list. QR směřuje k obsluze a ukazuje se **až po zaplacení**.
- Výdej odměny: vizuální kontrola (živá animace + hodiny = ne screenshot) → výdej → podržení tlačítka VYDAT na telefonu zákazníka.
- Reklamace / ruční zásah řeší admin v `/admin` (přidání/odebrání razítka, ruční označení odměny za vydanou).

## 4. Ochrana proti zneužití

| Riziko | Opatření |
|--------|----------|
| Opakované skenování téhož QR | **Cooldown** mezi razítky (výchozí 10 min, nastavitelné) + volitelný denní limit razítek (výchozí 4/den) |
| Sdílení fotky QR mimo stánek | Token platí **jen v daný den**; cooldown + denní limit; QR fyzicky u obsluhy, ukazuje se po zaplacení |
| Screenshot „vstupenky“ na odměnu | Živá animace + běžící hodiny na obrazovce; odměna se serverově znehodnotí prvním výdejem |
| Falešné potvrzení výdeje zákazníkem | Dlouhé podržení tlačítka; případné „samo-vydání“ poškozuje jen zákazníka (přijde o odměnu bez produktu). Volitelně lze zapnout PIN obsluhy (v nastavení). |
| Podvod přes více účtů | Přijatelné riziko (nutný nový e-mail + 4 nákupy); neřešíme technicky |

## 5. Obrazovky

| Route | Obsah |
|-------|-------|
| `/` | Věrnostní karta: políčka razítek, aktuální tier, nevyzvednutá odměna, historie odměn |
| `/scan/[token]` | Připsání razítka (redirect na kartu s výsledkem: úspěch / cooldown / neplatný den) |
| `/prihlaseni` | Google OAuth + e-mail OTP |
| `/vyber` | Výběr odměny — mřížka produktů aktuálního tieru |
| `/odmena/[id]` | „Vstupenka“ — ukaž u pokladny, tlačítko VYDAT (long-press), po vydání „Chci dál sbírat odměny“ |
| `/pravidla` | Pravidla věrnostního programu + GDPR poznámka |
| `/admin` | Statistiky: razítka dnes, počet uživatelů, odměny čekající/vydané dle produktu (plánování zásob) |
| `/admin/dny` | Správa festivalových dnů, generování tokenů |
| `/admin/dny/[id]/tisk` | Tisková stránka s velkým QR kódem pro daný den |
| `/admin/produkty` | Zapnutí/vypnutí produktů (vyprodaná příchuť → skrýt z výběru) |
| `/admin/uzivatele` | Vyhledání uživatele dle e-mailu, ruční korekce razítek/odměn |

## 6. Technický stack

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS** — nasazení na **Vercel** (free tier stačí), subdoména např. `bar.peaceandcoco.com`.
- **Supabase** (free tier): Postgres + Auth (Google OAuth, e-mail OTP). RLS: uživatel čte jen svá data; **všechny zápisy jdou přes serverové route handlery se service-role klíčem** (cooldown, validace tokenu dne, výdej — nic z toho nesmí být vynucováno jen na klientovi).
- **QR kódy**: generování v admin tiskové stránce (balíček `qrcode`).
- **PWA-lite**: manifest + ikona (přidání na plochu), appka je online-only.
- E-maily pro OTP: v Supabase nastavit **vlastní SMTP** (Resend/Brevo) — vestavěný limit Supabase (≈2 e-maily/h) by na festivalu nestačil. Google login je primární cesta.

## 7. Datový model (Postgres / Supabase)

- `profiles` — id (= auth.users.id), email, jméno, created_at
- `event_days` — id, datum, token (unikátní, náhodný), aktivní
- `stamps` — id, user_id, day_id, created_at
- `products` — id, kategorie (`cocofir` / `coco_water` / `drink`), název, pořadí, aktivní
- `rewards` — id, user_id, tier_index (pořadí odměny uživatele), kategorie, product_id (null = ještě nevybráno), stav (`ready` → `selected` → `redeemed`), selected_at, redeemed_at
- `settings` — klíč/hodnota: cooldown_minut, denni_limit, opakovat_cyklus, admin_emaily, pin_obsluhy (volitelný)

**Odvozený stav**: `dostupná razítka = počet razítek − 4 × počet odměn`. Jakmile `dostupná ≥ 4` a neexistuje odměna ve stavu `ready`/`selected`, server založí odměnu s kategorií dle `tier_index % 3` (0→cocofir, 1→kokosová voda, 2→drink).

## 8. Produkty (seed) — dle FINAL ceníku Longevity Bar (know-how v3, 29. 7. 2026)

**Tier 1 — Cocofir 250 ml** (6 příchutí):
Young Coconut · Mango · Rybíz · Čoko · Banana Lemon · Slaný karamel

**Tier 2 — Kokosová voda 500 ml** (2 varianty):
Wild Raw · Thai Raw

**Tier 3 — Drink** (všechny nápoje z menu):
Espresso · Doppio · Lungo · Cappuccino · Flat white · Batch brew · Cold brew · Matcha latté · Matcha mango latté · Cacao magic · Wild ceremony cacao · Longevity drink · Longevito mocktail · Coconut Cuvée · Kombucha levandule

Správa (vypnutí vyprodaných, doplnění) v `/admin/produkty`. Výdej odměny zdarma se na NFCtron markuje dle dohodnutého interního procesu (mimo rozsah appky).

**Seed festivalových dnů**: 5. 8. – 9. 8. 2026 (středa–neděle), tokeny vygenerované náhodně při migraci, QR k tisku v `/admin/dny`.

## 9. Mimo rozsah (v1)

- Offline režim, nativní aplikace, push notifikace
- Napojení na pokladní systém
- Marketingové e-maily (e-mail se používá jen pro přihlášení)

## 10. Nasazení (kroky pro majitele)

1. Založit projekt na Supabase, spustit `supabase/migrations/*.sql`, nastavit Google OAuth provider + vlastní SMTP.
2. Nasadit repo na Vercel, vyplnit env proměnné dle `.env.example`.
3. Ve Vercelu připojit subdoménu `bar.peaceandcoco.com` (CNAME na doméně peaceandcoco.com).
4. V `/admin/dny` založit festivalové dny, vytisknout QR z tiskové stránky.
5. Nastavit admin e-maily v `settings`.
