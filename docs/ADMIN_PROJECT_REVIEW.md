# ADMIN PROJECT REVIEW — Centered101 Work

**Date:** 2026-09-02/03
**Status: AUDIT + PHASE 1 IMPLEMENTATION** (hardened). This is a revision
pass over `docs/ADMIN_PROJECT_LIFECYCLE.md`'s Phase 1 — same audit-first
discipline, but with a real server-side status transition graph, the
rejection-tracking columns, and the split of the review decision into three
independently-guarded actions the earlier pass didn't yet have.

---

## 1. Audit

### ALREADY EXISTS (reused, unchanged)
- `projects` table, `project_status` enum, RLS (`projects_select_visible`,
  `projects_update_staff`, `projects_update_owner`, `projects_delete_managers`,
  `projects_delete_owner`) — untouched.
- `activity_logs` — generic, project-scoped, reused for every event this
  phase adds (no new table).
- Admin Project Inbox (`/admin/inbox`), Project Review (`/admin/projects/[id]/review`),
  `submitProject`, the two `SUBMITTED`/`UNDER_REVIEW`/`NEEDS_INFORMATION`/
  `DELIVERED` status values — all from the prior pass
  (`docs/ADMIN_PROJECT_LIFECYCLE.md` §2), reused and extended here, not
  rebuilt.
- Every payment/Stripe/PromptPay/manual-payment/pricing-integrity/
  unlock_rules system — untouched, not re-audited (see
  `docs/BUSINESS_FLOW_AUDIT.md`, `docs/PRODUCTION_READINESS.md`).
- The general-purpose `/admin/projects/[id]` detail page (pricing, payments,
  milestones, deployments, agreements, members, all already built) —
  untouched. This phase's review workflow lives at the separate `/review`
  sub-route, not merged into it — see §9 for why.

### MISSING → now built this pass
- **A real, enforced status transition graph.** The prior pass's
  `reviewProject` only checked `.in('status', [...])` — a coarse "is this
  even a review-eligible state" gate, not a real per-edge graph. This pass
  adds `lib/work/auth/project-status.ts`: `PROJECT_STATUS_TRANSITIONS`, the
  exact graph from this task's §3, plus `assertValidTransition()`, which
  every status-writing action now calls before touching the database.
- **Three distinct project_status values** the graph actually needs:
  `QUOTATION_DRAFT`, `QUOTATION_SENT`, `AWAITING_CLIENT_APPROVAL` — the
  earlier pass had mapped all three onto the single existing (and, checked
  directly, never-written-anywhere) `WAITING_FOR_AGREEMENT` value. Revised:
  see migration `20260902110000_project_review_status_values.sql`'s own
  comment for the check that found nothing collides.
- **`IN_REVIEW`, `CLIENT_APPROVAL`, `READY_FOR_DELIVERY`** — same migration,
  same reasoning, distinct from the pre-existing `CLIENT_REVIEW`/
  `FINAL_APPROVAL`/`READY_FOR_HANDOVER` (which remain in the enum, unused
  going forward, since Postgres cannot drop an enum value).
- **Rejection with a reason, kept as durable state** — `rejected_by`/
  `rejected_at`/`rejection_reason` (migration `20260902110100_project_rejection_tracking.sql`),
  guarded by a CHECK requiring the reason whenever `rejected_at` is set —
  the same "status + its evidence" shape `payments_paid_has_timestamp` and
  `milestones_paid_has_timestamp` already use elsewhere in this schema.
- **Three separate review actions**, not one dropdown: `approveForQuotation`
  (validates minimum info, §8), `requestMoreInformation` (requires a note),
  `rejectProject` (requires a reason, uses a separate admin-override
  transition table since rejection is a deliberate exit, not a graph edge).
