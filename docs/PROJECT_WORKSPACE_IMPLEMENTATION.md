# PROJECT WORKSPACE IMPLEMENTATION — Centered101 Work

**Date:** 2026-09-02
**Status: PLAN ONLY. Nothing in this document has been coded yet** — per
the explicit instruction, this is presented before Phase 1 begins.
Companion to `docs/PROJECT_WORKSPACE_ARCHITECTURE.md`, which this document
assumes.

---

## How to read this

For each of the brief's 20 numbered feature sections: **Completed** (exists
today, reused as-is), **In Progress** (exists partially — a table/RLS/query
exists but the UI doesn't, or vice versa), **Pending** (planned, not
started, no blocker), **Blocked** (needs a decision or a production
migration first). Nothing here is claimed Completed on the strength of
"the general capability exists somewhere" — it means the specific thing
asked for is reachable today.

---

## Section-by-section status

| § | Feature | Status | Detail |
| --- | --- | --- | --- |
| 1 | Multi-project workspace / My Projects cards | **Completed** | `MyProjectsGrid` now shows name/status/owner/members/progress/payment AND milestone-fraction ("ชำระแล้ว 2/3 งวด") — Phase 1, done. The card itself is the click target rather than a separate `[Open Project]` button; functionally equivalent, kept as a deliberate minor cosmetic difference from the brief's mockup. |
| 2 | Project switcher | **Completed** | `ProjectSwitcher` — Phase 1, done. Sidebar-resident, always visible on the portal side, active project derived from the URL. |
| 3 | Project workspace navigation | **In Progress** | `portalProjectTabs` now lists 11 tabs (added Pricing, Milestones this phase); still missing Delivery, Activity, Settings as their own routes — Phase 3/5/7. |
| 4 | Project overview dashboard | **In Progress** | The current `/portal/projects/[id]` page already shows most fields (status, progress, payment summary via `getProjectPaymentSummary`, members via `ProjectPeople`) but not laid out as the brief's dashboard-with-quick-actions. Phase 3. |
| 5 | Create Project Wizard (10 steps) | **Pending** | Current creation is one form (`OwnProjectForm`) for Step 1 only. Steps 2–10 need building; every step's SUBMIT reuses an existing action (see Architecture doc §3, "Wizard draft persistence"). No new server logic for pricing/payment-plan/team steps — only new UI wrapping existing actions, plus the two schema additions (`requirements` jsonb, document categories) for Steps 2/8. Phase 2. |
| 6 | Project creation states | **In Progress** | Enum reconciliation planned (Architecture doc §4) — 3 additive values (`PLANNING`, `QUOTED`, `DELIVERED`), everything else mapped to existing values, `ARCHIVED` stays `archived_at`. Phase 2. |
| 7 | Edit project / Settings | **Pending** | `updateProject` (staff) exists; a self-serve equivalent (`updateOwnProject`, OWNER/MANAGER, non-financial fields only) does not exist yet. Phase 3. |
| 8 | Work / Preview page | **Completed** | `/portal/projects/[id]/preview` exists, gated by `isResourceUnlocked(id, 'preview')` (verified live in the business-flow audit). Only gap: no "version"/"screenshots" fields on `project_deployments` — `version` already exists as a column; screenshots do not. Minor, Phase 3 if wanted. |
| 9 | Pricing page | **Completed** | `/portal/projects/[id]/pricing` — Phase 1, done. `canManageFinance={access.canManagePricing}` fixed on the overview page in the same pass (was stale `false`, hardcoded before self-serve OWNER pricing existed). |
| 10 | Payments page | **Completed** | `/portal/projects/[id]/payments` exists — Stripe, PromptPay, manual all live and audited (`docs/BUSINESS_FLOW_AUDIT.md`, `docs/REAL_DATABASE_VERIFICATION.md`). No changes needed. |
| 11 | Milestones page | **Completed** | `/portal/projects/[id]/milestones` — Phase 1, done. Added `unlockRules` to `MilestoneListItem` (was not exposed before) so the tab can show "ปลดล็อกเมื่อชำระ" per milestone, per the brief's explicit ask. |
| 12 | Documents page | **In Progress** | `/portal/projects/[id]/documents` exists. Category set needs extending (Architecture doc §3) for Requirements/Design/Technical/Meeting Notes/Delivery Document; `version`/`visibility` columns are new. Phase 5. |
| 13 | Publishing / Deployment page | **Completed** (rename only) | `/portal/projects/[id]/deployment` already shows environment/status/URL/version/deployed-at, unlock-gated. "Publishing" is the brief's name for the same thing — UI copy change only, Phase 1. |
| 14 | Source Code page | **Completed** | `/portal/projects/[id]/source-code` exists, unlock-gated, proven un-bypassable by direct URL/id-tampering in the business-flow audit (14/14 bypass attempts refused). No changes needed. |
| 15 | Delivery / Handover | **Blocked** | No table exists for a checklist or an acceptance record. Needs `delivery_checklists` (or equivalent) — schema decision to make in Phase 7, see Architecture doc §3. Blocked on: deciding one-row-with-jsonb vs one-row-per-item (tradeoff noted below). |
| 16 | Maintenance page | **In Progress** | `maintenance_plans` + `/portal/projects/[id]/maintenance` exist for the PLAN half. The REQUEST half (open/completed request counts) needs a new `maintenance_requests` table. Phase 8. |
| 17 | Change Requests | **Completed** (pricing isolation already correct) | `/portal/projects/[id]/change-requests` exists; `change_requests.estimated_amount` is already isolated from `project_pricing_items` (Architecture doc §5 — verified, not a gap). Optional future: attachments (reuse `documents` with a nullable `change_request_id`), not blocking. |
| 18 | Members | **Completed** | Built and audited this session (`docs/PROJECT_COLLABORATION_AUDIT.md`) — invite/accept/revoke/role-change/remove, all RLS-enforced, 39/39 real-Postgres assertions. No changes needed. |
| 19 | Activity | **In Progress** | `activity_logs` + `getActivity({projectId})` already exist, already fed by nearly every service action. Needs only a route (`/activity`) rendering the existing `Timeline` component. Phase 5. |
| 20 | Project Settings | **Pending** | New route combining: general-info edit (new `updateOwnProject`), Members (link to existing tab), Danger Zone (wire the ALREADY-EXISTING but unused-in-UI `archiveOwnProject` action). "Billing"/"Notifications"/"Integrations" sub-sections are not asked for elsewhere in this codebase and are the least-specified part of the brief — recommend deferring until a concrete need is named, rather than building empty placeholder pages. Phase 3 (General + Danger Zone only). |
| 21 | Admin global view | **Completed** | `/admin/dashboard`, `/admin/projects`, `/admin/payments`, `/admin/milestones`, `/admin/deployments`, `/admin/maintenance`, `/admin/change-requests` already give staff the cross-project view the brief asks for, entirely through the existing `requireAdmin`/`requireCapability` guards — never through project membership. No changes needed. |
| 22 | Client view ("My Work") | **Completed** | The switcher + card grid (§1/§2) give the portal a persistent "my projects, my workspace" frame rather than a single flat list — Phase 1, done. |
| 23 | Security / IDOR | **Completed** (for everything that exists today) | Re-verified, not re-litigated (Architecture doc §7). Anything newly built in Phases 5–8 gets the same class of test before being marked Completed here — see Testing Plan below. |
| 24 | Database design | **This document** | — |
| 25 | UX / design system | **Ongoing constraint** | Every new page in every phase reuses `Panel`/`PageHeading`/`Status`/`StatCard`/`ProgressBar`/`Timeline`/the existing `work.css` tokens — no new UI library, matching this session's `MyProjectsGrid`/`MembersPanel` precedent. |
| 26 | Implementation strategy | **This document** | — |
| 27 | Testing | See Testing Plan below | — |
| 28 | Final documentation | **Completed** | This document + the Architecture doc. |

