-- ============================================================
-- VOQCL SMP — Supabase schema
-- Run this once in your Supabase project's SQL Editor.
-- Auth (accounts) is handled automatically by Supabase's
-- built-in auth.users table — this just adds the servers table
-- and locks it down so users can only see their own rows.
-- ============================================================

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mc_version text not null,
  server_type text not null,
  ram_mb int not null,
  address text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.servers enable row level security;

create policy "Users can view their own servers"
  on public.servers for select
  using (auth.uid() = user_id);

create policy "Users can insert their own servers"
  on public.servers for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own servers"
  on public.servers for update
  using (auth.uid() = user_id);

create policy "Users can delete their own servers"
  on public.servers for delete
  using (auth.uid() = user_id);
