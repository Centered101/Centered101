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
