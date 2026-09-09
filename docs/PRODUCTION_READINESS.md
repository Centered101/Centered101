# PRODUCTION READINESS — Centered101 Work

**Date:** 2026-09-02

```
CODE:                      PASS
LOCAL TESTS:               PASS
PRODUCTION MIGRATION:      PENDING
PRODUCTION STRIPE WEBHOOK: PENDING
```

**This system is NOT production ready.** Everything below this line is either
a verified PASS or an explicit, named PENDING item with the exact steps to
close it. Nothing is marked PASS on the strength of code inspection alone —
where a live test was possible, it was run.

---

## STEP 1 — Production Supabase Migrations

### 1.1 Exact pending migrations

Checked live against the real remote database (REST introspection + one
functional test — see §1.2 method notes). Three migration files, in filename
order:

| # | File | Status on production |
| --- | --- | --- |
| 1 | `20260901090300_share_links_missing_indexes.sql` | **UNCONFIRMED, likely pending** — indexes are invisible to PostgREST, so this can't be checked from here; treat as pending until §1.3's SQL confirms it |
| 2 | `20260901090400_projects_total_amount_guard.sql` | **CONFIRMED PENDING** — re-ran the exact audit exploit live: `update projects set total_amount = 99999999` on a project with ฿20,000 of pricing items still sticks |
| 3 | `20260901090500_payments_manual_recording_fields.sql` | **CONFIRMED PENDING** — `payments.verified_by` does not exist on the remote (`column payments.verified_by does not exist`) |

Nothing else is pending. `20260901090000_pricing_sync_total.sql` and
`20260901090200_pricing_vat_delta.sql` (VAT columns + the VAT-shaped
`project_pricing_totals` view) were re-confirmed live and present.

#### 1.2 What each one changes

**`20260901090300_share_links_missing_indexes.sql`**
- **Changes:** adds two B-tree indexes — `share_links_organization_idx` on
  `share_links(organization_id)`, `share_links_created_by_idx` on
  `share_links(created_by)`.
- **Destructive:** No. `create index if not exists` — cannot fail on a
  re-run, cannot remove or alter data.
- **Dependencies:** the `share_links` table, created in
  `20260831090000_share_links.sql` (already applied).
- **Objects affected:** two new indexes only. No table, column, trigger,
  function, or policy is touched.
- **Locking:** a plain `CREATE INDEX` (not `CONCURRENTLY`) takes a
  `SHARE` lock on `share_links`, which blocks writes to that table for the
  duration of the index build. On a table this small (a handful of rows in
  this environment) that's sub-second. Not a concern here, but worth knowing
  if `share_links` ever gets large.

**`20260901090400_projects_total_amount_guard.sql`**
- **Changes:** `DROP TRIGGER` + `CREATE TRIGGER` on
  `projects_sync_total_on_vat_change`, adding `total_amount` to its
  `BEFORE UPDATE OF vat_enabled, vat_rate_bp, total_amount` column list.
  Also updates one `COMMENT ON FUNCTION`. The trigger function itself
  (`app.sync_project_total_from_vat_settings`) is unchanged — it already
  recomputed `total_amount` from the pricing items and VAT settings and
  assigned it to `NEW`, this migration just makes it fire in the one case
  it was missing.
- **Destructive:** No. Recreating a trigger is instantaneous and touches no
  data. The `DROP TRIGGER` is `IF EXISTS`, so it cannot fail even if the
  trigger were somehow already gone.
- **Dependencies:** `app.sync_project_from_vat_settings()` and the
  `vat_enabled`/`vat_rate_bp` columns, all from `20260901090000` (already
  applied).
- **Objects affected:** one trigger definition on `projects`. No rows are
  touched by the migration itself — the new behavior only applies to writes
  that happen *after* it runs.
