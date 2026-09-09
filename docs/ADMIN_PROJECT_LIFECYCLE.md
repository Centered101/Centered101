# ADMIN PROJECT LIFECYCLE — Centered101 Work

**Date:** 2026-09-02
**Status: AUDIT + PHASE 1 IMPLEMENTATION.** Per §37's explicit "before coding,
audit the current system" instruction, this document leads with the audit;
Phase 1 (Admin Project Inbox, Project Review, project status workflow) was
then implemented against it in the same pass, matching the working rhythm
established for the prior two large requests in this conversation. Phases
2–7 are planned, not built — see §Phase Plan.

---

## 1. Audit — ALREADY EXISTS / MISSING / NEEDS EXTENSION / CONFLICTS / SECURITY RISKS

### ALREADY EXISTS (reuse verbatim, no changes)
- **Payments, Stripe, PromptPay, manual payments, webhook-only PAID** — untouched, not re-audited here (see `docs/BUSINESS_FLOW_AUDIT.md`, `docs/PRODUCTION_READINESS.md`).
- **`unlock_rules`, RLS, pricing integrity (`total_amount` guard)** — untouched.
- **Quotation core**: `agreements` / `agreement_versions` / `agreement_acceptances` (migration 0008) already implement almost exactly §9–13's ask — one agreement per project, immutable versioned snapshots (`agreement_versions.version`, `body`, `body_hash`), append-only acceptance evidence, `agreement_status` (DRAFT/SENT/ACCEPTED/DECLINED/EXPIRED/SUPERSEDED — 6 of the 7 brief asks for). `AgreementPanel`/`SendAgreementForm`/`AgreementConfirmPanel` and `services/agreements.ts` (`sendAgreement`, `acceptAgreement`) already exist and are wired into both portals.
- **Project scope/requirements intake**: `project_scopes`/`project_features` (§Client submission's Scope section) — versioned, checkbox-style, already built.
- **Documents with categories, versions is NOT yet there** — see NEEDS EXTENSION below; the base `documents` table, storage, and signed-URL download flow all exist and are reused as-is.
- **Members, roles, invitations** — `docs/PROJECT_COLLABORATION_AUDIT.md`, complete, untouched.
- **Milestones, payment plans** — `payment_plans`/`payment_milestones`, complete, untouched.
- **Change requests** — `change_requests`, already isolated from `project_pricing_items` (verified in `docs/PROJECT_WORKSPACE_ARCHITECTURE.md` §5).
- **Deployments ("Publishing")** — `project_deployments`, complete.
- **Maintenance plans** — `maintenance_plans`, complete (maintenance *requests* as a distinct log is a known gap from the prior audit, unchanged here).
- **Activity log** — `activity_logs`, generic, already fed by nearly every action — covers §32 with zero new schema.

### MISSING (genuinely new, not built anywhere)
- **Client submission workflow** (DRAFT → SUBMITTED → admin review) — the current self-serve project creation (`createOwnProject`) lands directly at `DRAFT` with no "submit for review" step, and there is no admin-facing inbox of new requests at all.
- **Structured VAT/pricing snapshot on a quotation version** — `agreement_versions` stores `total_amount` and a free-text `body`; it does not store `subtotal`/`discount_total`/`taxable_amount`/`vat_rate_bp`/`vat_amount` as discrete columns the way `project_pricing_totals` already does for live pricing. Today "the quotation" and "the current pricing" can silently drift once pricing changes after a quote was sent — the version's `body` is immutable, but its structured numbers are not captured at all.
- **Quotation numbering** (QT-2026-001) — no `document_number`-style field on `agreement_versions`.
- **`VIEWED` status** — the brief's quotation status list includes it; `agreement_status` does not.
- **Client-proposed vs admin payment-plan comparison** (§14) — nothing stores what a client *proposed*; `payment_plans` only ever represents the one plan admin actually creates.
- **Three-way deadline** (§17: client-requested / admin-proposed / final-agreed) — `projects.expected_delivery` is a single column.
- **Work status separate from payment status per milestone** (§19) — `payment_milestones.status` is payment-only (PENDING/INVOICED/PAID/OVERDUE/CANCELLED); there is no development-progress field.
- **Project timeline / Gantt-style items** (§16) — no table at all.
- **Configurable minimum start payment** (§7) — no config table anywhere in the schema; nothing to configure yet.
- **Brand asset collection as its own concept** (§4–5) — `documents` can hold a file, but has no `visibility`/asset-specific fields (logo/color/font are metadata, not files) and no "approve/needs-replacement" review status.
- **Delivery checklist / handover acceptance** (§27–28) — flagged already in `docs/PROJECT_WORKSPACE_IMPLEMENTATION.md` Phase 7, still not built.

### NEEDS EXTENSION (existing table, additive columns/values)
- `project_status`: add `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFORMATION`, `DELIVERED` (the last one already flagged in the prior audit). Everything else in the brief's §6 lifecycle maps 1:1 onto an existing value — see the mapping table below. **Not renaming anything.**
- `agreement_status`: add `VIEWED` (additive).
- `agreement_versions`: add `quotation_number`, `subtotal`, `discount_total`, `taxable_amount`, `vat_enabled`, `vat_rate_bp`, `vat_amount` (additive columns, captured from `project_pricing_totals` at send time — `total_amount` stays as the grand total, unchanged in meaning).
- `payment_milestones`: add `work_status` (new enum, default `NOT_STARTED`) — kept fully independent of `status` (payment status), per §19's explicit instruction. No existing constraint, trigger, or RLS policy touches this column, so nothing about milestone payment integrity changes.
- `projects`: add `requested_deadline` (client's original ask, written once at submission, never overwritten), `proposed_deadline` (admin's counter-offer) — `expected_delivery` remains the final agreed date, unchanged in meaning. Add `requested_payment_plan jsonb` (the client's proposed split, captured at submission).

### CONFLICTS (brief's vocabulary vs existing — resolved, not duplicated)
- The brief's §6 lifecycle (18 states) substantially overlaps the existing `project_status` (18 different values, richer in places). Resolved the same way as the prior workspace audit: **map, don't rename.**

  | Brief's term | Resolution |
  | --- | --- |
  | `DRAFT` | existing `DRAFT` |
  | `SUBMITTED` | **new** |
  | `UNDER_REVIEW` | **new** |
  | `NEEDS_INFORMATION` | **new** |
  | `QUOTATION_DRAFT` | not a project status — this is `agreements.status = 'DRAFT'` on the project's one agreement (already modeled, one level down) |
  | `QUOTATION_SENT` | existing `WAITING_FOR_AGREEMENT` (project status) + `agreements.status = 'SENT'` (agreement status) — both already exist and already fire together in `sendAgreement` |
  | `AWAITING_CLIENT_APPROVAL` | same as `QUOTATION_SENT` above — the brief lists these as two states; the existing schema already treats "quote sent" and "awaiting the client's yes" as one state, which is more accurate (there is no in-between) |
  | `AWAITING_DEPOSIT` | existing `WAITING_FOR_DEPOSIT` |
  | `READY_TO_START` | existing `READY_TO_START` |
  | `IN_PROGRESS` | existing `IN_PROGRESS` |
  | `IN_REVIEW` | existing `CLIENT_REVIEW` |
  | `CLIENT_APPROVAL` | existing `FINAL_APPROVAL` |
  | `READY_FOR_DELIVERY` | existing `READY_FOR_HANDOVER` |
  | `DELIVERED` | **new** (already flagged pre-existing prior audit) |
  | `MAINTENANCE` | existing `MAINTENANCE` |
  | `COMPLETED` | existing `COMPLETED` |
  | `CANCELLED` | existing `CANCELLED` |
  | `ARCHIVED` | not a status — `projects.archived_at`, unchanged (see prior audit §4 for why this is the correct pattern) |

- The brief's §9 quotation status list (DRAFT/SENT/VIEWED/ACCEPTED/REJECTED/EXPIRED/SUPERSEDED) vs existing `agreement_status` (DRAFT/SENT/ACCEPTED/DECLINED/EXPIRED/SUPERSEDED): `REJECTED` ≈ existing `DECLINED` (kept as-is, not renamed), `VIEWED` is genuinely missing (added).

### SECURITY RISKS found during this audit
- **§8's delete-lock is not yet enforceable — because there is currently no delete path for a client at all**, in either direction. Checked directly: `projects` RLS has exactly one DELETE policy, `projects_delete_managers` (staff org-managers only, migration 0005). No self-serve OWNER DELETE policy was ever added (migration 0025b deliberately implemented "delete project" as archive-only, on purpose — see that migration's own comment). **This means §8 as literally stated ("client may delete their draft project before payment") is not something the client can do today.** Recommendation, not silently assumed: implement §8's "before payment, client can remove a draft project" as archive (soft-delete via `archived_at`, exactly the existing pattern), not a real `DELETE`, consistent with this codebase's standing rule against unjustified destructive deletes. A genuine hard-delete policy is available below (§Phase 1) for the case where a project has zero pricing items, zero payments, and zero members beyond the owner — but is gated tightly and not exposed in any UI yet.
- **No other new risk found.** Every write path this section touches (status transitions, the new delete/archive rule) goes through a new SECURITY DEFINER-adjacent server action + RLS pairing, following the exact belt-and-braces shape audited repeatedly in this conversation — no existing RLS policy is loosened by anything in Phase 1.

---

## 2. Phase 1 — Admin Project Inbox + Project Review + Status Workflow

### What was built
- **Migration** `20260902100000_admin_project_lifecycle.sql`:
  - `project_status` additive values: `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFORMATION`, `DELIVERED`.
  - `projects.submitted_at` (nullable timestamptz) — when a client moved a project from DRAFT to SUBMITTED. Distinguishes "still drafting" from "waiting on admin" without overloading `created_at`.
  - A `projects_delete_owner` RLS policy: a self-serve OWNER may delete their own project ONLY while it has zero pricing items, zero payments, and status is `DRAFT` — i.e., before anything of substance exists. This is deliberately narrower than "before any payment" (the brief's literal ask): a project with pricing items already represents real staff/owner effort and stays archive-only, matching the existing standing rule. The financial half of §8 ("after payment, undeletable") needed no new policy — it was already true (no client delete path existed at all); this migration only opens a narrow, safe case, it does not widen anything that was a risk.
  - `app.can_delete_own_draft_project(project_id)` helper, mirroring `app.is_project_owner`'s shape.
- **`submitProject`** (`lib/work/services/projects.ts`) — the client-facing action moving a project from `DRAFT` to `SUBMITTED`, setting `submitted_at`. Guarded by `isProjectOwner`. This is the ONLY place `SUBMITTED` is ever written.
- **`reviewProject`** (new, staff-only) — moves a project between `SUBMITTED` → `UNDER_REVIEW` → (`NEEDS_INFORMATION` | back to admin's next step). Every transition logged to `activity_logs` with the old and new status in `metadata`, per §32.
- **Admin Project Inbox** (`/admin/inbox`) — every project in `SUBMITTED`/`UNDER_REVIEW`/`NEEDS_INFORMATION`, with the filter set from §1 (`All`/`New`/`Reviewing`/... mapped onto the resolved status vocabulary above), each card showing name/client/type/submitted date/requested deadline/status/payment status/member count, a "Review Project" link.
- **Project Review page** (`/admin/projects/[id]/review`) — the client's full submission: scope, pricing (as submitted, read-only until a quotation exists), timeline dates, members, and the three admin actions (Approve for Quotation / Needs More Information / Reject), each a real server action, each RLS-backed the same way every other admin mutation in this codebase is.

### What Phase 1 deliberately does not touch
- No changes to `payment_plans`/`payment_milestones`/`payments`/webhook logic.
- No changes to `unlock_rules` or any resource-gating RLS.
- No changes to the pricing-write policies from the collaboration work — a submitted project's pricing is still edited through the exact same `requireProjectPricing`-gated actions as before.

---

## 3. Phase Plan (Phases 2–7, not yet built)

| Phase | Scope | Key new schema |
| --- | --- | --- |
| 2 | Quotation (numbering, VAT/pricing snapshot, versioning, client-request-changes), Pricing, Payment plan comparison | `agreement_versions` extension (above), `agreement_status.VIEWED`, `projects.requested_payment_plan` |
| 3 | Timeline, Milestones (`work_status`), lifecycle polish | `project_timeline_items` (new table), `payment_milestones.work_status` |
| 4 | Brand Assets, Documents (categories/version/visibility — same extension already planned in `docs/PROJECT_WORKSPACE_IMPLEMENTATION.md` Phase 5), Client information view | `document_type` additive values, `documents.visibility`/`version`, a lightweight `project_assets` table if brand metadata (colors/fonts) needs structure beyond a file |
| 5 | Publishing, Source Code, Delivery | Delivery checklist (already planned, Workspace doc Phase 7) |
| 6 | Change Requests (already functionally complete — polish only), Maintenance (`maintenance_requests`, already planned) | `maintenance_requests` |
| 7 | Notifications, Activity (already exists, needs an admin-facing feed page), Reports | Possibly a `notifications` table if Sonner-only proves insufficient for persistent/cross-session alerts — not decided yet, deferred to that phase |

Configurable minimum start payment (§7) is folded into Phase 2 (it gates `READY_TO_START`, which only matters once quotation+payment-plan exist) — a new `organization_settings` table (`organization_id` PK, `min_start_payment_amount bigint not null default 25000` [= ฿250], `currency`) rather than hardcoding ฿250 anywhere, per the brief's explicit instruction.

---

## 4. Testing

- `npm run work:db:snapshot && npm run work:db:validate` — **102/102 passed** after the new migrations (two new `project_status` values wired into `PG_ENUM_MAP`/`PROJECT_STATUSES` in exact `pg_enum` append order — see the enum's own code comment for why order matters here).
- `npx tsc --noEmit` — **0 errors.**
- `npx eslint .` — **0 errors**, same pre-existing warning set, none new.
- `npm run build` — **PASS, 129/129 pages** (`/admin/inbox` and `/admin/projects/[id]/review` both registered as dynamic routes, same as every other per-project admin page).

Live-remote testing remains **PENDING**, same reason as every prior
migration this session: this sandbox has no path to apply DDL to the real
Supabase project. `20260902095900_project_status_lifecycle_values.sql` and
`20260902100000_admin_project_lifecycle.sql` join the existing PENDING
queue in `docs/PRODUCTION_READINESS.md` until a person with real
credentials applies them, after which the same class of live-session test
already run for every prior phase (Client A/B isolation, IDOR on the new
`/review` route, the narrow owner-delete RLS policy) should be repeated
against production before this phase is marked live-verified.
