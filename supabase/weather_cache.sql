-- Weather cache table for tomorrow forecast data (met.no)
-- Safe to run in Supabase SQL editor (idempotent).
--
-- Caching Strategy:
-- - Cache weather data per location (lat/lon) for 24 hours
-- - Cache key format: weather-{date}-{lat}-{lon}
-- - When a user visits:
--   1. Check if cached weather data exists for that location
--   2. Check if last_fetched_at is less than 24 hours old
--   3. If both true → return cached data
--   4. If no valid cache → fetch fresh weather data from API and store
-- - On a new day, requests for the new date create new cache entries
-- - Old entries are automatically cleaned up after 7 days

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
create index if not exists idx_weather_cache_last_fetched on public.weather_cache (last_fetched_at);

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

-- Function to clean up old weather cache entries (older than specified days)
-- Default retention is 7 days
create or replace function public.cleanup_old_weather_cache(retention_days int default 7)
returns int
language plpgsql
security definer
as $$
declare
  deleted_count int;
begin
  delete from public.weather_cache
  where last_fetched_at < now() - (retention_days || ' days')::interval;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Grant execute permission to service_role for cleanup function
grant execute on function public.cleanup_old_weather_cache(int) to service_role;

alter table public.weather_cache enable row level security;
revoke all on table public.weather_cache from anon, authenticated;
grant all on table public.weather_cache to service_role;
