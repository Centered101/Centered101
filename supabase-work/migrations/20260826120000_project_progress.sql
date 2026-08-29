-- =============================================================================
-- 0013 — projects.progress
-- =============================================================================
-- Delivery progress as a percentage, edited by staff and displayed in both
-- portals.
--
-- WHY A COLUMN AND NOT A DERIVED VALUE: progress could be computed from
-- project_features (COMPLETED / total), but that conflates "how much of the
-- agreed scope is built" with "how far along is this project", and a project
-- with no scope rows yet would report 0% forever. The brief asks the admin to
-- SET progress; a stored column is what that requires. project_features stays
-- the record of what was agreed, not a progress meter.
--
-- smallint with a range check rather than an unconstrained int: 0–100 is the
-- whole domain, and a bad write should fail at the database, not render a
-- 4000%-wide progress bar.
-- =============================================================================

alter table projects
  add column progress smallint not null default 0,
  add constraint projects_progress_range check (progress between 0 and 100);

comment on column projects.progress is
  'Delivery progress 0–100, set by agency staff. Display and reporting only — '
  'never a permission input; unlocks are decided by paid milestones.';
