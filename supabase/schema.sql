-- =============================================================================
-- Skillstat AI - Supabase Database Schema
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "pgcrypto";

-- Create users table
create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  identity text unique not null,
  email text not null,
  employee_id text default '',
  password_hash text default '',
  session_token text default '',
  is_email_verified boolean default false,
  verification_code text default '',
  verification_expires bigint default 0,
  last_verification_sent_at bigint default 0,
  state jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Fast lookup indexes
create index if not exists idx_users_identity on public.users (identity);
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_users_session_token on public.users (session_token);
create index if not exists idx_users_employee_id on public.users (employee_id);

-- Optional: Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Policy: Allow full access with service role key (Backend Serverless functions use service role)
drop policy if exists "Service role has full access to users" on public.users;
create policy "Service role has full access to users"
  on public.users
  for all
  using (true)
  with check (true);

-- Auto-update updated_at timestamp trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();
