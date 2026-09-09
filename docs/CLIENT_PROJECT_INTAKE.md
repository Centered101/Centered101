# CLIENT PROJECT INTAKE — Centered101 Work

**Date:** 2026-09-03
**Status: BUILT.** This is the field-level gap-fill pass on top of
`docs/CLIENT_INTAKE_WIZARD.md` (which built the wizard's skeleton, schema,
and server actions on 2026-09-03 earlier the same day). Nothing here
duplicates a table, action, or route that document already covers — see
"What was reused" below for the audit that confirmed that before any code
was written.

---

## 1. The wizard

Ten steps. Step 1 is `/portal/projects/new` (pre-existing, unchanged) —
it runs `createOwnProject` and creates the `DRAFT` row every later step
edits. Steps 2–10 are `/portal/projects/[id]/wizard?step=<key>`:

```
1  Basic Information   → createOwnProject                (existing, unchanged)
2  Requirements        → saveRequirements
3  Scope                → saveScope
4  Timeline             → saveTimeline
5  Budget               → saveBudget
6  Payment Proposal     → savePaymentProposal
7  Delivery             → saveDeliveryRequest
8  Brand & Assets       → uploadProjectAsset / addProjectAssetLink
9  Review & Submit      → submitProject (now requires the confirmation checkbox)
```

(The brief numbers this 1–10 with "Review" and "Submit" as separate steps;
in the actual URL/step-key scheme they are one page — the review summary
and the submit form are both rendered under `step=review`, which is what
`WIZARD_STEPS` in `lib/work/wizard-steps.ts` encodes. No behavior is
missing for this — see §4.)

Navigation is URL-driven (`?step=`), not client-side wizard state — a
shared link, a refresh, or the browser back button always lands on the
correct step, matching the Admin Inbox's own filter-strip convention.

## 2. Data model

### Free-form intake content → `projects.requirements jsonb`

One jsonb object, not a table-per-field. Deliberate: this content's shape
will keep changing as the wizard is refined, and a migration for every
reworded question is not worth it. Current keys (all optional, all
validated/shaped by `lib/work/validation/intake.ts#requirementsSchema`,
not by a database constraint beyond "is an object"):

| Key | Shape |
|---|---|
| `goals`, `targetAudience` | string |
| `requiredFeatures`, `requiredPages` | string[] (newline-split, ≤50 lines) |
| `integrations` | string[] |
| `authentication` | string |
| `adminRequirements`, `userRequirements` | string |
| `technicalRequirements` | string[] |
| `technology`, `referenceLinks`, `brandColors`, `fonts` | string[] |
| `designPreferences`, `contentAvailability`, `domainRequirements`, `notes` | string |

### Structured/queryable fields → real columns on `projects`

