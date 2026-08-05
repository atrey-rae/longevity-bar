-- Longevity Bar: phone-first auth + samostatné potvrzení kontaktního e-mailu.
-- Idempotentní; před spuštěním zkontroluj přiložený PREFLIGHT.sql.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email_verified_at timestamptz;
alter table public.profiles add column if not exists last_activation_email_at timestamptz;

create table if not exists public.phone_identities (
  phone_e164 text primary key check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.phone_auth_challenges (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  pin_hash text not null check (length(pin_hash) = 64),
  ip_hash text not null check (length(ip_hash) = 64),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists phone_auth_challenges_phone_created_idx
  on public.phone_auth_challenges(phone_e164, created_at desc);
create index if not exists phone_auth_challenges_ip_created_idx
  on public.phone_auth_challenges(ip_hash, created_at desc);
create unique index if not exists phone_auth_one_active_per_phone
  on public.phone_auth_challenges(phone_e164) where consumed_at is null;

-- Ověření a inkrementace počtu pokusů musí být atomická. Jinak by několik
-- paralelních požadavků mohlo všech pět pokusů přečíst se stejnou hodnotou.
create or replace function public.consume_phone_auth_challenge(
  p_id uuid,
  p_phone_e164 text,
  p_pin_hash text
)
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  challenge public.phone_auth_challenges%rowtype;
begin
  select * into challenge
  from public.phone_auth_challenges
  where id = p_id
  for update;

  if not found
    or challenge.phone_e164 <> p_phone_e164
    or challenge.consumed_at is not null then
    return 'invalid';
  end if;
  if challenge.expires_at <= now() then
    return 'expired';
  end if;
  if challenge.attempts >= 5 then
    return 'attempts';
  end if;
  if challenge.pin_hash <> p_pin_hash then
    update public.phone_auth_challenges
    set attempts = challenge.attempts + 1
    where id = challenge.id;
    if challenge.attempts + 1 >= 5 then
      return 'attempts';
    end if;
    return 'invalid';
  end if;

  update public.phone_auth_challenges
  set consumed_at = now()
  where id = challenge.id;
  return 'ok';
end;
$$;

revoke all on function public.consume_phone_auth_challenge(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.consume_phone_auth_challenge(uuid, text, text)
  to service_role;

create table if not exists public.email_activation_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token_hash text not null unique check (length(token_hash) = 64),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists email_activation_user_created_idx
  on public.email_activation_tokens(user_id, created_at desc);

create table if not exists public.phone_identity_conflicts (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  matching_user_ids uuid[] not null,
  created_at timestamptz not null default now()
);

alter table public.phone_identities enable row level security;
alter table public.phone_auth_challenges enable row level security;
alter table public.email_activation_tokens enable row level security;
alter table public.phone_identity_conflicts enable row level security;

-- Citlivé tabulky nemají žádné klientské policies ani grants.
revoke all on public.phone_identities from anon, authenticated;
revoke all on public.phone_auth_challenges from anon, authenticated;
revoke all on public.email_activation_tokens from anon, authenticated;
revoke all on public.phone_identity_conflicts from anon, authenticated;

-- Explicitní service-role grants: od roku 2026 už nové Supabase projekty
-- nemusejí tabulky v public schématu automaticky vystavit Data API.
grant select, insert, update on public.phone_identities to service_role;
grant select, insert, update, delete on public.phone_auth_challenges to service_role;
grant select, insert, update, delete on public.email_activation_tokens to service_role;
grant select, insert on public.phone_identity_conflicts to service_role;

-- Stávající Google/e-mailové identity jsou už ověřené Supabase Auth.
update public.profiles
set email_verified_at = coalesce(email_verified_at, now())
where email is not null
  and email !~* '@auth\.longevity\.invalid$';

-- Jednoznačné validní české legacy telefony lze bezpečně navázat.
with normalized as (
  select id,
    case
      when regexp_replace(phone, '[^0-9+]', '', 'g') ~ '^[0-9]{9}$'
        then '+420' || regexp_replace(phone, '[^0-9]', '', 'g')
      when regexp_replace(phone, '[^0-9+]', '', 'g') ~ '^\+[1-9][0-9]{7,14}$'
        then regexp_replace(phone, '[^0-9+]', '', 'g')
      else null
    end as e164
  from public.profiles
  where phone is not null
), unique_phones as (
  select e164, min(id::text)::uuid as user_id
  from normalized where e164 is not null
  group by e164 having count(*) = 1
)
insert into public.phone_identities(phone_e164, user_id)
select e164, user_id from unique_phones
on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_email text;
begin
  safe_email := case
    when new.email is null or new.email ~* '@auth\.longevity\.invalid$' then null
    else new.email
  end;
  insert into public.profiles (id, email, email_verified_at, full_name)
  values (
    new.id,
    safe_email,
    case when safe_email is not null then now() else null end,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, profiles.email),
        email_verified_at = case
          when excluded.email is not null then coalesce(profiles.email_verified_at, now())
          else profiles.email_verified_at
        end,
        full_name = coalesce(profiles.full_name, excluded.full_name);
  return new;
end;
$$;

-- Trigger funkce není veřejné RPC. Trigger ji dál může vykonat, ale klientské
-- role ji nesmějí přímo volat přes Data API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

comment on table public.phone_identities is 'Jediné autoritativní mapování E.164 telefonu na auth.users.';
comment on table public.phone_auth_challenges is 'Hashované krátkodobé SMS challenge; nikdy neukládá čitelný PIN.';
comment on table public.email_activation_tokens is 'Hashované jednorázové tokeny pro potvrzení kontaktního e-mailu.';
