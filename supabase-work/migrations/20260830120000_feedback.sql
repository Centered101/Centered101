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
