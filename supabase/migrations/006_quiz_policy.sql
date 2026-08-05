-- ============================================================================
-- Migrace 006: politika přihlášení ke kvízu + evidence dokončených variant
--
--   quiz_policy       — singleton (jeden řádek) s přepínačem `login_required`
--                       a doporučenou variantou; audit updated_at/updated_by.
--   quiz_completions  — kdo už kterou variantu kvízu dokončil.
--
-- ⚠️ OCHRANA SOUKROMÍ (nepřekročitelné):
--    Odpovědi na zdravotní otázky ani průběžné skóre se NIKDY neukládají —
--    žijí výhradně v prohlížeči hosta. Proto tu není žádný sloupec typu
--    answers/score/payload a ani žádný přidávat nelze. Server se dozví
--    jen to, KTEROU variantu host dokončil a JAKÝ produkt si vybral
--    (ten je v `quiz_leads` z migrace 003).
--
-- Spuštění: Supabase → SQL Editor → vlož celý obsah → Run.
-- Migrace je idempotentní (lze pustit opakovaně).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- quiz_policy — singleton
--
-- Singleton je vynucený primárním klíčem `id boolean` + checkem `id = true`:
-- druhý řádek do tabulky prostě nejde vložit. Žádný trigger, žádná domluva.
-- ----------------------------------------------------------------------------
create table if not exists public.quiz_policy (
  id                   boolean primary key default true,
  -- Vyžadovat přihlášení před spuštěním kvízu? Výchozí ANO (viz P&COS).
  login_required       boolean not null default true,
  -- Doporučená varianta — POUZE předvolba v přepínači, nic nevynucuje.
  recommended_variant  text not null default 'mikrobiom',
  updated_at           timestamptz not null default now(),
  -- Kdo naposledy přepnul (e-mail admina / název systému, např. 'healing-api').
  updated_by           text,
  constraint quiz_policy_singleton check (id),
  constraint quiz_policy_recommended_variant_ck
    check (recommended_variant in ('mikrobiom', 'profil'))
);

comment on table public.quiz_policy is
  'Singleton: vyžaduje kvíz přihlášení? + doporučená varianta. Přepíná Healing přes interní API. Neobsahuje ŽÁDNÉ odpovědi hostů.';
comment on column public.quiz_policy.login_required is
  'true = /kviz/<bavič> přesměruje nepřihlášeného na /prihlaseni; false = anonymní průchod s best-effort ochranou proti duplicitám.';
comment on column public.quiz_policy.recommended_variant is
  'Jen doporučení do UI (předvolený přepínač). Host si vždy může vybrat druhou variantu.';

-- Doplnění sloupců, kdyby se migrace pouštěla nad starším tvarem tabulky.
alter table public.quiz_policy add column if not exists login_required      boolean not null default true;
alter table public.quiz_policy add column if not exists recommended_variant text    not null default 'mikrobiom';
alter table public.quiz_policy add column if not exists updated_at          timestamptz not null default now();
alter table public.quiz_policy add column if not exists updated_by          text;

-- Jediný řádek. `on conflict do nothing` = opakované spuštění nic nepřepíše,
-- takže migrace nikdy nevrátí přepnutou politiku zpátky na výchozí.
insert into public.quiz_policy (id) values (true)
on conflict (id) do nothing;

-- Audit: `updated_at` se razítkuje v DB, ne v aplikaci — nezapomene se na něj
-- ani při ručním UPDATE ze SQL editoru.
create or replace function public.touch_quiz_policy()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists quiz_policy_touch on public.quiz_policy;
create trigger quiz_policy_touch
  before update on public.quiz_policy
  for each row execute function public.touch_quiz_policy();

-- ----------------------------------------------------------------------------
-- quiz_completions — jedno dokončení na (identitu × variantu)
--
-- Identita je právě jedna ze dvou (vynuceno checkem):
--   · user_id      — přihlášený host (politika ANO),
--   · contact_hash — anonymní host (politika NE): HMAC z normalizovaného
--                    e-mailu + telefonu. Jde o best-effort ochranu, ne důkaz —
--                    kdo chce, zadá jiný kontakt. Hrubé zneužití řeší Healing
--                    varováním v adminu, ne appka.
--
-- Ukládá se JEN identita, varianta a bavič. Žádné odpovědi, žádné skóre.
-- ----------------------------------------------------------------------------
create table if not exists public.quiz_completions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete cascade,
  contact_hash  text,
  variant       text not null,
  -- Kód baviče fronty (A1–F6) kvůli atribuci; nepovinný.
  bavic         text,
  created_at    timestamptz not null default now(),
  constraint quiz_completions_variant_ck
    check (variant in ('mikrobiom', 'profil')),
  constraint quiz_completions_identita_ck
    check (num_nonnulls(user_id, contact_hash) = 1)
);

comment on table public.quiz_completions is
  'Kdo už kterou variantu kvízu dokončil. Bez odpovědí a bez skóre — ta zůstávají v prohlížeči hosta.';
comment on column public.quiz_completions.contact_hash is
  'HMAC-SHA256(QUIZ_CONTACT_HMAC_SECRET, normalizovaný e-mail + telefon) pro anonymní průchod. Nikdy ne holý kontakt.';

-- Atomické vynucení „jednu variantu jednou“ — souběžné odeslání dvou formulářů
-- skončí na unique violation (23505), ne na dvou kupónech.
create unique index if not exists quiz_completions_user_variant_key
  on public.quiz_completions (user_id, variant)
  where user_id is not null;

create unique index if not exists quiz_completions_contact_variant_key
  on public.quiz_completions (contact_hash, variant)
  where user_id is null;

create index if not exists quiz_completions_created_idx
  on public.quiz_completions (created_at desc);

-- ----------------------------------------------------------------------------
-- RLS a minimální práva
--
-- Zápis jde VÝHRADNĚ přes service role (server action) — stejně jako
-- u razítek a odměn v migraci 001. Klient nemá INSERT/UPDATE/DELETE nikde.
-- ----------------------------------------------------------------------------
alter table public.quiz_policy      enable row level security;
alter table public.quiz_completions enable row level security;

revoke all on public.quiz_policy      from anon, authenticated;
revoke all on public.quiz_completions from anon, authenticated;

-- quiz_policy: ŽÁDNÁ policy ani grant → z prohlížeče nepřístupné.
-- Politiku čte server (service role) a vrací ji jen v interním API.

-- quiz_completions: přihlášený smí přečíst jen svoje dokončení (přepínač
-- variant si podle toho odškrtne, co už má hotové).
grant select on public.quiz_completions to authenticated;

drop policy if exists "kviz: ctu jen sva dokonceni" on public.quiz_completions;
create policy "kviz: ctu jen sva dokonceni"
  on public.quiz_completions for select
  to authenticated
  using (auth.uid() = user_id);
