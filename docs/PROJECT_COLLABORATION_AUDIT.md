# PROJECT COLLABORATION AUDIT — Centered101 Work

**Date:** 2026-09-02
**Scope:** self-serve project ownership, project_members (OWNER/MANAGER/MEMBER/VIEWER), project_invitations, the invite/accept/revoke flow, and everywhere payment/pricing authority intersects with project membership.
**Out of scope, unchanged:** Supabase Auth, the agency staff (`organization_members`) model, the existing client_owner/client_member roles' behavior, Stripe/PromptPay/manual payments, milestone settlement, unlock_rules. Every test below that touches these only *confirms* nothing regressed.

---

## Status

```
CODE:                PASS — 0 tsc errors, 0 eslint errors, build PASS (128/128 pages)
LOCAL DB TESTS:      PASS — 39/39 real-Postgres RLS assertions (PGlite, all 26 migrations applied)
LIVE SUPABASE TESTS: PENDING — the 3 new migrations are not yet on the real remote database
```

**This mirrors exactly the PRODUCTION MIGRATION / PRODUCTION STRIPE WEBHOOK
split already tracked in `docs/PRODUCTION_READINESS.md`.** The three new
migration files below join the same PENDING queue — nothing here can be
verified against the real Supabase project from this sandbox until they are
applied there, same limitation, same reason (no SQL-execution path to
production from here).

---

## 0. An architectural conflict, and how it was resolved