- **The client's NEEDS_INFORMATION response loop** — `provideRequestedInformation`
  (client, NEEDS_INFORMATION → SUBMITTED) + `getLatestInformationRequest()`
  (reads the admin's note back from `activity_logs`, no new column) +
  `NeedsInformationBanner` on the portal overview page.
- **Admin dashboard cards + filters + search** on `/admin/projects` — status
  buckets, status/type/payment filters, name/client/id search, all via
  URL search params so a link or a browser-back reproduces the exact view.
- **Client "next action" hint** on the My Projects card grid
  (`PROJECT_NEXT_ACTION_LABELS`).

### NOT built this pass (stated, not silently skipped)
- **Requirements / Brand / Delivery-requested / Payment-Request sections**
  on the Project Review page beyond what already exists (scope, proposed
  pricing, members). These depend on schema this codebase does not have
  yet — `projects.requirements`, brand asset storage, a requested-delivery
  checklist, a client-proposed payment-plan record — all tied to the
  client-intake wizard from a separate, not-yet-built phase
  (`docs/PROJECT_WORKSPACE_IMPLEMENTATION.md` Phase 2). Building a "Brand
  Assets" tab with nothing behind it would be exactly the kind of
  plausible fiction this whole project has been careful to avoid. When the
  wizard lands, this page's Review sections extend to show that data — the
  page's structure does not need to change, only what it reads.
- **§9's reusable project header component + tabs (Overview/Requirements/
  Brand/Members/Activity)** on the general admin detail page. The existing
  `/admin/projects/[id]` page is already a full, working, general-purpose
  detail page (pricing, payments, milestones, deployments, agreements,
  members) that predates this task and is explicitly out of scope to
  rewrite ("Do NOT rewrite... existing Client workspace" / general
  admonition against duplicating working features). Restructuring it into
  the tabbed shape this section describes is a real UI project on its own
  and was not attempted this pass to keep the change surface reviewable —
  flagged as the next concrete piece of work, not silently dropped.
- **Activity tab on the admin side** — `getActivity({projectId})` already
  exists and already works (used by the client portal); an admin-facing
  route rendering it is a one-page addition, deferred with the header/tabs
  work above since they belong together.

### CONFLICTS — resolved, see the migration comments for full reasoning
- The status vocabulary conflict from the prior audit (map vs duplicate) is
  **revised** for the quotation-adjacent states specifically, per the
  finding above: `WAITING_FOR_AGREEMENT` was never actually written by any
  code path, so there was nothing to preserve by reusing it. Every other
  earlier mapping (WAITING_FOR_DEPOSIT, READY_TO_START, IN_PROGRESS,
  MAINTENANCE, COMPLETED, CANCELLED) stands unchanged.

### SECURITY RISKS
- **None newly found.** The delete-lock gap from the prior audit was
  already closed there. Every new write in this pass goes through a named
  server action with its own `requireCapability`/`requireProjectAccess`
  guard, its own `assertValidTransition` check, and RLS underneath —
  nothing here trusts `project_id`, `status`, or any other value from the
  browser; every action re-reads current status from the database before
  deciding whether a transition is legal.

---

## 2. Project status — the full transition graph

```
DRAFT ────────────────────────────────► SUBMITTED
                                            │  ▲
                          ┌─────────────────┤  │
                          ▼                 ▼  │
                    UNDER_REVIEW  ──►  NEEDS_INFORMATION
                          │                    (back to SUBMITTED)
             ┌────────────┼──────────────┐
             ▼            ▼              ▼
      QUOTATION_DRAFT  CANCELLED    (admin override,
             │           (admin      not the normal graph)
             ▼            override)
      QUOTATION_SENT
             │
             ▼
   AWAITING_CLIENT_APPROVAL
             │        │
             ▼        ▼
  WAITING_FOR_DEPOSIT  QUOTATION_DRAFT  (client asked for changes)
             │
             ▼
      READY_TO_START
             │
             ▼
       IN_PROGRESS ◄──────┐
             │             │
             ▼             │
        IN_REVIEW ─────────┘ (sent back)
             │
             ▼
     CLIENT_APPROVAL ────► IN_REVIEW (client asked for revision)
             │
             ▼
   READY_FOR_DELIVERY
             │
             ▼
        DELIVERED
          │      │
          ▼      ▼
   MAINTENANCE  COMPLETED
          │
          ▼
      COMPLETED
```

