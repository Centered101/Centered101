# BUSINESS FLOW AUDIT — Centered101 Work

**Date:** 2026-09-01 (original audit) · **updated 2026-09-02** with P1 remediation
**Scope:** PROJECT · PRICING · QUOTES · PAYMENT PLANS · DEPOSITS · INSTALLMENTS · STRIPE · PROMPTPAY · MILESTONES · UNLOCK RULES · PREVIEW · DEPLOYMENT · SOURCE CODE HANDOVER
**Out of scope (unchanged, not re-litigated):** Auth, RLS architecture, admin/client separation, the authorization model. Nothing in those areas was modified; where a test below touches them it only *confirms* the existing behaviour.
**The section below §0 is the original 2026-09-01 audit, unedited.** It found three P1s. §0 reports what happened to each one on 2026-09-02 — this time code WAS written and migrations WERE created, per the follow-up task. Full detail (including the live test transcripts) is in `docs/REAL_DATABASE_VERIFICATION.md` §13.

---

## 0. P1 REMEDIATION — 2026-09-02

| P1 | Task's verdict format | Result |
| --- | --- | --- |
| **P1-1 Stripe Webhook** | PASS/FAIL | **PASS (local dev) / PENDING (production)** |
| **P1-2 Total Integrity** | PASS/FAIL | **PASS (code) / PENDING (remote DB)** |
| **P1-3 Manual Payment** | PASS/FAIL | **PASS** (14/15 live; 1 expected gap, see below) |

**Real Tests: 24/25** (10/10 webhook-scenario suite + 14/15 test-matrix suite; the one non-pass is the `verified_by`/`notes` migration not yet applied to the remote — reported explicitly by the test itself, not hidden).

None of the three is a clean, unqualified PASS, because two have a database
component this sandbox cannot apply to the real remote Supabase project — it
has REST access via the service key, but no `supabase db push`, no direct
Postgres connection, and no SQL-execution RPC. This was true in the original
audit and is unchanged. What moved:

- **P1-1**: `STRIPE_WEBHOOK_SECRET` was empty (finding B1) → now set locally
  and proven with 10 real signed-webhook scenarios via `stripe listen`
  (Stripe CLI, already authenticated). **Production** still needs a person to
  register the endpoint in the Stripe Dashboard and set the secret on the
  actual deploy host — exact steps in REAL_DATABASE_VERIFICATION.md §13. This
  is a deliberate, persistent change to a real (if sandbox-mode) Stripe
  account, so it was not done without asking; the user chose to receive the
  steps rather than have it done automatically.
- **P1-2**: the trigger gap (finding F1) is fixed in a new migration,
  `20260901090400_projects_total_amount_guard.sql`, validated locally
  (100/100) — but re-testing the exact original exploit against the remote
  confirmed it is **still open there** until that file is run. Handed to the
  user; not applied by this session.
- **P1-3**: `recordManualPayment` now exists, gated by `requireProjectFinance`
  and RLS, with settlement flowing through the same function the webhook
  uses. The two additional columns the task asked for (`verified_by`,
  `notes`) are in a new migration,
  `20260901090500_payments_manual_recording_fields.sql`, also not yet applied
  remotely — the live test caught this itself and reported it rather than
  silently working around it.

**Two migrations are the only thing between "written and locally validated"
and "actually true in production" for P1-2 and part of P1-3. Do not proceed
to DELIVERY / DEPLOYMENT / HANDOVER / MAINTENANCE until they are applied and
re-verified, and until the production Stripe webhook is registered.**

---

## SCORECARD

| Area | Verdict |
| --- | --- |
| PROJECT | **PASS** |
| PRICING | **PARTIAL** — one real defect (§1.4) |
| CLIENT VISIBILITY | **PASS** |
| PAYMENT PLAN | **PASS** |
| STRIPE | **PARTIAL** — code correct, environment cannot confirm a payment (§4.3) |
| PROMPTPAY | **PASS** — real, asynchronous, never auto-paid |
| MILESTONES | **PARTIAL** — data model complete, no post-creation edit path (§6.2) |
| UNLOCK RULES | **PASS** |
| PREVIEW | **PASS** |
| DEPLOYMENT | **PASS** |
| SOURCE CODE | **PARTIAL** — the gate is real, the handover itself does not exist (§10.2) |
| PAYMENT SECURITY | **PASS** |

