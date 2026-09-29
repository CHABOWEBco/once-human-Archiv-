-- Once Human Archiv
-- Core identity / authorization foundation.
-- This migration intentionally does NOT connect the frontend to Supabase
-- and does NOT create application-content tables.

begin;

-- Role values are deliberately constrained at the database layer.
create type public.app_role as enum ('user', 'moderator', 'admin', 'owner');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Meta-Human'
    check (char_length(display_name) between 1 and 64),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index user_roles_role_idx on public.user_roles(role);

comment on table public.profiles is
  'Public-facing account profile data owned by exactly one auth.users row.';
comment on table public.user_roles is
  'Authorization role per authenticated user. Direct client-side role mutation is intentionally forbidden.';
comment on column public.user_roles.role is
  'Server-managed application role. New users always start as user.';

-- Keep authorization helpers outside the exposed public API schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Read-only helper for RLS policies that need an exact role.
create or replace function private.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as ur
    where ur.user_id = (select auth.uid())
      and ur.role = required_role
  );
$$;

-- Hierarchical role helper:
-- user < moderator < admin < owner
create or replace function private.has_role_at_least(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select
        case ur.role
          when 'user'::public.app_role then 10
          when 'moderator'::public.app_role then 20
          when 'admin'::public.app_role then 30
          when 'owner'::public.app_role then 40
        end
        >=
        case required_role
          when 'user'::public.app_role then 10
          when 'moderator'::public.app_role then 20
          when 'admin'::public.app_role then 30
          when 'owner'::public.app_role then 40
        end
      from public.user_roles as ur
      where ur.user_id = (select auth.uid())
    ),
    false
  );
$$;

revoke all on function private.has_role(public.app_role) from public, anon;
revoke all on function private.has_role_at_least(public.app_role) from public, anon;
grant execute on function private.has_role(public.app_role) to authenticated;
grant execute on function private.has_role_at_least(public.app_role) to authenticated;

-- Trigger helper for profile timestamps.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

-- New auth.users rows get a profile and exactly the default "user" role.
-- User-controlled metadata is used only for the display name, never for roles.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  initial_display_name text;
begin
  initial_display_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Meta-Human'
    ),
    64
  );

  insert into public.profiles (id, display_name)
  values (new.id, initial_display_name)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user'::public.app_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function private.set_updated_at();

drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at
before update on public.user_roles
for each row
execute function private.set_updated_at();

drop trigger if exists once_human_create_identity on auth.users;
create trigger once_human_create_identity
after insert on auth.users
for each row
execute function private.handle_new_auth_user();

-- Backfill profiles and default roles if Auth already contains users when this
-- migration is applied. Existing role rows are never overwritten.
insert into public.profiles (id, display_name)
select
  u.id,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Meta-Human'
    ),
    64
  )
from auth.users as u
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'user'::public.app_role
from auth.users as u
on conflict (user_id) do nothing;

-- RLS is enabled and forced on both client-facing tables.
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;

-- Start from least privilege instead of relying on Supabase default grants.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;

-- A signed-in user may read their own profile and update only safe profile
-- columns. id, created_at and updated_at cannot be directly changed by clients.
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url) on table public.profiles to authenticated;

-- Users may inspect their own current role, but cannot insert/update/delete
-- role rows. Future role administration must use a server-side/Admin path.
grant select on table public.user_roles to authenticated;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy user_roles_select_own
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

commit;
