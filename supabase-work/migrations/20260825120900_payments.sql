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