- **What this fixes:** without it, `UPDATE projects SET total_amount = x`
  writes stick even when `x` disagrees with the sum of that project's
  `project_pricing_items` (plus VAT). This is reachable by anyone with the
  service-role key, anyone with SQL-editor access, or any org finance/admin
  staff calling PostgREST directly — not by a client, and not through any
  path the application's own UI exposes (`totalAmount` was removed from both
  form schemas earlier).

**`20260901090500_payments_manual_recording_fields.sql`**
- **Changes:** `ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by
  uuid REFERENCES profiles(id) ON DELETE SET NULL`, `ADD COLUMN IF NOT
  EXISTS notes text`, plus `CREATE INDEX IF NOT EXISTS
  payments_verified_by_idx ON payments (verified_by)`.
- **Destructive:** No. Both columns are nullable with no default that
  rewrites existing rows in a way that could fail; `ADD COLUMN ... IF NOT
  EXISTS` is idempotent.
- **Dependencies:** the `payments` and `profiles` tables (both from Phase 0,
  already applied).
- **Objects affected:** two new columns and one new index on `payments`.
  No existing column, constraint, or row is altered.
- **What this enables:** `recordManualPayment` (the out-of-band
  bank-transfer/cash payment action) already runs without these columns —
  it currently omits them from the insert rather than failing — but until
  this migration is applied, every manually recorded payment is missing
  *who* verified it and any staff note, which the audit's P1-3 requirement
  explicitly asked for.

None of the three drops anything, resets anything, or can lose data. All
three are safe to run in any order relative to each other (they touch
different tables/objects), though running them in filename order is the
convention this repo follows.

### 1.3 Exact process to apply them

This sandbox has no Postgres connection string, no linked Supabase CLI
project, and no SQL-execution RPC reachable through the REST API — so this
step has to be done by a person with real credentials. Two ways to do it;
pick one.

**Option A — Supabase Dashboard SQL Editor (no local setup required)**

1. Open the Supabase Dashboard → the `work` project → **SQL Editor** → **New
   query**.
2. Open `supabase/work/migrations/20260901090300_share_links_missing_indexes.sql`
   in this repo, paste its **entire contents**, click **Run**. Expect no
   output rows — it's two `CREATE INDEX` statements.
3. New query. Same for
   `supabase/work/migrations/20260901090400_projects_total_amount_guard.sql`.
4. New query. Same for
   `supabase/work/migrations/20260901090500_payments_manual_recording_fields.sql`.
5. Run each in **its own query tab**, one at a time, not all three pasted
   together into one editor run. This is the one operational lesson from
   this same migration set earlier: a large multi-statement paste run as one
   block hit a `40P01` deadlock against a concurrent connection (the app's
   own live traffic) holding a conflicting lock. These three files are much
   smaller than that one was, but running them individually costs nothing
   and removes the risk entirely. If a deadlock happens anyway, it is
   transient — Postgres always aborts one of the two colliding transactions
   automatically — simply re-run the same file.
6. Optional but recommended: close or pause anything else with an open
   connection to this database (a local `next dev` pointed at production,
   another open SQL Editor tab mid-query) while running step 5, since that
   is exactly the kind of concurrent session that caused the earlier
   deadlock.

**Option B — Supabase CLI, if you have it linked with real credentials**

```bash
supabase link --project-ref <your-work-project-ref>
supabase db push
```

`supabase db push` applies every migration in `supabase/work/migrations/`
that its migration-history table doesn't already record as applied — which,
for a project already at `20260901090200`, means it will apply exactly the
three files above and stop. It will NOT re-run anything already applied,
and it will NOT touch data. This is the standard, lower-effort path if the
CLI is already set up; Option A exists because this sandbox has confirmed it
is not.

**Either way: do not use `supabase db reset`, do not drop any table, and do
not hand-edit `20260901090000`, `20260901090200`, or any other
already-applied file to "fix" something — a new migration is always the
right response to a problem in an applied file, never a rewrite of it.**

### 1.4 Verification — run after applying

Two files, both read-only, both safe to run any number of times on any
database, both already generated and sitting in this repo:

