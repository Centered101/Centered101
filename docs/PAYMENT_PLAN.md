# Payment Plan & ฿250 Start Payment

Phase 3 of the project business flow. This document is the reference for how a
project goes from "the client proposed a way to pay" to "the money arrived and
work started".

**Nothing in this phase replaced existing payment infrastructure.** Stripe,
PromptPay, the webhook, `payments`, `payment_milestones`, `unlock_rules`, the
quotation flow and `project_pricing_items`' VAT all work exactly as they did;
this phase added a lifecycle, an acceptance record, a change-request channel,
and the ฿250 rule on top of them.

---

## 1. The flow

```
CLIENT CREATES PROJECT              projects.status = DRAFT
        ↓
CLIENT SUBMITS PAYMENT PROPOSAL     projects.requested_payment_plan  (intake wizard)
        ↓
ADMIN REVIEWS                       /admin/projects/[id] — proposal vs plan, side by side
        ↓
ADMIN CREATES PAYMENT PLAN          payment_plans (status PROPOSED, version N)
        ↓
CLIENT REVIEWS PLAN                 /portal/projects/[id]/payments
        ↓
CLIENT ACCEPTS                      payment_plan_acceptances + status ACCEPTED
   └─ or REQUESTS CHANGES           payment_plan_change_requests (plan untouched)
        ↓
PAY ฿250 MINIMUM TO START           the milestone flagged is_start_payment
        ↓
PAYMENT VERIFIED                    webhook / verifyManualPayment → status PAID
        ↓
WAITING_FOR_DEPOSIT → READY_TO_START   automatic (advanceProjectOnStartPayment)
        ↓
READY_TO_START → IN_PROGRESS        explicit admin action (startProject)
        ↓
MILESTONE PAYMENTS → FINAL PAYMENT  same checkout path, per milestone
        ↓
UNLOCK DELIVERABLES                 unlock_rules on each PAID milestone
```

---

## 2. Client proposal (informational)

Captured once by the intake wizard, into `projects`:

| Column | Meaning |
|---|---|
| `requested_payment_plan` jsonb | `{type, milestones:[{name, percentageBp, dueDate}], notes}` |
| `requested_budget_min/max/preferred` | the client's stated budget, in satang |
| `requested_currency` | THB by default |

**This is never written into `payment_plans`.** It exists to be *compared*
against the official plan, not to become one. `getPaymentPlanComparison()`
returns both untouched and the admin UI renders them side by side — the brief's
"do not silently replace the client's proposal".

---

## 3. Official payment plan (versioned)

`payment_plans` gained a lifecycle in migration `20260903120000`:

```
DRAFT ──▶ PROPOSED ──▶ ACCEPTED
             │            │
             └─▶ DECLINED └─▶ SUPERSEDED (a newer version replaced it)
```

- `version`, `supersedes_id` — the history chain.
- `accepted_by` / `accepted_at` — who agreed, when.
- `source_agreement_version_id` — the accepted quotation this plan implements.
- Unique index `payment_plans_live_project_key` — **one LIVE plan per project**
  (`status not in (SUPERSEDED, DECLINED)`), history rows allowed alongside.

**An ACCEPTED plan is immutable.** The trigger
`payment_milestones_accepted_plan_guard` rejects inserting, deleting, or
changing the amount / percentage / name / sequence / due date / unlock rules /
start flag of any milestone on an accepted plan. The one edit it still allows
is settlement (`status → PAID` and `paid_at`) — that is money arriving, not the
plan changing. Re-pricing means a **new plan row**, never an edit.

`createPaymentPlan` refuses to supersede an ACCEPTED plan that already has PAID
payments against it.

### Validation (all server-side)

| Rule | Where enforced |
|---|---|
| Milestone amounts sum to the plan total | derived from `percentageBp`; last milestone takes the remainder; deferred trigger `payment_milestones_validate_totals` re-checks at commit |
| Percentages sum to exactly 100% | `createPaymentPlanSchema` refine + the same trigger |
| No zero or negative amounts | `percentageBp` min 1, plus an explicit `amounts.some(a => a <= 0)` check |
| No duplicate ordering | `sequence` assigned from array index; unique index `payment_milestones_plan_sequence_key` |
| Plan total == accepted quotation total | `createPaymentPlan` compares against the ACCEPTED agreement's current version |

