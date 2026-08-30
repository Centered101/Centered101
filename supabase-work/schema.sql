-- ============================================================================
-- Centered101's Work — database schema
--
-- GENERATED FILE. DO NOT EDIT.
--   Source of truth: supabase-work/migrations/
--   Regenerate with: npm run work:db:snapshot
--
-- Tables, types, functions, indexes, triggers and RLS policies. Storage buckets and object policies live in storage.sql; seed data in seed.sql.
--
-- Built from 17 migration(s):
--   20260825120000_extensions_and_utilities.sql
--   20260825120100_enums.sql
--   20260825120200_profiles_and_organizations.sql
--   20260825120300_clients.sql
--   20260825120400_projects.sql
--   20260825120500_project_scopes.sql
--   20260825120600_project_pricing.sql
--   20260825120700_agreements.sql
--   20260825120800_payment_plans_and_milestones.sql
--   20260825120900_payments.sql
--   20260825121000_documents.sql
--   20260825121100_activity_logs.sql
--   20260825121200_index_foreign_keys.sql
--   20260826120000_project_progress.sql
--   20260826120100_deployments_maintenance_change_requests.sql
--   20260826120300_auto_codes.sql
--   20260830120000_feedback.sql
-- ============================================================================
-- ▼ 20260825120000_extensions_and_utilities.sql
-- =============================================================================
-- 0001 — Extensions, helper schema, shared utilities
-- =============================================================================
-- Foundations every later migration depends on. Nothing here is domain logic.
--
-- The `app` schema exists so authorization helpers are NOT reachable through
-- PostgREST: Supabase exposes `public` (plus whatever is configured), never
-- `app`. Keeping the helpers out of `public` means a client cannot call them
-- directly to probe access.
-- =============================================================================

create extension if not exists pgcrypto;      -- gen_random_uuid(), digest()
create extension if not exists pg_trgm;       -- fuzzy search on names/codes

create schema if not exists app;

revoke all on schema app from public;
grant usage on schema app to authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
-- Applied as a trigger on every table carrying updated_at. Done in the database
-- rather than the application so a direct SQL edit cannot leave a stale value.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Current user
-- -----------------------------------------------------------------------------
-- Thin wrapper over auth.uid() so policies read consistently and so the
-- validation harness has a single seam to stub.
create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Human-readable document codes (PRJ-2026-001, INV-2026-042, …)
-- -----------------------------------------------------------------------------
-- Per-organization, per-year, gap-free-enough sequence. This is DISPLAY ONLY.
-- It must never address a resource — URLs use the UUID primary key
-- (docs/ARCHITECTURE.md §5). Guessing PRJ-2026-002 must get you nothing.
create table if not exists app.code_counters (
  organization_id uuid   not null,
  prefix          text   not null,
  year            int    not null,
  last_value      bigint not null default 0,
  primary key (organization_id, prefix, year)
);

create or replace function app.next_code(
  p_organization_id uuid,
  p_prefix          text,
  p_year            int default null
)
returns text
language plpgsql
security definer
set search_path = app, pg_temp
as $$
declare
  v_year int := coalesce(p_year, extract(year from now())::int);
  v_next bigint;
begin
  insert into app.code_counters (organization_id, prefix, year, last_value)
  values (p_organization_id, p_prefix, v_year, 1)
  on conflict (organization_id, prefix, year)
    do update set last_value = app.code_counters.last_value + 1
  returning last_value into v_next;

  return format('%s-%s-%s', p_prefix, v_year, lpad(v_next::text, 3, '0'));
end;
$$;

comment on function app.next_code is
  'Generates a display-only human-readable code. Never use as an access key.';
-- ▲ 20260825120000_extensions_and_utilities.sql

-- ▼ 20260825120100_enums.sql
-- =============================================================================
-- 0002 — Enum types
-- =============================================================================
-- Values are UPPER_CASE to match the specification exactly, so there is no
-- translation layer between the brief, the database and the TypeScript types.
--
-- Enums are used instead of text+CHECK because they are self-documenting in
-- generated types and cannot drift. The cost is that adding a value requires a
-- migration — which is the point: statuses are business rules, not free text.
-- =============================================================================

-- Agency-side roles, held in organization_members.
create type org_role as enum (
  'super_admin',
  'admin',
  'developer',
  'accountant'
);

-- Client-side (and per-project developer) roles, held in project_members.
create type project_role as enum (
  'client_owner',
  'client_member',
  'developer'
);

-- The full project lifecycle from the brief (Phase 5).
create type project_status as enum (
  'DRAFT',
  'WAITING_FOR_AGREEMENT',
  'WAITING_FOR_DEPOSIT',
  'WAITING_FOR_CLIENT_DATA',
  'READY_TO_START',
  'IN_PROGRESS',
  'WAITING_FOR_CLIENT',
  'CLIENT_REVIEW',
  'REVISION',
  'TESTING',
  'FINAL_APPROVAL',
  'WAITING_FOR_FINAL_PAYMENT',
  'READY_FOR_HANDOVER',
  'DEPLOYED',
  'MAINTENANCE',
  'COMPLETED',
  'PAUSED',
  'CANCELLED',
  'OVERDUE'
);

create type project_type as enum (
  'WEBSITE',
  'WEB_APP',
  'ECOMMERCE',
  'DASHBOARD',
  'LANDING_PAGE',
  'MAINTENANCE',
  'OTHER'
);

create type delivery_method as enum (
  'DEVELOPER_HOSTED',
  'CLIENT_HOSTED',
  'SOURCE_HANDOVER'
);

create type source_code_ownership as enum (
  'DEVELOPER',
  'CLIENT',
  'SHARED'
);

-- Milestone-gated access states (brief Phase 22).
create type source_code_access as enum (
  'LOCKED',
  'PREVIEW',
  'READ_ONLY',
  'FULL_ACCESS'
);

create type scope_item_status as enum (
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'OUT_OF_SCOPE'
);

-- Discounts are a separate kind rather than a negative line amount, so the
-- subtotal/discount/total breakdown in the brief (Phase 7) is derivable and
-- amounts can stay non-negative.
create type pricing_item_kind as enum (
  'LINE_ITEM',
  'DISCOUNT',
  'ADDON'
);

create type agreement_status as enum (
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'SUPERSEDED'
);

create type payment_plan_type as enum (
  'FULL_PAYMENT',
  'DEPOSIT_FINAL',
  'MILESTONE',
  'INSTALLMENT',
  'CUSTOM'
);

