-- Feedback table for storing user submissions from frontend form.
-- Safe to run in Supabase SQL editor (idempotent).

create table if not exists public.feedbacks (
  id bigint generated always as identity primary key,
  name text,
  email text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedbacks_created_at on public.feedbacks (created_at desc);

alter table public.feedbacks enable row level security;
revoke all on table public.feedbacks from anon, authenticated;
grant all on table public.feedbacks to service_role;
