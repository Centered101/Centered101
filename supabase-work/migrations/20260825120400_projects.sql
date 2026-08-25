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
