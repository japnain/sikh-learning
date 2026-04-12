create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id text primary key,
  user_id uuid not null,
  device_id text not null,
  locale text not null,
  dark_mode boolean not null default false,
  reader jsonb not null default '{}'::jsonb,
  onboarding jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.saved_items (
  id text primary key,
  user_id uuid not null,
  device_id text not null,
  kind text not null,
  natural_key text not null,
  payload jsonb not null,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, natural_key)
);

create table if not exists public.vocab_entries (
  id text primary key,
  user_id uuid not null,
  device_id text not null,
  natural_key text not null,
  payload jsonb not null,
  review_due_at timestamptz null,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, natural_key)
);

create table if not exists public.learning_progress (
  id text primary key,
  user_id uuid not null,
  device_id text not null,
  scope text not null,
  payload jsonb not null,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scope)
);

create table if not exists public.activity_events (
  id text primary key,
  user_id uuid not null,
  device_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_items_user_id_idx on public.saved_items (user_id);
create index if not exists user_profiles_user_id_idx on public.user_profiles (user_id);
create index if not exists saved_items_kind_idx on public.saved_items (user_id, kind) where deleted_at is null;
create index if not exists vocab_entries_user_id_idx on public.vocab_entries (user_id);
create index if not exists vocab_entries_review_due_at_idx on public.vocab_entries (user_id, review_due_at) where deleted_at is null;
create index if not exists learning_progress_user_id_idx on public.learning_progress (user_id);
create index if not exists activity_events_user_id_idx on public.activity_events (user_id, occurred_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_profiles_updated_at on public.user_profiles;
create trigger touch_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_saved_items_updated_at on public.saved_items;
create trigger touch_saved_items_updated_at
before update on public.saved_items
for each row execute function public.touch_updated_at();

drop trigger if exists touch_vocab_entries_updated_at on public.vocab_entries;
create trigger touch_vocab_entries_updated_at
before update on public.vocab_entries
for each row execute function public.touch_updated_at();

drop trigger if exists touch_learning_progress_updated_at on public.learning_progress;
create trigger touch_learning_progress_updated_at
before update on public.learning_progress
for each row execute function public.touch_updated_at();

drop trigger if exists touch_activity_events_updated_at on public.activity_events;
create trigger touch_activity_events_updated_at
before update on public.activity_events
for each row execute function public.touch_updated_at();

alter table public.user_profiles enable row level security;
alter table public.saved_items enable row level security;
alter table public.vocab_entries enable row level security;
alter table public.learning_progress enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists user_profiles_own_rows on public.user_profiles;
create policy user_profiles_own_rows
on public.user_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists saved_items_own_rows on public.saved_items;
create policy saved_items_own_rows
on public.saved_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists vocab_entries_own_rows on public.vocab_entries;
create policy vocab_entries_own_rows
on public.vocab_entries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists learning_progress_own_rows on public.learning_progress;
create policy learning_progress_own_rows
on public.learning_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists activity_events_own_rows on public.activity_events;
create policy activity_events_own_rows
on public.activity_events
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
