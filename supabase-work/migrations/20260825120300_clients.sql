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
