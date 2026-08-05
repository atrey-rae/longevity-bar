# Release runbook

1. V Supabase SQL Editoru spusť pouze `PREFLIGHT.sql`. Vyřeš všechny řádky
   `DUPLICATE` a `INVALID`; nic automaticky neslučuj.
2. Spusť `supabase/migrations/005_phone_first_auth.sql`.
3. Ve Vercelu nastav serverové proměnné z `.env.example`, hlavně nový náhodný
   `BAR_AUTH_PEPPER` a existující OptimCall/Resend údaje. Žádná z nich nesmí
   mít prefix `NEXT_PUBLIC_`.
4. Teprve potom nasaď aplikaci.
5. Smoke test na vlastním čísle: telefon → SMS se čtyřmi číslicemi → návrat z
   jiné aplikace na stále otevřený krok kódu → přihlášení → zadání e-mailu →
   aktivace odkazu → výběr a výdej testovací odměny.
6. Ověř starý Google/e-mailový účet a administraci.
7. Zkontroluj, že v `profiles.email` není žádná adresa končící
   `@auth.longevity.invalid` a že tabulky challenge/tokenů nejsou čitelné anon
   ani authenticated rolí.

Rollback aplikace bez rollbacku migrace je bezpečný pouze před vznikem nových
telefonních účtů. Po ostrém použití se identity nesmějí mazat ani slučovat bez
datové kontroly.
