-- Kontakt zákazníka pro speciální výhry (jméno bere full_name z 001).
-- Idempotentní; spouští se ručně v Supabase SQL editoru (viz NASAZENI.md).
alter table public.profiles add column if not exists phone text;
comment on column public.profiles.phone is 'Telefon zadaný zákazníkem v appce — pro speciální výhry a follow-up po festivalu.';
