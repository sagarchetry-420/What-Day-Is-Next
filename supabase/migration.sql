-- Supabase migration for production-ready holiday caching.
-- Safe to run in Supabase SQL editor (idempotent).

create extension if not exists pgcrypto;

create table if not exists public.holidays (
  id bigint generated always as identity primary key,
  holiday_uid uuid not null default gen_random_uuid() unique,
  name text not null,
  description text not null default '',
  holiday_date date not null,
  country_code text not null check (char_length(country_code) between 2 and 3),
  country_name text not null default '',
  region text not null default '',
  holiday_type text[] not null default '{}',
  source text not null default 'calendarific',
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, holiday_date, country_code)
);

create table if not exists public.holiday_cache_meta (
  id bigint generated always as identity primary key,
  cache_key text not null unique,
  last_fetched date not null,
  data jsonb not null default '[]'::jsonb,
  source text not null default 'calendarific',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_holidays_holiday_date on public.holidays (holiday_date);
create index if not exists idx_holidays_country_code on public.holidays (country_code);
create index if not exists idx_holidays_source on public.holidays (source);
create index if not exists idx_cache_last_fetched on public.holiday_cache_meta (last_fetched);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_holidays_set_updated_at on public.holidays;
create trigger trg_holidays_set_updated_at
before update on public.holidays
for each row
execute function public.set_updated_at();

drop trigger if exists trg_holiday_cache_meta_set_updated_at on public.holiday_cache_meta;
create trigger trg_holiday_cache_meta_set_updated_at
before update on public.holiday_cache_meta
for each row
execute function public.set_updated_at();

alter table public.holidays enable row level security;
alter table public.holiday_cache_meta enable row level security;

-- Service role bypasses RLS. No anon/authenticated policies are created on purpose.
revoke all on table public.holidays from anon, authenticated;
revoke all on table public.holiday_cache_meta from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on table public.holidays to service_role;
grant all on table public.holiday_cache_meta to service_role;

create or replace function public.get_holiday_cache(p_cache_key text)
returns table (
  cache_key text,
  last_fetched date,
  data jsonb,
  source text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select hcm.cache_key, hcm.last_fetched, hcm.data, hcm.source, hcm.updated_at
  from public.holiday_cache_meta hcm
  where hcm.cache_key = p_cache_key
  limit 1;
$$;

create or replace function public.upsert_holiday_cache(
  p_cache_key text,
  p_last_fetched date,
  p_data jsonb,
  p_source text default 'calendarific'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.holiday_cache_meta (cache_key, last_fetched, data, source)
  values (p_cache_key, p_last_fetched, coalesce(p_data, '[]'::jsonb), coalesce(p_source, 'calendarific'))
  on conflict (cache_key)
  do update set
    last_fetched = excluded.last_fetched,
    data = excluded.data,
    source = excluded.source,
    updated_at = now();
end;
$$;

revoke all on function public.get_holiday_cache(text) from public;
revoke all on function public.upsert_holiday_cache(text, date, jsonb, text) from public;
grant execute on function public.get_holiday_cache(text) to service_role;
grant execute on function public.upsert_holiday_cache(text, date, jsonb, text) to service_role;
