# Evidence

## Root review 2026-08-04

- Supabase project resolved read-only as `zrfbtrlrgsygpraetjog` (`longevity-bar`).
- Corrected `PREFLIGHT.sql` executed through the Management API: no invalid or
  duplicate legacy phones (2 profiles total, 1 profile with phone).
- Full migration 005 executed inside `BEGIN … ROLLBACK` against the production
  schema: syntax and dependencies GREEN, with no persistent database change.
- Added transactional `consume_phone_auth_challenge()` with `FOR UPDATE`, so
  concurrent guesses cannot bypass the five-attempt limit.
- E-mail resend throttle is per account, not per address; provider failure
  releases the claim and consumes the undelivered token.
- `npx tsx scripts/check-bar-auth.ts`: GREEN.
- `npx tsx scripts/check-stale-qr-entry.ts`: GREEN.
- Clean temp-copy TypeScript check and Next.js production build: GREEN on
  Node 24; expected build-time warnings only because Supabase env was omitted.
- No migration, env change or deploy was performed.

## RED

Před implementací:

```text
$ npx tsx scripts/check-bar-auth.ts
ERR_MODULE_NOT_FOUND: Cannot find module 'src/lib/phone-auth'
```

## GREEN

```text
$ npx tsx scripts/check-bar-auth.ts
bar phone auth checks: OK

$ npm run check
✓ check-kviz: 80/80 kombinací OK
✓ check-kviz-profil: 15552/15552 kombinací OK
✓ check-quiz-lead-payload: 32/32 kontrol OK
✓ check-healing-bridge: 45/45 kontrol OK
✓ check-mobile-ergonomics: 43/43 kontrol OK
bar phone auth checks: OK

$ npx tsc --noEmit
(exit 0, bez výstupu)

$ git diff --check
(exit 0, bez výstupu)
```

Pozdější opakovaný typecheck v kombinovaném příkazu nedal po více než 40 s
žádný výstup a byl přerušen `Ctrl-C`; jde o známé chování iCloud checkoutu.
Nezávislý reviewer má typecheck/build zopakovat v dočasné lokální kopii.

Build ani deploy se v pracovním iCloud checkoutu nespouštěl. Migrace 005 se
na vzdálenou databázi neaplikovala.
