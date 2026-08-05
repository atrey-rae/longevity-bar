-- Global quiz access policy and one completion per identity + quiz variant.
-- Health answers and profile scores remain browser-only and never enter these tables.

create table if not exists public.quiz_settings (
  singleton boolean primary key default true check (singleton = true),
  quiz_login_required boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.quiz_settings (singleton, quiz_login_required, updated_by)
values (true, true, 'migration 006 default')
on conflict (singleton) do nothing;

-- Auditní čas razítkuje databáze i při ručním UPDATE. Funkce je trigger-only
-- a není dostupná klientským rolím.
create or replace function public.touch_quiz_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_quiz_settings_updated_at() from public, anon, authenticated;
grant execute on function public.touch_quiz_settings_updated_at() to service_role;

drop trigger if exists quiz_settings_touch_updated_at on public.quiz_settings;
create trigger quiz_settings_touch_updated_at
  before update on public.quiz_settings
  for each row execute function public.touch_quiz_settings_updated_at();

create table if not exists public.quiz_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  contact_hash text,
  quiz_variant text not null check (quiz_variant in ('microbiom', 'profil')),
  bavic_code text not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint quiz_completions_identity_exactly_one
    check (num_nonnulls(user_id, contact_hash) = 1)
);

-- `create table if not exists` nedoplní constraint nad tabulkou vytvořenou
-- starší verzí migrace. Drop + add drží opakované spuštění idempotentní.
alter table public.quiz_completions
  drop constraint if exists quiz_completions_identity_exactly_one;
alter table public.quiz_completions
  add constraint quiz_completions_identity_exactly_one
  check (num_nonnulls(user_id, contact_hash) = 1);

create unique index if not exists quiz_completions_user_variant_unique
  on public.quiz_completions (user_id, quiz_variant)
  where user_id is not null;

create unique index if not exists quiz_completions_contact_variant_unique
  on public.quiz_completions (contact_hash, quiz_variant)
  where user_id is null and contact_hash is not null;

alter table public.quiz_settings enable row level security;
alter table public.quiz_completions enable row level security;

revoke all on public.quiz_settings from public, anon, authenticated;
revoke all on public.quiz_completions from public, anon, authenticated;
grant select, insert, update on public.quiz_settings to service_role;
grant select, insert, update, delete on public.quiz_completions to service_role;

drop policy if exists quiz_completions_select_own on public.quiz_completions;
create policy quiz_completions_select_own
  on public.quiz_completions for select
  to authenticated
  using (user_id = auth.uid());

comment on table public.quiz_settings is
  'Single source of truth for whether a real Bar.app phone login is required before quiz selection.';
comment on table public.quiz_completions is
  'Minimal completion ledger. Stores identity/contact hash, variant and host only; never quiz answers or scores.';