**REAL TESTS: 135 assertions — 134 passed, 1 failed.**
**MOCKED FEATURES: 0.** (The `MockPaymentService` adapter refuses rather than simulates; it never reports a fake success.)
**UNVERIFIED FEATURES: 3** — see the UNVERIFIED list at the end.
**BLOCKERS: 2** — B1 (`STRIPE_WEBHOOK_SECRET` empty) and B2 (no way to record an out-of-band payment).

### How these tests were run

Not by reading code. Against the **real remote Supabase project**, with:

- **Real authenticated sessions** for three actual accounts — staff (`savencenter5047@`), Client A (`centered101@outlook.com`, `client_owner` on the ABC project) and Client B (`tcrffalok.…@gmail.com`, `client_owner` on the XYZ project) — minted through `admin.auth.admin.generateLink` + `verifyOtp`, so every query below ran under a genuine JWT and genuine RLS.
- **Real HTTP requests** to the running application (`next dev`, work subdomain host), carrying the real `sb-<ref>-auth-token` cookie, for everything route-level.
- **Real Stripe API calls** (test mode) for the PromptPay/card capability check, and **real HMAC-signed webhook deliveries** against a live signing secret for the webhook tests.
- A **throwaway project** (`PRJ-AUDIT-BFA`, ฿20,000) created for the money tests and **deleted afterwards**. Seed data was verified untouched at the end: ABC ฿30,000 / XYZ ฿55,000, both consistent with their pricing items. No destructive command, no reset, no dropped table.

---

## 1. PROJECT + PRICING — PARTIAL

Test project: `PRJ-AUDIT-BFA`, items exactly as briefed.

| # | Test | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1.1 | New project, no items | total ฿0 | ฿0 | PASS |
| 1.2 | UI/UX ฿5,000 + Frontend ฿8,000 + Backend ฿7,000 | subtotal ฿20,000 | ฿20,000.00 | PASS |
| 1.3 | `projects.total_amount` after those inserts | ฿20,000 | ฿20,000.00 | PASS |
| 1.4 | View `grand_total` == `projects.total_amount` | equal | equal | PASS |
| 1.5 | Quantity 2 × ฿1,000 (ADDON) | line ฿2,000, subtotal ฿22,000 | ฿2,000 / ฿22,000 | PASS |
| 1.6 | DISCOUNT ฿2,000 | discount ฿2,000, taxable ฿20,000 | as expected | PASS |
| 1.7 | `total_amount` follows the discount | ฿20,000 | ฿20,000 | PASS |
| 1.8 | VAT 7% on ฿20,000 | VAT ฿1,400, grand ฿21,400 | ฿1,400 / ฿21,400 | PASS |
| 1.9 | `total_amount` re-syncs on the VAT toggle | ฿21,400 | ฿21,400 | PASS |
| 1.10 | VAT on an odd taxable (฿21,666.67) | integer satang, no float drift | taxable 2166667, VAT 151667 (= round) | PASS |
| 1.11 | `grand_total == taxable + vat` exactly | exact | exact | PASS |
| 1.12 | VAT rate 7% → 10% | re-syncs | re-synced | PASS |
| 1.13 | VAT rate 200% | rejected | `projects_vat_rate_range` violation | PASS |
| 1.14 | Discount larger than subtotal | taxable floors at 0, never negative | 0 | PASS |
| **1.15** | **Direct write of `projects.total_amount` = ฿999,999.99** | **trigger corrects it / write refused** | **the write stood — `total_amount` ฿999,999.99 against ฿20,000 of items** | **FAIL** |

### 1.4 FINDING F1 (P1) — pricing items and `total_amount` can be made to disagree

`projects.total_amount` is recomputed by two triggers: `pricing_items_sync_project_total` (fires on `project_pricing_items`) and `projects_sync_total_on_vat_change` (fires `before update of vat_enabled, vat_rate_bp`). **Neither fires on an update of `total_amount` itself.** A direct `UPDATE projects SET total_amount = …` therefore sticks, and the column silently disagrees with the items behind it until the next pricing change happens to correct it.

Migration `20260901090000` states the opposite as its own design goal — *"a direct SQL edit or a future bug in the app must not be able to leave `total_amount` disagreeing with the items"* — so this is the migration failing its own stated contract, not a missing nice-to-have.

