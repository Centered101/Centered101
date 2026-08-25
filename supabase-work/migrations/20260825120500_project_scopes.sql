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
