create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'en',
  onboarding jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reader_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  script_mode text not null default 'gurmukhi',
  support_density text not null default 'guided',
  meaning_language text not null default 'english',
  payload jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  reading_id text not null,
  title text not null,
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reading_id)
);

create table if not exists public.vocab_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  natural_key text not null,
  payload jsonb not null default '{}'::jsonb,
  review_due_at timestamptz,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, natural_key)
);

create table if not exists public.learning_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  device_id text not null,
  saved_item_ids text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reading_progress (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  reading_id text not null,
  progress numeric not null default 0 check (progress >= 0 and progress <= 1),
  payload jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reading_id)
);

create table if not exists public.activity_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookmarks_user_idx on public.bookmarks(user_id) where deleted_at is null;
create index if not exists vocab_entries_review_idx on public.vocab_entries(user_id, review_due_at) where deleted_at is null;
create index if not exists reading_progress_user_idx on public.reading_progress(user_id) where deleted_at is null;
create index if not exists activity_events_user_time_idx on public.activity_events(user_id, occurred_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_reader_preferences_updated_at on public.reader_preferences;
create trigger touch_reader_preferences_updated_at before update on public.reader_preferences
for each row execute function public.touch_updated_at();

drop trigger if exists touch_bookmarks_updated_at on public.bookmarks;
create trigger touch_bookmarks_updated_at before update on public.bookmarks
for each row execute function public.touch_updated_at();

drop trigger if exists touch_vocab_entries_updated_at on public.vocab_entries;
create trigger touch_vocab_entries_updated_at before update on public.vocab_entries
for each row execute function public.touch_updated_at();

drop trigger if exists touch_learning_state_updated_at on public.learning_state;
create trigger touch_learning_state_updated_at before update on public.learning_state
for each row execute function public.touch_updated_at();

drop trigger if exists touch_reading_progress_updated_at on public.reading_progress;
create trigger touch_reading_progress_updated_at before update on public.reading_progress
for each row execute function public.touch_updated_at();

drop trigger if exists touch_activity_events_updated_at on public.activity_events;
create trigger touch_activity_events_updated_at before update on public.activity_events
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.reader_preferences enable row level security;
alter table public.bookmarks enable row level security;
alter table public.vocab_entries enable row level security;
alter table public.learning_state enable row level security;
alter table public.reading_progress enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists profiles_own_rows on public.profiles;
create policy profiles_own_rows on public.profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists reader_preferences_own_rows on public.reader_preferences;
create policy reader_preferences_own_rows on public.reader_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists bookmarks_own_rows on public.bookmarks;
create policy bookmarks_own_rows on public.bookmarks
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists vocab_entries_own_rows on public.vocab_entries;
create policy vocab_entries_own_rows on public.vocab_entries
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists learning_state_own_rows on public.learning_state;
create policy learning_state_own_rows on public.learning_state
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists reading_progress_own_rows on public.reading_progress;
create policy reading_progress_own_rows on public.reading_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists activity_events_own_rows on public.activity_events;
create policy activity_events_own_rows on public.activity_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