**`verify-work-schema.sql`** (repo root, regenerated this session — 153
checks derived by actually applying all 25 migration files, including the
three above, to a throwaway in-memory Postgres and asking it what exists).
Covers the broad "all required tables, RLS enabled, policies, triggers,
functions, enums, storage buckets" ask. Paste it into the SQL Editor and
run it — every row should say `OK`; any `MISSING` row names the migration
file to check.

**`verify-p1-migrations.sql`** (repo root, hand-written this session)
covers the three specific things the generator above **cannot** see, because
it checks object *existence*, not object *content* — the total_amount
trigger already existed under the same name before this fix, so a
generic "does this trigger exist" check would say OK even without the fix
applied. This file specifically checks:

1. `pg_get_triggerdef()` of `projects_sync_total_on_vat_change` actually
   mentions `total_amount` — the literal fix.
2. A functional re-run of the audit's own exploit (insert a throwaway
   project, give it ฿20,000 of pricing items, hostile-write
   `total_amount = 99999999`, confirm it snaps back to ฿20,000) — wrapped in
   a `DO` block that always rolls itself back, so it leaves nothing behind
   either way.
3. `payments.verified_by`, `payments.notes`, and
   `payments_verified_by_idx` all exist, and `verified_by` is a real foreign
   key to `profiles(id)` (not just a bare column).
4. `share_links_organization_idx` and `share_links_created_by_idx` both
   exist — settling U1 from the original audit, which could never be
   checked through PostgREST.
5. A full dump of every constraint, trigger, and RLS policy on `projects`,
   `payments`, `payment_milestones`, and `share_links`, for a human to scan.

**Run both. Every row in both files needs to say OK before this section can
be marked PASS.** This session cannot run either against the real database
itself — report back what came back MISSING, if anything, and I'll address
it; otherwise, once you confirm all-OK, this line moves from PENDING to
PASS.

---

## STEP 2 — Production Stripe Webhook

### 2.1 Events the code actually handles

Read directly from `app/work/api/payments/webhook/route.ts` — this is not a
list of what Stripe *could* send, it's the exact `switch` statement:

```
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
```

Anything else Stripe sends to this endpoint is acknowledged with `200` and
otherwise ignored (`default: return` in the switch) — deliberate, so an
event type this app doesn't act on doesn't trigger Stripe's retry logic
forever. **Register exactly these four events and no others** — sending
more costs nothing (they're no-ops here) but registering fewer means a real
completion or failure event never arrives.

### 2.2 Dashboard steps (Test Mode)

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/), confirm the
   **Test mode** toggle (top-right) is ON — the account behind
   `STRIPE_SECRET_KEY` in this project is already a test/sandbox account
   (`sk_test_...`), so this should be the default view.
2. **Developers → Webhooks → Add endpoint.**
3. **Endpoint URL:**
   ```
   https://work.centered101.com/work/api/payments/webhook
   ```
   Confirmed live on Vercel — `work.centered101.com` is an active domain on
   the `centered101` project, currently deployed. **Do not** use
   `https://work.centered101.com/api/payments/webhook` (missing the `/work`
   prefix) — on the work subdomain a bare `/api/*` deliberately passes
   through to the *main* site (`proxy.ts:155`, by design, so the two apps
   can share the domain) and returns 404. Stripe would show every delivery
   attempt failing with a 404 and no indication why.
4. **Events to send** → select exactly the four listed in §2.1 above (search
   "checkout.session" and check the four).
5. Click **Add endpoint**.
6. On the endpoint's detail page, find **Signing secret** → **Reveal** →
   copy the value starting `whsec_...`.

That secret is not pasted here, not shown to me, and not written to this
chat by design — it goes straight into your deploy host's environment
variables, per §3.

---

## STEP 3 — Vercel Environment Variables

`STRIPE_WEBHOOK_SECRET` needs to exist in **Production** only, on the
`centered101` Vercel project (`prj_97qmb5Dyv5bCbMUlAu5tAeqMoKz5`) — confirmed
linked via `.vercel/project.json`.

