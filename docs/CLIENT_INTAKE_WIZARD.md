# CLIENT INTAKE WIZARD — Centered101 Work

**Date:** 2026-09-03
**Status: BUILT.** This unblocks the two gaps flagged as MISSING/PENDING in
`docs/ADMIN_PROJECT_REVIEW.md` (Requirements/Brand sections on the review
page) and `docs/PROJECT_WORKSPACE_IMPLEMENTATION.md` (client-intake
dependency for the payment-plan comparison).

---

## What this is

Steps 2–9 of the wizard following Step 1 (`createOwnProject`, unchanged —
already existed). Every step writes into the SAME `DRAFT` project row —
that row already **is** the draft (the design decision from
`docs/PROJECT_WORKSPACE_ARCHITECTURE.md` §3), so leaving and resuming later
needs no separate draft-storage mechanism.

```
Step 1 (existing, unchanged) — Basic Information → createOwnProject → DRAFT row created
Step 2 — Requirements        → saveRequirements
Step 3 — Scope                → saveScope
Step 4 — Timeline             → saveTimeline
Step 5 — Budget               → saveBudget
Step 6 — Payment Proposal     → savePaymentProposal
Step 7 — Delivery             → saveDeliveryRequest
Step 8 — Brand & Assets       → uploadProjectAsset / addProjectAssetLink
Step 9 — Review & Submit      → submitProject (existing, unchanged)
```

`/portal/projects/[id]/wizard?step=<key>` — URL-driven, so a shared link or
a browser back always lands on the right step, same convention as the
Inbox's own filter strip.

## Schema — two new migrations

**`20260903100000_client_intake_wizard.sql`**
- `projects.requirements jsonb` — free-form: goals, target audience,
  required features/pages, technology, references, design preferences,
  brand colors, fonts, content availability, domain requirements, notes.
  Shape lives in `lib/work/validation/intake.ts`, not enforced by the
  database beyond "is an object" — deliberately, since this will keep
  changing shape as the wizard grows, and a column per field would mean a
  migration every time a question is reworded.
- `projects.requested_start_date` / `requested_deadline` /
  `proposed_deadline` — the three-way deadline flagged as NEEDS EXTENSION
  in the earlier admin-lifecycle audit.
- `projects.requested_budget_min` / `requested_budget_max` — informational
  only, CHECK-constrained `min <= max`, never read by pricing logic.
- `projects.requested_payment_plan jsonb` — the client's PROPOSED split.
  Entirely separate from `payment_plans`/`payment_milestones` (migration
  0009) — this is what `docs/ADMIN_PROJECT_REVIEW.md`'s payment-plan
  comparison (still not built) will read from; it is never written into
  the real payment tables automatically.
- `projects.requested_delivery jsonb` — an array of delivery-item keys the
  client asked for. Deliberately NOT tied to `UNLOCKABLE_RESOURCES`
  (`lib/work/types/enums.ts`) — "what the client wants" and "what payment
  actually unlocks" are different concepts that share some vocabulary.
- Additive RLS: `project_scopes`/`project_features` gain
  `_insert_owner`/`_update_owner`/`_delete_owner` policies — before this,
  ONLY staff could ever write scope, which meant a self-serve project's
  wizard had nowhere to put its Scope step. Existing staff policies
  untouched.

**`20260903100100_project_assets.sql`** + **`20260903100200_storage_assets.sql`**
- New table `project_assets` — deliberately NOT a reuse of `documents`
  (migration 0011): that table is staff-only-write and models
  financial/contractual paperwork; a client uploading their logo is a
  different concern with different write authority.
- `project_asset_kind` (LOGO/ICON/FAVICON/IMAGE/FONT/BRAND_GUIDELINE/
  REFERENCE/OTHER), `project_asset_review_status`
  (PENDING/APPROVED/NEEDS_REPLACEMENT/NEEDS_CLARIFICATION).
- Exactly one of `storage_path` / `external_url` — a file upload OR a
  reference-website link, never both, enforced by a CHECK constraint.
- New private storage bucket `work-assets` — no policies on
  `storage.objects`, same shape as `work-documents`/`work-feedback`. Split
  into its OWN migration file, not combined with the table: an earlier
  draft of this migration combined them, and
  `scripts/snapshot-work-schema.mjs` sorts a migration into `schema.sql` or
  `storage.sql` by sniffing the WHOLE file's content for `storage.` — a
  combined file got its table wrongly filed under storage.sql entirely,
  caught by a local RLS test coming back "relation project_assets does not
  exist". Fixed by following the convention every other bucket-creating
  migration in this schema already uses (`documents`/`storage_documents`,
  `feedback`/`storage_feedback`): one file per concern.

**RLS on `project_assets`**: `SELECT` for anyone who can read the project;
`INSERT` for ANY project member (not owner-only — brand assets carry no
financial stakes, this is deliberately broader than pricing/payment write
access); `UPDATE` (review status/note) staff-only; `DELETE` for staff, or
the uploader themselves while still `PENDING`.

## Server actions (`lib/work/services/intake.ts`)

All OWNER-only except `uploadProjectAsset`/`addProjectAssetLink`/
`removeProjectAsset` (any project member — matches the RLS above). None of
these actions can touch `total_amount`, `payment_plans`, or `unlock_rules`
— they have no code path that writes any of them.

File upload (`uploadProjectAsset`) mirrors `submitFeedback`'s existing
screenshot-upload shape exactly: uploaded BEFORE the row exists (a storage
failure costs a retry, not an orphaned row), path chosen server-side from
the caller's own id, cleaned up if the row insert then fails.

## What this closes

- `docs/ADMIN_PROJECT_REVIEW.md`'s Project Review page now shows real
  Requirements, Timeline (three-way), Budget, Payment Proposal, Delivery
  request, and Brand assets (with an admin review control) — previously
  all "MISSING, depends on the wizard".
- `approveForQuotation`'s field validation (`findMissingQuotationFields`)
  now also checks requirements/delivery for a self-serve project
  (`project.ownerId` present) — previously could not, since nothing
  collected that data. A staff-created project (no owner) is unaffected —
  the check only applies when the project actually came through this
  wizard.

## What this does NOT close yet

- The payment-plan **comparison** UI (client proposal vs admin plan,
  side by side) — the data now exists (`requested_payment_plan`) but the
  comparison screen itself is not built. Next natural step once Phase 3
  (฿250 minimum-start-payment) is underway.
- Admin's own "propose a different deadline" UI — `proposed_deadline`
  exists as a column, nothing writes it yet.

## Testing

- `npm run work:db:snapshot && npm run work:db:validate` — **104/104**.
- A dedicated real-Postgres RLS check (PGlite, same technique as every
  other RLS test this session) — **13/13**: OWNER can write
  scope/requirements, a stranger cannot; any project member can upload an
  asset, a stranger cannot, and cannot forge another user as the uploader;
  a stranger cannot even see the assets, a fellow member can; the OWNER
  cannot review (approve) their own upload — staff-only; the budget-range
  CHECK constraint holds. One of these caught a real test-script bug (the
  same "affectedAs always rolls back" gotcha from the collaboration RLS
  test) before being fixed, not a schema bug.
- `npx tsc --noEmit` — **0 errors**.
- `npx eslint .` — **0 errors**, same pre-existing warning set.
- `npm run build` — **PASS, 129/129 pages** (`/portal/projects/[id]/wizard`
  and `/work/api/assets/[id]/download` both registered as dynamic routes).

Live-remote testing remains **PENDING** — these four migrations join the
existing queue in `docs/PRODUCTION_READINESS.md`; this sandbox still has no
path to apply DDL to the real Supabase project.
