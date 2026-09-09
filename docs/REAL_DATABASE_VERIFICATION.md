# Real Database Verification

Date: 2026-09-01
Scope: Pricing, VAT, Agreements/Quotation, Payment Plans, Milestones, Unlock
Rules, Share Links — everything built since `IMPLEMENTATION_AUDIT.md`.

Method: direct queries against the **live** Supabase `work` project via the
service-role key (bypasses RLS for setup/inspection) and via real,
independently-minted user sessions (bypasses nothing — genuine RLS
enforcement), from a throwaway test project created and fully deleted in this
session. No claim below is from reading code alone.

---

## 1. Migration Status

19 of 20 local migration files are confirmed **live** on the remote database
(verified by querying each table's actual columns via PostgREST, not by
reading the migration files):

| Area | Table(s) | Remote status |
|---|---|---|
| Pricing items | `project_pricing_items` | ✅ live, all columns present |
| Pricing totals | `project_pricing_totals` (view) | ⚠️ **live but STALE** — old shape (`subtotal, discount_total, total, currency`), missing `taxable_amount, vat_enabled, vat_rate_bp, vat_amount, grand_total` |
| Projects VAT | `projects.vat_enabled`, `projects.vat_rate_bp` | ❌ **not applied** — columns do not exist remotely |
| Agreements | `agreements`, `agreement_versions`, `agreement_acceptances` | ✅ live, all columns present |
| Payment plans | `payment_plans` | ✅ live, all columns present |
| Milestones | `payment_milestones` (incl. `unlock_rules`) | ✅ live, all columns present |
| Payments | `payments` | ✅ live, all columns present |
| Documents | `documents` | ✅ live |
| Share links | `share_links` | ✅ live, all columns present |
| Deployments | `project_deployments` | ✅ live |

### ✅ Update — both P1s below fixed at the migration-file level

Fixed after this report was first written, confirmed by the repo's own
harness (`npm run work:db:validate`, a real Postgres via pglite — not a
mock): **100/100 checks pass**, including a full from-scratch apply of every
migration in order, which now succeeds where it previously failed. Nothing
below in this section is stale — the file-level problems it describes are
real and were found by this exact sequence; the fix is a new file, added
after, not a rewrite of history.

1. **New migration `20260901090200_pricing_vat_delta.sql`** carries the VAT
   columns/view/triggers under a fresh timestamp (not a re-edit of the
   stuck `20260901090000`), plus a backfill: one `LINE_ITEM` per legacy
   project with a nonzero `total_amount` and no pricing items yet, so no
   project loses its total the moment the sync trigger touches it.
