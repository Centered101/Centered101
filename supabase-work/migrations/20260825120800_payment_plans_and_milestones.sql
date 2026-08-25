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
