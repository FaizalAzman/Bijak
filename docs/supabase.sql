-- Optional cloud backup for Bijak (Module 2). Run in the Supabase SQL editor.
create table if not exists public.bijak_progress (
  profile_id  uuid primary key,
  family_id   uuid not null,
  family_key  text not null,
  name        text not null,
  level       int  not null,
  avatar      jsonb not null,
  progress    jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.bijak_progress enable row level security;

-- Each device sends its secret family key in the `x-family-key` header.
-- Rows can only be read or written with the matching key.
create policy "family can read"   on public.bijak_progress for select
  using (family_key = current_setting('request.headers', true)::json->>'x-family-key');
create policy "family can insert" on public.bijak_progress for insert
  with check (family_key = current_setting('request.headers', true)::json->>'x-family-key');
create policy "family can update" on public.bijak_progress for update
  using (family_key = current_setting('request.headers', true)::json->>'x-family-key');