Added across two migrations — `20260903100000_client_intake_wizard.sql`
(the wizard's first pass) and `20260903110000_intake_wizard_field_gaps.sql`
(this pass, closing the fields the first migration didn't cover):

| Column | Type | Notes |
|---|---|---|
| `requested_start_date`, `requested_deadline` | date | client's requested window |
| `proposed_deadline` | date | the team's counter-proposal (not yet written by any UI — see §7) |
| `important_launch_date` | date | a second date distinct from the deadline (a launch event, a campaign) |
| `requested_duration` | text | free text ("2 เดือน") — not worth a strict interval type for a rough estimate |
| `requested_priority` | `change_request_priority` | reuses the existing enum (LOW/NORMAL/HIGH/URGENT) rather than a new one — same urgency vocabulary |
| `requested_budget_min`, `requested_budget_max` | bigint (satang) | CHECK `min <= max` |
| `requested_budget_preferred` | bigint (satang) | the client's single preferred figure |
| `requested_currency` | char(3) | THB by default, CHECK `^[A-Z]{3}$` |
| `requested_payment_plan` | jsonb | `{ type, milestones: [{name, percentageBp, dueDate}], notes }` — `type` is one of FULL_PAYMENT/DEPOSIT_FINAL/INSTALLMENT/CUSTOM |
| `requested_delivery` | jsonb array | known keys (see `DELIVERY_ITEM_KEYS`) and free-form custom strings stored together, split apart at read time (see §2.1) |
| `intake_confirmed_at` | timestamptz | set only by `submitProject()` when the confirmation checkbox was actually checked — real server-side evidence, not a client-side-only courtesy |

Money fields are integer (satang), matching every other money column in
this schema — `npm run work:db:validate`'s own "all money columns are
integer types" structural check would fail the build otherwise.

### 2.1 `requestedDelivery` vs `requestedDeliveryCustom`

`DELIVERY_ITEM_KEYS` (`lib/work/validation/intake.ts`) lists the nine known
delivery items (production website, source code, documentation, domain
setup, admin access, user access, training, credentials, maintenance).
The Delivery step lets the client tick any of these AND type free-form
custom deliverables. Both are stored together in the single
`requested_delivery` jsonb array (one column, not two) — `getProjectIntake()`
(`lib/work/queries/projects.ts`) splits them back apart at read time via a
`KNOWN_DELIVERY_KEYS` Set membership check, so the UI never has to
reconcile two sources of truth for one array.

### 2.2 `CUSTOM` payment proposal

`paymentProposalSchema` (`lib/work/validation/intake.ts`) is a
`z.object({...}).transform((value, ctx) => ...)`. For `type !== 'CUSTOM'` it
requires the milestone rows to sum to exactly 100% (`ctx.addIssue()` +
`z.NEVER` otherwise); for `type === 'CUSTOM'` the milestone requirement is
skipped entirely and the client's free-text `notes` field carries the
proposal instead — "we'd like to discuss a schedule" is a valid answer.

## 3. Draft behavior

Every step writes into the SAME `DRAFT` project row — that row already
**is** the saved draft (the design decision from
`docs/PROJECT_WORKSPACE_ARCHITECTURE.md` §3). There is no separate
draft-storage table, so:

- **Leave and return**: nothing to lose — refreshing, closing the tab, or
  navigating away just leaves the row as it last was.
- **No duplicate projects on refresh**: Step 1 creates exactly one row;
  every later step's server action does an `UPDATE ... WHERE id = $1`
  against that same id, never an insert. A refresh mid-step just re-renders
  the same form with the same saved values (`getProjectIntake(id)`).
- **Resume**: `getProjectIntake()`/`getProjectFeatures()`/`getProjectAssets()`
  read the current row on every visit — a wizard link opened days later
  shows exactly what was last saved.

## 4. Submission

`submitProject` (`lib/work/services/projects.ts`) is unchanged in identity
(no duplicate action was created) but now does two additional things this
pass:

1. Requires `formData.get('confirmed') === 'on'` — the "I confirm that the
   information submitted is correct" checkbox
   (`app/work/(portal)/portal/projects/[id]/wizard/review-submit-form.tsx`).
   Rejected server-side with a Thai error if missing, regardless of what
   the client sent — the checkbox's `required` HTML attribute is a UX
   convenience, not the enforcement.
2. Writes `intake_confirmed_at = now()` alongside the existing
   `status`/`submitted_at` write — durable evidence the confirmation
   actually happened, not just a UI event with nothing recorded.

**Duplicate submission** is prevented the way it already was before this
pass, unchanged: `PROJECT_STATUS_TRANSITIONS['DRAFT'] = ['SUBMITTED']`
(`lib/work/auth/project-status.ts`) is the only edge into `SUBMITTED`, so
`assertValidTransition()` rejects a second submit attempt before any write
runs. The `UPDATE ... WHERE status = current.status` clause in the same
action is the race-condition backstop — two concurrent submits still only
let one through, because the loser's `WHERE` clause matches zero rows once
the winner has already flipped the status. Both layers are exercised by
`scripts/validate-work-schema.mjs`'s "a second identical submit affects
zero rows" check (§6).

## 5. Permissions & IDOR

- Every wizard step page is OWNER-gated
  (`requireProjectAccess(id).isProjectOwner`, `notFound()` otherwise) —
  the same guard every write action re-checks independently server-side,
  never trusting the page having already checked.
- A client can only ever reach their **own** draft/submittable project.
  They cannot: change `owner_id`, act on another user's project, change
  payment status, change quotation status, change admin pricing, or change
  `status` outside the one `DRAFT → SUBMITTED` transition the intake wizard
  is allowed to make.
- **RLS is the real boundary**, not the page guard — `projects_update_owner`
  (`app.is_project_owner(id)`) only matches rows where the caller holds the
  ACTIVE `OWNER` `project_members` role on that exact project id. The exact
  same `UPDATE` statement, run by a different client against another
  client's project UUID, matches zero rows — proven, not asserted, by the
  IDOR checks in §6.
- `project_assets` follows the same shape: `SELECT`/`INSERT` require
  `app.can_read_project(project_id)` (any member), `INSERT` additionally
  requires `uploaded_by = auth.uid()` (cannot forge another user as the
  uploader), and review (`UPDATE`) is staff-only
  (`app.can_manage_project(project_id)`) — a client cannot approve their
  own upload.

## 6. Testing

- `npm run work:db:snapshot && npm run work:db:validate` — **119/119**,
  including a new "Client intake wizard" section
  (`scripts/validate-work-schema.mjs`) added this pass:
  - owner can save intake fields on their own draft; a non-owner client and
    a memberless outsider touching the identical UUID/statement affect
    **zero rows** (the IDOR case, stated as a row-count assertion, not an
    error-message assertion — RLS denies by silently matching nothing, not
    by raising),
  - owner can submit; `intake_confirmed_at` is recorded; an identical
    second submit affects zero rows (duplicate-submit backstop),
  - a project member can upload a (linked) brand asset; an unrelated
    client cannot see it; a client cannot upload under someone else's
    identity; a client cannot approve their own upload; staff can.

  This replaces the "13/13" figure `docs/CLIENT_INTAKE_WIZARD.md` cited for
  a separate dedicated script — that script was never actually committed
  to the repo (confirmed by inspection at the start of this pass, no file
  matched `intake` under `scripts/`). The real, current, running test
  suite for this feature lives inside `validate-work-schema.mjs`, the
  repo's one PGlite harness, alongside every other RLS test.
- `npx tsc --noEmit` — **0 errors**.
- `npx eslint .` — **0 errors** (125 pre-existing warnings, none newly
  introduced — none in any file this pass touched beyond one
  already-pre-existing unused-import warning in `wizard/page.tsx`).
- `npm run build` — **PASS**, all routes generated including
  `/work/portal/projects/[id]/wizard` and `/work/admin/projects/[id]/review`.

## 7. Client proposal ≠ admin decision

Enforced at every layer, not just documented:

- **Schema**: `requested_payment_plan`, `requested_delivery`,
  `requested_budget_*`, `requested_priority`/`requested_duration`/
  `important_launch_date` all live on `projects` under a `requested_`
  prefix, entirely separate columns/tables from `payment_plans` /
  `payment_milestones` / `project_pricing_items` / `unlock_rules`. No
  server action or trigger ever copies a `requested_*` value into its real
  counterpart.
- **Admin Review page**
  (`app/work/(admin)/admin/projects/[id]/review/page.tsx`) displays every
  field this pass added — important launch date, duration, priority,
  preferred budget/currency, `CUSTOM`-type payment notes, and the combined
  known + custom delivery list — as read-only "the client asked for this"
  panels, never as pre-filled admin-decision inputs.
- **Copy**: the wizard's own review step tells the client explicitly
  ("นี่คือข้อเสนอเบื้องต้นของคุณ ทีมงานจะพิจารณาและอาจเสนอแผนที่ต่างออกไป" /
  the unlockable-resources disclaimer under the delivery summary) that
  what they submitted is a proposal, not a commitment.
- `proposed_deadline` exists as a column specifically so the team's own
  counter-proposal has somewhere to live that is visibly distinct from
  `requested_deadline` — no UI writes it yet (see §8), but the schema
  already refuses to conflate the two.

## 8. What was reused (audit before writing any code)

Per this pass's explicit instruction to inspect before creating anything,
confirmed via `ls`/`grep` before any file was touched:

- All wizard routes, forms, migrations (`20260903100000`,
  `20260903100100`, `20260903100200`), and server actions
  (`lib/work/services/intake.ts`) already existed from
  `docs/CLIENT_INTAKE_WIZARD.md`'s pass earlier the same day — none were
  recreated.
- `project_assets` already existed and was reused as-is for Brand/Assets —
  not recreated.
- `submitProject` already existed and was extended in place (the
  confirmation check + `intake_confirmed_at` write) — not duplicated.
- `change_request_priority` (migration `20260826120100`) was reused for
  `requested_priority` instead of a new enum type.
- Only ONE new migration this pass
  (`20260903110000_intake_wizard_field_gaps.sql`), adding only the
  genuinely-missing scalar columns — no table was recreated, no applied
  migration was edited.

## 9. What this does NOT close yet

Unchanged from `docs/CLIENT_INTAKE_WIZARD.md` — still pending, still
correctly out of scope for this pass per its own explicit STOP instruction:

- The payment-plan **comparison** UI (client proposal vs admin plan, side
  by side).
- Admin's own "propose a different deadline" UI (`proposed_deadline`
  column exists, unwritten).
- Payment Plan Phase, ฿250 minimum-start payment, Timeline/Milestones
  build-out, Maintenance, Delivery/Handover — all explicitly deferred.

Live-remote testing remains **PENDING** — this migration joins the
existing queue in `docs/PRODUCTION_READINESS.md`; this sandbox still has
no path to apply DDL to the real Supabase project.