---

## 4. The ฿250 start payment

`payment_milestones.is_start_payment boolean` marks **exactly one** milestone
per plan (partial unique index `payment_milestones_one_start_per_plan`), with a
CHECK constraint `amount >= 25000` satang = **฿250**.

It is an ordinary milestone in every other respect: it counts toward the plan
total, it is paid through the same checkout, it settles through the same path.
The flag only says *which* milestone paying unblocks the project starting.

> ฿250 is a **minimum to start**, not necessarily the deposit.
> Project ฿15,000 → start payment ฿250 → remaining ฿14,750 across later
> milestones is a perfectly valid plan.

---

## 5. Payment methods — all reused, none duplicated

| Method | Path | Who marks PAID |
|---|---|---|
| **Card** | `startMilestoneCheckout` → `StripePaymentService` → Stripe Checkout | `checkout.session.completed` webhook |
| **PromptPay** | same Stripe Checkout Session, `promptpay` method | `checkout.session.async_payment_succeeded` webhook |
| **Manual (client-initiated)** | `submitManualPaymentProof` → PENDING row | `verifyManualPayment` (finance staff) |
| **Manual (staff-entered)** | `recordManualPayment` — unchanged from before | the staff member, who has already verified it |

There is **one** checkout system. The start payment is just a milestone, so it
uses `startMilestoneCheckout` like any other — no separate ฿250 flow exists.

---

## 6. Payment verification

`payments.status` ∈ `PENDING | PROCESSING | PAID | FAILED | EXPIRED | REFUNDED | CANCELLED`.

**A client can never write `PAID`.** RLS gives clients SELECT on `payments` and
no insert/update/delete policy at all (migration 0010), so a direct PostgREST
call matches no policy and the database refuses it regardless of the app.

Only three code paths write `PAID`:

1. **The Stripe webhook** — after `constructEvent` verifies the signature over
   the raw body, and after the event id is inserted into
   `payment_provider_events` (its primary key is the idempotency mechanism).
2. **`recordManualPayment`** — finance staff entering an out-of-band payment
   they verified themselves.
3. **`verifyManualPayment`** — finance staff confirming a client-submitted
   transfer.

Each records `paid_at`; the two manual paths also record `verified_by` and keep
the client's reference in `provider_payment_id`. A Stripe payment has no
`verified_by` on purpose — the signature is the verification, not a person.

Audit events: `payment.received`, `manual_payment.submitted`,
`manual_payment.verified`, `payment.recorded_manual`, `payment.checkout_started`.

---

## 7. Project start rule

```
WAITING_FOR_DEPOSIT ──(start payment PAID)──▶ READY_TO_START ──(admin)──▶ IN_PROGRESS
```

- The first arrow is **automatic and server-side**: `advanceProjectOnStartPayment()`
  runs from both money paths (webhook and manual verification), always with the
  privileged client. It is idempotent — guarded by `.eq('status','WAITING_FOR_DEPOSIT')`,
  so a Stripe retry or a re-verification is a no-op and a project further along
  is never dragged backwards.
- The second arrow is a **deliberate human action** (`startProject`), gated by
  `assertValidTransition` — the only edge into `IN_PROGRESS` is from
  `READY_TO_START`, so a project that has not paid cannot reach it even by
  calling the server action directly.

Nothing about this trusts the UI. The button is a convenience; the transition
table is the rule.

---

## 8. Change requests

`payment_plan_change_requests` — `OPEN → ADDRESSED | DISMISSED`.

A client's "Request Changes" **never modifies the official plan.** It records a
message; admin answers by drafting a new plan version through the ordinary
`createPaymentPlan`, which supersedes the old row rather than editing it.
Dismissing requires a reason.

---

## 9. Quotation & VAT integration

- The plan's `total_amount` is read from `projects.total_amount`, which the
  pricing-items trigger (migration 0019) maintains from
  `project_pricing_items`. It is never accepted from a form.
- `createPaymentPlan` refuses when the project total differs from the ACCEPTED
  quotation's `total_amount` — a plan may not silently diverge from what the
  client was quoted. Changing the price means a new quotation version first.