create type milestone_status as enum (
  'PENDING',
  'INVOICED',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

-- Brief Phase 9. A payment reaches PAID only via a verified webhook.
create type payment_status as enum (
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
  'CANCELLED'
);

create type payment_method as enum (
  'CARD',
  'PROMPTPAY',
  'BANK_TRANSFER',
  'CASH',
  'OTHER'
);

create type document_type as enum (
  'QUOTATION',
  'INVOICE',
  'RECEIPT',
  'TAX_INVOICE',
  'AGREEMENT',
  'CREDIT_NOTE',
  'DEBIT_NOTE',
  'OTHER'
);

create type document_status as enum (
  'DRAFT',
  'ISSUED',
  'SENT',
  'VOID'
);
-- ▲ 20260825120100_enums.sql

-- ▼ 20260825120200_profiles_and_organizations.sql
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
-- ▲ 20260825120200_profiles_and_organizations.sql

-- ▼ 20260825120300_clients.sql
-- =============================================================================
-- 0004 — clients
-- =============================================================================
-- A client is the customer company an organization works for. Projects belong
-- to one, so this table is a prerequisite for projects even though it was not
-- named in the phase request.
--
-- Note the distinction that runs through the whole schema: a `client` is a
-- COMPANY RECORD owned by the agency. A `profile` is a PERSON who can sign in.
-- A person gains access to a client's project through project_members — never
-- by virtue of the company record alone.
-- =============================================================================

create table clients (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,

  name            text not null,
  -- Display-only code (CLI-2026-001). Never an access key.
  client_code     text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  tax_id          text,
  address         text,
  notes           text,

  created_by      uuid references profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz,

  constraint clients_name_not_blank check (length(btrim(name)) > 0),
  constraint clients_contact_email_format
    check (contact_email is null or contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- Codes are unique per organization, not globally: two agencies may both have
-- a CLI-2026-001.
create unique index clients_org_code_key on clients (organization_id, client_code)
  where client_code is not null;
create index clients_org_idx on clients (organization_id);
create index clients_org_active_idx on clients (organization_id) where archived_at is null;
create index clients_name_trgm_idx on clients using gin (name gin_trgm_ops);

create trigger clients_set_updated_at
  before update on clients
  for each row execute function app.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
alter table clients enable row level security;

-- Agency staff see their own organization's clients. Client users get nothing
-- here: a client must never be able to enumerate the agency's other customers,
-- which is exactly what a "read clients" policy for them would allow.
create policy clients_select_org on clients
  for select to authenticated
  using (organization_id in (select app.org_ids()));

create policy clients_insert_org on clients
  for insert to authenticated
  with check (
    app.has_org_role(organization_id, 'super_admin', 'admin', 'developer')
    and created_by = auth.uid()
  );

create policy clients_update_org on clients
  for update to authenticated
  using (app.has_org_role(organization_id, 'super_admin', 'admin', 'developer'))
  with check (app.has_org_role(organization_id, 'super_admin', 'admin', 'developer'));

-- Only managers may hard-delete; ordinary staff archive instead.
create policy clients_delete_managers on clients
  for delete to authenticated
  using (app.is_org_manager(organization_id));
-- ▲ 20260825120300_clients.sql

-- ▼ 20260825120400_projects.sql
-- =============================================================================
-- 0005 — projects, project_members, and the project access helpers
-- =============================================================================
-- The centre of the schema. Almost every other table hangs off projects, and
-- almost every policy in later migrations resolves through the helpers defined
-- at the bottom of this file.
-- =============================================================================

create table projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  client_id       uuid not null references clients (id)       on delete restrict,

  -- Display-only. The UUID above is the access key; this is for humans.
  project_code    text not null,
  name            text not null,
  description     text,

  type            project_type    not null default 'WEBSITE',
  status          project_status  not null default 'DRAFT',

  start_date        date,
  expected_delivery date,
  actual_delivery   date,

  -- Money is an integer count of minor units (satang for THB). Never numeric,
  -- never float: see docs/ARCHITECTURE.md §5. Formatting is a UI concern.
  total_amount    bigint  not null default 0,
  currency        char(3) not null default 'THB',

  delivery_method        delivery_method       not null default 'DEVELOPER_HOSTED',
  source_code_ownership  source_code_ownership not null default 'DEVELOPER',
  maintenance_enabled    boolean               not null default false,

  created_by      uuid references profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz,

  constraint projects_name_not_blank     check (length(btrim(name)) > 0),
  constraint projects_total_non_negative check (total_amount >= 0),
  constraint projects_currency_format    check (currency ~ '^[A-Z]{3}$'),
  -- Delivery cannot precede the start. Both are optional, so only check when
  -- both are present.
  constraint projects_dates_ordered check (
    start_date is null or expected_delivery is null or expected_delivery >= start_date
  )
);

create unique index projects_org_code_key on projects (organization_id, project_code);
create index projects_org_idx            on projects (organization_id);
create index projects_client_idx         on projects (client_id);
create index projects_org_status_idx     on projects (organization_id, status);
create index projects_org_active_idx     on projects (organization_id) where archived_at is null;
create index projects_expected_delivery_idx on projects (expected_delivery)
  where archived_at is null;
create index projects_name_trgm_idx      on projects using gin (name gin_trgm_ops);

create trigger projects_set_updated_at
  before update on projects
  for each row execute function app.set_updated_at();

-- The client company must belong to the same organization as the project.
-- A composite foreign key is the only way to enforce this declaratively; a
-- CHECK cannot reference another table, and a trigger can be bypassed by a
-- superuser bulk load.
create unique index clients_id_org_key on clients (id, organization_id);
alter table projects
  add constraint projects_client_same_org
  foreign key (client_id, organization_id)
  references clients (id, organization_id)
  on update cascade
  deferrable initially immediate;

-- -----------------------------------------------------------------------------
-- project_members — who can see this specific project
-- -----------------------------------------------------------------------------
-- This is how a client user gains access, and it is per-project by design.
-- Access is granted explicitly, one project at a time, rather than implied by
-- the client company record — so an ex-client keeps exactly the projects they
-- were given and nothing else.
create table project_members (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  role       project_role not null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index project_members_unique on project_members (project_id, profile_id);
create index project_members_profile_idx   on project_members (profile_id);
create index project_members_project_role_idx on project_members (project_id, role);

create trigger project_members_set_updated_at
  before update on project_members
  for each row execute function app.set_updated_at();

-- =============================================================================
-- Project access helpers
-- =============================================================================
-- Every downstream policy routes through these, so the rule "who can see this
-- project" is written once. SECURITY DEFINER for the same reason as before:
-- these read tables that are themselves RLS-protected, and a policy that
-- queried them directly would recurse.
-- =============================================================================

-- Projects the current user may read: agency staff see everything in their
-- organization; everyone else sees only projects they were explicitly added to.
create or replace function app.project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id
  from projects p
  where p.organization_id in (select organization_id
                              from organization_members
                              where profile_id = auth.uid())
  union
  select pm.project_id
  from project_members pm
  where pm.profile_id = auth.uid();
$$;

create or replace function app.can_read_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from projects p
    where p.id = p_project_id
      and p.organization_id in (select organization_id
                                from organization_members
                                where profile_id = auth.uid())
  ) or exists (
    select 1 from project_members pm
    where pm.project_id = p_project_id and pm.profile_id = auth.uid()
  );
$$;

-- Agency staff on the project's organization. This is the write predicate for
-- delivery data — clients read, staff write.
create or replace function app.can_manage_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from projects p
    join organization_members m
      on m.organization_id = p.organization_id
     and m.profile_id = auth.uid()
    where p.id = p_project_id
      and m.role in ('super_admin', 'admin', 'developer')
  );
$$;

-- Managers and accountants: pricing, agreements, invoices, payments.
create or replace function app.can_manage_project_finance(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from projects p
    join organization_members m
      on m.organization_id = p.organization_id
     and m.profile_id = auth.uid()
    where p.id = p_project_id
      and m.role in ('super_admin', 'admin', 'accountant')
  );
$$;

-- True when the current user is on the CLIENT side of this project. Used to
-- give clients read access without letting them write delivery data.
create or replace function app.is_project_client(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from project_members pm
    where pm.project_id = p_project_id
      and pm.profile_id = auth.uid()
      and pm.role in ('client_owner', 'client_member')
  );
$$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table projects        enable row level security;
alter table project_members enable row level security;

-- ---- projects ----------------------------------------------------------------
-- One policy, both audiences. A client passing another client's UUID matches
-- neither branch and receives zero rows — not an error, simply nothing. This
-- is the control that satisfies "Client A must never access Client B's
-- project, even if Client A knows the UUID".
create policy projects_select_visible on projects
  for select to authenticated
  using (
    organization_id in (select app.org_ids())
    or exists (
      select 1 from project_members pm
      where pm.project_id = projects.id and pm.profile_id = auth.uid()
    )
  );

create policy projects_insert_staff on projects
  for insert to authenticated
  with check (
    app.has_org_role(organization_id, 'super_admin', 'admin', 'developer')
    and created_by = auth.uid()
  );

-- WITH CHECK repeats the predicate so a row cannot be moved into an
-- organization the user does not belong to.
create policy projects_update_staff on projects
  for update to authenticated
  using (app.has_org_role(organization_id, 'super_admin', 'admin', 'developer'))
  with check (app.has_org_role(organization_id, 'super_admin', 'admin', 'developer'));

create policy projects_delete_managers on projects
  for delete to authenticated
  using (app.is_org_manager(organization_id));

-- ---- project_members ---------------------------------------------------------
create policy project_members_select_self on project_members
  for select to authenticated
  using (profile_id = auth.uid());

-- Everyone on a project can see who else is on it.
create policy project_members_select_project on project_members
  for select to authenticated
  using (app.can_read_project(project_id));

-- Only agency staff grant project access. A client_owner cannot add people to
-- a project — that would let a client widen their own blast radius.
create policy project_members_insert_staff on project_members
  for insert to authenticated
  with check (app.can_manage_project(project_id));

create policy project_members_update_staff on project_members
  for update to authenticated
  using (app.can_manage_project(project_id))
  with check (app.can_manage_project(project_id));

create policy project_members_delete_staff on project_members
  for delete to authenticated
  using (app.can_manage_project(project_id));
-- ▲ 20260825120400_projects.sql

-- ▼ 20260825120500_project_scopes.sql
-- =============================================================================
-- 0006 — project_scopes, project_features
-- =============================================================================
-- What was agreed to be built. A project has one scope per version; features
-- are the individual deliverables inside it.
--
-- Scope is versioned rather than edited in place, because "what did we agree
-- to?" is the question every change-request dispute turns on.
-- =============================================================================

create table project_scopes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,

  version     int  not null default 1,
  title       text,
  summary     text,
  -- Set when this scope version becomes the agreed one; null while drafting.
  locked_at   timestamptz,

  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint project_scopes_version_positive check (version > 0)
);

create unique index project_scopes_project_version_key
  on project_scopes (project_id, version);
create index project_scopes_project_idx on project_scopes (project_id);

