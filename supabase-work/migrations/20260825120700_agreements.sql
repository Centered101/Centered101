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
