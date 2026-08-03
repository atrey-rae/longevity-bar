# 🥥 Longevity Bar — věrnostní appka

Webová věrnostní aplikace pro stánek **Longevity Bar** (Wild & Coco / Peace & Coco)
na Healing Festivalu. Zákazník sbírá razítka skenem denního QR kódu u pokladny
a za každá **4 razítka** dostane odměnu podle vlastního výběru.

| Tier | Razítka | Odměna |
|------|---------|--------|
| 1 | 1.–4. | Cocofir 250 ml — libovolná příchuť |
| 2 | 5.–8. | Kokosová voda 500 ml — libovolná varianta |
| 3 | 9.–12. | Drink — libovolný nápoj z menu |

Po třetí odměně se cyklus opakuje od začátku (lze vypnout v nastavení).

---

## Obsah

1. [Technologie](#1-technologie)
2. [Struktura projektu](#2-struktura-projektu)
3. [Lokální spuštění](#3-lokální-spuštění)
4. [Nasazení krok za krokem](#4-nasazení-krok-za-krokem)
   - [4.1 Supabase projekt a migrace](#41-supabase-projekt-a-migrace)
   - [4.2 Google OAuth](#42-google-oauth)
   - [4.3 Vlastní SMTP a 6místný kód](#43-vlastní-smtp-a-6místný-kód)
   - [4.4 Nasazení na Vercel](#44-nasazení-na-vercel)
   - [4.5 Subdoména bar.peaceandcoco.com](#45-subdoména-barpeaceandcocom)
   - [4.6 Admin e-maily](#46-admin-e-maily)
   - [4.7 Festivalové dny a tisk QR](#47-festivalové-dny-a-tisk-qr)
5. [Nastavení aplikace](#5-nastavení-aplikace)
6. [Provoz na festivalu](#6-provoz-na-festivalu)
7. [Bezpečnost a ochrana proti zneužití](#7-bezpečnost-a-ochrana-proti-zneužití)
8. [Řešení potíží](#8-řešení-potíží)
9. [Po festivalu (GDPR)](#9-po-festivalu-gdpr)

---

## 1. Technologie

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — Postgres, Auth (Google OAuth + e-mail OTP), RLS
- **Vercel** — hosting (free tier bohatě stačí)
- `qrcode` — generování QR kódů na tiskové stránce
- PWA-lite: manifest + ikona (přidání na plochu), appka je **online-only**

Bez dalších knihoven — žádný UI framework, žádný state manager.

**Klíčové pravidlo:** veškerá herní logika (připsání razítka, cooldown, denní
limit, platnost denního tokenu, založení odměny, výběr produktu, výdej) běží
**na serveru** přes service-role klíč. Klient nevynucuje nic.

---

## 2. Struktura projektu

```
src/
├── app/
│   ├── page.tsx                      věrnostní karta (/)
│   ├── prihlaseni/                   Google OAuth + e-mail OTP
│   ├── scan/[token]/                 připsání razítka ze skenu QR
│   ├── vyber/                        výběr odměny z produktů tieru
│   ├── odmena/[id]/                  „vstupenka“ + tlačítko VYDAT
│   ├── pravidla/                     pravidla programu + GDPR
│   ├── admin/                        administrace (chráněná)
│   │   ├── page.tsx                  statistiky
│   │   ├── dny/                      festivalové dny a tokeny
│   │   ├── dny/[id]/tisk/            tisková stránka s velkým QR
│   │   ├── produkty/                 zapnutí/vypnutí produktů
│   │   ├── uzivatele/                hledání a ruční korekce
│   │   └── actions.ts                server actions administrace
│   ├── api/odmena/vybrat/            POST — výběr produktu
│   ├── api/odmena/[id]/vydat/        POST — výdej odměny
│   └── auth/callback | odhlasit/     OAuth návrat, odhlášení
├── components/                       klientské komponenty (konfety, long-press…)
├── lib/
│   ├── loyalty.ts                    ČISTÁ věrnostní logika (bez DB)
│   ├── loyalty-server.ts             serverové zápisy (service role)
│   ├── settings.ts                   nastavení z tabulky settings
│   ├── time.ts                       čas v Europe/Prague
│   ├── admin-guard.ts                ochrana administrace
│   └── supabase/                     klienti (browser / server / admin)
└── middleware.ts                     obnova Supabase session

supabase/migrations/001_init.sql      tabulky, RLS, trigger, seed
```

---

## 3. Lokální spuštění

```bash
npm install
cp .env.example .env.local     # a vyplň hodnoty ze Supabase (viz kap. 4.1)
npm run dev                    # http://localhost:3000
```

Další skripty:

```bash
npm run build       # produkční build (musí projít před nasazením)
npm run typecheck   # kontrola typů
```

> `.env.local` **nikdy necommituj** — je v `.gitignore`.

---

## 4. Nasazení krok za krokem

### 4.1 Supabase projekt a migrace

1. Na [supabase.com](https://supabase.com) → **New project**.
   - Region zvol **Frankfurt / EU Central** (data v EU kvůli GDPR).
   - Ulož si databázové heslo.
2. V projektu otevři **SQL Editor** → **New query**.
3. Zkopíruj celý obsah `supabase/migrations/001_init.sql` a dej **Run**.
   Migrace vytvoří tabulky, RLS politiky, trigger na zakládání profilů
   a nasype seed (nastavení, produkty, 5 festivalových dnů 5.–9. 8. 2026).
   Skript je idempotentní — lze ho pustit i opakovaně.
4. Zkontroluj **Table Editor** → měly by být tabulky `profiles`, `event_days`,
   `stamps`, `products`, `rewards`, `settings`.
5. Opiš si klíče z **Project Settings → API**:

| Proměnná | Kde ji najdeš |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API keys → `anon` / `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | API keys → `service_role` — **TAJNÉ** |

> ⚠️ `service_role` klíč nikdy nedávej do proměnné s prefixem `NEXT_PUBLIC_`
> a nikdy ho nesdílej — obchází veškerá bezpečnostní pravidla databáze.

### 4.2 Google OAuth

Google login je primární a nejrychlejší cesta pro zákazníky.

1. [Google Cloud Console](https://console.cloud.google.com) → nový projekt
   (nebo existující) → **APIs & Services → OAuth consent screen**.
   - User type: **External**, publikuj aplikaci (jinak jen testovací účty).
   - Vyplň název „Longevity Bar“, kontaktní e-mail, doménu.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   - **Authorized JavaScript origins**: `https://bar.peaceandcoco.com`
   - **Authorized redirect URIs**:
     `https://<TVUJ-PROJECT-REF>.supabase.co/auth/v1/callback`
     (přesnou adresu ti Supabase ukáže v dalším kroku)
3. Zkopíruj **Client ID** a **Client secret**.
4. Supabase → **Authentication → Sign In / Providers → Google** → zapni,
   vlož Client ID a Secret, ulož.
5. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://bar.peaceandcoco.com`
   - **Redirect URLs** (přidej obě):
     - `https://bar.peaceandcoco.com/auth/callback`
     - `http://localhost:3000/auth/callback` (pro vývoj)

### 4.3 Vlastní SMTP a 6místný kód

Vestavěný e-mail Supabase má limit ~2 e-maily za hodinu — na festivalu
nepoužitelné. Nastav vlastní SMTP (**Resend** nebo **Brevo**, oba mají free tier).

1. Založ účet u [Resend](https://resend.com) (nebo Brevo), ověř doménu
   `peaceandcoco.com` (DNS záznamy SPF/DKIM) a vytvoř SMTP přihlašovací údaje.
2. Supabase → **Project Settings → Authentication → SMTP Settings** → **Enable
   custom SMTP**:
   - Host: `smtp.resend.com`, Port: `465`, User: `resend`,
     Password: tvůj API klíč
   - Sender email: `bar@peaceandcoco.com`, Sender name: `Longevity Bar`
3. Supabase → **Authentication → Rate Limits** → zvyš **„Rate limit for sending
   emails"** (např. na 100–200 / hodinu podle očekávané návštěvnosti).
4. **Důležité — 6místný kód místo odkazu:**
   Supabase → **Authentication → Emails → Magic Link** a uprav šablonu tak,
   aby obsahovala **`{{ .Token }}`**. Například:

   ```html
   <h2>Tvůj kód do Longevity Baru</h2>
   <p>Zadej v aplikaci tento ověřovací kód:</p>
   <p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>Kód platí 1 hodinu. Pokud jsi o něj nežádal(a), e-mail ignoruj.</p>
   ```

   Bez `{{ .Token }}` přijde jen odkaz a zákazník nebude mít co opsat.
5. Volitelně **Authentication → Providers → Email** → zkontroluj, že je
   povolený **Email OTP** a že **Confirm email** nebrání přihlášení.

### 4.4 Nasazení na Vercel

1. Nahraj repozitář na GitHub.
2. [vercel.com](https://vercel.com) → **Add New → Project** → importuj repo.
   Framework preset **Next.js** se detekuje sám, nic neměň.
3. **Environment Variables** (pro Production i Preview):

   ```
   NEXT_PUBLIC_SUPABASE_URL       = https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ...
   SUPABASE_SERVICE_ROLE_KEY      = eyJ...        (Secret)
   NEXT_PUBLIC_SITE_URL           = https://bar.peaceandcoco.com
   ```

4. **Deploy**.

> `NEXT_PUBLIC_SITE_URL` se propisuje do **obsahu QR kódů**. Nastav finální
> doménu **dřív, než začneš tisknout** — jinak budou vytištěné QR kódy mířit
> jinam. Po změně této proměnné je nutný nový deploy.

### 4.5 Subdoména bar.peaceandcoco.com

1. Vercel → projekt → **Settings → Domains → Add** → `bar.peaceandcoco.com`.
2. U registrátora / správce DNS domény `peaceandcoco.com` přidej:

   ```
   Typ: CNAME    Název: bar    Hodnota: cname.vercel-dns.com
   ```

3. Počkej na ověření (obvykle minuty, max hodiny) — Vercel vystaví HTTPS
   certifikát automaticky.
4. Zkontroluj, že `NEXT_PUBLIC_SITE_URL` odpovídá nové doméně a že Site URL
   i Redirect URLs v Supabase (kap. 4.2, krok 5) také.

### 4.6 Admin e-maily

Přístup do `/admin` se řídí seznamem v tabulce `settings`. Migrace nastavila
`atrey@wildandcoco.com`. Přidání dalších (Supabase → SQL Editor):

```sql
update public.settings
set value = '["atrey@wildandcoco.com", "obsluha@peaceandcoco.com"]'::jsonb,
    updated_at = now()
where key = 'admin_emails';
```

E-mail musí přesně odpovídat tomu, kterým se admin přihlásí (malá písmena).

### 4.7 Festivalové dny a tisk QR

1. Přihlas se na `https://bar.peaceandcoco.com` admin e-mailem.
2. Otevři **/admin/dny** — 5 dnů festivalu (5.–9. 8. 2026) už tam je ze seedu.
   Další den založíš formulářem nahoře (datum + popis).
3. U každého dne klikni **Tisk QR →** a vytiskni stránku (A4, měřítko 100 %,
   bez záhlaví/zápatí prohlížeče).
4. Listy vezmi na stánek — **jeden list na jeden den**, ráno se vyměňuje.

> Každý den má vlastní tajný token. QR z jiného dne razítko nepřipíše.
> Kdyby se kód dostal ven (např. někdo ho vyfotil a poslal dál), klikni
> u dne na **Nový token** a vytiskni list znovu — starý okamžitě přestane platit.

---

## 5. Nastavení aplikace

Tabulka `settings` (Supabase → SQL Editor). Hodnoty jsou JSON.

| Klíč | Výchozí | Význam |
|---|---|---|
| `cooldown_minutes` | `10` | Minimální rozestup mezi razítky jednoho zákazníka |
| `daily_limit` | `4` | Max. razítek na zákazníka za den (`0` = bez limitu) |
| `repeat_cycle` | `true` | Po 3. odměně začít znovu od tieru 1 |
| `admin_emails` | `["atrey@wildandcoco.com"]` | Přístup do `/admin` |
| `staff_pin` | `null` | Volitelný PIN obsluhy pro výdej odměny |

Příklady změn:

```sql
-- Prodloužit cooldown na 15 minut
update public.settings set value = '15'::jsonb where key = 'cooldown_minutes';

-- Zrušit denní limit
update public.settings set value = '0'::jsonb where key = 'daily_limit';

-- Zapnout PIN obsluhy (pozor na uvozovky — JSON string)
update public.settings set value = '"2468"'::jsonb where key = 'staff_pin';

-- Vypnout PIN
update public.settings set value = 'null'::jsonb where key = 'staff_pin';
```

Změna se projeví okamžitě, deploy není potřeba.

**Produkty** se spravují klikáním v **/admin/produkty** — vyprodanou příchuť
přepni na „Vyprodáno“ a zmizí z nabídky odměn. Zákazníkům, kteří ji už mají
vybranou, zůstane.

---

## 6. Provoz na festivalu

### Obsluha u pokladny

1. **Po zaplacení** ukaž zákazníkovi vytištěný QR kód. Nikdy ne dřív a nenechávej
   list volně na pultu.
2. Zákazník sejme kód telefonem, poprvé se přihlásí (Google = 1 klik).
3. **Výdej odměny:** zákazník ukáže „vstupenku“ na telefonu.
   - Zkontroluj, že obrazovka **žije** — barvy se přelévají a **hodiny běží
     po sekundách**. Screenshot je nehybný → nepřijímej ho.
   - Vydej produkt a **podrž 3 sekundy** tlačítko **VYDAT** na telefonu
     zákazníka. Objeví se „Vydáno ✓“.
4. Zákazník pokračuje tlačítkem „Chci dál sbírat odměny“.

### Časté situace

| Situace | Řešení |
|---|---|
| „Razítko už máš, další za X min“ | Zákazník sejmul kód podruhé (nebo obnovil stránku). V pořádku — razítko má. |
| Zákazník ztratil obrazovku / vybil telefon | Vše je na serveru. Po opětovném otevření appky se nevyzvednutá odměna zobrazí sama. |
| Zákazník omylem zmáčkl VYDAT sám | Admin v **/admin/uzivatele** najde e-mail a přidá razítka zpět (`+1 razítko` 4×), případně vrátí odměnu tlačítkem „Vrátit k výběru“. |
| Vybraná příchuť došla | **/admin/produkty** → přepni na „Vyprodáno“. U již vybraných odměn použij „Vrátit k výběru“. |
| Zákazníkovi se nepřipsalo razítko | **/admin/uzivatele** → najdi e-mail → `+1 razítko` (obchází cooldown i limit). |
| Nefunguje žádný QR | **/admin** ukáže varování, když pro dnešek není založený nebo je vypnutý den. |

### Ranní rutina

1. Vyměň vytištěný list QR za dnešní den.
2. Otevři **/admin** — zkontroluj, že nesvítí varování o chybějícím dni.
3. Projdi **/admin/produkty** a zapni/vypni, co je či není skladem.

---

## 7. Bezpečnost a ochrana proti zneužití

| Riziko | Opatření |
|---|---|
| Opakovaný sken téhož QR | Cooldown (10 min) + denní limit (4/den) — serverově |
| Sdílení fotky QR mimo stánek | Token platí jen v daný den; QR se ukazuje až po zaplacení; lze kdykoli přegenerovat |
| Screenshot „vstupenky“ | Živá animace + běžící hodiny; odměna se serverově znehodnotí prvním výdejem |
| Falešné potvrzení výdeje | Nutné 3s podržení; samo-vydání poškodí jen zákazníka; volitelný PIN obsluhy |
| Podvod přes více účtů | Přijaté riziko (nový e-mail + 4 nákupy) — neřešíme technicky |
| Přímé volání API z prohlížeče | RLS: uživatel čte jen svá data, zapisovat nemůže vůbec. Všechny zápisy jdou přes serverové endpointy se service-role klíčem, které pravidla vynucují. |
| Přístup do administrace | Kontrola e-mailu proti `settings.admin_emails` na serveru — v layoutu i v každé jednotlivé akci |

Denní hranice se počítají v zóně **Europe/Prague**, ne v UTC — QR kód se tedy
přepíná o půlnoci českého času.

---

## 8. Řešení potíží

**Build spadne na chybějících proměnných**
Aplikace čte env až za běhu, build projde i s dummy hodnotami. Pokud za běhu
uvidíš „Chybí proměnná prostředí…“, doplň ji ve Vercelu a spusť nový deploy.

**Po přihlášení přes Google se vrátím na chybovou stránku**
Zkontroluj **Redirect URLs** v Supabase (kap. 4.2 krok 5) a **Authorized
redirect URI** v Google Cloud (musí mířit na `…supabase.co/auth/v1/callback`).

**E-mail s kódem nechodí**
SMTP není nastavené nebo je vyčerpaný limit (kap. 4.3). Zkontroluj i logy
v Supabase → **Logs → Auth**.

**V e-mailu přijde odkaz místo 6místného kódu**
Šablona **Magic Link** neobsahuje `{{ .Token }}` — viz kap. 4.3, krok 4.

**„Tenhle QR kód dnes neplatí"**
Sejmutý kód patří jinému dni. Vytiskni list pro dnešek z **/admin/dny**.

**„Do administrace nemáš přístup"**
E-mail není v `settings.admin_emails` (kap. 4.6) nebo je zapsaný jinak
(velká písmena, překlep).

**Razítka se nepřipisují nikomu**
V **/admin** zkontroluj varování o dnešním dni; v **/admin/dny** musí být den
s dnešním datem a stavem *aktivní*.

**QR kódy míří na špatnou doménu**
Špatný `NEXT_PUBLIC_SITE_URL`. Oprav ve Vercelu, spusť deploy a **vytiskni QR
znovu**.

---

## 9. Po festivalu (GDPR)

E-maily se používají jen k přihlášení, marketing se neposílá. Data smaž
nejpozději do 3 měsíců po akci:

```sql
-- 1) provozní data
truncate table public.stamps, public.rewards;

-- 2) profily
delete from public.profiles;
```

Účty v Supabase Auth smaž v **Authentication → Users** (hromadný výběr →
Delete), nebo smaž rovnou celý Supabase projekt.

Na žádost jednotlivce o výmaz:

```sql
delete from public.profiles where email = 'zakaznik@email.cz';
-- razítka i odměny se smažou kaskádou; účet pak smaž v Authentication → Users
```

---

## Kontakt

Provozovatel: Wild & Coco / Peace & Coco — Longevity Bar, Healing Festival.