create trigger project_scopes_set_updated_at
  before update on project_scopes
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- project_features — individual deliverables within a scope
-- -----------------------------------------------------------------------------
create table project_features (
  id          uuid primary key default gen_random_uuid(),
  scope_id    uuid not null references project_scopes (id) on delete cascade,
  -- Denormalised for RLS: lets the policy check the project without joining
  -- through scopes on every row. Kept honest by the composite FK below.
  project_id  uuid not null references projects (id) on delete cascade,

  name        text not null,
  description text,
  status      scope_item_status not null default 'PLANNED',
  sort_order  int  not null default 0,
  -- Included in the agreed price, versus billable as an extra.
  is_included boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint project_features_name_not_blank check (length(btrim(name)) > 0)
);

create index project_features_scope_idx   on project_features (scope_id, sort_order);
create index project_features_project_idx on project_features (project_id);

create trigger project_features_set_updated_at
  before update on project_features
  for each row execute function app.set_updated_at();

-- Guarantees the denormalised project_id actually matches the scope's project,
-- so the RLS policy above cannot be fooled by writing a mismatched pair.
create unique index project_scopes_id_project_key on project_scopes (id, project_id);
alter table project_features
  add constraint project_features_scope_same_project
  foreign key (scope_id, project_id)
  references project_scopes (id, project_id)
  on delete cascade;

-- =============================================================================
-- RLS
-- =============================================================================
alter table project_scopes   enable row level security;
alter table project_features enable row level security;

-- Clients may read the scope of their own project — knowing what was agreed is
-- the point of the portal — but only agency staff may change it.
create policy project_scopes_select on project_scopes
  for select to authenticated
  using (app.can_read_project(project_id));

create policy project_scopes_insert_staff on project_scopes
  for insert to authenticated
  with check (app.can_manage_project(project_id));

create policy project_scopes_update_staff on project_scopes
  for update to authenticated
  using (app.can_manage_project(project_id))
  with check (app.can_manage_project(project_id));

create policy project_scopes_delete_staff on project_scopes
  for delete to authenticated
  using (app.can_manage_project(project_id));

create policy project_features_select on project_features
  for select to authenticated
  using (app.can_read_project(project_id));

create policy project_features_insert_staff on project_features
  for insert to authenticated
  with check (app.can_manage_project(project_id));

create policy project_features_update_staff on project_features
  for update to authenticated
  using (app.can_manage_project(project_id))
  with check (app.can_manage_project(project_id));

create policy project_features_delete_staff on project_features
  for delete to authenticated
  using (app.can_manage_project(project_id));
-- ▲ 20260825120500_project_scopes.sql

-- ▼ 20260825120600_project_pricing.sql
-- =============================================================================
-- 0007 — project_pricing_items
-- =============================================================================
-- Itemised pricing (brief Phase 7).
--
-- Every amount is an integer count of minor units. There is no numeric and no
-- floating point anywhere in this file, and there never should be: 0.1 + 0.2
-- is not 0.3, and a rounding error in a discount is a rounding error in an
-- invoice. Formatting to "฿30,000" is the UI's job.
--
-- Discounts are stored as a positive amount with kind = 'DISCOUNT' rather than
-- a negative LINE_ITEM, so subtotal / discount / total are each derivable and
-- every stored amount can be constrained non-negative.
-- =============================================================================

create table project_pricing_items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,

  kind        pricing_item_kind not null default 'LINE_ITEM',
  name        text not null,
  description text,

  quantity    int    not null default 1,
  -- Price for a single unit, in minor units.
  unit_amount bigint not null,
  -- quantity * unit_amount, maintained by the trigger below so it can be
  -- indexed, summed and audited without recomputing in the application.
  amount      bigint not null default 0,

  sort_order  int not null default 0,

  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint pricing_name_not_blank      check (length(btrim(name)) > 0),
  constraint pricing_quantity_positive   check (quantity > 0),
  constraint pricing_unit_non_negative   check (unit_amount >= 0),
  constraint pricing_amount_non_negative check (amount >= 0)
);

create index pricing_project_idx on project_pricing_items (project_id, sort_order);
create index pricing_project_kind_idx on project_pricing_items (project_id, kind);

-- Keep `amount` consistent with quantity * unit_amount. Done in the database
-- so a direct SQL insert cannot record a line total that disagrees with its
-- own inputs.
create or replace function app.pricing_item_compute_amount()
returns trigger
language plpgsql
as $$
begin
  new.amount := new.quantity::bigint * new.unit_amount;
  return new;
end;
$$;

create trigger pricing_items_compute_amount
  before insert or update of quantity, unit_amount on project_pricing_items
  for each row execute function app.pricing_item_compute_amount();

create trigger pricing_items_set_updated_at
  before update on project_pricing_items
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Derived totals
-- -----------------------------------------------------------------------------
-- A view rather than stored columns: totals are a pure function of the items,
-- and a cached copy is a copy that can go stale.
create view project_pricing_totals
with (security_invoker = true) as
select
  p.id as project_id,
  coalesce(sum(i.amount) filter (where i.kind in ('LINE_ITEM', 'ADDON')), 0)::bigint as subtotal,
  coalesce(sum(i.amount) filter (where i.kind = 'DISCOUNT'), 0)::bigint             as discount_total,
  greatest(
    coalesce(sum(i.amount) filter (where i.kind in ('LINE_ITEM', 'ADDON')), 0)
      - coalesce(sum(i.amount) filter (where i.kind = 'DISCOUNT'), 0),
    0
  )::bigint as total,
  p.currency
from projects p
left join project_pricing_items i on i.project_id = p.id
group by p.id, p.currency;

comment on view project_pricing_totals is
  'Derived pricing totals. security_invoker = true so the view runs under the '
  'caller''s RLS rather than the definer''s — without it the view would leak '
  'totals for projects the caller cannot read.';

-- =============================================================================
-- RLS
-- =============================================================================
alter table project_pricing_items enable row level security;

-- Clients may see what they are being charged for — itemised pricing is
-- exactly what the portal is for.
create policy pricing_select on project_pricing_items
  for select to authenticated
  using (app.can_read_project(project_id));

-- Writing prices is restricted to managers and accountants. Developers can
-- build the project but cannot change what it costs.
create policy pricing_insert_finance on project_pricing_items
  for insert to authenticated
  with check (app.can_manage_project_finance(project_id) and created_by = auth.uid());

create policy pricing_update_finance on project_pricing_items
  for update to authenticated
  using (app.can_manage_project_finance(project_id))
  with check (app.can_manage_project_finance(project_id));

create policy pricing_delete_finance on project_pricing_items
  for delete to authenticated
  using (app.can_manage_project_finance(project_id));
-- ▲ 20260825120600_project_pricing.sql

-- ▼ 20260825120700_agreements.sql
-- =============================================================================
-- 0008 — agreements, agreement_versions, agreement_acceptances
-- =============================================================================
-- Three tables rather than one, because they answer three different questions
-- and have three different lifetimes:
--
--   agreements             — the contract slot on a project (one per project)
--   agreement_versions     — immutable snapshots of the terms as sent
--   agreement_acceptances  — the append-only record of who accepted what
--
-- Versions and acceptances are never updated or deleted. An agreement whose
-- text can change after it was accepted is not evidence of anything.
-- =============================================================================