`projects.organization_id` and `projects.client_id` are `NOT NULL`, and
`clients` RLS gives a client user **no read access at all** ("Client users
get nothing here" — migration 0004's own comment). The whole schema assumes
one agency, N client companies it manages — a client self-registering a
project with no agency involvement doesn't fit that shape on its own.

**Resolved by:** self-serve projects still get a real `organization_id` and
`client_id` — resolved **server-side**, by `createOwnProject`
(`lib/work/services/projects.ts`), against the single organization this
deployment currently serves, and a `clients` row auto-provisioned (or
reused) for that individual. Neither value is ever accepted from the client.

**Flagged, not silently assumed:** if this platform ever serves more than
one agency organization, `createOwnProject`'s
`select id from organizations order by created_at limit 1` is the one line
that needs revisiting — everything else (RLS, the ownership model, the
invitation flow) does not care how many organizations exist.

---

## 1. Database — new objects

Three new migrations, applied in this order (enum values must land before
anything references them — Postgres rejects using a brand-new enum value in
the same transaction that added it):

| Migration | What it adds |
| --- | --- |
| `20260902085900_project_role_collaboration_values.sql` | Four new `project_role` enum values: `OWNER`, `MANAGER`, `MEMBER`, `VIEWER` — additive, disjoint (uppercase) from the existing `client_owner`/`client_member`/`developer`. Nothing else changes. |
| `20260902090000_project_collaboration.sql` | `projects.owner_id` (nullable FK to `profiles`); `project_members.status`/`invited_by`; a partial unique index enforcing at most one ACTIVE `OWNER` per project; `app.is_project_owner()`; a trigger keeping `project_members`'s `OWNER` row in sync with `projects.owner_id`; a guard trigger stopping a self-serve owner from reassigning `organization_id`/`client_id`/`owner_id` through their own UPDATE policy; new RLS on `projects` (self-serve UPDATE), `project_members` (OWNER-scoped insert/update/delete), and `project_pricing_items` (OWNER-scoped insert/update/delete). |
| `20260902090100_project_invitations.sql` | The `project_invitations` table (email, role, `token_hash`, `expires_at`, status lifecycle PENDING→ACCEPTED/EXPIRED/REVOKED) and its RLS. |

All three are additive. None drops a table, removes a column, or narrows an
existing grant — verified by re-running `npm run work:db:validate` (the
full 26-migration fresh-apply harness) after each: **102/102**, including
every pre-existing assertion this feature did not touch.

**A note on the repo's own tooling, corrected during this work:** `npm run
work:db:bundle` (no `--out`) only prints a paste-ready bundle to stdout — it
does **not** regenerate `supabase/work/schema.sql`. That file (which
`work:db:validate` and this audit's own RLS tests apply) is written by `npm
run work:db:snapshot`. Running `work:db:bundle` after adding a migration and
assuming `schema.sql` had picked it up would have silently tested a stale
schema — caught here because the first local test run failed with "column
projects.owner_id does not exist" despite the migration file being correct.
**Always run `work:db:snapshot` after adding or editing a migration, not
`work:db:bundle`.**

---

## 2. Live RLS verification — real Postgres, not mocked

Ran against PGlite (a real embedded Postgres, the same engine
`work:db:validate` trusts) with every one of the 26 migration files applied
in order, then exercised as actual impersonated users via `set local
app.test_user_id` — the identical technique `work:db:validate` itself uses.
This is genuine RLS enforcement, not application-code simulation.

**39/39 passed.** One test initially failed — traced to the test itself
(a pricing-item insert wrapped in a rolling-back transaction, so a later
assertion checked a `total_amount` that had never actually been derived
from anything); fixed the test, re-ran clean. Noted here rather than
silently discarded, matching this project's standing practice.

| # | Test | Result |
| --- | --- | --- |
| 1 | Creating a project with `owner_id` set auto-creates the `OWNER` `project_members` row | PASS |
| 2 | The owner can read their own project; a stranger cannot | PASS / PASS |
| 3 | A client cannot `INSERT` into `projects` directly (no client-reachable INSERT policy — self-serve creation only via the server action) | PASS |
| 4 | A project cannot have two ACTIVE owners (partial unique index) | PASS |
| 5 | A user cannot add themselves to another project | PASS |
| 6 | The OWNER can add a MEMBER | PASS |
| 7 | A member cannot change their own role to OWNER | PASS |
| 8 | The owner cannot promote another member to OWNER either | PASS |
| 9 | A plain MEMBER cannot add other members | PASS |
| 10 | The OWNER can create an invitation | PASS |
| 11 | An invitation can never offer the OWNER role (CHECK + RLS) | PASS |
| 12 | Unauthorized invitation creation is refused | PASS |
| 13 | An invitation is invisible to anyone but the invited email | PASS |
| 14 | The invited email CAN see their own invitation | PASS |
| 15 | Accepting an invitation for another email is impossible | PASS |
| 16 | The rightful invitee CAN accept | PASS |
| 17 | An already-accepted invitation cannot be reused | PASS |
| 18 | An invitation cannot be created already expired (CHECK) | PASS |
| 19 | Only the owner/manager can revoke; a stranger cannot | PASS |
| 20 | The owner CAN revoke | PASS |
| 21 | The owner cannot abuse the revoke policy's WITH CHECK to fake-accept someone else's invitation (see §3 below) | PASS |
| 22 | The self-serve OWNER cannot create a fake PAID payment | PASS |
| 23 | The self-serve OWNER cannot settle a milestone | PASS |
| 24 | The self-serve OWNER cannot create a payment plan | PASS |
| 25 | A plain MEMBER cannot manage pricing | PASS |
| 26 | The self-serve OWNER CAN manage pricing, and `total_amount` derives from it | PASS |
| 27 | The `total_amount` integrity guard (migration 0023) still holds for a self-serve project — a hostile direct write by the owner is overwritten back to the derived value | PASS |
| 28–31 | Client A ↔ Project A/B, Client B ↔ Project A/B — the full 2×2 isolation matrix | PASS ×4 |
| 32–35 | B cannot see A's pricing items / payments / milestones / members | PASS ×4 |
| 36 | Changing the `project_id` in a write still hits RLS — no bypass by tampering | PASS |
| 37 | Agency staff retain full, unchanged access to a self-serve project | PASS |
| 38 | Agency staff can still manage members via the pre-existing staff policy | PASS |
| 39 | (setup/consistency assertion folded into the above) | PASS |

### §3 — a real RLS design pitfall caught and fixed before it shipped

`project_invitations` needs two different UPDATE policies (accept — the
invited user flips PENDING→ACCEPTED; revoke — the owner flips
PENDING→REVOKED). Postgres **OR-combines every permissive policy's `WITH
CHECK`** for the same command. An early draft's revoke policy only required
`is_project_owner` with no status restriction — combined with the accept
policy's `WITH CHECK`, that would have let an owner set `status = 'ACCEPTED'`
and `accepted_by` to themselves on **anyone's** invitation, by going through
the *revoke* policy's permissive slot. Fixed by requiring the revoke
policy's `WITH CHECK` to specifically demand `status = 'REVOKED'`, closing
the combination. Test #21 above is this exact scenario, still passing.

---

## 3. Permissions — what changed in `permissions.ts`

`ProjectAccess` gained three fields: `canManagePricing`, `canManageMembers`,
`isProjectOwner`. Two new guards: `requireProjectPricing`,
`requireProjectMembers`.

**The one line that must never change, and didn't:** `canManageFinance` is
still hardcoded `false` for every non-staff role, unconditionally — payment
authority never comes from project membership alone. `lib/work/services/
payment-plans.ts` and `lib/work/services/payments.ts` still call
`requireProjectFinance` exclusively and were not touched. Only `lib/work/
services/pricing.ts`'s four actions moved from `requireProjectFinance` to
the new, narrower `requireProjectPricing` — which admits staff finance
(unchanged) **or** a self-serve project's OWNER (the one deliberate
widening this feature makes, matching the brief's own split between "OWNER:
manage pricing" §5 and "only explicitly authorized finance/admin roles may
create manual payments... clients must never mark payments PAID" §6).

| Role | `canManage` | `canManageFinance` | `canManagePricing` | `canManageMembers` |
| --- | --- | --- | --- | --- |
| Staff (`project:write`/`finance:write`) | as before | as before | = `canManageFinance` | = `canManage` |
| `client_owner` / `client_member` | `false` (unchanged) | `false` (unchanged) | `false` | `false` |
| `OWNER` | `true` | **`false`** | `true` | `true` |
| `MANAGER` | `true` | `false` | `false` | `false` |
| `MEMBER` / `VIEWER` | `false` | `false` | `false` | `false` |

---

## 4. Frontend

Built:
- **My Projects** (`/portal/projects`) — a card grid (`MyProjectsGrid`),
  each card showing name, status, owner, member count, progress, payment
  status — matching the brief's mockup — plus a "+ สร้างโปรเจกต์" button.
  Uses a NEW query (`getMyProjectsWithCollaboration`), kept separate from
  `getProjects()`/`ProjectsTable` (shared with the admin side, which has no
  self-serve-owner concept) rather than widening a shared type.
- **Create project** (`/portal/projects/new`) — minimal form (name,
  type, description). No organization/client/owner field anywhere in it.
- **Members** tab (`/portal/projects/[id]/members`) — member list +, for
  whoever holds `canManageMembers`, an invite form, role-change selects, and
  remove/revoke buttons. Everyone else sees the list and nothing they could
  act on (RLS would refuse the write regardless; this is the UX-level
  version of the same rule).
- **Invitations inbox** (`/portal/invitations`) — every PENDING invitation
  addressed to the signed-in user's own verified email, with an Accept
  button.
- **Direct-link accept** (`/portal/invitations/[token]`) — the flow for
  someone following the one-time URL `inviteMember` hands back.

**Simplification, stated plainly:** the brief allows "MANAGER manage members
if permitted", with no permission-delegation mechanism defined anywhere in
the schema. Rather than invent one, member/invitation management is
**OWNER-only** for this phase — a MANAGER can read membership (unchanged,
role-blind `project_members_select_project`) but cannot add, remove, or
invite. This is enforced at the RLS layer, not just hidden in the UI.

**Not built this phase:** an "Archive project" (the brief's "OWNER: delete
project", implemented server-side as `archiveOwnProject` — see §5 — the
same archive-not-delete substitution the existing staff `ArchiveForm`
already makes) button is not yet wired into the project detail page's UI.
The action exists and is reachable, just not from a visible control yet.
Ownership transfer is not implemented at all — a self-serve owner cannot
currently hand off or leave their own project; this needs a more deliberate
flow than "change a role" and was out of scope for this pass.

---

## 5. Section-by-section

| Item | Status |
| --- | --- |
| Project Creation | **PASS** (local) — self-serve creation via server action, `owner_id` always from the session, never trusted from `formData` |
| Ownership | **PASS** (local) — one ACTIVE owner per project, enforced by a partial unique index + a sync trigger, not application discipline alone |
| Members | **PASS** (local) — `project_members` extended additively; existing `client_owner`/`client_member`/`developer` rows and behavior untouched |
| Invitations | **PASS** (local) — token security follows the audited `share_links` pattern (random 256-bit token, only its SHA-256 hash stored); every named abuse (wrong email, reuse, expired, revoked, unauthorized creation) is blocked at the RLS layer, proven live |
| Roles | **PASS** (local) — permission matrix in §3; OWNER cannot be granted or self-granted outside the sync trigger |
| RLS | **PASS** (local) — 39/39, including the Client A/B 2×2 matrix and the OR-combination pitfall in §2 |
| Client Isolation | **PASS** (local) — identical shape to every other isolation test this codebase has run all conversation: 0 rows visible across projects, pricing, payments, milestones, members |
| Payment Security | **PASS** (local) — `canManageFinance` unconditionally false for every client-side role; self-serve OWNER proven unable to fake a payment, settle a milestone, or create a payment plan |
| Pricing Security | **PASS** (local) — the one deliberate widening (OWNER only) proven to work, and proven NOT to extend to MANAGER/MEMBER/VIEWER; `total_amount` integrity guard (P1-2, migration 0023) proven to still hold against a self-serve owner's own hostile write |
| Admin Separation | **PASS** (local) — staff access to a self-serve project, and staff's own member-management policy, both proven unchanged |
| Frontend | **PARTIAL** — core flows built (§4); archive-project UI and ownership transfer not built this phase, stated above rather than left silent |
| Tests | **PASS (local) / PENDING (live remote)** — 39/39 real-Postgres RLS assertions; cannot be re-run as genuine Supabase-session tests until the 3 migrations above are applied to production, same limitation as the P1 items in `docs/PRODUCTION_READINESS.md` |

**Real tests: 39/39.** **Mocked: 0.** **Unverified (live-remote only): the
entire feature**, until the migrations are applied — tracked as PENDING
above, not claimed as PASS.

## Recommendation

Do not consider this feature production-ready until:
- [x] Three new migrations written, and locally validated (`work:db:validate` 102/102)
- [x] 39/39 real-Postgres RLS assertions pass, including the specific abuse scenarios named in the brief
- [x] `npx tsc --noEmit`, `npx eslint .`, `npm run build` all clean
- [ ] The three migrations are applied to the real production database (join the existing PENDING queue in `docs/PRODUCTION_READINESS.md`)
- [ ] The same 39 scenarios (or a live-session equivalent) are re-run against production after that
- [ ] A person clicks through Create Project → Invite → Accept → Members once in a real browser against production, the one thing no automated test here substitutes for