**Reachability.** Not through the application: `totalAmount` was removed from `createProjectSchema`/`updateProjectSchema`, and no service writes the column. It is reachable by (a) anyone with the service key, (b) any SQL run in the Supabase editor, and (c) **org finance/admin staff calling PostgREST directly**, because `projects_update_*` RLS grants UPDATE on the row without column restrictions. So it is a data-integrity hole, not a client-facing privilege hole.

**The fix (not applied):** one new migration adding `total_amount` to the BEFORE-UPDATE trigger's column list, so the trigger overwrites any hand-set value with the derived one:

```sql
drop trigger if exists projects_sync_total_on_vat_change on projects;
create trigger projects_sync_total_on_vat_change
  before update of vat_enabled, vat_rate_bp, total_amount on projects
  for each row execute function app.sync_project_total_from_vat_settings();
```

The existing function already recomputes from the items and assigns `new.total_amount`, so no function change is needed. **A new migration file — never an edit to `20260901090000`, which has already run.**

Everything else in the chain is sound: `pricing_items → subtotal → discount → VAT → total_amount` holds under every other test, money is integer satang throughout (`bahtToSatang`, `bigint` columns, `round(...)::bigint` in SQL), and no floating-point arithmetic touches money anywhere in the path.

---

## 2. CLIENT VISIBILITY — PASS

The portal project page renders `PricingPanel` with `canManageFinance={false}`: the client sees every line item, quantity, unit price, subtotal, discount, VAT line and grand total, and no edit controls. Payment status is on the payments tab (total / paid / remaining / next due, all derived from the rows just read).

Cross-client isolation, tested as Client B reaching for Client A's project id, under a real session:

