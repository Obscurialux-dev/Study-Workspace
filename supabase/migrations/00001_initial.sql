-- 00001_initial.sql — Phase 1: profile foundation only.
-- Creates:
--   public.profiles
--   updated_at trigger
--   auth signup -> profile creation trigger
--   Row Level Security + own-row policies
-- Nothing else (courses, tuton, materials, notes, ... come in later phases).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'User profile. One row per auth.users entry; owned by the user.';

-- Keep updated_at current on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Row Level Security: users may only access their own profile.
alter table public.profiles enable row level security;

create policy "users_select_own_profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "users_insert_own_profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "users_update_own_profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Create a profile automatically whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