create table agreements (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,

  title       text not null default 'Service Agreement',
  status      agreement_status not null default 'DRAFT',
  -- Points at the version currently in force. Set when a version is accepted.
  current_version_id uuid,

  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One agreement per project.
create unique index agreements_project_key on agreements (project_id);

create trigger agreements_set_updated_at
  before update on agreements
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- agreement_versions — immutable terms snapshots
-- -----------------------------------------------------------------------------
create table agreement_versions (
  id           uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements (id) on delete cascade,
  project_id   uuid not null references projects (id)   on delete cascade,

  version      int  not null,
  -- The terms exactly as presented. Stored, not regenerated: a template change
  -- must never retroactively alter what someone already agreed to.
  body         text not null,
  -- SHA-256 of body, so tampering is detectable without re-reading the text.
  body_hash    text not null,

  total_amount bigint  not null default 0,
  currency     char(3) not null default 'THB',

  sent_at      timestamptz,
  expires_at   timestamptz,

  created_by   uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now(),

  constraint agreement_versions_version_positive check (version > 0),
  constraint agreement_versions_body_not_blank   check (length(btrim(body)) > 0),
  constraint agreement_versions_total_non_negative check (total_amount >= 0),
  constraint agreement_versions_currency_format  check (currency ~ '^[A-Z]{3}$')
);

create unique index agreement_versions_unique
  on agreement_versions (agreement_id, version);
create index agreement_versions_project_idx on agreement_versions (project_id);

alter table agreements
  add constraint agreements_current_version_fk
  foreign key (current_version_id) references agreement_versions (id)
  on delete set null;

-- -----------------------------------------------------------------------------
-- agreement_acceptances — append-only evidence
-- -----------------------------------------------------------------------------
create table agreement_acceptances (
  id           uuid primary key default gen_random_uuid(),
  version_id   uuid not null references agreement_versions (id) on delete cascade,
  project_id   uuid not null references projects (id)           on delete cascade,

  -- Null when accepted through a share link by someone without an account.
  accepted_by  uuid references profiles (id) on delete set null,
  accepted_name  text not null,
  accepted_email text not null,
  -- Captured for evidential value. Personal data: subject to retention policy.
  ip_address   inet,
  user_agent   text,

  accepted_at  timestamptz not null default now(),

  constraint acceptances_name_not_blank  check (length(btrim(accepted_name)) > 0),
  constraint acceptances_email_not_blank check (length(btrim(accepted_email)) > 0)
);

-- A given version is accepted once per person.
create unique index agreement_acceptances_unique
  on agreement_acceptances (version_id, accepted_email);
create index agreement_acceptances_project_idx on agreement_acceptances (project_id);

-- =============================================================================
-- Immutability
-- =============================================================================
-- Enforced by trigger, not convention. RLS can withhold UPDATE from clients,
-- but this also stops agency staff and application bugs.
create or replace function app.reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Table % is append-only; % is not permitted', tg_table_name, tg_op
    using errcode = 'restrict_violation';
end;
$$;

create trigger agreement_versions_immutable
  before update or delete on agreement_versions
  for each row execute function app.reject_mutation();

create trigger agreement_acceptances_immutable
  before update or delete on agreement_acceptances
  for each row execute function app.reject_mutation();

-- =============================================================================
-- RLS
-- =============================================================================
alter table agreements            enable row level security;
alter table agreement_versions    enable row level security;
alter table agreement_acceptances enable row level security;

-- ---- agreements --------------------------------------------------------------
create policy agreements_select on agreements
  for select to authenticated
  using (app.can_read_project(project_id));

create policy agreements_insert_finance on agreements
  for insert to authenticated
  with check (app.can_manage_project_finance(project_id));

create policy agreements_update_finance on agreements
  for update to authenticated
  using (app.can_manage_project_finance(project_id))
  with check (app.can_manage_project_finance(project_id));

-- ---- agreement_versions ------------------------------------------------------
create policy agreement_versions_select on agreement_versions
  for select to authenticated
  using (app.can_read_project(project_id));

create policy agreement_versions_insert_finance on agreement_versions
  for insert to authenticated
  with check (app.can_manage_project_finance(project_id));

-- No update or delete policy, and the trigger above blocks them regardless.

-- ---- agreement_acceptances ---------------------------------------------------
create policy agreement_acceptances_select on agreement_acceptances
  for select to authenticated
  using (app.can_read_project(project_id));

-- A client accepts their own agreement — this is the one write in the contract
-- flow that belongs to the client side. Staff may also record an acceptance
-- taken out of band.
create policy agreement_acceptances_insert on agreement_acceptances
  for insert to authenticated
  with check (
    app.is_project_client(project_id)
    or app.can_manage_project_finance(project_id)
  );
-- ▲ 20260825120700_agreements.sql

-- ▼ 20260825120800_payment_plans_and_milestones.sql
-- =============================================================================
-- 0009 — payment_plans, payment_milestones
-- =============================================================================
-- How a project's total is split into what the client actually pays, and when.
--
-- The milestone is also the unlock unit (brief Phase 12): `unlock_rules` names
-- the resources that become reachable once it is PAID. Those rules are DATA
-- read by canAccessProjectResource(); the milestone row is never itself the
-- gate, and no component should read unlock_rules directly.
-- =============================================================================

create table payment_plans (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,

  type        payment_plan_type not null default 'DEPOSIT_FINAL',
  -- Denormalised from the project so milestone sums can be validated against
  -- the plan without a join, and so a plan keeps the total it was built for.
  total_amount bigint  not null default 0,
  currency     char(3) not null default 'THB',

  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint payment_plans_total_non_negative check (total_amount >= 0),
  constraint payment_plans_currency_format    check (currency ~ '^[A-Z]{3}$')
);

-- One active plan per project.
create unique index payment_plans_project_key on payment_plans (project_id);

create trigger payment_plans_set_updated_at
  before update on payment_plans
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- payment_milestones
-- -----------------------------------------------------------------------------
create table payment_milestones (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references payment_plans (id) on delete cascade,
  project_id  uuid not null references projects (id)      on delete cascade,

  sequence    int  not null,
  name        text not null,
  description text,

  -- Percentages are stored in basis points (3000 = 30.00%) so a 33.33% split
  -- is exact. Storing 33.33 as numeric then multiplying reintroduces exactly
  -- the rounding problem integer money is meant to avoid.
  percentage_bp int,
  amount        bigint not null,

  due_date      date,
  status        milestone_status not null default 'PENDING',

  -- Resources unlocked when this milestone is PAID, e.g.
  --   ["preview", "production_preview"]  or  ["source_code", "credentials"]
  unlock_rules  jsonb not null default '[]'::jsonb,

  paid_at       timestamptz,
  completed_at  timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint milestones_sequence_positive   check (sequence > 0),
  constraint milestones_name_not_blank      check (length(btrim(name)) > 0),
  constraint milestones_amount_non_negative check (amount >= 0),
  constraint milestones_percentage_range
    check (percentage_bp is null or (percentage_bp >= 0 and percentage_bp <= 10000)),
  constraint milestones_unlock_rules_is_array
    check (jsonb_typeof(unlock_rules) = 'array'),
  -- A milestone marked PAID must say when. Guards against a status set without
  -- the corresponding timestamp, which would corrupt unlock and SLA logic.
  constraint milestones_paid_has_timestamp
    check (status <> 'PAID' or paid_at is not null)
);

create unique index payment_milestones_plan_sequence_key
  on payment_milestones (plan_id, sequence);
create index payment_milestones_project_idx  on payment_milestones (project_id);
create index payment_milestones_status_idx   on payment_milestones (project_id, status);
create index payment_milestones_due_date_idx on payment_milestones (due_date)
  where status in ('PENDING', 'INVOICED');
create index payment_milestones_unlock_idx
  on payment_milestones using gin (unlock_rules);

create trigger payment_milestones_set_updated_at
  before update on payment_milestones
  for each row execute function app.set_updated_at();

-- Keeps the denormalised project_id aligned with the plan's project.
create unique index payment_plans_id_project_key on payment_plans (id, project_id);
alter table payment_milestones
  add constraint payment_milestones_plan_same_project
  foreign key (plan_id, project_id)
  references payment_plans (id, project_id)
  on delete cascade;

-- -----------------------------------------------------------------------------
-- Plan integrity
-- -----------------------------------------------------------------------------
-- Milestone amounts must sum to the plan total, and percentages (when used) to
-- 100%. This is checked as a CONSTRAINT TRIGGER deferred to commit, because
-- the rule is only meaningful once the whole set of milestones is in place —
-- a per-row check would reject the first insert of a valid batch.
create or replace function app.validate_payment_plan_totals()
returns trigger
language plpgsql
as $$
declare
  v_plan_id  uuid := coalesce(new.plan_id, old.plan_id);
  v_total    bigint;
  v_sum      bigint;
  v_pct_sum  int;
  v_pct_count int;
  v_row_count int;
begin
  select total_amount into v_total from payment_plans where id = v_plan_id;
  if v_total is null then
    return null;  -- plan already gone; nothing to validate
  end if;

  select
    coalesce(sum(amount), 0),
    coalesce(sum(percentage_bp), 0),
    count(percentage_bp),
    count(*)
  into v_sum, v_pct_sum, v_pct_count, v_row_count
  from payment_milestones
  where plan_id = v_plan_id and status <> 'CANCELLED';

  if v_row_count = 0 then
    return null;  -- an empty plan is a valid draft
  end if;

  if v_sum <> v_total then
    raise exception
      'Payment plan % milestones sum to % but the plan total is %',
      v_plan_id, v_sum, v_total
      using errcode = 'check_violation';
  end if;

  -- Percentages are optional, but if any milestone uses them they all must.
  if v_pct_count > 0 then
    if v_pct_count <> v_row_count then
      raise exception
        'Payment plan %: percentage_bp must be set on all milestones or none',
        v_plan_id
        using errcode = 'check_violation';
    end if;
    if v_pct_sum <> 10000 then
      raise exception
        'Payment plan % percentages sum to % basis points, expected 10000',
        v_plan_id, v_pct_sum
        using errcode = 'check_violation';
    end if;
  end if;

  return null;
end;
$$;

create constraint trigger payment_milestones_validate_totals
  after insert or update or delete on payment_milestones
  deferrable initially deferred
  for each row execute function app.validate_payment_plan_totals();

-- =============================================================================
-- RLS
-- =============================================================================
alter table payment_plans      enable row level security;
alter table payment_milestones enable row level security;

-- Clients must be able to see what they owe and when — this is the core of the
-- portal. They can never write: a client marking their own milestone PAID is
-- precisely the attack this schema exists to prevent.
create policy payment_plans_select on payment_plans
  for select to authenticated
  using (app.can_read_project(project_id));

create policy payment_plans_insert_finance on payment_plans
  for insert to authenticated
  with check (app.can_manage_project_finance(project_id));

create policy payment_plans_update_finance on payment_plans
  for update to authenticated
  using (app.can_manage_project_finance(project_id))
  with check (app.can_manage_project_finance(project_id));

create policy payment_plans_delete_finance on payment_plans
  for delete to authenticated
  using (app.can_manage_project_finance(project_id));

create policy payment_milestones_select on payment_milestones
  for select to authenticated
  using (app.can_read_project(project_id));

create policy payment_milestones_insert_finance on payment_milestones
  for insert to authenticated
  with check (app.can_manage_project_finance(project_id));

create policy payment_milestones_update_finance on payment_milestones
  for update to authenticated
  using (app.can_manage_project_finance(project_id))
  with check (app.can_manage_project_finance(project_id));

create policy payment_milestones_delete_finance on payment_milestones
  for delete to authenticated
  using (app.can_manage_project_finance(project_id));
-- ▲ 20260825120800_payment_plans_and_milestones.sql

-- ▼ 20260825120900_payments.sql
-- =============================================================================
-- 0010 — payments
-- =============================================================================
-- The record of money actually moving. No Stripe columns are populated by this
-- phase; the provider fields exist so the webhook has somewhere to land in
-- Phase 11 without another migration.
--
-- THE CENTRAL RULE (brief Phase 9): a payment reaches PAID only through a
-- verified provider webhook. Nothing here trusts a client. The RLS below gives
-- clients NO write access to this table at all — not insert, not update. A
-- checkout is created by the server on their behalf.
-- =============================================================================

create table payments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects (id) on delete cascade,
  -- Nullable: ad-hoc payments need not map to a milestone.
  milestone_id uuid references payment_milestones (id) on delete set null,

  amount       bigint  not null,
  currency     char(3) not null default 'THB',
  status       payment_status not null default 'PENDING',
  method       payment_method,

  -- Provider linkage. Populated in Phase 11; left null by the mock adapter.
  provider              text,
  provider_payment_id   text,
  provider_checkout_id  text,

  -- Set by the webhook, never by a client action.
  paid_at      timestamptz,
  failed_at    timestamptz,
  refunded_at  timestamptz,
  failure_reason text,

  -- Amount refunded so far, so partial refunds are representable.
  refunded_amount bigint not null default 0,

  created_by   uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint payments_amount_positive        check (amount > 0),
  constraint payments_currency_format        check (currency ~ '^[A-Z]{3}$'),
  constraint payments_refund_non_negative    check (refunded_amount >= 0),
  constraint payments_refund_within_amount   check (refunded_amount <= amount),
  -- Same guard as milestones: a status without its timestamp corrupts every
  -- downstream unlock and reconciliation decision.
  constraint payments_paid_has_timestamp
    check (status <> 'PAID' or paid_at is not null),
  constraint payments_failed_has_timestamp
    check (status <> 'FAILED' or failed_at is not null),
  constraint payments_refunded_has_timestamp
    check (status <> 'REFUNDED' or refunded_at is not null)
);