| Table | Rows returned to Client B | Result |
| --- | --- | --- |
| `project_pricing_items` | 0 | PASS |
| `project_pricing_totals` (the view) | 0 | PASS |
| `payment_plans` | 0 | PASS |
| `payment_milestones` | 0 | PASS |
| `payments` | 0 | PASS |
| `documents` | 0 | PASS |
| `project_deployments` | 0 | PASS |
| `share_links` | 0 | PASS |
| `agreements` | 0 | PASS |
| `change_requests` | 0 | PASS |
| `project_scopes` | 0 | PASS |
| `activity_logs` | 0 | PASS |
| `projects` (A's row) | 0 | PASS |
| `clients` (enumeration) | 0 — not even their own client row is listed | PASS |
| B's *own* project | 1 row — isolation is not a blanket deny | PASS |
| write to A's milestones | 0 rows affected | PASS |

The `project_pricing_totals` view carries `security_invoker = true`, which is what makes row 2 come back empty rather than leaking totals under the view owner's rights.

---

## 3. PAYMENT PLAN — PASS

All three models, against the ฿20,000 project. Amounts are allocated exactly as `createPaymentPlan` does it: the first N−1 milestones get `round(total × bp / 10000)`, the last absorbs the remainder.

| Model | Split | Amounts | Sum | Result |
| --- | --- | --- | --- | --- |
| A. Full payment | 100% | ฿20,000 | ฿20,000 | PASS |
| B. Deposit + remaining | 30 / 70 | ฿6,000 + ฿14,000 | ฿20,000 | PASS |
| C. 3 installments | 33.33 / 33.33 / 33.34 | ฿6,666 + ฿6,666 + ฿6,668 | ฿20,000 exactly | PASS |

Integrity, all enforced by the database rather than by application care:

| Test | Actual | Result |
| --- | --- | --- |
| Milestones summing to less than the plan total | rejected — `payment_milestones_validate_totals` (deferred constraint trigger) | PASS |
| Percentages summing to 80% | rejected, same trigger | PASS |
| Duplicate `sequence` in one plan | rejected — `23505` | PASS |
| A second plan on one project | rejected — `23505`, `payment_plans_project_key` | PASS |
| Milestone `PAID` with no `paid_at` | rejected — `milestones_paid_has_timestamp` | PASS |

`total_amount` on the plan is read from the project, never accepted from the form, and `createPaymentPlan` refuses outright if the project has no pricing. Money is integer satang end to end; the C-case above is the proof — three thirds of ฿20,000 reconcile to the satang with nothing lost.

Consistency of the reported figures (`getProjectPaymentSummary`): total from the plan, paid summed from `status = 'PAID'` payment rows, `remaining = max(0, total − paid)`, all computed from rows read in the same request rather than from a stored summary column. Verified: after the tests the paid total reconciled to ฿20,000 exactly.

---

## 4. STRIPE — PARTIAL

### 4.1 The webhook is genuinely trustworthy — 22/22

Tested by POSTing real HMAC-signed payloads to the live route with a real signing secret configured.

| # | Test | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 4.1 | Unsigned event | refused | 400 `missing signature` | PASS |
| 4.2 | Garbage signature | refused | 400 | PASS |
| 4.3 | Well-formed signature from the **wrong secret** | refused | 400 | PASS |
| 4.4 | Valid signature over **different bytes** | refused | 400 | PASS |
| 4.5 | Correct signature, timestamp 2 hours old | refused | 400 | PASS |
| 4.6 | Payment state after those 5 attempts | still not paid | `PROCESSING` | PASS |
| 4.7 | Ledger after those 5 attempts | nothing recorded | 0 rows | PASS |
| 4.8 | Correctly signed `checkout.session.completed`, `payment_status=paid` | payment PAID | PAID, `paid_at` set | PASS |
| 4.9 | `provider_payment_id` recorded | `pi_…` stored | stored | PASS |
| 4.10 | Milestone settled once payments cover it | milestone PAID | PAID | PASS |
| 4.11 | Unlock followed the payment | only the deposit's rules | `["preview"]` | PASS |
| 4.12 | **Replay of the same event id** | duplicate, no effect | `{"received":true,"duplicate":true}` | PASS |
| 4.13 | Replay moves `paid_at` | must not | unchanged | PASS |
| 4.14 | Replay creates a second payment row | must not | 1 row | PASS |
| 4.15 | A *different* event that also means paid | must not rewrite `paid_at` | unchanged | PASS |
| 4.16 | Late `async_payment_failed` after settlement | cannot un-pay | still PAID | PASS |
| 4.17 | Unhandled event type | 200, not an infinite retry | 200 | PASS |
| 4.18 | Ledger rows for accepted events | recorded with `processed_at` | 5 rows, all processed | PASS |

Idempotency is at the data layer (`payment_provider_events.id` primary key), not in application care, and there is a second guard (`if (payment.status === 'PAID') return`) for two *different* events that both mean paid. The raw body is read with `request.text()`, so the signature verifies over the exact bytes.

**No frontend success state is trusted anywhere.** `success_url` returns the client to a page whose copy says the attempt was received and the status will update on confirmation — it never claims payment succeeded. The only writer of `status = 'PAID'` in the entire codebase is this route.

### 4.2 Checkout creation

`startMilestoneCheckout` authorises (`requireProjectAccess`), re-reads the milestone **under the caller's session** so RLS decides whether it exists for them, refuses PAID/CANCELLED/zero-amount milestones and milestones already settled, then inserts the `payments` row with the privileged client (clients have no insert policy — deliberate) and only then calls Stripe. `idempotencyKey: work-checkout-<paymentId>` means a double-clicked pay button reuses the session. A provider refusal marks the row CANCELLED rather than deleting it.

### 4.3 BLOCKER B1 — this environment cannot confirm any payment

`.env.local` has `STRIPE_WEBHOOK_SECRET=""`. With that empty the route returns **503 before it reads anything** — verified live. So in the current configuration a client can start a checkout and pay, and the payment will never be marked PAID, the milestone will never settle, and nothing will ever unlock. The 22 tests above only ran because a signing secret was supplied for the duration of the test run.

Two related configuration notes:

- The workspace uses `STRIPE_SECRET_KEY` (shared with the main site). `WORK_STRIPE_SECRET_KEY` / `WORK_STRIPE_WEBHOOK_SECRET` exist in `.env.local` but are empty and read by nothing.
- **The webhook URL to register with Stripe is `/work/api/payments/webhook`, not `/api/payments/webhook`.** On the work subdomain a bare `/api/*` deliberately passes through to the main site (`proxy.ts:155`) and returns 404 — confirmed live. Registering the wrong one produces silent 404s on every delivery.

---

## 5. PROMPTPAY — **REAL**

Not a mock, not a locally generated QR, and never auto-marked paid.

| # | Test | Actual | Result |
| --- | --- | --- | --- |
| 5.1 | Stripe key present, test mode | `sk_test_…` | PASS |
| 5.2 | Real PromptPay THB checkout session against this account | created, `cs_test_a1Q1Ugk…`, URL returned | PASS |
| 5.3 | The session's payment status on creation | `unpaid` | PASS |
| 5.4 | Real card THB session (control) | created | PASS |
| 5.5 | `checkout.session.completed` with `payment_status: unpaid` (the PromptPay shape) | accepted 200, payment stays `PROCESSING`, milestone stays `PENDING` | PASS |
| 5.6 | `checkout.session.async_payment_succeeded` | marks paid | PASS (§4) |

PromptPay is asynchronous through Stripe: the session completes while the payment is still unpaid, and confirmation arrives minutes later. The handler treats those two shapes separately and explicitly — `if (session.payment_status === 'paid')` — so a completed-but-unpaid PromptPay session leaves the payment outstanding, which is exactly the required behaviour. **No manual staff verification is needed** for PromptPay-through-Stripe, because Stripe confirms it. Manual verification only becomes relevant for a bank transfer paid outside Stripe entirely — see B2.

---

## 6. MILESTONES — PARTIAL

### 6.1 The model is complete

`payment_milestones` carries `plan_id` + `project_id` (with a composite FK forcing them to agree), `sequence`, `name`, `description`, `percentage_bp`, `amount`, `due_date`, `status`, `unlock_rules` (JSONB array, GIN-indexed, `jsonb_typeof = 'array'` enforced), `paid_at`, `completed_at`. Payment relationship is via `payments.milestone_id`; `settleMilestone` derives settlement from the sum of PAID payments against the milestone, so a milestone split across a deposit and a top-up settles correctly and a part-payment leaves it honestly outstanding (proven in §7).

The briefed example (deposit ฿5,000 / development ฿10,000 / final ฿10,000) is representable exactly and was exercised in its 30/70 and 33/33/34 forms.

### 6.2 FINDING F2 (P2) — nothing can be edited after the plan is created

`createPaymentPlan` is the **only** write path to `payment_plans` and `payment_milestones` in the entire application. There is no action and no UI to:

- change a milestone's due date, name, amount or `unlock_rules` after creation;
- mark a milestone `INVOICED` or `OVERDUE` (both statuses exist and are read by `nextDue`, and nothing ever sets them);
- cancel a milestone, or replace a plan that was built against a total that has since changed.

The admin milestones page (`/admin/milestones`) is a read-only table. RLS already permits all of this for finance staff (`payment_milestones_update_finance`), so this is a missing UI, not a missing permission. Consequence in practice: a pricing change after the plan exists leaves `payment_plans.total_amount` stale against `projects.total_amount`, with no in-app way to reconcile it.

---

## 7. UNLOCK RULES — PASS

The rule is: a resource is unlocked when **any milestone naming it in `unlock_rules` has `status = 'PAID'`**. Staff bypass in application code (`isResourceUnlocked` → `getAccessContext()`); clients are gated. There is **no `total_paid >= total_amount` shortcut anywhere** — the one place that used to have it (`source-code`) now calls `isResourceUnlocked`.

Tested at the database layer under a real client session *and* at the route layer over real HTTP.

| # | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 7.1 | Nothing paid | nothing unlocked | `[]` | PASS |
| 7.2 | Nothing paid — `/preview`, `/deployment`, `/source-code` over HTTP | all show the locked state | all 3 locked | PASS |
| 7.3 | **Partial payment** ฿3,000 of a ฿6,000 milestone | unlocks nothing, milestone stays unpaid | `[]`, milestone `PENDING` | PASS |
| 7.4 | Deposit fully paid (`unlock_rules: ["preview"]`) | only preview | `[preview]` | PASS |
| 7.5 | …`/preview` over HTTP | unlocked | unlocked | PASS |
| 7.6 | …`/deployment` and `/source-code` over HTTP | still locked | both locked | PASS |
| 7.7 | **฿13,999 paid against a ฿14,000 milestone** | source code still locked | locked | PASS |
| 7.8 | Both milestones paid | exactly the configured union | `[deployment, preview, source_code]` | PASS |
| 7.9 | Fully paid — unconfigured resources (`documents`, `maintenance`) | stay locked | locked | PASS |
| 7.10 | Client B on Client A's project | nothing | `[]` | PASS |
| 7.11 | Staff on a project with nothing paid | not gated | all 3 pages open | PASS |

7.7 is the specific case the brief called out, and it behaves correctly: one satang short of a milestone unlocks nothing.

---

## 8. PREVIEW — PASS

Preview URLs come from `project_deployments` rows an admin actually saved (`environment in ('PREVIEW','STAGING')`); no placeholder link exists in the page. Access is gated by `isResourceUnlocked(id, 'preview')`, and the page renders a locked state rather than a 404 — correct, because "not yet paid" is not "not yours".

Share links, tested end-to-end over HTTP against the running app:

| # | Test | Actual | Result |
| --- | --- | --- | --- |
| 8.1 | Valid token | 200, project name and preview link | PASS |
| 8.2 | Revoked token | "ลิงก์นี้ถูกยกเลิกแล้ว" | PASS |
| 8.3 | View-limited token, after its last view | "ถูกเปิดดูครบจำนวน" | PASS |
| 8.4 | Short-lived token, **after real wall-clock expiry** | "ลิงก์นี้หมดอายุแล้ว" | PASS |
| 8.5 | Creating a link already expired | refused — `share_links_expires_after_created` | PASS |
| 8.6 | Random 256-bit token | refused | PASS |
| 8.7 | Sequential guess (`111…`) | refused | PASS |
| 8.8 | Short token / SQL-ish token | refused | PASS |
| 8.9 | Plaintext token stored anywhere | only the SHA-256 hash | PASS |
| 8.10 | Rewriting `token_hash` | refused — immutability trigger | PASS |
| 8.11 | Page contents | project name + preview URL only; no pricing, payments or client identity | PASS |
| 8.12 | `robots: noindex` | present | PASS |

Every failure mode renders the same shape of page and reveals nothing about which check failed beyond the four visible categories, so the endpoint is not a token-guessing oracle. Project isolation holds: a share link resolves one project's preview and nothing else.

*(One assertion in this set initially flagged the word "ชำระเงิน" on the share page. On inspection it is the site-wide `<meta name="description">`, not project data — a test-methodology false alarm, not a leak.)*

---

## 9. DEPLOYMENT — PASS

`/portal/projects/[id]/deployment` calls `requireProjectAccess` then `isResourceUnlocked(id, 'deployment')`, and **fetches no deployment rows at all when locked** (`unlocked ? getDeployments(...) : Promise.resolve([])`) — the URL is not merely hidden in the markup, it is never read. Verified over HTTP at 7.2, 7.6 and 7.7: with the deployment milestone unpaid, the page returns the locked state and the body contains no deployment URL.

A client cannot reach it by direct URL (that *is* the direct URL), and cannot reach another client's by changing the project id (§10.1).

---

## 10. SOURCE CODE — PARTIAL

### 10.1 The gate cannot be bypassed — 14/14

All over real HTTP with real session cookies.

| # | Attempt | Actual | Result |
| --- | --- | --- | --- |
| 10.1 | Client B → A's portal overview | 404 | PASS |
| 10.2 | Client B → A's `/payments` | 404 | PASS |
| 10.3 | Client B → A's `/preview` | 404 | PASS |
| 10.4 | Client B → A's `/deployment` | 404 | PASS |
| 10.5 | Client B → A's `/source-code` | 404 | PASS |
| 10.6 | Client B → A's `/documents` | 404 | PASS |
| 10.7 | Client A → B's `/source-code` | 404 | PASS |
| 10.8 | Client → `/admin/projects/{id}` | 307 → `/portal` | PASS |
| 10.9 | Client → `/admin/payments` | 307 → `/portal` | PASS |
| 10.10 | Client → `/admin/dashboard` | 307 → `/portal` | PASS |
| 10.11 | Anonymous → a portal page | redirected to login | PASS |
| 10.12 | Made-up project UUID | 404 | PASS |
| 10.13 | Client B → download A's document by id (`/api/documents/{id}/download`) | 404 | PASS |
| 10.14 | Download route with a malformed id | 404 | PASS |

"Does not exist" and "not yours" return the same 404 throughout, so ids cannot be enumerated. The download route reads the `documents` row **under the caller's session first** and only then mints a 60-second signed URL with the privileged client — a guessable storage path is therefore harmless, and the bucket is private with no user-facing policies. Changing a milestone id changes nothing, because the unlock decision is a server-side query over PAID milestones, never a client-supplied value.

There is no download endpoint, API route or client-side state that can be flipped to obtain source code — because, per 10.2, there is nothing to obtain.

### 10.2 FINDING F3 (P2) — the handover itself does not exist

`/portal/projects/[id]/source-code` shows the *agreed terms* (ownership, delivery method, unlock status, next milestone) and, when locked, a locked state. It does not hand over a repository, because the schema has no repository URL, no credential store and no handover artifact. The page says so plainly rather than inventing a link, which is the right call — but "SOURCE CODE HANDOVER" as a delivered capability is **MISSING**, not merely locked. The gate protects a door with nothing behind it yet.

---

## 11. PAYMENT SECURITY — PASS

Every one of these was attempted as **Client A, on their own project**, with a real session — the hardest case, since RLS cannot fall back on "not their project".

| # | Attempt | Actual | Result |
| --- | --- | --- | --- |
| 11.1 | Mark a payment PAID | 0 rows updated | PASS |
| 11.2 | Insert a fake successful payment | `42501` insufficient privilege | PASS |
| 11.3 | Mark a milestone PAID | 0 rows | PASS |
| 11.4 | Change a milestone amount | 0 rows | PASS |
| 11.5 | Rewrite `unlock_rules` | 0 rows | PASS |
| 11.6 | Change a pricing item | 0 rows | PASS |
| 11.7 | Add their own discount | `42501` | PASS |
| 11.8 | Change `projects.total_amount` / turn on VAT | 0 rows | PASS |
| 11.9 | Change the plan total | 0 rows | PASS |
| 11.10 | Delete a payment record | 0 rows | PASS |
| 11.11 | Read the webhook event ledger | 0 rows (`payment_provider_events` has RLS on and no policies at all) | PASS |
| 11.12 | Write to another client's milestones | 0 rows | PASS |

Clients hold SELECT and nothing else on `payments`, `payment_plans`, `payment_milestones` and `project_pricing_items`. The one client-side write in the money flow is `agreement_acceptances`, which is append-only and immutable by trigger.

---

## 12. DATABASE — migrations and tables

23 migration files, all applying cleanly from scratch: **`npm run work:db:validate` → 100 passed, 0 failed** (real Postgres via pglite, every migration in order, ~100 RLS and schema-hygiene assertions).

| Capability | Migration(s) | Tables / objects | Present on the remote? |
| --- | --- | --- | --- |
| Pricing | `20260825120600_project_pricing` · `20260901090000_pricing_sync_total` · `20260901090200_pricing_vat_delta` | `project_pricing_items`, `project_pricing_totals` (view), `app.sync_project_total_from_pricing`, `app.sync_project_total_from_vat_settings`, `projects.vat_enabled` / `vat_rate_bp` | **YES** — VAT columns and the VAT-shaped view both confirmed live |
| Payment plans | `20260825120800_payment_plans_and_milestones` | `payment_plans`, `payment_plans_project_key` | YES |
| Milestones | same | `payment_milestones`, `payment_milestones_validate_totals` (deferred constraint trigger), unlock GIN index | YES |
| Unlock rules | same | `payment_milestones.unlock_rules` JSONB | YES |
| Payments | `20260825120900_payments` | `payments`, `payment_provider_events`, `payments_provider_payment_key` | YES |
| Quotes / agreements | `20260825120700_agreements` | `agreements`, `agreement_versions`, `agreement_acceptances`, immutability triggers | YES |
| Invoices | `20260825121000_documents` (+ `20260826120200_storage_documents`) | `documents` (`type = 'INVOICE'`), `work-documents` private bucket | YES |
| Share links | `20260831090000_share_links` · `20260901090300_share_links_missing_indexes` | `share_links`, token-hash immutability trigger, `expires_after_created` CHECK | Table YES; **the two FK indexes are UNVERIFIED** (U1) |
| Deployments | `20260826120100_deployments_maintenance_change_requests` | `project_deployments`, `maintenance_plans`, `change_requests` | YES |

**Pending migrations:** the earlier `20260901090200` deadlock (40P01) resolved — the VAT columns, the VAT-shaped `project_pricing_totals` and `grand_total` are all live on the remote and returning correct values, so that migration landed. `20260901090300` (two share-link FK indexes) cannot be confirmed through PostgREST, which does not expose `pg_indexes`; run `npm run work:db:verify` and paste the generated SQL into the Supabase SQL editor to settle it. Applying it twice is harmless — it is `create index if not exists`.

No destructive command was run. No table was dropped, no database was reset, no production row was deleted other than the throwaway audit project this audit created.

---

## 13. TEST MATRIX — as executed

Real project, ฿20,000, `PRJ-AUDIT-BFA`, deleted afterwards.

| Dimension | Cases run | Result |
| --- | --- | --- |
| Payment models | full · deposit 30% · 3 installments | 3/3 |
| Payment state transitions | PENDING → PROCESSING → PAID (webhook) · → FAILED · → EXPIRED · → CANCELLED (provider refusal) · PAID immune to a late failure | all correct |
| Milestone transitions | PENDING → PAID only when payments cover the amount; partial leaves PENDING | correct |
| Unlock transitions | nothing → preview → preview+source_code+deployment, each step gated by its own milestone | correct |
| Client A / Client B isolation | 16 assertions across 12 tables + routes | 16/16 |
| Client write attempts | 12 attempts on their own project | 12/12 refused |
| Webhook trust | 5 forgery shapes, replay, duplicate-meaning events, late failure, unknown type | 22/22 |
| Share links | valid · revoked · exhausted · expired (real wall-clock) · random · malformed | 15/15 |

**TypeScript:** 0 errors (`npx tsc --noEmit`; the only entries were in `.next/dev/types/validator.ts`, a generated file being rewritten by the running dev server — 0 errors in project sources).
**ESLint:** 0 errors, 127 warnings — all pre-existing, none in `/work`.
**Build:** not re-run in this pass. The last successful run was 126/126 pages; nothing in this audit changed a source file, so that result still stands, but it is **UNVERIFIED for today** and is listed as U3 rather than claimed as a PASS.

---

## FINDINGS

| ID | Sev | Finding | Where |
| --- | --- | --- | --- |
| **F1** | P1 | ~~`projects.total_amount` can be written directly and left disagreeing with its pricing items~~ — **fixed in code** (`20260901090400_projects_total_amount_guard.sql`), **PENDING on the remote** (§0) | §1.4 |
| **B1** | P1 | ~~`STRIPE_WEBHOOK_SECRET` is empty~~ — **fixed for local dev**, proven with 10 real signed-webhook scenarios; **production registration PENDING**, steps handed to the user (§0) | §4.3 |
| **B2** | P1 | ~~No way to record an out-of-band payment~~ — **fixed**: `recordManualPayment`, live-tested 14/15 (the 1 gap is `verified_by`/`notes` awaiting the same pending migration) (§0) | §6.2, §11 |
| **F2** | P2 | Milestones and plans cannot be edited after creation — no due-date change, no INVOICED/OVERDUE transition, no cancellation, no plan replacement when pricing changes | §6.2 |
| **F3** | P2 | Source-code handover has no artifact: no repository URL, credential store or delivery mechanism exists. The gate is real; the thing it gates is not built | §10.2 |
| **F4** | P3 | Invoices are a derived read-only view over `documents`; nothing in the app creates an invoice or a receipt, and `documents` has no write path at all (queries only) | §12 |
| **F5** | P3 | Stripe webhook URL must be registered as `/work/api/payments/webhook`; a bare `/api/...` on the work subdomain 404s by design | §4.3 |

## UNVERIFIED

- **U1** — Whether `share_links_organization_idx` / `share_links_created_by_idx` exist on the remote. PostgREST cannot see `pg_indexes`; needs `npm run work:db:verify` run against the real database.
- **U2** — The project **create and edit forms** as a browser flow. The pricing arithmetic behind them was tested exhaustively at the database layer under real sessions, and the actions were read line by line, but no form submission was driven through a browser in this pass.
- **U3** — `npm run build` was not re-run today (no source file changed during this audit; last known result 126/126 pages).

## RECOMMENDATION

Three P1s, and none of them is a security hole — the security model held on all 134 relevant assertions. They are integrity and completeness gaps:

1. **B1** — set `STRIPE_WEBHOOK_SECRET` and register the endpoint at `/work/api/payments/webhook`. Without this the entire payment→unlock chain is inert in production, however correct the code is.
2. **F1** — one new migration adding `total_amount` to the BEFORE-UPDATE trigger's column list (§1.4). Small, and it closes the last way the two sources of truth can drift.
3. **B2** — an admin action to record an out-of-band payment. It is the smallest missing piece with the largest operational consequence: today, money that arrives by bank transfer cannot be entered at all.

F2 and F3 are the natural content of the next phase (DELIVERY / HANDOVER), not defects to fix before it.
