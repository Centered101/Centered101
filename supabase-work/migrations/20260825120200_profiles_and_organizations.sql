-- =============================================================================
-- 0003 — profiles, organizations, organization_members
-- =============================================================================
-- The root of the tenancy model and of every RLS policy in this schema.
--
-- Membership is the ONLY thing that grants access. There is no "is admin" flag
-- on a user and no role claim read from the JWT — a client controls its own
-- token contents, so a role stored there is a role the client can forge.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles — application-facing mirror of auth.users
-- -----------------------------------------------------------------------------
-- auth.users belongs to Supabase and should not be joined against or extended
-- directly. profiles is ours, and cascades when the auth user is deleted.
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text        not null,
  full_name    text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint profiles_email_not_blank check (length(btrim(email)) > 0)
);

create unique index profiles_email_key on profiles (lower(email));

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function app.set_updated_at();

-- Keep profiles in step with auth.users automatically, so a signup cannot
-- produce a user with no profile row.
create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- organizations — the tenant
-- -----------------------------------------------------------------------------
create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null,
  -- Default currency for new projects. ISO 4217, uppercase.
  currency   char(3) not null default 'THB',
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,

  constraint organizations_name_not_blank check (length(btrim(name)) > 0),
  constraint organizations_slug_format     check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  constraint organizations_currency_format check (currency ~ '^[A-Z]{3}$')
);

create unique index organizations_slug_key on organizations (slug);
create index organizations_archived_at_idx on organizations (archived_at)
  where archived_at is null;

create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- organization_members — agency staff
-- -----------------------------------------------------------------------------
create table organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  profile_id      uuid not null references profiles (id)      on delete cascade,
  role            org_role not null default 'developer',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One membership row per person per organization.
create unique index organization_members_unique
  on organization_members (organization_id, profile_id);
create index organization_members_profile_idx on organization_members (profile_id);
create index organization_members_org_role_idx on organization_members (organization_id, role);

create trigger organization_members_set_updated_at
  before update on organization_members
  for each row execute function app.set_updated_at();

-- =============================================================================
-- Authorization helpers
-- =============================================================================
-- SECURITY DEFINER is essential here, not incidental. A policy on
-- organization_members that itself queries organization_members would recurse
-- infinitely. These functions run as the owner, bypassing RLS on their internal
-- reads, and are locked to a fixed search_path so they cannot be hijacked by a
-- caller-controlled schema.
--
-- They live in `app`, which PostgREST does not expose, so they cannot be
-- called directly by a client to enumerate access.
-- =============================================================================

-- Organizations the current user belongs to as staff.
create or replace function app.org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select organization_id
  from organization_members
  where profile_id = auth.uid();
$$;

-- True when the current user holds any of the given roles in the organization.
-- Passing no roles asks only "is a member at all".
create or replace function app.has_org_role(
  p_organization_id uuid,
  variadic p_roles org_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from organization_members m
    where m.organization_id = p_organization_id
      and m.profile_id = auth.uid()
      and (p_roles is null or m.role = any (p_roles))
  );
$$;

-- Convenience predicates used across later migrations.
create or replace function app.is_org_member(p_organization_id uuid)
returns boolean
language sql stable
as $$ select app.has_org_role(p_organization_id); $$;

-- Who may change money, pricing and agreements.
create or replace function app.is_org_manager(p_organization_id uuid)
returns boolean
language sql stable
as $$ select app.has_org_role(p_organization_id, 'super_admin', 'admin'); $$;

-- Managers plus accountants: may see and issue financial records.
create or replace function app.is_org_finance(p_organization_id uuid)
returns boolean
language sql stable
as $$ select app.has_org_role(p_organization_id, 'super_admin', 'admin', 'accountant'); $$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table profiles             enable row level security;
alter table organizations        enable row level security;
alter table organization_members enable row level security;

-- Deny-by-default is what `enable row level security` already gives us: with no
-- policy, nothing is visible. Every policy below only ever ADDS access.

-- ---- profiles ----------------------------------------------------------------
-- You can always see yourself.
create policy profiles_select_self on profiles
  for select to authenticated
  using (id = auth.uid());

-- You can see people you share an organization with, so member lists and
-- "assigned to" fields resolve. Not the whole user table.
create policy profiles_select_coworkers on profiles
  for select to authenticated
  using (
    exists (
      select 1
      from organization_members m
      where m.profile_id = profiles.id
        and m.organization_id in (select app.org_ids())
    )
  );

-- Only ever your own row, and you cannot re-point it at another auth user.
create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---- organizations -----------------------------------------------------------
create policy organizations_select_members on organizations
  for select to authenticated
  using (id in (select app.org_ids()));

-- Anyone signed in may create an organization; they must record themselves as
-- the creator. The matching membership row is created by the application in
-- the same transaction.
create policy organizations_insert_authenticated on organizations
  for insert to authenticated
  with check (created_by = auth.uid());

create policy organizations_update_managers on organizations
  for update to authenticated
  using (app.is_org_manager(id))
  with check (app.is_org_manager(id));

-- No delete policy: organizations are archived via archived_at, never deleted.

-- ---- organization_members ----------------------------------------------------
-- Read your own row even before any other policy could match it.
create policy organization_members_select_self on organization_members
  for select to authenticated
  using (profile_id = auth.uid());

create policy organization_members_select_same_org on organization_members
  for select to authenticated
  using (organization_id in (select app.org_ids()));

-- Only managers may grant membership...
create policy organization_members_insert_managers on organization_members
  for insert to authenticated
  with check (app.is_org_manager(organization_id));

-- ...and only managers may change a role. Without this, a developer could
-- promote themselves to admin by updating their own row.
create policy organization_members_update_managers on organization_members
  for update to authenticated
  using (app.is_org_manager(organization_id))
  with check (app.is_org_manager(organization_id));

create policy organization_members_delete_managers on organization_members
  for delete to authenticated
  using (app.is_org_manager(organization_id));
