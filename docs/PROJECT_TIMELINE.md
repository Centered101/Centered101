# Project Timeline & Work Milestones

Phase 4. The project **execution** timeline — what gets built, by when, and
who signs it off.

---

## 1. Work milestones vs payment milestones

These are **two different entities** and the codebase keeps them that way.

| | Work milestone | Payment milestone |
|---|---|---|
| Table | `project_work_milestones` (migration 0035) | `payment_milestones` (migration 0009) |
| Answers | "where has the work got to" | "what is owed, and when" |
| Status enum | `work_milestone_status` | `milestone_status` |
| Owned by | delivery (`app.can_manage_project`) | finance (`app.can_manage_project_finance`) |
| Progress figure | COMPLETED / non-CANCELLED | PAID amount / total |
| Client can | approve, request changes | pay |
| Service file | `lib/work/services/work-milestones.ts` | `lib/work/services/payments.ts` |

**They may be linked, and are never merged.** `project_work_milestones.payment_milestone_id`
is an optional FK — "this work bills against that invoice line". It is a
reference and nothing more:

- No work action reads payment status to decide whether work may proceed.
- No payment action reads work status to decide whether money is owed.
- `lib/work/services/work-milestones.ts` touches **no** payment, pricing,
  quotation or VAT table at all.

A composite FK `(payment_milestone_id, project_id) → payment_milestones (id, project_id)`
stops a work milestone pointing at another project's money. `ON DELETE SET NULL`,
never cascade: deleting a payment plan must not delete delivery history.

### Why a new table, not an extension

Three existing candidates were considered and rejected:

- **`payment_milestones`** — money. Merging would make "the homepage is done"
  and "฿4,000 is owed" unable to disagree, which in practice they constantly do.
- **`project_features`** (migration 0006) — *scope*: "what we agreed to build",
  versioned under `project_scopes`. Adding dates/review/assignee would put a
  delivery schedule inside a versioned agreement record, so re-versioning the
  scope would orphan or rewrite the schedule. Scope stays the record of what
  was agreed; the timeline is the record of when it gets done.
- **`projects.progress`** (migration 0013) — a staff-set display number whose
  own comment says it is deliberately *not* derived. **Left untouched.**

---

## 2. Timeline states

```
work_milestone_status:
  PENDING  IN_PROGRESS  IN_REVIEW  CHANGES_REQUESTED
  APPROVED  COMPLETED  BLOCKED  CANCELLED

work_milestone_review_status:   (a separate axis)
  NOT_REQUIRED  PENDING  APPROVED  CHANGES_REQUESTED
```

Two enums on purpose: "where is the work" and "what did the client say" are
different questions, and collapsing them makes an approved-then-reopened
milestone unrepresentable.

### Transition graph

`lib/work/auth/work-milestone-status.ts` is the **one place** these are
written down, mirroring `project-status.ts`:

```
PENDING            → IN_PROGRESS, BLOCKED, CANCELLED
IN_PROGRESS        → IN_REVIEW, COMPLETED*, BLOCKED, CANCELLED
IN_REVIEW          → APPROVED, CHANGES_REQUESTED, BLOCKED, CANCELLED
CHANGES_REQUESTED  → IN_PROGRESS, CANCELLED
APPROVED           → COMPLETED, IN_PROGRESS, CANCELLED
BLOCKED            → IN_PROGRESS, CANCELLED
COMPLETED          → (terminal)
CANCELLED          → (terminal)
```

\* `IN_PROGRESS → COMPLETED` is only taken when no client review is required —
a condition the table cannot express, checked separately in
`completeWorkMilestone`.

Every status-moving action calls `assertValidWorkTransition()` **before** any
write and scopes its UPDATE with `.eq('status', from)`, so a concurrent change
fails safely instead of overwriting a status the check never saw. A button
being hidden is never the rule.

---

## 3. Client review (§8–9)

```
IN_PROGRESS → IN_REVIEW → [client] → APPROVED → COMPLETED
                            └──────→ CHANGES_REQUESTED → IN_PROGRESS
```

A client sees Approve / Request Changes **only** when
`client_review_required = true` **and** `status = IN_REVIEW`. The server
re-checks both. **Request Changes requires a message** (min 5 chars) — a
rejection with nothing said is a milestone nobody can act on.

Re-starting a milestone after CHANGES_REQUESTED resets
`client_review_status` to `PENDING` and clears `submitted_for_review_at`, so
the gate closes again and the client is genuinely re-asked.

### Why the client's review is not a direct database write

RLS is row-level, not column-level. A client UPDATE policy permissive enough to
let someone approve a milestone would also let them move its deadline in the
same request. So **migration 0035 grants clients no UPDATE policy at all**, and
`approveWorkMilestone` / `requestWorkMilestoneChanges` follow the
`acceptAgreement` / `acceptPaymentPlan` pattern:

1. `requireProjectAccess` — is this caller on this project.
2. Read the milestone **under the caller's own session** — the SELECT policy
   decides whether it exists for them. Another project's id returns empty.
3. Only then write, with the privileged client, a **fixed set of named review
   columns** — never anything else the form supplied.

---

## 4. Admin completion & override (§10)

A milestone with `client_review_required = true` cannot be completed until the
client has approved it — **unless** the admin supplies an explicit
`overrideReason`. That reason is:

- required by `completeWorkMilestone`,
- required by the database (`work_milestones_override_pair`),
- stored on the row (`override_reason`, `overridden_by`, `overridden_at`),
- logged as its own event, `work_milestone.admin_override`.