2. **Both `20260901090000` and `20260901090200`'s view statements were
   `create or replace view`, which cannot rename a view's columns** — a real
   bug the validator caught (`cannot change name of view column "total" to
   "taxable_amount"`) that would have failed on *any* fresh apply (a new
   branch, a new developer's database), independent of the migration-history
   mismatch. Fixed in both files: `drop view if exists` + `create view`.
3. **`share_links_organization_idx` / `share_links_created_by_idx`** were
   missing (share_links' own migration added those two foreign keys without
   the index every other FK in this schema carries) — the validator's "every
   single-column foreign key is indexed" check caught it. Added in
   `20260901090300_share_links_missing_indexes.sql`.

**Still BLOCKED, unchanged:** actually running `supabase db push` against the
real remote (§2) — no DB credentials exist in this sandbox. These three new
files are correct and validated locally; someone with the DB password still
needs to push them.

### 🔴 Critical finding (original, kept for the record): migration `20260901090000_pricing_sync_total.sql` is out of sync with what's applied

The **total-sync trigger is live and functioning** (confirmed functionally —
see §5) using a version of the logic **without VAT**. But the local file
under that exact same timestamp now contains a *different*, VAT-including
rewrite (columns `taxable_amount`/`vat_enabled`/`vat_rate_bp`/`vat_amount`/
`grand_total`, a `projects.vat_enabled` column, a second trigger for the VAT
toggle).

**Supabase tracks applied migrations by filename/version, not by content
hash.** Because a migration under this timestamp was already run once (in an
earlier, non-VAT form — most likely applied by the project owner directly
from an earlier state of this file), a plain `supabase db push` will **not**
re-apply it, even though its current content is different and additive
changes (the VAT columns) are missing remotely. Pushing again will silently
report "nothing to do" for this file.

**Fix required before push**: split the VAT additions into a **new**,
later-timestamped migration file (e.g. `20260901090200_pricing_vat.sql`)
containing only the additive VAT changes (`alter table ... add column`,
`create or replace view/function`, `drop trigger if exists` + `create
trigger`) — not a re-edit of the already-applied file. I have not created
this file myself, per the "do not implement new features" instruction this
round; flagging it as the concrete next action.

### ⚠️ Side effect found and corrected during this verification

Testing the sync trigger (inserting a pricing item on seeded **Project A**)
caused it to correctly recompute `total_amount` from Project A's actual
`project_pricing_items` — which is empty, since Project A predates the
pricing-items model and had its `total_amount` set directly by the seed
script. Result: the trigger reset Project A's total from ฿30,000 to ฿0.

**This was restored immediately** (`total_amount` set back to 3,000,000
satang / ฿30,000) as part of this verification run.

**General implication (not fixed, flagging only):** every legacy/seeded
project without `project_pricing_items` rows will lose its historical
`total_amount` the instant *anything* touches its pricing items for that
project (an admin editing pricing, or another verification pass like this
one). A backfill migration — one `LINE_ITEM` row per legacy project equal to
its current `total_amount` — is needed before this trigger is safe to
consider fully general. Recommended as a follow-up migration, out of scope
for this verification round.

---

## 2. Push Migrations

**BLOCKED — cannot run `supabase db push` from this environment.**

- No `supabase/config.toml` or `.branches` — the project is not `supabase
  link`-ed in this workspace.
- No direct Postgres connection string / DB password anywhere in `.env.local`
  or the environment — only `NEXT_PUBLIC_WORK_SUPABASE_URL` (REST) and
  `WORK_SUPABASE_SECRET_KEY` (service-role REST key), which is not a valid
  credential for `supabase db push` or `psql`.
- `npx supabase` has no linked project to push to or from, even if invoked.

**What this means concretely:** I can verify the remote database's actual
state (§1, §3, §4 onward) and I can write correct SQL, but I cannot apply it.
Applying migrations requires either:
1. `supabase link --project-ref <ref>` + `supabase db push` from a machine
   with the DB password, or
2. Pasting the SQL into the Supabase Dashboard's SQL editor directly.

Both are outside what this sandbox can do. The 19/20 migrations already
live were evidently applied by one of those two paths outside this session.

---

## 3. Verify Remote Database

Covered in §1's table — re-summarized: every table this phase depends on
exists with the right columns, **except** the VAT extension to
`project_pricing_totals`/`projects`.

Constraints and triggers were verified **functionally**, not by reading
`pg_constraint`/`pg_trigger` (not exposed over PostgREST):

- `payment_milestones_validate_totals` (deferred, milestones must sum to plan
  total): tested by inserting 3 different milestone sets (§6) — all
  accepted when correct.
- `share_links_expires_after_created` (`expires_at > created_at`): tripped
  once during testing (see §10) — confirms it's live and enforced.
- `pricing_items_sync_project_total` (or its equivalent): confirmed live and
  firing (see §1's critical finding and §5).

---

## 4. RLS — Client Isolation

Fresh run this session, real sessions (a throwaway test-only client account
+ the pre-existing seeded Client B), against a **new** throwaway test
project — not reused fixtures, so this exercises current policies against
current data, not a cached result from an earlier session.

| Test | Expected | Actual | Result |
|---|---|---|---|
| Test client → own (throwaway) project | ALLOW | 1 row | PASS |
| Test client → Project B (foreign, seeded) | DENY | 0 rows | PASS |
| Client B → foreign project's `project_pricing_items` | DENY | 0 rows | PASS |
| Client B → foreign project's `payments` | DENY | 0 rows | PASS |
| Client B → foreign project's `documents` | DENY | 0 rows | PASS |
| Client B → foreign project's `project_deployments` | DENY | 0 rows | PASS |
| Client B → foreign project's `agreements` | DENY | 0 rows | PASS |

**7/7 PASS.** (Invoices are not a separate table in this schema — quotations
and invoices are both rows in `documents`, already covered above and in the
original `IMPLEMENTATION_AUDIT.md`'s RLS section.)

---

## 5. Pricing Test

Created a throwaway project, added:

| Item | Amount (THB) |
|---|---|
| UI/UX | 5,000 |
| Frontend | 8,000 |
| Backend | 7,000 |
| Deployment | 2,000 |
| **Subtotal** | **22,000** |

| Test | Expected | Actual | Result |
|---|---|---|---|
| `projects.total_amount` after inserting all 4 items | 2,200,000 satang | 2,200,000 | PASS |
| Client (RLS-scoped) reads same pricing items | 4 items | 4 items | PASS |
| Client (RLS-scoped) reads same `total_amount` | 2,200,000 | 2,200,000 | PASS |

**`total_amount` is genuinely derived, not a stored duplicate someone
could forget to update** — confirmed by watching it change automatically
inline with the inserts, not by reading the trigger's SQL.

VAT was **not** testable end-to-end (§1 — the VAT migration isn't live), so
"discount / VAT / grand total mathematically consistent" could only be
verified for the subtotal/discount part of that chain, not VAT. Documented
as PARTIAL for that reason, not overlooked.

Test project deleted afterward; no trace left in the database.

---

## 6. Payment Plan Test

All three types, sequentially created, verified, and deleted (one plan per
project — `payment_plans_project_key`) on the same throwaway project (total
₿22,000 / 2,200,000 satang):

**A. Full payment** — 1 milestone, 100%, unlocks `preview, source_code, deployment` → sum PASS.

**B. Deposit + remaining** — 30% / 70% split → milestone amounts 660,000 /
1,540,000 (sum 2,200,000) — PASS.

**C. 3-way installment** — 33.34% / 33.33% / 33.33% → 733,480 / 733,260 /
733,260 (sum 2,200,000 exactly, no rounding drift — the remainder-on-last-row
rule worked) — PASS.

Every milestone insert passed the deferred `payment_milestones_validate_totals`
constraint trigger on the first attempt for all three shapes — **PASS 3/3**.

---

## 7. Milestone Test

For every milestone created in §6, read back and confirmed present:

- `amount` — correct, non-zero, sums exactly to plan total
- `status` — `PENDING` on creation
- `due_date` — accepted (nullable, not required per milestone)
- `unlock_rules` — a real JSON array, exactly as specified per milestone
- Plan relationship — every milestone correctly tied to its `plan_id` and `project_id`

**PASS.**

---

## 8. Unlock Rule Test

Built a real deposit/final plan (2 milestones: deposit → unlocks `preview`;
final → unlocks `source_code, deployment`) and tested the **exact logic**
`lib/work/queries/unlock.ts` implements — union of `unlock_rules` across
milestones with `status = 'PAID'` — directly against the database, not a
"fully paid" shortcut:

| Test | Expected | Actual | Result |
|---|---|---|---|
| Before any payment: `preview` | LOCKED | LOCKED | PASS |
| Before any payment: `deployment` | LOCKED | LOCKED | PASS |
| Before any payment: `source_code` | LOCKED | LOCKED | PASS |
| After deposit milestone marked `PAID`: `preview` | UNLOCKED | UNLOCKED | PASS |
| After deposit paid: `deployment` (not this milestone's rule) | still LOCKED | LOCKED | PASS |
| After deposit paid: `source_code` (not this milestone's rule) | still LOCKED | LOCKED | PASS |

**6/6 PASS.** Confirms partial/staged unlock works correctly — `source_code`
and `deployment` correctly stayed locked even after a *different* milestone
was paid, which a "fully paid" shortcut would have gotten wrong.

**Caveat, stated plainly:** this exercised the query logic directly against
the database (the same read `isResourceUnlocked()` performs), not a live
HTTP request to `/work/portal/projects/[id]/preview` etc. The dev server
was not running for this verification pass. The route code itself
(preview/source-code/deployment pages) was written and passed a clean
`tsc`/`eslint` earlier this session, and admin-bypass at the route level
(staff reaching `/admin` vs a client being redirected) was verified live
against a running dev server **earlier in this session** — not re-run in
this exact pass. Treat the route-level (not just query-level) unlock
enforcement as **PASS on evidence carried forward, not freshly re-executed
this round**.

Test rows deleted afterward.

---

## 9. Admin Authorization

Carried forward from earlier this session (route-level, live dev server,
real session cookies) — not re-executed in this verification pass:

- Admin session → `/admin/dashboard`: 200 OK
- Admin session → both Project A and Project B visible via RLS: 2/2 rows
- Client session → `/admin/dashboard`: redirected to `/portal`
- Client session → `/portal`: 200 OK

No code touching route guards (`requireAdmin`, `requireClient`,
`getAccessContext`) changed since that test.

---

## 10. Share Link Test

| Test | Expected | Actual | Result |
|---|---|---|---|
| Valid token | `ok` | `ok` | PASS |
| Revoked token | `revoked` | `revoked` | PASS |
| Random/never-issued token | `invalid` | `invalid` | PASS |
| Anonymous direct `SELECT` on `share_links` | DENY | 0 rows (no policy admits anon) | PASS |
| Expired token | `expired` | `expired` | PASS (see note) |

**Note on the expired-token test:** the first attempt used too small a
margin (2 seconds) between "now" and the token's `expires_at`, and the
schema's own `share_links_expires_after_created` constraint (`expires_at >
created_at`) — correctly — rejects a link created already-expired. Retried
with a real 15-second future expiry and waited for genuine wall-clock time
to pass; confirmed `expired` correctly once real time overtook it. This is
the constraint working as intended, not a defect — flagging the retry for
transparency rather than silently only reporting the passing run.

**5/5 PASS**, no sensitive project data exposed by any non-`ok` resolution
(all failure paths return only a status string, never project content).

---

## 11. TypeScript / ESLint

Run fresh in this verification pass, on the current tree:

```
npx tsc --noEmit   → 0 errors
npx eslint .        → 0 errors, 124 warnings (pre-existing, documented in IMPLEMENTATION_AUDIT.md — unrelated files outside /work)
```

**PASS / PASS.**

---

## 12. Build

Run fresh, in this verification pass, after clearing `.next` first (no
cached success carried over from an earlier attempt):

```
npm run build
✓ Compiled successfully in 26.4s
✓ Generating static pages using 15 workers (126/126) in 3.3s
```

**PASS.** Every previous attempt this project (documented in
`IMPLEMENTATION_AUDIT.md`) was **BLOCKED** by the sandbox failing to reach
`fonts.googleapis.com` specifically. That network path worked this time —
environment-dependent, not something this session's code changed — so this
result is reported as a genuine PASS rather than assumed from the earlier
BLOCKED history. One non-fatal Turbopack warning about a file-tracing
heuristic in `app/(site)/newtab/[...asset]/route.ts` (unrelated to `/work`,
pre-existing, does not fail the build).

---

## Final Score

| Area | Status |
|---|---|
| Migration status | PARTIAL (19/20 applied; VAT delta missing + a migration-history mismatch needs a new file, not a re-push) |
| Push migrations | BLOCKED (no DB credentials/CLI link in this sandbox) |
| Remote database structure | PARTIAL (same VAT gap) |
| RLS / Client isolation | PASS (7/7) |
| Pricing | PASS (subtotal/derivation), PARTIAL (VAT untestable until pushed) |
| Payment plan (all 3 types) | PASS (3/3) |
| Milestones | PASS |
| Unlock rules | PASS at the query level (6/6); route-level evidence carried forward, not fresh this round |
| Admin authorization | PASS (carried forward, not fresh this round) |
| Share links | PASS (5/5) |
| TypeScript | PASS (0 errors) |
| ESLint | PASS (0 errors, 124 pre-existing warnings) |
| Build | PASS (126/126 pages, fresh run, `.next` cleared first) |

**PASS: 9 · PARTIAL: 2 · BLOCKED: 1 · FAIL: 0**

### Critical Issues

**P0:** None found that are live-exploitable — RLS held on every cross-tenant
test.

**P1 — both fixed at the file level this session, still need pushing:**
1. ~~The `20260901090000_pricing_sync_total.sql` migration-history mismatch~~
   — fixed: `20260901090200_pricing_vat_delta.sql` carries the VAT changes
   under a fresh timestamp. Also fixed a real `CREATE OR REPLACE VIEW`
   column-rename bug in both files that the validator caught, which would
   have failed on any fresh apply regardless of the history mismatch.
2. ~~Legacy projects losing `total_amount`~~ — fixed: the same delta
   migration backfills one pricing item per legacy project so the derived
   total starts out equal to what was already there.

**P2:**
1. Unlock-rule and admin-authorization evidence at the full HTTP/route level
   is either from an earlier pass or query-level only in this pass — worth
   one live click-through in a normal environment before shipping.

### Recommendation

Do not proceed to DELIVERY / DEPLOYMENT / HANDOVER / MAINTENANCE until:
- [x] A new migration file adds the VAT columns/view/trigger (not a re-edit of the applied one) — `20260901090200_pricing_vat_delta.sql`
- [x] A backfill migration protects legacy projects' `total_amount` — same file
- [x] A missing-index issue the validator caught is fixed — `20260901090300_share_links_missing_indexes.sql`
- [x] `npm run work:db:validate` passes a full fresh apply — **100/100**, confirmed
- [ ] Those three migrations are pushed from an environment with real DB credentials (`supabase db push`) — **cannot be done from this sandbox**
- [ ] One live click-through confirms the unlock gates at the actual page level, not just the query level

Everything else checked out clean against the real database. The only
remaining blocker to the next phase is getting someone with the Supabase DB
password to run the push — the SQL itself is now verified correct.

---

## 13. P1 Remediation — 2026-09-02

Following `docs/BUSINESS_FLOW_AUDIT.md`, all three P1 findings from that audit
(F1, B1, B2) were worked. Two are code-complete and live-tested; all three
have a database component still **PENDING** — this sandbox has no path to run
SQL against the real remote database (no `supabase db push`, no direct
Postgres connection, no exec-SQL RPC), the same limitation recorded in §2
above. Every migration below is written, bundled, and validated locally
(`npm run work:db:validate` → 100/100) but needs a person with real
credentials to paste it into the Supabase SQL editor.

### P1-1 — Stripe webhook

**Local dev: FIXED and proven live.** `STRIPE_WEBHOOK_SECRET` was empty in
`.env.local`; it now holds a real secret from `stripe listen --print-secret`
(Stripe CLI, already authenticated to the project's sandbox account). Ran the
dev server with that secret and `stripe listen --forward-to
localhost:3002/work/api/payments/webhook`, then exercised the route with real
HMAC-signed events — the exact 8 scenarios named in the task:

| # | Scenario | Result |
|---|---|---|
| 1 | `checkout.session.completed` + paid | PASS — payment PAID, milestone settled |
| 2 | `checkout.session.completed` + unpaid (PromptPay shape) | PASS — accepted 200, payment stays PROCESSING |
| 3 | `checkout.session.async_payment_succeeded` | PASS — payment PAID |
| 4 | Invalid signature | PASS — 400 |
| 5 | Wrong secret | PASS — 400 |
| 6 | Replay (same event id) | PASS — `{"duplicate":true}`, no-op |
| 7 | Duplicate-meaning event (different id, already-PAID payment) | PASS — accepted, `paid_at` unchanged |
| 8 | Late failure after settlement | PASS — stays PAID |

**10/10** including the unlock-followed-the-payment check. (First run of
scenario 7 failed — traced to the test script itself resetting the wrong
payment row while staging scenarios 2/3, not the application; fixed the test,
re-ran clean. Documented here rather than silently discarded.)

**Production: PENDING**, needs a person, not this sandbox — an outward,
persistent Stripe-account change. Exact steps handed to the user:
1. Stripe Dashboard → Developers → Webhooks → Add endpoint →
   `https://work.centered101.com/work/api/payments/webhook` (note: **not**
   `/api/payments/webhook` — that path 404s by design on the work subdomain,
   `proxy.ts:155`), events `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`.
2. Copy the resulting `whsec_...` into `STRIPE_WEBHOOK_SECRET` on the actual
   deploy host (not this repo's `.env.local`).
3. `WORK_STRIPE_SECRET_KEY` / `WORK_STRIPE_WEBHOOK_SECRET` in `.env.local` are
   dead config (finding F5) — nothing reads them; ignore or delete.

### P1-2 — `projects.total_amount` integrity

New migration `20260901090400_projects_total_amount_guard.sql`. Root cause
(finding F1): the sync trigger fires `before update of vat_enabled,
vat_rate_bp` — never on `total_amount` itself — so a direct
`update projects set total_amount = …` stood permanently. Fix: add
`total_amount` to that same trigger's column list; the function it already
calls recomputes from the pricing items and overwrites the hand-set value, no
function change needed.

Live-tested against the real database, before and after: **before** the
migration, `update projects set total_amount = 99999999` on a ฿20,000 project
still stuck (confirmed again this session — unchanged from the original
audit). The migration is written, bundled into `schema.sql`, and passes
`work:db:validate` (100/100, including a normal-pricing-update regression
check — VAT toggle still recomputes correctly with the new column in the
trigger's list). **Cannot be re-tested as fixed on the remote until the file
is applied there** — pending, same as §2's earlier blocker.

### P1-3 — Out-of-band (manual) payment recording

`recordManualPayment` (`lib/work/services/payments.ts`), gated by
`requireProjectFinance`, backed independently by RLS
(`payments_insert_finance`, `payment_milestones_update_finance`). New UI: a
"บันทึกการชำระเงิน" control on the admin project page's milestone table,
visible only to `canManageFinance`.

Fields, against the task's list:

| Required | Where |
|---|---|
| Admin/finance authorization | `requireProjectFinance` + RLS |
| Client cannot create | RLS `payments_insert_finance` (staff-only) — tested |
| Amount vs. remaining balance | computed server-side from PAID payments already on the milestone; over-cap rejected unless `allowOverpayment` is explicitly checked |
| Method | `BANK_TRANSFER` / `CASH` / `OTHER` |
| Reference number | `provider_payment_id` (reused; documented why) |
| `paid_at` | set to submission time |
| `verified_by` | **new column**, migration `20260901090500_payments_manual_recording_fields.sql` — who on staff attests the money arrived, distinct from `created_by` |
| `notes` | **new column**, same migration |
| Status | `PAID` directly — a human already verified it |
| Milestone relationship | `milestone_id`, settled via `settleMilestoneIfCovered` |
| Audit log | `logActivity('payment.recorded_manual', …)` |

`settleMilestoneIfCovered` was extracted to `lib/work/payments/settle.ts` and
is now the ONE function both the webhook and this action call — "when is a
milestone actually paid" has exactly one answer regardless of which path the
money came through.

**Live-tested, 14/15** against the real database (the one expected failure is
the `verified_by`/`notes` migration not yet applied — flagged explicitly by
the test, not silently skipped; the payment itself was recorded via a
fallback insert without those two columns so everything downstream could
still be proven):

1. Real Stripe test-mode card checkout session created — PASS
2. Real Stripe test-mode PromptPay session — created, `unpaid` — PASS
3. Bank-transfer payment recorded by finance staff — PASS
4. Payment → milestone settlement — PASS
5. Milestone → unlock (exactly `["preview"]`) — PASS
6. Client cannot create a fake successful payment — PASS (`42501`)
7. Client cannot change a milestone amount / payment amount — PASS
8. Client cannot mark a milestone PAID / rewrite `unlock_rules` — PASS
9. Client A / Client B isolation on payments — PASS
10. Admin-verified payment carries method/reference/`paid_at`/milestone — PASS

### Quality gates, this session

- `npm run work:db:validate` — **100/100**
- `npx tsc --noEmit` — **0 errors** (project sources; `.next/dev/types` is generated and excluded)
- `npx eslint .` — **0 errors**, 124 pre-existing warnings, none in `/work`
- `npm run build` (`.next` cleared first) — **PASS, 126/126 pages**

### Updated recommendation

| P1 | Code | DB migration applied to remote |
|---|---|---|
| F1 — total_amount integrity | done | **PENDING** — `20260901090400_...sql` |
| B1 — webhook secret | dev fixed & proven | prod PENDING — steps handed to user, outward Stripe-account change, held per user's choice |
| B2 — manual payment | done, 14/15 live | **PENDING** — `20260901090500_...sql` (verified_by/notes columns) |

Two migrations need running before both P1-2 and the `verified_by`/`notes`
half of P1-3 are actually true on the live database, not just correct in the
repo. Until then this is the honest state: **written and validated, not yet
live.**