- **VAT is not calculated anywhere in payment code.** `getPricingTotals()` is
  the sole authority; `agreement_versions` snapshots its output
  (`subtotal / discount_total / taxable_amount / vat_enabled / vat_rate_bp /
  vat_amount`) at send time, and the plan references that version.

---

## 10. Project deletion protection

`app.can_delete_own_draft_project(project_id)` — a self-serve OWNER may
hard-delete only while **all** of these hold:

- `is_project_owner`
- `projects.status = 'DRAFT'`
- zero `project_pricing_items`
- zero `payments` rows
- `app.project_verified_paid_amount(project_id) < 25000` (< ฿250)

The moment any of them fails, the RLS `projects_delete_owner` policy no longer
matches and the project can only be **archived**. This is enforced by the
database policy, not by hiding a button.

---

## 11. Milestone unlocking

Unchanged and still the source of truth: `getUnlockedResources()` unions the
`unlock_rules` of every **PAID** milestone. Nothing hardcodes "full payment =
everything" — granular per-milestone rules keep working, and the start payment
carries whatever rules the plan gave it (typically `preview`).

---

## 12. Security properties

| Attack | Why it fails |
|---|---|
| Client A reads Client B's payments | `payments_select` → `app.can_read_project`; RLS returns zero rows |
| Client changes a payment amount | no insert/update policy on `payments` for clients at all |
| Client marks a payment PAID | same — plus only the webhook and two finance-gated actions ever write PAID |
| Client manipulates a milestone amount | `payment_milestones_*_finance` policies; plus the accepted-plan immutability trigger |
| Client names their own manual payment amount | `submitManualPaymentProof` computes the outstanding balance server-side; the form has no amount field |
| Client accepts a plan on another project | acceptance row is inserted under the caller's own session; `payment_plan_acceptances_insert` RLS decides |
| Client deletes a project after paying | `can_delete_own_draft_project` predicate above |
| Staff account acting as the client | `acceptPaymentPlan` / `requestPaymentPlanChanges` refuse `access.isStaff` |
| Forged webhook | signature verified against `STRIPE_WEBHOOK_SECRET` before the body is read |
| Replayed webhook | `payment_provider_events` primary key; plus a `status === 'PAID'` short-circuit in `markPaid` |

**Self-serve note:** a self-serve project's client holds the `OWNER`
`project_members` role, not `client_owner` — so `app.is_project_client()` is
false for them. Every client-side write policy added here includes
`app.is_project_owner(project_id)` alongside it, and migration 0034 adds the
same missing branch to `agreement_acceptances` as an additive policy.

---

## 13. Files

**Migration:** `supabase/work/migrations/20260903120000_payment_plan_negotiation.sql`

**Server actions**
- `lib/work/services/payment-plans.ts` — `createPaymentPlan` (rewritten for versioning), `acceptPaymentPlan`, `requestPaymentPlanChanges`, `resolvePaymentPlanChangeRequest`, `startProject`
- `lib/work/services/payments.ts` — `submitManualPaymentProof`, `verifyManualPayment` (new); `recordManualPayment` gained the start-payment advance
- `lib/work/payments/settle.ts` — `advanceProjectOnStartPayment` (new)

**Queries** — `lib/work/queries/payment-plans.ts` (new), `lib/work/queries/payments.ts` (extended)

**Validation** — `lib/work/validation/payment-plans.ts`, `lib/work/validation/payments.ts`

**UI** — `components/work/domain/payment-plan-comparison.tsx`,
`payment-plan-change-requests.tsx`, `payment-plan-acceptance.tsx`,
`payment-plan-form.tsx` (extended); admin `start-project-form.tsx`,
`verify-payment-form.tsx`; portal `manual-proof-form.tsx`

---

## 14. Verification status

**LOCAL VERIFIED** — `tsc --noEmit`, `eslint`, `next build` all pass.

**NOT PRODUCTION VERIFIED.** Outstanding blockers:

1. Migration `20260903120000` has **not been applied** to any database. Neither
   has `20260903090000_quotation_snapshot_and_numbering.sql`. Until they are,
   the project detail page fails on the quotation read.
2. No end-to-end run against a real Stripe test account — no card, PromptPay,
   or webhook delivery has been exercised.
3. The production Stripe webhook has **not** been registered or modified.
4. No runtime RLS testing (Client A/B isolation, IDOR) has been performed —
   the policies are written and reviewed, not executed.