Enforced by `lib/work/auth/project-status.ts`'s `PROJECT_STATUS_TRANSITIONS`
— exhaustively, not just for the states this phase's actions use. Every
status-writing action:
1. Reads the row's CURRENT status under the caller's own session.
2. Calls `assertValidTransition(current, target)` — throws on an illegal edge.
3. Writes with `.eq('status', current)` — so a concurrent change between
   steps 1 and 3 makes the write match zero rows rather than silently
   clobbering a status this check never saw.

`ADMIN_OVERRIDE_TRANSITIONS` is a second, separate table used only by
`rejectProject` — a deliberate exit, not a step in the happy path, so it
is not mixed into the graph a normal client-driven flow must follow exactly.

---

## 3. Actions, by who may call them

| Action | Caller | Transition | Notes |
| --- | --- | --- | --- |
| `submitProject` | client, OWNER only | DRAFT → SUBMITTED | Only writer of SUBMITTED |
| `startReviewingProject` | staff, `project:write` | SUBMITTED → UNDER_REVIEW | One-click "claim" from the inbox |
| `approveForQuotation` | staff, `project:write` | SUBMITTED/UNDER_REVIEW → QUOTATION_DRAFT | Validates minimum fields first (§4 below); does not create a quotation |
| `requestMoreInformation` | staff, `project:write` | SUBMITTED/UNDER_REVIEW → NEEDS_INFORMATION | Requires a note, stored in `activity_logs.metadata` |
| `provideRequestedInformation` | client, OWNER only | NEEDS_INFORMATION → SUBMITTED | The client's response loop |
| `rejectProject` | staff, `project:write` | any review state → CANCELLED (admin override) | Requires a reason, writes `rejected_by`/`rejected_at`/`rejection_reason` |

## 4. Approve-for-quotation validation (§8)