create index payments_project_idx   on payments (project_id);
create index payments_milestone_idx on payments (milestone_id);
create index payments_status_idx    on payments (project_id, status);
create index payments_paid_at_idx   on payments (paid_at) where status = 'PAID';

-- One row per provider payment. This is the constraint that makes webhook
-- handling idempotent at the data layer rather than relying on application
-- care: a retried event cannot create a second payment row.
create unique index payments_provider_payment_key
  on payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create index payments_provider_checkout_idx
  on payments (provider, provider_checkout_id)
  where provider_checkout_id is not null;

create trigger payments_set_updated_at
  before update on payments
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Provider event log — the idempotency ledger
-- -----------------------------------------------------------------------------
-- Created now rather than in Phase 11 so the webhook has nowhere to be
-- non-idempotent from the start. The unique primary key IS the mechanism: the
-- handler inserts the event id first, and a duplicate insert means the event
-- was already processed, so it returns 200 and stops.
create table payment_provider_events (
  -- The provider's own event id (e.g. Stripe's evt_...).
  id            text primary key,
  provider      text not null,
  event_type    text not null,
  payload       jsonb not null,
  processed_at  timestamptz,
  received_at   timestamptz not null default now(),

  constraint provider_events_provider_not_blank check (length(btrim(provider)) > 0)
);

create index payment_provider_events_unprocessed_idx
  on payment_provider_events (received_at)
  where processed_at is null;

-- =============================================================================
-- RLS
-- =============================================================================
alter table payments               enable row level security;
alter table payment_provider_events enable row level security;

-- Clients may READ their own project's payments — they need their receipts and
-- history. They have no insert, update or delete policy whatsoever, so a
-- client calling the REST API directly to write status = 'PAID' matches no
-- policy and is rejected by the database, regardless of application bugs.
create policy payments_select on payments
  for select to authenticated
  using (app.can_read_project(project_id));

-- Even agency finance staff only record out-of-band payments (bank transfer,
-- cash). Provider-driven transitions come from the webhook, which runs with
-- the service role and bypasses RLS by design.
create policy payments_insert_finance on payments
  for insert to authenticated
  with check (app.can_manage_project_finance(project_id));

create policy payments_update_finance on payments
  for update to authenticated
  using (app.can_manage_project_finance(project_id))
  with check (app.can_manage_project_finance(project_id));

-- No delete policy: payment records are never deleted, only CANCELLED or
-- REFUNDED. Deleting a payment destroys the audit trail.

-- payment_provider_events has RLS enabled and NO policies at all. That is
-- deliberate: it is service-role-only. Raw webhook payloads can contain
-- customer and provider metadata, and no end user has any reason to read them.
-- ▲ 20260825120900_payments.sql

-- ▼ 20260825121000_documents.sql
-- =============================================================================
-- 0011 — documents
-- =============================================================================
-- Quotations, invoices, receipts, agreements and credit/debit notes.
--
-- A NOTE ON TAX INVOICES: document_type includes 'TAX_INVOICE', but storing a
-- row with that label does not make the artefact a legally valid Thai e-Tax
-- Invoice. That requires RDMS certification, digital signatures and submission
-- — none of which this schema implements. The type is a filing category, not a
-- legal claim (brief Phase 18, docs/ARCHITECTURE.md §16).
-- =============================================================================

create table documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  -- Nullable: an organization-level document (a template, a general receipt)
  -- need not belong to a project.
  project_id      uuid references projects (id) on delete cascade,
  client_id       uuid references clients (id)  on delete set null,

  type            document_type   not null,
  status          document_status not null default 'DRAFT',
  -- Display-only human code: INV-2026-001, QUO-2026-014.
  document_number text,
  title           text not null,
  notes           text,

  -- Denormalised money for listing and totals without opening the file.
  amount          bigint  not null default 0,
  currency        char(3) not null default 'THB',

  issued_at       timestamptz,
  due_date        date,
  voided_at       timestamptz,

  -- Path in Supabase Storage. NEVER a public URL: access goes through a
  -- server-side authorization check that issues a short-lived signed URL.
  -- A storage path that is guessable is fine; a public bucket is not.
  storage_path    text,
  file_size       bigint,
  mime_type       text,

  created_by      uuid references profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint documents_title_not_blank    check (length(btrim(title)) > 0),
  constraint documents_amount_non_negative check (amount >= 0),
  constraint documents_currency_format    check (currency ~ '^[A-Z]{3}$'),
  constraint documents_file_size_non_negative check (file_size is null or file_size >= 0),
  -- An issued document must record when, and must have a number to be
  -- referenced by. Drafts need neither.
  constraint documents_issued_has_metadata check (
    status = 'DRAFT'
    or (issued_at is not null and document_number is not null)
  ),
  constraint documents_void_has_timestamp
    check (status <> 'VOID' or voided_at is not null)
);

create unique index documents_org_number_key
  on documents (organization_id, document_number)
  where document_number is not null;
create index documents_org_idx      on documents (organization_id);
create index documents_project_idx  on documents (project_id);
create index documents_client_idx   on documents (client_id);
create index documents_type_idx     on documents (organization_id, type, status);
create index documents_issued_idx   on documents (issued_at desc) where status <> 'DRAFT';

create trigger documents_set_updated_at
  before update on documents
  for each row execute function app.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
alter table documents enable row level security;

-- Two audiences, deliberately asymmetric.
--
-- Agency staff see every document in their organization, including drafts and
-- organization-level documents with no project.
--
-- A client sees ONLY documents attached to a project they are a member of, and
-- only once ISSUED. Drafts are working documents — an invoice being edited, a
-- quotation not yet approved — and must not appear in the portal.
create policy documents_select_staff on documents
  for select to authenticated
  using (organization_id in (select app.org_ids()));

