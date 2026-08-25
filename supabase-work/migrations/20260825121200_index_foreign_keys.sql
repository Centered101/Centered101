-- =============================================================================
-- 0013 — Index remaining foreign keys
-- =============================================================================
-- Postgres indexes the referenced side of a foreign key (the primary key) but
-- never the referencing side. Without these, two things degrade badly as the
-- tables grow:
--
--   1. Deleting a profile must scan every referencing table to apply
--      ON DELETE SET NULL. With ~13 unindexed FKs pointing at profiles, one
--      user deletion becomes 13 sequential scans.
--   2. "What did this person create?" queries scan rather than seek.
--
-- Caught by the foreign-key coverage check in scripts/validate-schema.mjs.
-- Kept as a separate migration rather than folded into the originals so it
-- applies correctly whether or not the earlier set has already been run.
-- =============================================================================

create index if not exists organizations_created_by_idx
  on organizations (created_by);

create index if not exists clients_created_by_idx
  on clients (created_by);

create index if not exists projects_created_by_idx
  on projects (created_by);

create index if not exists project_members_created_by_idx
  on project_members (created_by);

create index if not exists project_scopes_created_by_idx
  on project_scopes (created_by);

create index if not exists project_pricing_items_created_by_idx
  on project_pricing_items (created_by);

create index if not exists agreements_created_by_idx
  on agreements (created_by);

-- Also the pointer to the version currently in force, which is followed on
-- every agreement read.
create index if not exists agreements_current_version_idx
  on agreements (current_version_id);

create index if not exists agreement_versions_created_by_idx
  on agreement_versions (created_by);

create index if not exists agreement_acceptances_accepted_by_idx
  on agreement_acceptances (accepted_by);

create index if not exists payment_plans_created_by_idx
  on payment_plans (created_by);

create index if not exists payments_created_by_idx
  on payments (created_by);

create index if not exists documents_created_by_idx
  on documents (created_by);
