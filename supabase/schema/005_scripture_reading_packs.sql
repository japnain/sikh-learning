create table if not exists public.scripture_reading_packs (
  reading_key text not null check (reading_key ~ '^(banidb:[0-9]{1,6}|shabados:[A-Z0-9_]{4,32})$'),
  source_revision text not null check (length(source_revision) between 1 and 120),
  variant text not null default 'default' check (variant in ('default','short','medium','long','extralong')),
  format_version integer not null default 1 check (format_version = 1),
  payload_json text not null check (jsonb_typeof(payload_json::jsonb) = 'object'),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  payload_bytes integer not null check (payload_bytes > 0 and payload_bytes <= 67108864 and payload_bytes = octet_length(payload_json)),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (reading_key, source_revision, variant, format_version)
);
alter table public.scripture_reading_packs enable row level security;
revoke all on table public.scripture_reading_packs from public, anon, authenticated;
grant select on table public.scripture_reading_packs to anon, authenticated;
grant select, insert, update, delete on table public.scripture_reading_packs to service_role;
create policy "Published scripture packs are readable"
  on public.scripture_reading_packs for select to anon, authenticated
  using (published = true);
comment on table public.scripture_reading_packs is
  'Versioned public scripture snapshots. Clients can read published packs only; administrative imports never use browser credentials.';
