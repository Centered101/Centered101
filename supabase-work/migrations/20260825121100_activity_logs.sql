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