create policy documents_select_client on documents
  for select to authenticated
  using (
    project_id is not null
    and status <> 'DRAFT'
    and app.is_project_client(project_id)
  );

create policy documents_insert_staff on documents
  for insert to authenticated
  with check (
    app.has_org_role(organization_id, 'super_admin', 'admin', 'accountant')
    and (project_id is null or app.can_read_project(project_id))
  );

create policy documents_update_staff on documents
  for update to authenticated
  using (app.has_org_role(organization_id, 'super_admin', 'admin', 'accountant'))
  with check (app.has_org_role(organization_id, 'super_admin', 'admin', 'accountant'));

-- Only managers may delete, and issued financial documents should be VOIDed
-- rather than removed.
create policy documents_delete_managers on documents
  for delete to authenticated
  using (app.is_org_manager(organization_id));
-- ▲ 20260825121000_documents.sql

-- ▼ 20260825121100_activity_logs.sql
-- =============================================================================
-- 0012 — activity_logs
-- =============================================================================
-- The audit trail (brief Phase 24).
--
-- APPEND-ONLY, enforced by trigger. A log that can be edited or deleted is not
-- an audit trail — and the actions worth logging are exactly the ones someone
-- would want to erase. There are no UPDATE or DELETE policies, and the trigger
-- blocks both even for the service role.
--
-- Written inside the same transaction as the mutation it describes, so the log
-- cannot disagree with the data (docs/ARCHITECTURE.md §13).
-- =============================================================================

create table activity_logs (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id      uuid references projects (id) on delete cascade,

  -- Null for system-originated actions: webhooks, scheduled jobs, migrations.
  actor_id        uuid references profiles (id) on delete set null,
  -- Kept alongside actor_id so the trail survives the profile being deleted.
  actor_email     text,

  -- Dotted verb, e.g. project.created, payment.succeeded, source_code.unlocked.
  action          text not null,
  entity_type     text not null,
  entity_id       uuid,

  metadata        jsonb not null default '{}'::jsonb,

  created_at      timestamptz not null default now(),

  constraint activity_logs_action_format
    check (action ~ '^[a-z_]+\.[a-z_]+$'),
  constraint activity_logs_entity_type_not_blank
    check (length(btrim(entity_type)) > 0),
  constraint activity_logs_metadata_is_object
    check (jsonb_typeof(metadata) = 'object')
);

-- A bigint identity rather than a uuid: this table grows faster than any
-- other, is always read in time order, and never appears in a URL.
create index activity_logs_org_time_idx     on activity_logs (organization_id, created_at desc);
create index activity_logs_project_time_idx on activity_logs (project_id, created_at desc);
create index activity_logs_entity_idx       on activity_logs (entity_type, entity_id);
create index activity_logs_actor_idx        on activity_logs (actor_id, created_at desc);
create index activity_logs_action_idx       on activity_logs (organization_id, action, created_at desc);
create index activity_logs_metadata_idx     on activity_logs using gin (metadata);

create trigger activity_logs_immutable
  before update or delete on activity_logs
  for each row execute function app.reject_mutation();

