-- ============================================================================
-- Migrace 009: pozvánka pro hosta na jedno ťuknutí
--
--   Dnes: host dostane SMS, opíše 4místný kód, čeká. Nově dostane osobní odkaz
--   `https://bar.peaceandcoco.com/i/<token>` — klik = přihlášen a rovnou
--   na /kredit.
--
--   a) `invite_links` — hashované dlouhodobé pozvánky. Plaintext token NIKDY
--      neopouští odpověď `/api/internal/invite/create`; v databázi leží jen
--      HMAC-SHA256 s peppertem `BAR_AUTH_PEPPER` (stejný postup jako u PINů
--      a e-mailových tokenů, viz migrace 005). Únik databáze tedy sám o sobě
--      nestačí — bez pepperu z tokenu nejde odvodit odkaz.
--
--      POZOR na tvar hashe: hashuje se SAMOTNÝ token, ne „telefon:token".
--      Ověření zná z URL jen token, telefon by nemělo z čeho vzít. Vazba na
--      číslo se drží sloupcem `phone` v témže řádku, který se čte až PO shodě.
--
--   b) `invite_link_attempts` — jen hash IP a čas. Bez něj by `/i/<token>`
--      nešlo rate-limitovat: pokusy chodí s NEZNÁMÝM tokenem, takže se nemají
--      kde počítat. Stejný vzor jako `phone_auth_challenges.ip_hash`
--      (migrace 005), jen bez jakéhokoli obsahu pokusu.
--
-- Obě tabulky jsou zavřené RLS bez klientských policies — čte a zapisuje je
-- výhradně service role z route handlerů.
--
-- Spuštění: Supabase → SQL Editor → vlož celý obsah → Run.
-- Migrace je idempotentní (lze pustit opakovaně).
-- ============================================================================

/* --- a) Pozvánky ----------------------------------------------------------- */

create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  -- HMAC-SHA256 v hex = vždy 64 znaků, stejně jako `pin_hash`/`token_hash`.
  token_hash text not null unique check (length(token_hash) = 64),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- Vyhledání všech pozvánek jednoho čísla (revokace, diagnostika).
create index if not exists invite_links_phone_created_idx
  on public.invite_links(phone, created_at desc);

/* --- b) Rate limit pokusů -------------------------------------------------- */

create table if not exists public.invite_link_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null check (length(ip_hash) = 64),
  created_at timestamptz not null default now()
);

create index if not exists invite_link_attempts_ip_created_idx
  on public.invite_link_attempts(ip_hash, created_at desc);

/* --- RLS a grants ---------------------------------------------------------- */

alter table public.invite_links enable row level security;
alter table public.invite_link_attempts enable row level security;

-- Žádné policies = přes anon/authenticated klíč se k řádkům nedostane nikdo.
revoke all on public.invite_links from anon, authenticated;
revoke all on public.invite_link_attempts from anon, authenticated;

grant select, insert, update on public.invite_links to service_role;
grant select, insert, delete on public.invite_link_attempts to service_role;

comment on table public.invite_links is
  'Hashované osobní pozvánky (/i/<token>); plaintext token se nikdy neukládá ani neloguje.';
comment on table public.invite_link_attempts is
  'Hash IP + čas pokusu o uplatnění pozvánky. Slouží výhradně k rate limitu.';
