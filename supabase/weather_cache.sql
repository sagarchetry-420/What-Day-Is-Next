-- Weather cache table for tomorrow forecast data (met.no)
-- Safe to run in Supabase SQL editor (idempotent).

create table if not exists public.weather_cache (
  id bigint generated always as identity primary key,
  cache_key text not null unique,
  weather_date date not null,
  latitude numeric(8,4) not null,
  longitude numeric(9,4) not null,
  payload jsonb not null default '{}'::jsonb,
  last_fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_weather_cache_date on public.weather_cache (weather_date);
create index if not exists idx_weather_cache_coords on public.weather_cache (latitude, longitude);

create or replace function public.set_weather_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_weather_cache_set_updated_at on public.weather_cache;
create trigger trg_weather_cache_set_updated_at
before update on public.weather_cache
for each row
execute function public.set_weather_cache_updated_at();

alter table public.weather_cache enable row level security;
revoke all on table public.weather_cache from anon, authenticated;
grant all on table public.weather_cache to service_role;