`findMissingQuotationFields()` checks, against what this phase can
actually collect: project name, description, type, client, and at least
one scope item (`project_features`). Requirements and delivery-requirement
fields are **not** checked — they cannot be, since nothing collects them
yet (see §1's MISSING list) — checking for data that structurally cannot
exist would make approval permanently impossible, not safer. This function
is the one place to extend once the intake wizard lands.

## 5. Activity logging

Every action above calls `logActivity()` (already existing, generic,
project-scoped). Action names used this phase: `project.submitted`,
`project.review_started`, `project.approved_for_quotation`,
`project.information_requested`, `project.information_submitted`,
`project.rejected` — dotted-verb form, matching this schema's existing
`activity_logs_action_format` CHECK constraint (`^[a-z_]+\.[a-z_]+$`), not
the brief's own `PROJECT_APPROVED`-style constants literally, since the
database already enforces a specific format and this codebase's convention
predates this task.

## 6. Testing

- `npm run work:db:snapshot && npm run work:db:validate` — **102/102**.
- `npx tsc --noEmit` — **0 errors**.
- `npx eslint .` — **0 errors**, same pre-existing warning set.
- `npm run build` — **PASS, 129/129 pages**.

Live-remote testing remains **PENDING** — the two new migrations
(`20260902110000_project_review_status_values.sql`,
`20260902110100_project_rejection_tracking.sql`) join the existing PENDING
queue in `docs/PRODUCTION_READINESS.md`; this sandbox has no path to apply
DDL to the real Supabase project. The transition graph, the rejection
CHECK constraint, and the client/staff action boundaries were exercised
through `tsc`+`eslint`+`build` and the schema-level `work:db:validate`
harness this pass — not yet through a live-session RLS test the way
`docs/PROJECT_COLLABORATION_AUDIT.md`'s 39 assertions were. That is the
next concrete step before this phase is marked live-verified.

## 7. Phase 2 — Pricing + VAT + Quotation (2026-09-03)

Pricing and VAT were already built in earlier sessions (`PricingPanel`,
`updateVatSettings`, `project_pricing_totals`) — this phase's real gap, per
the earlier audit, was the quotation itself: `agreement_versions` only ever
snapshotted a bare grand total (`total_amount`), had no human-readable
number, and nothing wired the new `QUOTATION_DRAFT` → `QUOTATION_SENT` →
`AWAITING_CLIENT_APPROVAL` → `WAITING_FOR_DEPOSIT` states from §2 to the
actual send/accept actions.

**Migration** `20260903090000_quotation_snapshot_and_numbering.sql`:
- `agreement_status` gains `VIEWED` (additive; not yet written by any code
  path — reserved for when view-tracking is added).
- `agreement_versions` gains `quotation_number` (auto-generated via
  `app.next_code(org, 'QT')`, the same trigger shape `project_code` and
  `request_code` already use) and the structured breakdown — `subtotal`,
  `discount_total`, `taxable_amount`, `vat_enabled`, `vat_rate_bp`,
  `vat_amount`. `total_amount` keeps its exact existing meaning (the grand
  total); the new columns are additive and null on every pre-migration row
  — a real absence of recorded history, not a fabricated zero.

**`sendAgreement`** now reads `project_pricing_totals` (via
`getPricingTotals`) at the moment of sending and snapshots the full
breakdown alongside the body. When the project is in `QUOTATION_DRAFT`, it
also drives both real transition edges (`QUOTATION_DRAFT` → `QUOTATION_SENT`
→ `AWAITING_CLIENT_APPROVAL`), each individually checked through
`assertValidTransition` — not skipped as one shortcut jump. Outside that
flow (an agreement sent without going through the inbox), project status is
left untouched, so this stays backward compatible.

**`acceptAgreement`** now also drives `AWAITING_CLIENT_APPROVAL` →
`WAITING_FOR_DEPOSIT` when accepting is what the project was actually
waiting on — this is the edge that unblocks Phase 3's ฿250 minimum-start
gate.

**New: `requestQuotationChanges`** (client-facing) — §13's "Client Change
Request to Quotation": `AWAITING_CLIENT_APPROVAL` → `QUOTATION_DRAFT`,
optional note logged to `activity_logs`. Never edits the sent version in
place — admin drafts and sends a genuinely new version through the
existing `sendAgreement` path, which is what keeps every past version
immutable (migration 0008's own invariant, untouched).

**UI**: `PricingPanel`'s VAT toggle already matched the requested mockup
(prior session). `SendAgreementForm`/`AgreementConfirmPanel` now show the
quotation number and the full subtotal/discount/VAT/grand-total breakdown
(`QuotationBreakdown`, renders nothing for a pre-migration version rather
than a fabricated ฿0 line), and the client side gained a "Request Changes"
button next to Accept.

**Testing:** `work:db:validate` 102/102, `tsc` 0 errors, `eslint` 0 errors,
`build` PASS (129/129 — see chat for the confirmed run). Live-remote
testing PENDING, same reason as every migration this session — joins the
queue in `docs/PRODUCTION_READINESS.md`.

**Not built this phase:** Quotation PDF/print view, view-tracking (the new
`VIEWED` status exists but nothing writes it yet), and the payment-plan
comparison (client-proposed vs admin plan, §14 of the admin workflow
brief) — the last one still blocked on the client-intake wizard not
existing (same dependency flagged in the prior audit).

## 8. Do not start Phase 3

Per the phase roadmap: ฿250 minimum-start-payment gate + Payment Plan
(configurable minimum, `organization_settings` table, the
`WAITING_FOR_DEPOSIT` → `READY_TO_START` transition guard) is next, not
started this pass.
