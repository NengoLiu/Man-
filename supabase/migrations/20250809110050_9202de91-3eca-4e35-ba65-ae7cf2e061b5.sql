-- Create profiles table (passwords are managed by Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive unique username
create unique index if not exists profiles_username_unique_ci on public.profiles (lower(username));

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS policies
create policy "Profiles are viewable by everyone"
on public.profiles
for select
using (true);

create policy "Users can insert their profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Timestamp update trigger
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();