| Vercel environment | Needs `STRIPE_WEBHOOK_SECRET`? | Why |
| --- | --- | --- |
| **Production** | **Yes** — the value from §2.2 | This is the only environment Stripe's real webhook (registered against `work.centered101.com`) will ever call. |
| **Preview** | No, unless you also register a *second* Stripe webhook endpoint pointed at a preview URL (Vercel gives every PR/branch deploy its own throwaway URL, so a single static webhook endpoint can't target them all). Leave unset unless you specifically set that up. |
| **Development** | No — this is what your local `.env.local` is for, and it's already set there (the `stripe listen`-forwarded dev secret from the earlier session). Vercel's "Development" environment variable scope only matters if you run `vercel dev`; most local work here uses `.env.local` directly, which Vercel never reads. |

**A local `.env.local` value is never automatically available on Vercel.**
They are two separate stores — `.env.local` is a file in your working copy
(and is, correctly, git-ignored — never commit it), while Vercel's
environment variables live in that project's dashboard settings and are
injected only into the environment (Production/Preview/Development) they're
scoped to at build/runtime. Setting `STRIPE_WEBHOOK_SECRET` in
`.env.local` does nothing for the deployed site; it has to be set again,
separately, in Vercel.

**To set it** (once you have the value from §2.2):

- Vercel Dashboard → the `centered101` project → **Settings → Environment
  Variables** → **Add New** → Key `STRIPE_WEBHOOK_SECRET`, paste the value,
  check **only** the **Production** environment box, **Save**.
- Then **redeploy** production (or wait for the next push to `main`) —
  Vercel only injects environment variables into deployments created *after*
  the variable was added; an already-running production deployment doesn't
  pick up a newly added variable until it's rebuilt.

Never commit the secret to git, never put it in a file this repo tracks, and
never paste it into this chat — none of that was asked of you and none of it
is needed for any step here.

---

## STEP 4 — Production Webhook Test Procedure

Run this **after** §2 (endpoint registered) and §3 (secret set + redeployed)
are both done. All of it is Stripe **Test Mode** — no real money moves.

### Setup
- Stripe Dashboard → your new endpoint → this page lets you **Send test
  webhook** for a synthetic event, but the more convincing proof is a real
  end-to-end checkout, so use both:
  - The Dashboard's **Send test webhook** button for the signature/plumbing
    checks (tests 5–8 below, where a live checkout doesn't apply anyway).
  - A real Test Mode checkout (test card `4242 4242 4242 4242`, any future
    expiry/CVC; PromptPay's test flow shows a QR that Stripe's test mode
    lets you mark paid from its own test panel) through the actual app —
    log into the admin/portal on `work.centered101.com`, start a checkout
    against a real milestone, for tests 1–4.

### The 8 tests

| # | Test | How | Expected |
| --- | --- | --- | --- |
| 1 | Successful card payment | Real checkout, test card `4242...` | `checkout.session.completed` arrives with `payment_status: paid` → payment row → `PAID`, `paid_at` set, milestone settles if fully covered |
| 2 | PromptPay / async payment | Real checkout, PromptPay method, use Stripe's test-mode "mark as paid" panel for the QR | `checkout.session.completed` arrives FIRST with `payment_status: unpaid` — payment must stay `PROCESSING`, not `PAID`, at this point |
| 3 | `async_payment_succeeded` | Follows test 2 once the test-mode QR is marked paid | Payment flips to `PAID`, milestone settles, client's unlocked-resources set updates |
| 4 | `async_payment_failed` | Test-mode PromptPay flow, decline/expire instead of paying | Payment → `FAILED`, milestone stays unsettled |
| 5 | Invalid signature | Dashboard → endpoint → **Send test webhook**, or `curl` the endpoint directly with a bogus `stripe-signature` header | `400`, no payment row touched |
| 6 | Duplicate webhook | Stripe Dashboard → the delivered event → **Resend** | `200` with `"duplicate": true` in the response body, no change to `paid_at` |
| 7 | Replay | Same event resent a second time (or use `stripe events resend <id>` via CLI) | Same as #6 — idempotent no-op |
| 8 | Late failure after settlement | After test 1 or 3 has already settled a payment, resend or trigger an `async_payment_failed` for that same session | Payment **stays PAID** — a late failure must never un-pay a settled payment |

### The chain to verify at each step

```
Stripe event → webhook (signature verified) → payments row → milestone → unlock_rules → client's portal access
```

Concretely: after test 1 or 3, log in as the client the milestone belongs to
and confirm the previously-locked tab (preview/source-code/deployment,
whichever that milestone's `unlock_rules` names) now renders unlocked. That
is the actual proof the whole chain moved, not just the database row.

**The rule to hold the whole way through: nothing in the browser — not a
success page, not a "payment received" toast — is evidence a payment is
PAID. Only the arrival of a correctly-signed webhook event writes
`status = 'PAID'`.** If a client's UI ever shows "paid" before the webhook
has actually landed, that is a bug worth reporting immediately; it isn't
supposed to be possible given how `startMilestoneCheckout` and the webhook
route are written, but this is exactly the kind of thing a live test catches
that a code review doesn't.

---

## STEP 5 — Final Production Check

Only after §1 and §2/§3/§4 are all confirmed. Re-verify, live, against the
production database and the production URL — not a repeat of local/dev
testing, a fresh pass now that the two blockers are closed:

- [ ] Project create/edit
- [ ] Pricing (items, subtotal, discount, VAT, grand total)
- [ ] `total_amount` cannot be hand-set out of sync (re-run
      `verify-p1-migrations.sql`'s functional block, or repeat the manual
      hostile-write test from the audit)
- [ ] Payment plan — full payment
- [ ] Payment plan — deposit + remaining
- [ ] Payment plan — installments
- [ ] Stripe (§4, tests 1 and 5–8)
- [ ] PromptPay (§4, tests 2–4)
- [ ] Manual/bank-transfer payment, with `verified_by`/`notes` actually
      populated this time (only possible once migration 3 from §1 is live)
- [ ] Milestones settle correctly from all three payment paths
- [ ] Unlock rules gate correctly, checked at the actual page/route level on
      `work.centered101.com`, not just the query level
- [ ] Preview, deployment, and source-code tabs each show the locked state
      until their specific milestone is paid
- [ ] Source-code protection — direct URL / id-tampering attempts against
      production return the same 404s the local tests proved
- [ ] Client A / Client B isolation, against real production accounts
- [ ] Admin authorization — a client account cannot reach any `/admin/*`
      route on production

### Quality gates (repeat exactly, on the current code)

```bash
npx tsc --noEmit
npx eslint .
npm run build
```

Current state, from this session, unchanged since (no source file has
changed): **0 TypeScript errors, 0 ESLint errors (124 pre-existing
warnings, none in `/work`), build PASS (126/126 pages).** Re-run before
declaring production-ready if any code changes at all between now and then
— these three are cheap enough that "it passed last time" is never a
substitute for "it passes now."

---

## Summary — what moves this from PENDING to PASS

| Item | Current | Becomes PASS when |
| --- | --- | --- |
| Production migration | **PENDING** | `verify-work-schema.sql` and `verify-p1-migrations.sql` both come back all-OK against the real production database |
| Production Stripe webhook | **PENDING** | Endpoint registered at the correct `/work/...` URL with the 4 correct events, `STRIPE_WEBHOOK_SECRET` set on Vercel Production and redeployed, and the 8-test procedure in §4 passes against production |

**Do not proceed to DELIVERY / DEPLOYMENT / HANDOVER / MAINTENANCE, and do
not update this document's top block to `PASS`, until both rows above are
confirmed — by you, running the SQL and the webhook tests against the real
production environment, since this sandbox has no path to either.**
