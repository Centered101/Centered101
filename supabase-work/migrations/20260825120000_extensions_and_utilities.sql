-- =============================================================================
-- 0001 — Extensions, helper schema, shared utilities
-- =============================================================================
-- Foundations every later migration depends on. Nothing here is domain logic.
--
-- The `app` schema exists so authorization helpers are NOT reachable through
-- PostgREST: Supabase exposes `public` (plus whatever is configured), never
-- `app`. Keeping the helpers out of `public` means a client cannot call them
-- directly to probe access.
-- =============================================================================

create extension if not exists pgcrypto;      -- gen_random_uuid(), digest()
create extension if not exists pg_trgm;       -- fuzzy search on names/codes

create schema if not exists app;

revoke all on schema app from public;
grant usage on schema app to authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
-- Applied as a trigger on every table carrying updated_at. Done in the database
-- rather than the application so a direct SQL edit cannot leave a stale value.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Current user
-- -----------------------------------------------------------------------------
-- Thin wrapper over auth.uid() so policies read consistently and so the
-- validation harness has a single seam to stub.
create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Human-readable document codes (PRJ-2026-001, INV-2026-042, …)
-- -----------------------------------------------------------------------------
-- Per-organization, per-year, gap-free-enough sequence. This is DISPLAY ONLY.
-- It must never address a resource — URLs use the UUID primary key
-- (docs/ARCHITECTURE.md §5). Guessing PRJ-2026-002 must get you nothing.
create table if not exists app.code_counters (
  organization_id uuid   not null,
  prefix          text   not null,
  year            int    not null,
  last_value      bigint not null default 0,
  primary key (organization_id, prefix, year)
);

create or replace function app.next_code(
  p_organization_id uuid,
  p_prefix          text,
  p_year            int default null
)
returns text
language plpgsql
security definer
set search_path = app, pg_temp
as $$
declare
  v_year int := coalesce(p_year, extract(year from now())::int);
  v_next bigint;
begin
  insert into app.code_counters (organization_id, prefix, year, last_value)
  values (p_organization_id, p_prefix, v_year, 1)
  on conflict (organization_id, prefix, year)
    do update set last_value = app.code_counters.last_value + 1
  returning last_value into v_next;

  return format('%s-%s-%s', p_prefix, v_year, lpad(v_next::text, 3, '0'));
end;
$$;

comment on function app.next_code is
  'Generates a display-only human-readable code. Never use as an access key.';
