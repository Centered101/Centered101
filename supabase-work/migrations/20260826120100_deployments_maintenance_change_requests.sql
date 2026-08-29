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
