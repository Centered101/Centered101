# PROJECT WORKSPACE ARCHITECTURE — Centered101 Work

**Date:** 2026-09-02
**Status: AUDIT + PLAN ONLY. No code was written for this task.** Per the
explicit instruction this document was produced against, coding starts only
after this audit and `docs/PROJECT_WORKSPACE_IMPLEMENTATION.md` are
reviewed.

---

## 0. Headline finding

**Most of the requested workspace already exists.** Across the prior
sessions in this conversation, the schema, RLS, server actions, and most of
the per-tab pages for a project workspace were already built one phase at a
time (pricing, payment plans, milestones, unlock rules, documents,
deployments, maintenance plans, change requests, share links, and — most
recently — self-serve ownership, roles, and invitations). This request is
**not a rewrite**; it's (a) surfacing what exists behind a proper
multi-project shell (a switcher, dedicated tabs instead of everything
crammed onto one overview page), (b) a handful of genuinely new tables for
the parts that were never built (delivery/handover, maintenance *requests*
as opposed to maintenance *plans*), and (c) a guided creation wizard in
front of server actions that already exist and don't need to change.

**Reuse-first inventory below.** Section 8's phase plan cites this section
by name — nothing in it should be duplicated.

---

## 1. Existing schema — reuse map

| Domain | Table(s) | Reuse as-is for |
| --- | --- | --- |
| Identity | `profiles`, `organizations`, `organization_members` | Auth, staff roles — untouched |
| Client company | `clients` | Agency-managed client records |
| Project core | `projects` | Overview, Settings (general fields), lifecycle status |
| Membership | `project_members` (client_owner/client_member/developer **+** OWNER/MANAGER/MEMBER/VIEWER, migration 0025a/b) | Members tab, project switcher's project list, all RLS |
| Invitations | `project_invitations` (migration 0026) | Members tab's invite/accept/revoke |
| Scope/requirements | `project_scopes`, `project_features` | Wizard Step 3 (Scope) — already exactly this shape: versioned scope with checkbox items, `is_included` |
| Pricing | `project_pricing_items`, `project_pricing_totals` (view) | Wizard Step 6, Pricing tab — VAT-aware, `total_amount`-deriving, already includes the P1-2 integrity guard |
| Agreements | `agreements`, `agreement_versions`, `agreement_acceptances` | Quotation send/accept flow already built (§20's "Billing" overlaps this) |
| Payment plan | `payment_plans`, `payment_milestones` | Wizard Step 7, Milestones tab — FULL/DEPOSIT_FINAL/INSTALLMENT already implemented with the deferred-trigger sum invariant |
| Payments | `payments`, `payment_provider_events` | Payments tab — Stripe/PromptPay/manual, webhook-only PAID |
| Documents | `documents` | Documents tab — storage-backed, signed-URL download |
| Deployments | `project_deployments` | Publishing tab (§13) — this **is** "Publishing", same table, needs a rename in UI copy only, not schema |
| Maintenance | `maintenance_plans` | Maintenance tab's **plan** half (§16) — the **request** half is new, see §3 |
| Change requests | `change_requests` | Change Requests tab — already carries its own `estimated_amount`, separate from `project_pricing_items` (see §3, "change-request pricing isolation" is already satisfied) |
| Share links | `share_links` | Preview's external-share button, unrelated to this task but sits on the same Preview tab |
| Activity | `activity_logs` | Activity tab (§19) — already generic (`action`, `entity_type`, `entity_id`, `metadata`), already project-scopable (`getActivity({projectId})`), already written to by nearly every service action in the codebase |

**Nothing above needs a new table.** Every one of these already has RLS,
already has at least a read query, and most already have a write path.

---

## 2. Existing RLS predicates and server-side guards — reuse map

### SQL (in `app` schema, SECURITY DEFINER, not PostgREST-reachable)
`app.can_read_project`, `app.can_manage_project`,
`app.can_manage_project_finance`, `app.is_project_client`,
`app.is_project_owner` (0025b), `app.org_ids`, `app.has_org_role`,
`app.is_org_manager`.

### TypeScript (`lib/work/auth/permissions.ts`)
`requireAdmin`, `requireCapability`, `requireClient`, `requireProjectAccess`
(returns `canManage` / `canManageFinance` / `canManagePricing` /
`canManageMembers` / `isProjectOwner`), `requireProjectManage`,
`requireProjectFinance` (payments/plans — staff only, untouched),
`requireProjectPricing` (pricing — staff OR self-serve OWNER, migration
0025's one deliberate widening), `requireProjectMembers`.

**The permission matrix this workspace needs is already fully expressed** —
Settings' "Danger Zone: Archive/Delete" maps directly to `isProjectOwner` (or
staff `isOrgManager` for a real delete); "Financial fields must use
existing secure pricing/payment logic" (§7) maps directly to
`requireProjectFinance`/`requireProjectPricing` staying exactly as they are.

---

## 3. Genuinely new — what does not exist yet

| Gap | Recommendation | Why new, not reused |
| --- | --- | --- |
| **Delivery / Handover checklist** (§15) | New table `delivery_checklists` (one row per project, jsonb array of `{key, label, done, done_at, done_by}` items, or one row per item — see Implementation doc §Phase 7 for the two options weighed) + `delivery_accepted_at`/`delivery_accepted_by` on `projects`, or a small `project_deliveries` table if acceptance needs its own audit trail beyond `activity_logs` | Nothing in the schema tracks a checklist today; `project_status` has `READY_FOR_HANDOVER`/`DEPLOYED`/`COMPLETED` but no per-item tracking |
| **Maintenance requests** (as distinct from a maintenance **plan**) | New table `maintenance_requests` (project_id, plan_id, title, description, status OPEN/IN_PROGRESS/RESOLVED, requested_by, resolved_at) | `maintenance_plans.services` is a fixed jsonb array describing what the PLAN covers, not a log of individual requests raised against it — same distinction as `payment_plans` vs `payments` |
| **Document categories matching §12** | Additive `document_type` enum values: `REQUIREMENTS`, `DESIGN`, `TECHNICAL`, `MEETING_NOTES`, `DELIVERY_DOCUMENT` (existing: QUOTATION/INVOICE/RECEIPT/TAX_INVOICE/AGREEMENT/CREDIT_NOTE/DEBIT_NOTE/OTHER already cover Quotation/Invoice/Receipt/Contract/Other) | Same `ALTER TYPE ... ADD VALUE` pattern already used for `project_role` (0025a) |
| **Document version + visibility** | Additive columns: `documents.version int not null default 1`, `documents.visibility document_visibility` (new enum `CLIENT`/`INTERNAL`) | Not present today; every document is implicitly client-visible once `status = 'ISSUED'`/`'SENT'` — an internal-only category (e.g. a technical doc staff aren't ready to share) has no way to exist currently |
| **Wizard requirements capture** (Step 2) | Additive `projects.requirements jsonb not null default '{}'::jsonb` — free-form structured answers (target audience, goals, tech preferences, reference links, brand colors, etc.); file uploads for this step reuse `documents` with the new `REQUIREMENTS` category | No structured home for this today; `project_scopes.summary` is free text but is specifically the SCOPE (Step 3), not the intake questionnaire |
| **Wizard draft persistence** (§5, "Save Draft") | Recommend: the draft **is** a real `projects` row with `status = 'DRAFT'`, created at the end of Step 1 (mirrors `createOwnProject` almost exactly) and updated in place as later steps complete — no new table. Steps 2–10 become `updateProject`/`addPricingItem`/`createPaymentPlan`/`inviteMember` calls against that row's id, not a separate draft object that gets migrated into a real project at the end. | Avoids a second "draft project" shape that would need its own migration path into the real one; `DRAFT` already exists as a status specifically for this |
| **Project switcher UI** | No schema change — a new sidebar component reading `getMyProjectsWithCollaboration()` (already exists), plus a `currentProjectId` derived from the URL segment (already how every project page resolves the active project) | Pure frontend; the codebase's own sidebar comment already flags this as a known, deliberately-deferred gap |

**Everything else asked for in the brief already has a table, a query, an
RLS policy, and (for at least the read side) a page.** The Implementation
doc's phase table marks each one precisely.

---

## 4. Project status — reconciling two vocabularies

The brief's §6 lists: `DRAFT, PLANNING, QUOTED, AWAITING_DEPOSIT,
IN_PROGRESS, IN_REVIEW, READY_FOR_DELIVERY, DELIVERED, MAINTENANCE,
COMPLETED, ARCHIVED`.

The existing `project_status` enum (already live, already used everywhere —
UI labels, tone functions, dashboard filters, RLS-adjacent logic in
`app.can_manage_project`) has **18** values: `DRAFT,
WAITING_FOR_AGREEMENT, WAITING_FOR_DEPOSIT, WAITING_FOR_CLIENT_DATA,
READY_TO_START, IN_PROGRESS, WAITING_FOR_CLIENT, CLIENT_REVIEW, REVISION,
TESTING, FINAL_APPROVAL, WAITING_FOR_FINAL_PAYMENT, READY_FOR_HANDOVER,
DEPLOYED, MAINTENANCE, COMPLETED, PAUSED, CANCELLED, OVERDUE`.

**Recommendation: do not rename or replace the existing enum.** Renaming a
value used across dozens of files (every status-label map, every tone
function, every filter) for cosmetic alignment is exactly the kind of
"weaken/duplicate existing functionality" risk both this brief and every
prior one in this conversation have explicitly forbidden. Instead:

1. **Map 1:1** where a value already means the same thing:

   | Brief's term | Existing value |
   | --- | --- |
   | `AWAITING_DEPOSIT` | `WAITING_FOR_DEPOSIT` |
   | `IN_PROGRESS` | `IN_PROGRESS` |
   | `IN_REVIEW` | `CLIENT_REVIEW` |
   | `READY_FOR_DELIVERY` | `READY_FOR_HANDOVER` |
   | `MAINTENANCE` | `MAINTENANCE` |
   | `COMPLETED` | `COMPLETED` |
   | `DRAFT` | `DRAFT` |

2. **Add, additively** (same `ALTER TYPE ... ADD VALUE` pattern as
   `project_role`): `PLANNING` (between DRAFT and WAITING_FOR_AGREEMENT —
   the wizard's own in-progress state before a quote exists), `QUOTED`
   (agreement sent, pre-acceptance — currently conflated with
   `WAITING_FOR_AGREEMENT`, worth splitting since the wizard explicitly asks
   for a "QUOTED" milestone), `DELIVERED` (currently the closest existing
   value is `DEPLOYED`, which conflates "the code is live" with "the client
   has formally accepted delivery" — these are different events once §15's
   delivery-acceptance flow exists, so `DELIVERED` becomes the status the
   acceptance action transitions into).
3. **`ARCHIVED` is not a status** — it is already `projects.archived_at`, a
   separate soft-delete timestamp column, independent of lifecycle status
   (a `COMPLETED` project and a `PAUSED` project can each be archived). This
   is the correct existing pattern (see `ArchiveForm`/`archiveOwnProject`)
   and should stay a timestamp, not become an 11th-or-so status value that
   would need every status filter to special-case it.

---

## 5. Change-request pricing isolation — already satisfied

The brief's §17 warning ("a change request that affects scope or price must
NOT silently modify the original project pricing... should create a
separate change request quote / pricing item or require explicit approval")
is **already true of the existing schema**: `change_requests.estimated_amount`
is its own column, entirely separate from `project_pricing_items` and
`projects.total_amount`. Nothing links a change request's estimate into the
project's derived total automatically — turning an approved change request
into a real, billable pricing item (if the agency chooses to) is, and should
remain, a distinct staff action (adding a new `project_pricing_items` row
that references the change request), never an automatic side effect of
`status = 'APPROVED'`. No schema change needed here; the Implementation doc
notes this as **VERIFIED, not a gap**.

---

## 6. Multi-project workspace — the shape

```
User (client_owner/client_member OR self-serve OWNER/MANAGER/MEMBER/VIEWER)
  │
  ├── project_members rows (one per project they can reach — role-blind for
  │    read access, exactly as app.can_read_project already implements)
  │
  └── For each reachable project:
        projects (the row) ── owner_id (nullable, self-serve only)
          ├── project_scopes / project_features       (Scope)
          ├── projects.requirements (new)              (Requirements)
          ├── project_pricing_items → project_pricing_totals (Pricing)
          ├── agreements / agreement_versions           (Quotation)
          ├── payment_plans → payment_milestones        (Payment Plan / Milestones)
          ├── payments                                   (Payments)
          ├── documents                                  (Documents)
          ├── project_deployments                        (Publishing)
          ├── (unlock_rules, read off payment_milestones) (Source Code / Preview / Publishing gating)
          ├── delivery_checklists (new)                  (Delivery)
          ├── maintenance_plans → maintenance_requests (new) (Maintenance)
          ├── change_requests                            (Change Requests)
          ├── project_members / project_invitations      (Members)
          └── activity_logs                               (Activity)
```

**Isolation is unchanged and unweakened at every level of this tree**: every
child table's RLS resolves back through `project_id` to the same
`app.can_read_project`/`app.can_manage_project`/`app.is_project_owner`
predicates already audited (39/39 real-Postgres RLS assertions,
`docs/PROJECT_COLLABORATION_AUDIT.md`). Adding tabs and a switcher on top
changes nothing about how any of this data is protected — it only changes
how much of it is exposed through dedicated routes instead of being
crammed onto one overview page.

---

## 7. Security — restated, not re-litigated

Every item in the brief's §23 IDOR checklist (project id, owner id, user id,
role, payment status, milestone status, unlock status, member id, payment
id, milestone id, document id, deployment id, source-code resource id — all
"change it in the URL/request and expect DENY") is **already the exact
threat model this codebase has been tested against, repeatedly, this whole
conversation** — most recently 39/39 in the collaboration audit, and before
that 134/135 in the business-flow audit, 100/100 in the DB verification.
Building the workspace shell on top of these same tables and RLS policies
does not reopen any of that; the Implementation doc's Phase testing
sections re-run the same class of test for anything genuinely new (delivery
checklist items, maintenance requests), not for anything that already
passed.

---

## 8. Project lifecycle (reference)

```
DRAFT (wizard, or empty until Step 10 "Create Project")
  → PLANNING (new)         — requirements/scope being defined
  → QUOTED (new)           — agreement sent, awaiting client acceptance
  → WAITING_FOR_DEPOSIT / AWAITING_DEPOSIT (existing)
  → IN_PROGRESS (existing)
  → CLIENT_REVIEW / IN_REVIEW (existing)
  → READY_FOR_HANDOVER / READY_FOR_DELIVERY (existing)
  → DELIVERED (new)        — delivery_checklists all done + client accepted
  → MAINTENANCE (existing) — if maintenance_plans has an ACTIVE row
  → COMPLETED (existing)
(archived_at, orthogonal to the above, at any point past DRAFT)
```

Status transitions remain server-authorized only — `updateProject` (staff)
and a new narrow `updateOwnProject` (self-serve OWNER/MANAGER, Phase 3)
are the only writers, both already re-checked by RLS on the `projects`
table regardless of what either action's guard says, the same
belt-and-braces shape every mutation in this codebase already follows.
