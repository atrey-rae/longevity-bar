# 🚀 NASAZENÍ — instrukce pro Claude (druhý profil, stroj s přístupem k doméně)

**Ahoj Claude!** Tento dokument je psaný pro tebe. Tvým úkolem je nasadit hotovou
věrnostní webovou appku „Longevity Bar“ do produkce. Appka je **kompletní,
zreviewovaná a otestovaná** (build + typecheck prošly) — **nic nevyvíjíš,
jen nasazuješ**. Pracuj společně s Atreyem: on má přihlašovací údaje
(Supabase, Vercel, Google Cloud, DNS), ty ho krok za krokem veď a dělej,
co jde udělat z terminálu.

⏰ **Deadline: appka musí běžet nejpozději ve středu 5. 8. 2026 ráno.**
Festival otevírá ve středu v 15:00, školení týmu je v úterý 4. 8.

---

## 1. Kde co najdeš

Repozitář: **`atrey-rae/longevity-bar`** (GitHub), výchozí větev
`claude/longevity-bar-loyalty-app-m1px95` — všechno je na ní.

```bash
git clone <URL repa atrey-rae/longevity-bar>
cd longevity-bar
```

| Soubor / složka | Co to je |
|---|---|
| `README.md` | **HLAVNÍ NÁVOD NASAZENÍ** — kapitola 4 obsahuje všechny kroky do detailu (Supabase, Google OAuth, SMTP, Vercel, doména). Tento dokument je jen zkrácená mapa; při nejasnosti platí README. |
| `ZADANI.md` | Zadání a kompletní popis fungování appky (mechanika razítek, tiery odměn, flow zákazníka i obsluhy). Čti pro kontext, nic v něm neměň. |
| `CLAUDE.md` | Pokyny pro Claude v tomto projektu (role, jazyk, doména). |
| `NASAZENI.md` | Tento soubor. |
| `docs/TAHAK-POKLADNA.md` | Jednostránkový tahák pro pokladní — **vytisknout na školení 4. 8.** |
| `supabase/migrations/001_init.sql` | Jediná DB migrace: tabulky, RLS, trigger, seed produktů (finální ceník), nastavení a festivalových dnů 5.–9. 8. Spouští se ručně v Supabase SQL editoru. Idempotentní. |
| `src/` | Kód appky (Next.js 15, App Router, TypeScript, Tailwind). Neměň. |
| `.env.example` | Vzor 4 potřebných env proměnných s komentáři, kde je vzít. |

## 2. Postup nasazení (zkrácený — detaily v README §4)

Pořadí je důležité. Kroky označené 👤 vyžadují Atreye (přihlášení do služeb).

1. **Supabase** 👤 — nový projekt (region EU, např. Frankfurt).
   - SQL Editor → vložit celý obsah `supabase/migrations/001_init.sql` → Run.
   - Ověř: tabulka `event_days` má 5 řádků (5.–9. 8. 2026), `products` 23 řádků.
2. **Google OAuth** 👤 — Google Cloud Console → OAuth client (Web):
   redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
   V Supabase: Authentication → Providers → Google → zapnout, vložit Client ID + Secret.
3. **SMTP pro e-mailové kódy** 👤 — Supabase → Authentication → SMTP:
   nastavit Resend nebo Brevo (vestavěný SMTP má limit ~2 e-maily/h — nestačí!).
   ⚠️ V šabloně „Magic Link“ nahradit odkaz za **`{{ .Token }}`** (6místný kód),
   jinak lidem chodí odkaz místo kódu, který appka očekává.
4. **Vercel** 👤 — Import git repa (větev `claude/longevity-bar-loyalty-app-m1px95`),
   framework Next.js, žádná speciální konfigurace. Env proměnné dle `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (tajný!), `NEXT_PUBLIC_SITE_URL=https://bar.peaceandcoco.com`.
5. **Doména** 👤 — u registrátora peaceandcoco.com přidat CNAME:
   `bar` → `cname.vercel-dns.com`, ve Vercelu přidat doménu `bar.peaceandcoco.com`.
   V Supabase: Authentication → URL Configuration → Site URL
   `https://bar.peaceandcoco.com`, Redirect URL `https://bar.peaceandcoco.com/auth/callback`.
6. **Tisk QR** — až doména běží: `/admin/dny` (přihlásit se jako
   atrey@wildandcoco.com, je naseedovaný jako admin) → u každého dne „Tisk QR“
   → vytisknout 5 listů. ⚠️ QR obsahují `NEXT_PUBLIC_SITE_URL` — tisknout až
   PO nastavení finální domény a redeployi.

## 3. Ověření po nasazení (projdi celé, zabere ~10 minut)

1. `https://bar.peaceandcoco.com` → načte se přihlášení (česky, kokosový vzhled).
2. Přihlášení Googlem funguje; přihlášení e-mailem doručí **6místný kód**.
3. V `/admin/dny` zkopíruj scan URL středečního dne → otevři ji:
   - ve středu 5. 8. připíše razítko (konfety, 1/4);
   - dřív než 5. 8. správně ohlásí, že QR platí až v den festivalu.
   - druhé otevření hned po sobě → hláška o cooldownu (to je správně).
4. `/admin` ukazuje statistiky; nepřihlášeného přesměruje na login;
   ne-admin účet dostane „přístup odepřen“.
5. Testovací výhra: v `/admin/uzivatele` přidej svému účtu ručně 4 razítka →
   na kartě naskočí „Vyhráváš!“ → vyber produkt → na „vstupence“ běží hodiny →
   podrž 3 s „VYDAT“ → „Vydáno ✓“. Pak razítka zase odeber (tamtéž).
6. Mobil: otevři na telefonu, zkontroluj čitelnost na slunci (velká tlačítka, kontrast).

## 4. Čeho se NEDOTÝKAT

- **Kód a migrace neměň** — prošly review. Když něco nefunguje, je to skoro
  jistě konfigurace (env, OAuth redirect, SMTP šablona, DNS) — viz README §8
  „Řešení potíží“.
- Produkty a ceny jsou dle **zmrazeného FINAL ceníku** — případné změny dělá
  Atrey za provozu v `/admin/produkty`, ne v SQL.
- Tokeny dnů negeneruj znovu, pokud už jsou QR vytištěné (tlačítko „Nový token“
  zneplatní starý QR!).
- `SUPABASE_SERVICE_ROLE_KEY` nikdy nedávej do klientského kódu, logů ani chatu.

## 5. Kontext appky (kdyby ses potřeboval zorientovat)

Zákazník po nákupu sejme denní QR u pokladny → přihlásí se → sbírá razítka
(1 nákup = 1 razítko, cooldown 10 min, max 4/den). Za každá 4 razítka odměna
dle výběru: 1. Cocofir 250 ml → 2. kokosová voda 500 ml → 3. drink z menu,
pak cyklus znovu. Výdej: zákazník ukáže „vstupenku“ s běžícími hodinami,
obsluha podrží 3 s tlačítko VYDAT na jeho telefonu. Veškerá pravidla vynucuje
server (service role), klient nic. Detaily v `ZADANI.md`.

Hodně štěstí — a ať to frčí! 🥥