An override with no stated cause is indistinguishable from a mistake.

---

## 5. Progress calculation (§12)

**Three separate figures. None is derived from another, and all may
legitimately disagree.**

| Figure | Source |
|---|---|
| **Work progress** | `COMPLETED / non-CANCELLED` work milestones — `computeWorkProgress()`, mirrored in SQL by `app.project_work_progress()` |
| **Payment progress** | `PAID amount / plan total` — `getProjectPaymentSummary()` |
| **`projects.progress`** | a staff-set number (migration 0013), untouched |

Work progress is **never** written back into `projects.progress`. A project at
60% built and 40% paid renders both, side by side, in visually separate panels.

---

## 6. Client requested vs admin proposed vs final agreed (§5)

No new columns — these already exist and are read side by side by
`getTimelineComparison()`:

| Column | Meaning | Written by |
|---|---|---|
| `requested_start_date`, `requested_deadline`, `requested_duration`, `important_launch_date` | **CLIENT REQUESTED** | intake wizard, once (migrations 0030/0033) |
| `proposed_deadline` | **ADMIN PROPOSED** | staff |
| `start_date`, `expected_delivery` | **FINAL AGREED** | staff |

The client's original request is never overwritten by either of the others.

---

## 7. Timeline changes and the change-request boundary (§15–16)

`updateWorkMilestone` has **no code path** to `agreements`, `payment_plans`,
`project_pricing_items` or anything VAT. Editing a deadline moves a deadline and
nothing else; a deadline change is additionally logged as its own event
(`work_milestone.deadline_changed`, with from/to) because "when did this slip,
and to when" is the question a late project gets asked.

A client asking for a timeline change (`requestTimelineChange`) opens a row in
the **existing `change_requests` table** (migration 0014) rather than a parallel
one — so a request that turns out to affect scope or price is already sitting in
the workflow that prices and approves those. Status and estimate are absent from
the form and the insert; RLS scopes it to
`requested_by = auth.uid()`.

---

## 8. Deadlines (§14)

`workMilestoneDeadlineState()` classifies a milestone as
`overdue / due_today / upcoming / completed / none`, compared as **calendar days
in UTC** (`due_date` is a DATE with no time, so a timestamp comparison would flip
"due today" at midnight UTC).

**Presentational only.** A passed deadline shows a badge and changes nothing else
— no status moves because a date went by. No cron, queue or background worker was
introduced; `MILESTONE_OVERDUE` as a scheduled event is left as a documented
future extension, since the existing activity architecture has no scheduled
processing to hang it on.

---

## 9. Activity events

All through the existing `logActivity()` → `public.log_activity` RPC. Action
names follow the established dotted-lowercase convention (and the
`^[a-z_]+\.[a-z_]+$` CHECK):

`work_milestone.created`, `.updated`, `.reordered`, `.started`,
`.submitted_for_review`, `.approved`, `.changes_requested`, `.completed`,
`.deadline_changed`, `.blocked`, `.cancelled`, `.admin_override`,
`.timeline_change_requested`

---

## 10. Security

| Attack | Why it fails |
|---|---|
| Client B reads Client A's timeline | `project_work_milestones_select` → `app.can_read_project`; RLS returns zero rows |
| Client changes a deadline / sequence / assignee | **no client UPDATE policy exists**; review is a fixed-column server write |
| Client marks a milestone COMPLETED | `clientReview` only ever writes `APPROVED` / `CHANGES_REQUESTED`, and only from `IN_REVIEW` |
| Client approves a milestone on another project | milestone is read under the caller's own session first; RLS decides |
| Client approves a milestone not awaiting review | explicit `client_review_required` + `status === 'IN_REVIEW'` checks |
| Staff account acting as the client | `clientReview` refuses `access.isStaff` |
| Accountant reschedules the build | write policies use `app.can_manage_project` (admin/developer), not `_finance` |
| Illegal status jump via direct action call | `assertValidWorkTransition` + `.eq('status', from)` |
| Reorder using another project's ids | the submitted list must match this project's ids exactly, set-for-set |
| Link work to another project's payment milestone | composite FK `(payment_milestone_id, project_id)` |

**Self-serve note:** a self-serve project's client holds the `OWNER`
`project_members` role, not `client_owner`, so `app.is_project_client()` is false
for them. Migration 0035 adds `change_requests_insert_owner` as an additive
policy so §16's reuse of `change_requests` actually works for them — the same gap
migrations 0030 and 0034 each had to close.

---

## 11. Files

**Migration:** `supabase/work/migrations/20260905090000_project_work_milestones.sql`
— 2 enums, 1 table, 5 policies, 1 function, 1 additive policy on `change_requests`.

**Logic** — `lib/work/auth/work-milestone-status.ts` (transition graph),
`lib/work/services/work-milestones.ts` (11 actions),
`lib/work/queries/work-milestones.ts`, `lib/work/validation/work-milestones.ts`

**UI** — `components/work/domain/work-timeline.tsx` (shared render),
`work-timeline-admin.tsx`, `work-milestone-admin-actions.tsx`,
`work-milestone-review.tsx`, `timeline-comparison.tsx`;
portal route `app/work/(portal)/portal/projects/[id]/timeline/`

---

## 12. Verification status

**LOCAL VERIFIED** — `tsc --noEmit` (exit 0), `eslint .` (0 errors),
`npm run build` (exit 0, `/work/portal/projects/[id]/timeline` emitted).

**NOT PRODUCTION VERIFIED.** No runtime execution of any kind — see blockers
below.