---

## Phased plan

Matches the brief's own §26 phase list, re-ordered slightly so nothing in a
later phase blocks on a decision not yet made in an earlier one.

### Phase 1 — Multi-project dashboard + project switcher + tab reorganization — **DONE**
- Sidebar project switcher (`components/work/layout/project-switcher.tsx`) — "My Projects" header, every reachable project (`getMyProjectSwitcherList()`, a new lightweight id+name-only query kept separate from the full `getMyProjectsWithCollaboration()` since the switcher renders on every portal navigation), active project highlighted from the URL, "+ Create Project" at the foot. Wired through `Sidebar` → `AppShell` → the portal layout — portal only, `projects` prop simply absent on the admin side.
- New routes: `/portal/projects/[id]/pricing` (reuses `PricingPanel` verbatim) and `/portal/projects/[id]/milestones` (reuses `getProjectPaymentSummary().milestones`, presented in the same table style as the Payments tab's own milestone list, plus a new "unlocks" column).
- `portalProjectTabs` reordered to match the brief's own tree (Overview, Pricing, Payment, Milestones, Preview, Documents, ...). **No label rename needed for Publishing** — the existing Thai label "การเผยแพร่" already means "publishing/distribution"; the brief's "Deployment→Publishing" concern was about English naming in the brief text, not a mismatch in the actual UI copy.
- `MyProjectsGrid` now shows "ชำระแล้ว N/M งวด" (milestones paid/total), fed by a new batched `getMilestoneCounts()` query (same shape as the existing `paidByProject`/`getMemberCounts` batching pattern).
- **Fixed along the way, not introduced by this phase:** the portal overview page's `PricingPanel` was hardcoded `canManageFinance={false}` — stale since the collaboration work added `access.canManagePricing`. Now passes it through, so a self-serve project's OWNER can actually use the pricing-edit capability RLS already grants them, on both the overview page and the new dedicated Pricing tab.
- **No new migration.** Verified: `npx tsc --noEmit` 0 errors, `npx eslint .` 0 errors, `npm run build` PASS (128/128 pages, both new routes registered as dynamic — same as every other per-project tab).

### Phase 2 — Project creation wizard
- New multi-step client component wrapping Steps 1–10.
- New migration: `projects.requirements jsonb`, `PLANNING`/`QUOTED`/`DELIVERED` enum values (additive, own file per the ALTER-TYPE-enum-value rule already established).
- Draft persistence: the wizard's Step 1 submit IS `createOwnProject` (or a new thin variant that also accepts `requirements`) — the row exists as `DRAFT` from that point on; "Save Draft" is just "stop here, come back to `/portal/projects/[id]/edit-wizard` later."
- Steps 3/6/7/9 call existing actions: `project_features` writes (existing pattern from admin), `addPricingItem` × N, `createPaymentPlan`, maintenance-plan creation (existing table, no service yet — small addition).
- Step 5 (Team) calls the existing `inviteMember` × N.
- Step 10 (Review) is read-only, no new writes.

### Phase 3 — Project editing + overview
- New `updateOwnProject` service action (OWNER/MANAGER, `requireProjectManage`-equivalent already exists as `access.canManage` on the self-serve path — just needs a schema-appropriate action, mirroring `updateProject` but scoped).
- Rebuilt overview page: quick actions, recent activity strip (reuses `getActivity({projectId, limit: 5})`), current/next milestone (reuses `getProjectPaymentSummary().nextDue`).
- Settings page: General (name/description/type via `updateOwnProject`) + Danger Zone (wire existing `archiveOwnProject`).
- **No new migration** (uses Phase 2's `requirements` column if editing it is wanted here too).

### Phase 4 — Members + invitations
**Already done** — `docs/PROJECT_COLLABORATION_AUDIT.md`. Nothing to do this phase; kept in the list only to match the brief's own numbering.

### Phase 5 — Documents + activity
- New migration: `document_type` additive values (`REQUIREMENTS`, `DESIGN`, `TECHNICAL`, `MEETING_NOTES`, `DELIVERY_DOCUMENT`), `documents.version int default 1`, `documents.visibility` (new enum `CLIENT`/`INTERNAL`) + one new RLS predicate change: the client SELECT policy on `documents` needs `visibility = 'CLIENT'` added to its condition (this is the one place this whole plan touches an EXISTING policy rather than only adding new ones — called out explicitly here, not buried, per the standing "do not weaken existing RLS" rule: it is a narrowing for clients, only on rows explicitly marked `INTERNAL`, and staff access is unaffected).
- New route: `/portal/projects/[id]/activity`.

### Phase 6 — Change Requests
**Already functionally complete** (§17 above). This phase is limited to: optional attachment support (`documents.change_request_id`, nullable FK, additive) if wanted — otherwise skip.

### Phase 7 — Delivery + handover
- New migration: `delivery_checklists`. Schema decision to make before writing it:
  - **Option A** — one row per project, `items jsonb` array of `{key, label, done, done_at, done_by}`. Simpler, matches `maintenance_plans.services`'s existing jsonb-array precedent in this schema. Downside: per-item RLS/audit is coarser (the whole row is one write).
  - **Option B** — one row per checklist item (`project_id, key, label, done_at, done_by`). Matches the fine-grained-row pattern the rest of this schema strongly prefers (pricing items, scope features, milestones are all one-row-per-item). Recommended, for consistency with everything else in this database.
- `projects.delivery_accepted_at` / `delivery_accepted_by` (nullable), written only by a new `acceptDelivery` action (client-facing, requires every checklist item done — server-checked, not trusted from the browser) that also transitions `status → DELIVERED`.
- A `requestCorrection` action (client-facing, writes an `activity_logs` entry and reopens the relevant checklist item — reuses existing audit infrastructure, no new table for this half).

### Phase 8 — Maintenance
- New migration: `maintenance_requests` (project_id, plan_id nullable, title, description, status, requested_by, resolved_at) + RLS mirroring `change_requests`'s existing shape closely (same read/write split: client reads+creates, staff manages status).
- New route surfacing open/completed counts on the existing Maintenance page.

---

## Testing plan (every phase)

Per the brief's own §27, repeated per phase, not only at the end:

```bash
npx tsc --noEmit
npx eslint .
npm run build
```

Plus, for any phase touching RLS or a new table (2, 5, 7, 8): a real-Postgres
RLS test (PGlite, the same technique used for `docs/PROJECT_COLLABORATION_AUDIT.md`'s
39 assertions), covering at minimum:

- Client A → Project A = ALLOW, Client A → Project B = DENY, and the mirror for Client B (the standing 2×2 matrix this whole conversation has re-run for every new table).
- Every new table's RLS specifically: can a MEMBER (not OWNER) write to it when they shouldn't; can a stranger read it at all; does the new resource respect `unlock_rules` where relevant (delivery/source-code-adjacent items).
- Project ID / member ID / payment ID / milestone ID / document ID / deployment ID tampering — repeating the same class of test already passed 14/14 in the business-flow audit, for any new route.
- `npm run work:db:snapshot` (not `work:db:bundle` — see the correction noted in `docs/PROJECT_COLLABORATION_AUDIT.md` §1) followed by `npm run work:db:validate`, expecting the existing count plus however many new assertions the new tables' FK-index/RLS-completeness checks add, **0 failed**.

**Production migration status carries forward unchanged**: any new
migration from Phases 2/5/7/8 joins the same PENDING queue already tracked
in `docs/PRODUCTION_READINESS.md` and `docs/PROJECT_COLLABORATION_AUDIT.md`
— this sandbox has no path to apply DDL to the real database, and nothing
in this plan changes that. Each phase's own tests run locally
(PGlite/pglite-validated) until a person with real credentials applies the
accumulated migrations, at which point a live-remote pass repeats the same
assertions against production before that phase is marked Completed here.

---

## What this plan deliberately does NOT do

- Does not rename or touch any already-audited payment/pricing/unlock RLS policy (the one narrowing in Phase 5, on `documents`, is the sole exception, called out explicitly there).
- Does not rewrite `payment_plans`/`payment_milestones`/`payments`/webhook logic — Milestones and Payments pages are presentation only, reusing existing queries verbatim.
- Does not introduce a new UI library — every new component reuses `Panel`/`Status`/`StatCard`/`ProgressBar`/`Timeline`/`work.css` tokens, the `MyProjectsGrid`/`MembersPanel` precedent from this session.
- Does not begin coding. This document and its Architecture companion are
  the deliverable for this request.