-- -----------------------------------------------------------------------------
-- Writer
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER so a caller can append an entry without being granted
-- INSERT on the table directly. Fills in the actor from the session, so a
-- caller cannot attribute an action to someone else.
create or replace function app.log_activity(
  p_organization_id uuid,
  p_action          text,
  p_entity_type     text,
  p_entity_id       uuid    default null,
  p_project_id      uuid    default null,
  p_metadata        jsonb   default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
begin
  insert into activity_logs (
    organization_id, project_id, actor_id, actor_email,
    action, entity_type, entity_id, metadata
  )
  values (
    p_organization_id,
    p_project_id,
    auth.uid(),
    (select email from profiles where id = auth.uid()),
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function app.log_activity is
  'Appends an audit entry. Actor is taken from the session, never from the '
  'caller, so an action cannot be attributed to another user.';

-- =============================================================================
-- RLS
-- =============================================================================
alter table activity_logs enable row level security;

-- Agency staff see their organization's full activity feed.
create policy activity_logs_select_staff on activity_logs
  for select to authenticated
  using (organization_id in (select app.org_ids()));

-- Clients see activity on their own projects only. Organization-level entries
-- (project_id is null) are internal — a client has no business seeing that
-- another client was invoiced, or that a team member's role changed.
create policy activity_logs_select_client on activity_logs
  for select to authenticated
  using (
    project_id is not null
    and app.is_project_client(project_id)
  );

-- No INSERT policy: entries are written through app.log_activity(), which is
-- SECURITY DEFINER. Direct inserts from a client are rejected, so nobody can
-- forge an audit entry.
--
-- No UPDATE or DELETE policy, and the immutability trigger enforces the same.
-- ▲ 20260825121100_activity_logs.sql

-- ▼ 20260825121200_index_foreign_keys.sql
-- =============================================================================
-- 0013 — Index remaining foreign keys
-- =============================================================================
-- Postgres indexes the referenced side of a foreign key (the primary key) but
-- never the referencing side. Without these, two things degrade badly as the
-- tables grow:
--
--   1. Deleting a profile must scan every referencing table to apply
--      ON DELETE SET NULL. With ~13 unindexed FKs pointing at profiles, one
--      user deletion becomes 13 sequential scans.
--   2. "What did this person create?" queries scan rather than seek.
--
-- Caught by the foreign-key coverage check in scripts/validate-schema.mjs.
-- Kept as a separate migration rather than folded into the originals so it
-- applies correctly whether or not the earlier set has already been run.
-- =============================================================================

create index if not exists organizations_created_by_idx
  on organizations (created_by);

create index if not exists clients_created_by_idx
  on clients (created_by);

create index if not exists projects_created_by_idx
  on projects (created_by);

create index if not exists project_members_created_by_idx
  on project_members (created_by);

create index if not exists project_scopes_created_by_idx
  on project_scopes (created_by);

create index if not exists project_pricing_items_created_by_idx
  on project_pricing_items (created_by);

create index if not exists agreements_created_by_idx
  on agreements (created_by);

-- Also the pointer to the version currently in force, which is followed on
-- every agreement read.
create index if not exists agreements_current_version_idx
  on agreements (current_version_id);

create index if not exists agreement_versions_created_by_idx
  on agreement_versions (created_by);

create index if not exists agreement_acceptances_accepted_by_idx
  on agreement_acceptances (accepted_by);

create index if not exists payment_plans_created_by_idx
  on payment_plans (created_by);

create index if not exists payments_created_by_idx
  on payments (created_by);

create index if not exists documents_created_by_idx
  on documents (created_by);
-- ▲ 20260825121200_index_foreign_keys.sql

-- ▼ 20260826120000_project_progress.sql
-- =============================================================================
-- 0013 — projects.progress
-- =============================================================================
-- Delivery progress as a percentage, edited by staff and displayed in both
-- portals.
--
-- WHY A COLUMN AND NOT A DERIVED VALUE: progress could be computed from
-- project_features (COMPLETED / total), but that conflates "how much of the
-- agreed scope is built" with "how far along is this project", and a project
-- with no scope rows yet would report 0% forever. The brief asks the admin to
-- SET progress; a stored column is what that requires. project_features stays
-- the record of what was agreed, not a progress meter.
--
-- smallint with a range check rather than an unconstrained int: 0–100 is the
-- whole domain, and a bad write should fail at the database, not render a
-- 4000%-wide progress bar.
-- =============================================================================

alter table projects
  add column progress smallint not null default 0,
  add constraint projects_progress_range check (progress between 0 and 100);

comment on column projects.progress is
  'Delivery progress 0–100, set by agency staff. Display and reporting only — '
  'never a permission input; unlocks are decided by paid milestones.';
-- ▲ 20260826120000_project_progress.sql

-- ▼ 20260826120100_deployments_maintenance_change_requests.sql
-- =============================================================================
-- 0014 — project_deployments, maintenance_plans, change_requests
-- =============================================================================
-- The three tables the portal routes need in order to stop rendering invented
-- data. Each follows the pattern established in 0005–0012: project_id is the
-- access key, every policy routes through the app.* helpers, and clients read
-- where staff write.
--
-- No Vercel API is involved here. A deployment row is a RECORD of a deploy,
-- entered by staff. Wiring it to a provider later means filling the same
-- columns from an API response instead of a form — not a new table.
-- =============================================================================

-- One table covers preview and production. They differ by environment, not by
-- shape, and a client asking "what is deployed where" wants one history.
create type deployment_environment as enum (
  'PREVIEW',
  'STAGING',
  'PRODUCTION'
);

create type deployment_status as enum (
  'QUEUED',
  'BUILDING',
  'READY',
  'FAILED',
  'CANCELLED'
);

create type maintenance_status as enum (
  'ACTIVE',
  'PAUSED',
  'CANCELLED',
  'EXPIRED'
);

create type maintenance_billing_cycle as enum (
  'MONTHLY',
  'QUARTERLY',
  'YEARLY'
);

create type change_request_status as enum (
  'OPEN',
  'UNDER_REVIEW',
  'QUOTED',
  'APPROVED',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

create type change_request_priority as enum (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

-- -----------------------------------------------------------------------------
-- project_deployments
-- -----------------------------------------------------------------------------
create table project_deployments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects (id) on delete cascade,

  environment  deployment_environment not null default 'PREVIEW',
  status       deployment_status      not null default 'READY',

  -- Human version label (v1.4.2). Display only.
  version      text,
  url          text,
  commit_sha   text,
  notes        text,

  deployed_at  timestamptz,

  created_by   uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- http(s) only. A javascript: or data: URL here would be rendered as a link
  -- in the portal and handed to a client to click.
  constraint deployments_url_scheme check (url is null or url ~* '^https?://'),
  constraint deployments_commit_sha_format
    check (commit_sha is null or commit_sha ~ '^[0-9a-f]{7,40}$'),
  -- A READY deployment must say where and when; anything else may be in flight.
  constraint deployments_ready_has_url
    check (status <> 'READY' or (url is not null and deployed_at is not null))
);

create index project_deployments_project_idx on project_deployments (project_id, created_at desc);
create index project_deployments_env_idx     on project_deployments (project_id, environment, created_at desc);

create trigger project_deployments_set_updated_at
  before update on project_deployments
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- maintenance_plans
-- -----------------------------------------------------------------------------
create table maintenance_plans (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects (id) on delete cascade,

  name           text not null,
  status         maintenance_status        not null default 'ACTIVE',
  billing_cycle  maintenance_billing_cycle not null default 'MONTHLY',

  -- Minor units, as everywhere else in this schema.
  price_amount   bigint  not null default 0,
  currency       char(3) not null default 'THB',

  -- What the plan covers, e.g. ["โฮสติ้ง", "สำรองข้อมูล"].
  services       jsonb not null default '[]'::jsonb,

  started_on        date,
  next_billing_date date,
  cancelled_at      timestamptz,

  created_by     uuid references profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint maintenance_name_not_blank    check (length(btrim(name)) > 0),
  constraint maintenance_price_non_negative check (price_amount >= 0),
  constraint maintenance_currency_format   check (currency ~ '^[A-Z]{3}$'),
  constraint maintenance_services_is_array check (jsonb_typeof(services) = 'array'),
  constraint maintenance_cancelled_has_timestamp
    check (status <> 'CANCELLED' or cancelled_at is not null)
);

-- One plan per project: the portal shows "your maintenance package", singular.
create unique index maintenance_plans_project_key on maintenance_plans (project_id);
create index maintenance_plans_status_idx on maintenance_plans (status)
  where status = 'ACTIVE';
create index maintenance_plans_next_billing_idx on maintenance_plans (next_billing_date)
  where status = 'ACTIVE';

create trigger maintenance_plans_set_updated_at
  before update on maintenance_plans
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- change_requests
-- -----------------------------------------------------------------------------
create table change_requests (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects (id) on delete cascade,

  -- Display-only code (CR-2026-004), generated by app.next_code().
  request_code text,
  title        text not null,
  description  text,

  status       change_request_status   not null default 'OPEN',
  priority     change_request_priority not null default 'NORMAL',

  -- Quoted cost once staff have priced it. Null while unpriced.
  estimated_amount bigint,
  currency         char(3) not null default 'THB',

  -- The person who raised it. Kept even after status changes hands.
  requested_by uuid references profiles (id) on delete set null,
  resolved_at  timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint change_requests_title_not_blank check (length(btrim(title)) > 0),
  constraint change_requests_estimate_non_negative
    check (estimated_amount is null or estimated_amount >= 0),
  constraint change_requests_currency_format check (currency ~ '^[A-Z]{3}$')
);

create index change_requests_project_idx on change_requests (project_id, created_at desc);
create index change_requests_status_idx   on change_requests (project_id, status);
create unique index change_requests_code_key on change_requests (request_code)
  where request_code is not null;

create trigger change_requests_set_updated_at
  before update on change_requests
  for each row execute function app.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
alter table project_deployments enable row level security;
alter table maintenance_plans   enable row level security;
alter table change_requests     enable row level security;

-- ---- project_deployments -----------------------------------------------------
-- Anyone on the project reads. Only agency staff write: a deployment record a
-- client could edit is a deployment record nobody can trust.
create policy project_deployments_select on project_deployments
  for select to authenticated
  using (app.can_read_project(project_id));

create policy project_deployments_insert_staff on project_deployments
  for insert to authenticated
  with check (app.can_manage_project(project_id));

create policy project_deployments_update_staff on project_deployments
  for update to authenticated
  using (app.can_manage_project(project_id))
  with check (app.can_manage_project(project_id));

create policy project_deployments_delete_staff on project_deployments
  for delete to authenticated
  using (app.can_manage_project(project_id));

-- ---- maintenance_plans -------------------------------------------------------
-- Price and billing cycle are money, so writes are the finance predicate, not
-- the delivery one — a developer should not be able to reprice a retainer.
create policy maintenance_plans_select on maintenance_plans
  for select to authenticated
  using (app.can_read_project(project_id));

create policy maintenance_plans_insert_finance on maintenance_plans
  for insert to authenticated
  with check (app.can_manage_project_finance(project_id));

create policy maintenance_plans_update_finance on maintenance_plans
  for update to authenticated
  using (app.can_manage_project_finance(project_id))
  with check (app.can_manage_project_finance(project_id));

create policy maintenance_plans_delete_finance on maintenance_plans
  for delete to authenticated
  using (app.can_manage_project_finance(project_id));

-- ---- change_requests ---------------------------------------------------------
create policy change_requests_select on change_requests
  for select to authenticated
  using (app.can_read_project(project_id));

-- Clients MAY raise a request on their own project — that is the point of the
-- feature — and must attribute it to themselves.
create policy change_requests_insert_client on change_requests
  for insert to authenticated
  with check (app.is_project_client(project_id) and requested_by = auth.uid());

create policy change_requests_insert_staff on change_requests
  for insert to authenticated
  with check (app.can_manage_project(project_id));

-- Clients get NO update policy. Status, priority and the quoted amount are
-- agency decisions; a client who could set status = 'APPROVED' or
-- estimated_amount = 0 would be pricing their own change request.
create policy change_requests_update_staff on change_requests
  for update to authenticated
  using (app.can_manage_project(project_id))
  with check (app.can_manage_project(project_id));

create policy change_requests_delete_staff on change_requests
  for delete to authenticated
  using (app.can_manage_project(project_id));

-- -----------------------------------------------------------------------------
-- Foreign key indexes
-- -----------------------------------------------------------------------------
-- Same reasoning as migration 0013: Postgres indexes the referenced side of a
-- foreign key but never the referencing side, so without these a single
-- profile deletion turns into a sequential scan of each table below. The
-- project_id columns are already covered by the composite indexes above,
-- which lead with project_id.
create index project_deployments_created_by_idx on project_deployments (created_by);
create index maintenance_plans_created_by_idx   on maintenance_plans (created_by);
create index change_requests_requested_by_idx   on change_requests (requested_by);
-- ▲ 20260826120100_deployments_maintenance_change_requests.sql

-- ▼ 20260826120300_auto_codes.sql
-- =============================================================================
-- 0016 — Automatic display codes
-- =============================================================================
-- PRJ-2026-001, CR-2026-004 and friends are generated by app.next_code(), which
-- lives in the `app` schema and is therefore NOT reachable through PostgREST.
-- That is deliberate (migration 0001), but it leaves the application unable to
-- ask for a code when inserting a row.
--
-- The answer is a trigger rather than an exposed RPC:
--
--   * The application never handles a code at all, so it cannot pass a
--     duplicate, a forged one, or one belonging to another organization.
--   * Numbering is atomic with the insert. Two concurrent project creations
--     cannot both read "last was 007" and both write 008 — app.next_code()
--     increments inside the same transaction.
--   * A direct SQL insert gets a code too, so seeds and back-fills stay
--     consistent with the application.
--
-- These codes remain DISPLAY ONLY. Guessing PRJ-2026-002 must get you nothing:
-- every URL and every policy addresses rows by UUID.
-- =============================================================================

create or replace function app.set_project_code()
returns trigger
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
begin
  if new.project_code is null or length(btrim(new.project_code)) = 0 then
    new.project_code := app.next_code(new.organization_id, 'PRJ');
  end if;
  return new;
end;
$$;

-- BEFORE INSERT, so the generated value satisfies the NOT NULL constraint:
-- constraints are checked after BEFORE triggers have run.
create trigger projects_set_code
  before insert on projects
  for each row execute function app.set_project_code();

create or replace function app.set_change_request_code()
returns trigger
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_org uuid;
begin
  if new.request_code is null or length(btrim(new.request_code)) = 0 then
    -- change_requests hangs off a project, so the organization is one hop away.
    select organization_id into v_org from projects where id = new.project_id;
    if v_org is not null then
      new.request_code := app.next_code(v_org, 'CR');
    end if;
  end if;
  return new;
end;
$$;

create trigger change_requests_set_code
  before insert on change_requests
  for each row execute function app.set_change_request_code();

-- =============================================================================
-- public.log_activity — the audit writer the application can actually reach
-- =============================================================================
-- app.log_activity() is SECURITY DEFINER and fills the actor from the session,
-- but it lives in `app` and PostgREST cannot call it. activity_logs has no
-- INSERT policy by design, so without a reachable wrapper no server action
-- could record anything.
--
-- The wrapper re-checks authorization before delegating. That check is the
-- reason it is safe to expose: app.log_activity() trusts its arguments, and a
-- caller who could pass an arbitrary organization_id would be able to write
-- entries into another tenant's audit trail. Here, you may only log against a
-- project you can read or an organization you belong to.
--
-- The actor is still taken from auth.uid() inside app.log_activity(), so an
-- action can never be attributed to someone else.
-- =============================================================================
create or replace function public.log_activity(
  p_organization_id uuid,
  p_action          text,
  p_entity_type     text,
  p_entity_id       uuid  default null,
  p_project_id      uuid  default null,
  p_metadata        jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
begin
  if p_project_id is not null then
    if not app.can_read_project(p_project_id) then
      raise exception 'not authorized to log activity for this project'
        using errcode = '42501';
    end if;
  elsif not app.is_org_member(p_organization_id) then
    raise exception 'not authorized to log activity for this organization'
      using errcode = '42501';
  end if;

  return app.log_activity(
    p_organization_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_project_id,
    p_metadata
  );
end;
$$;

revoke all on function public.log_activity(uuid, text, text, uuid, uuid, jsonb) from public;
grant execute on function public.log_activity(uuid, text, text, uuid, uuid, jsonb) to authenticated;
-- ▲ 20260826120300_auto_codes.sql

-- ▼ 20260830120000_feedback.sql
-- =============================================================================
-- 0017 — feedback
-- =============================================================================
-- The in-app feedback widget: a control in the topbar that anyone signed in
-- can use to report a problem or suggest an improvement, without leaving the
-- page they are on.
--
-- IT IS NOT change_requests, and the two must not be merged. A change request
-- is billable scope on ONE project, it is quoted, approved and delivered, and
-- its status drives money. Feedback is about the workspace itself: it belongs
-- to no project, nobody is invoiced for it, and the only lifecycle it has is
-- whether the agency has looked at it yet. Putting them in one table would put
-- a nullable project_id and half the change-request columns on every row a
-- typo report ever fills in.
--
-- WHO CAN SUBMIT: anyone signed in, staff and clients alike. That is the point
-- of the widget — the people who hit the rough edges are the ones using the
-- portal, not the ones building it.
-- =============================================================================

-- Two kinds, because the Supabase widget this is modelled on is right about
-- one thing: the question "is this broken, or is this an idea?" is answered
-- better by the person typing than by whoever triages later. A third value
-- ('QUESTION') was considered and left out — a question is a support request
-- and belongs in a conversation, not in a queue nobody promises to answer.
create type feedback_kind as enum (
  'ISSUE',
  'IDEA'
);

-- Deliberately short. Every extra state is a promise to keep it accurate.
create type feedback_status as enum (
  'NEW',
  'TRIAGED',
  'PLANNED',
  'SHIPPED',
  'DECLINED'
);

create table feedback (
  id              uuid primary key default gen_random_uuid(),

  -- Which agency workspace this is about. NULLABLE, and the null case is real:
  -- a person who has signed up but has not yet been added to an organization
  -- or a project has nowhere to belong, and the moment they most want to tell
  -- someone the app is broken is exactly that moment. Such a row is visible to
  -- its author only, until someone with the service role assigns it.
  organization_id uuid references organizations (id) on delete cascade,

  -- Who wrote it. Not null: this widget sits behind the sign-in gate, so there
  -- is always an author. `on delete set null` is therefore not an option here;
  -- the row goes with the profile.
  profile_id      uuid not null references profiles (id) on delete cascade,
  -- Kept alongside profile_id for the same reason activity_logs keeps
  -- actor_email: a triage list that reads "deleted user" is useless.
  submitter_email text,

  kind            feedback_kind   not null,
  status          feedback_status not null default 'NEW',

  message         text not null,

  -- WHERE THEY WERE when they hit send, e.g. /work/admin/invoices. The single
  -- most useful field on the table and the one nobody would ever type: a bug
  -- report without a page is a search, with one it is a lead.
  page_path       text,
  -- Browser and OS, as sent. Truncated by the application; stored raw because
  -- parsing it into columns would decide in advance which half matters.
  user_agent      text,

  -- Object key in the private `work-feedback` bucket (migration 0018), or null
  -- when nothing was attached. Never handed to a browser directly — see that
  -- migration for why the path is not the credential.
  screenshot_path text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- An empty report helps nobody, and the cap is what the textarea allows.
  -- Enforced here as well because the textarea is not the only possible caller.
  constraint feedback_message_length
    check (length(btrim(message)) between 1 and 2000),
  -- A path, not a URL: storing the origin would let a submitted string decide
  -- where a future "open the page they were on" link points.
  constraint feedback_page_path_is_relative
    check (page_path is null or page_path ~ '^/[^\s]*$')
);

create index feedback_org_time_idx on feedback (organization_id, created_at desc);
create index feedback_profile_idx  on feedback (profile_id, created_at desc);
-- Triage reads one status at a time, and almost always newest first.
create index feedback_status_idx   on feedback (organization_id, status, created_at desc);

create trigger feedback_set_updated_at
  before update on feedback
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- What triage may change
-- -----------------------------------------------------------------------------
-- RLS grants UPDATE to org managers so they can move a row through the
-- statuses above. It cannot say WHICH COLUMNS they may touch, and the report
-- itself must not be one of them: an edited complaint is no longer the
-- complaint that was made. The trigger draws that line for everyone, including
-- the service role and a mistaken migration.
create or replace function app.reject_feedback_content_change()
returns trigger
language plpgsql
as $$
begin
  if new.message is distinct from old.message
     or new.kind is distinct from old.kind
     or new.profile_id is distinct from old.profile_id
     or new.page_path is distinct from old.page_path
     or new.screenshot_path is distinct from old.screenshot_path then
    raise exception
      'feedback content is immutable; only status may change'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger feedback_content_immutable
  before update on feedback
  for each row execute function app.reject_feedback_content_change();

-- -----------------------------------------------------------------------------
-- Which organizations a person may file against
-- -----------------------------------------------------------------------------
-- Staff reach an organization through membership; a client reaches it through
-- a project they belong to. app.org_ids() answers only the first half, and a
-- client filing feedback needs the second — without it every client report
-- would be filed with a null organization and would never reach the agency
-- that could act on it.
--
-- SECURITY DEFINER, like its neighbours: the policy that calls it has to read
-- membership rows the caller cannot select directly.
create or replace function app.feedback_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select organization_id
  from organization_members
  where profile_id = auth.uid()
  union
  select p.organization_id
  from project_members m
  join projects p on p.id = m.project_id
  where m.profile_id = auth.uid();
$$;

comment on function app.feedback_org_ids is
  'Organizations the current user may file feedback against: their own '
  'memberships, plus the organizations behind projects they belong to.';

-- =============================================================================
-- RLS
-- =============================================================================
alter table feedback enable row level security;

-- Write it as yourself, about a workspace you actually touch. Both halves
-- matter: without the first, one user could file in another's name; without
-- the second, any signed-in account could drop rows into any agency's triage
-- queue by guessing an organization id.
create policy feedback_insert_self on feedback
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and (organization_id is null or organization_id in (select app.feedback_org_ids()))
  );

-- You can always read back what you sent. This is what lets the widget say
-- "sent" truthfully rather than swallowing the message.
create policy feedback_select_self on feedback
  for select to authenticated
  using (profile_id = auth.uid());

-- Agency staff read their own organization's queue — every role, not just
-- managers: a developer being able to see the bug reports is the entire point.
create policy feedback_select_staff on feedback
  for select to authenticated
  using (organization_id in (select app.org_ids()));

-- Triage is a manager action. The trigger above already limits it to `status`,
-- so this policy decides who may triage, not what triaging is.
create policy feedback_update_managers on feedback
  for update to authenticated
  using (app.is_org_manager(organization_id))
  with check (app.is_org_manager(organization_id));

-- No DELETE policy. Deleting feedback is deciding it was never said; a
-- DECLINED status records the same decision and leaves the record behind.

comment on table feedback is
  'In-app feedback from signed-in users about the workspace itself. Not '
  'billable scope — see change_requests for that.';
-- ▲ 20260830120000_feedback.sql
