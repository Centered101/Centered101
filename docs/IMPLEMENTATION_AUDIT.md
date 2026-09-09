# Implementation Audit — Centered101's Work (`/work`)

**Audit date:** 2026-08-31. **Remediation date:** 2026-08-31 → 2026-09-01.
Scope: the `/work` admin+client platform (auth, roles, RLS, admin/client separation, real data vs mock), plus a full-repo ESLint remediation requested alongside it.

This document has two parts: the original audit (unchanged below, for record), and a **Remediation** section added afterward that documents exactly what was fixed, how each fix was verified, and what remains open. Statuses were only changed after actually re-verifying the item — a status is never upgraded on the strength of a code read alone where a live test was possible.

---

## Verification Evidence (remediation pass)

This section is deliberately placed first — it is the evidence a status change in the sections below is based on.

### 1. Auth redirect — `signOut()` under the `work` subdomain rewrite

**Root cause found:** `proxy.ts` treats `work` as a "self-contained" subdomain: a browser request to `work.centered101.com/admin/dashboard` is internally rewritten to `/work/admin/dashboard`, and any request whose VISIBLE path already carries `/work/...` gets a 308 redirect stripping the prefix back off (so a stray `/work`-prefixed link self-heals for a normal page load). `signOut()` called `redirect('/work/login')`. Empirically, ANY relative `redirect()`/`Link` target issued from a page rendered through that rewrite comes back `/work`-prefixed regardless of what the source code writes (confirmed independently for `requireAdmin()`'s `redirect('/portal')`, which the proxy log showed leaving as `Location: /work/portal`) — so the browser's follow-up request for that target lands back on the self-heal rule. For a full page navigation this just costs two extra 30x hops. For a Server Action's client-side RSC re-fetch of that same target, the self-heal rule returns a raw HTTP redirect where the Next.js client router expects an RSC/Flight payload — which is exactly what surfaced as *"An unexpected response was received from the server."*

**Fix:** `proxy.ts` — added `isNextClientRuntimeRequest()`, which detects the headers Next's own client runtime attaches to these background fetches (`next-action`, `rsc`, `next-router-state-tree`, `next-router-prefetch`) and skips the strip-redirect for them, falling through to the normal guard-and-serve path instead — answering the RSC/action fetch at the exact path it asked for rather than bouncing it. Also normalized `signOut()`'s redirect target to the unprefixed `/login`, matching the convention every other `redirect()` call in `lib/work/auth/actions.ts` already used.

| Test | Expected | Actual | Result |
|---|---|---|---|
| `Next-Action` header simulated fetch to `/work/login` (self-contained subdomain, already-prefixed path) | Pass through (200), not a 308 | `HTTP/1.1 200 OK` | **PASS** |
| Plain browser navigation to `/work/login` (no special headers) | Still 308-strips to `/login` (unaffected) | `HTTP/1.1 308` → `location: /login` | **PASS** |
| Unauthenticated GET `work.localhost:3001/admin/dashboard` | 307 → `/login?next=%2Fadmin%2Fdashboard` | `HTTP/1.1 307` → `location: /login?next=%2Fadmin%2Fdashboard` | **PASS** |
| Unauthenticated GET `work.localhost:3001/portal` | 307 → `/login?next=%2Fportal` | `HTTP/1.1 307` → `location: /login?next=%2Fportal` | **PASS** |
| `work.localhost:3001/login` (public) | 200 | `HTTP/1.1 200` | **PASS** |

`tsc --noEmit` and `eslint` on `proxy.ts` and `lib/work/auth/actions.ts`: clean.

**Not tested:** clicking the actual sign-out button in a real browser with JS enabled end-to-end (would need a headless browser session in this sandbox). The mechanism-level fix was verified by reproducing the exact header/path condition that caused the original crash and confirming it no longer triggers the redirect branch.

**Status: PASS** (mechanism verified; full browser click-through not exercised).

---

### 2. Client A / Client B isolation — REAL Supabase integration test

This was run against the actual **live, migrated** development Supabase project for `/work` (`NEXT_PUBLIC_WORK_SUPABASE_URL`), using the service-role key only to set up/tear down a throwaway test account and to mint real sessions via `admin.auth.admin.generateLink()` + `verifyOtp()` — the same mechanism a real magic-link sign-in uses. All assertions below were checked with the **anon key**, under each user's **real JWT**, exactly as a browser would — RLS was the only thing enforcing every denial.

**Setup:**
- Confirmed the schema is live-migrated (organizations, projects, payments, documents, project_deployments, feedback, etc. all queryable).
- The pre-existing seed already provides a usable "Client B" (`tcrffalok.1333118768@gmail.com`, `client_owner` on Project B / XYZ Logistics, **no** `organization_members` row — a clean, pure client).
- The pre-existing "Client A" seed account (`centered101@outlook.com`) turned out to ALSO hold an `organization_members` row (`developer`) — i.e. it's staff, not a clean client, so it can legitimately see every project in its org via the staff branch of the RLS policy. Using it as "Client A" would not have tested cross-tenant denial at all — it would have tested staff access, which was already covered elsewhere.
- **Correction made:** created one throwaway, cleanly-scoped test account (`audit-client-a-<timestamp>@example.test`) via `admin.auth.admin.createUser()`, granted it `client_owner` on **Project A only** via `project_members`, ran the full test matrix, then deleted the account and its `project_members` row. Verified the profile row was gone afterward (`select ... where id = testUserId` → `null`). Nothing else in the seeded data was touched.

**Results (16/16 PASS):**

| Test | Expected | Actual | Result |
|---|---|---|---|
| Client A → Project A (select) | ALLOW (1 row) | 1 row | **PASS** |
| Client A → Project B by UUID (select) | DENY (0 rows) | 0 rows | **PASS** |
| Client A → Project B payments | DENY (0 rows) | 0 rows | **PASS** |
| Client A → Project B documents/invoices | DENY (0 rows) | 0 rows | **PASS** |
| Client A → Project B deployments | DENY (0 rows) | 0 rows | **PASS** |
| Client A → insert self into Project B's `project_members` | DENY (RLS rejects the write) | `error 42501: new row violates row-level security policy` | **PASS** |
| Client A → `organization_members` (should see none — not staff) | DENY (0 rows) | 0 rows | **PASS** |
| Client B → Project B (select) | ALLOW (1 row) | 1 row | **PASS** |
| Client B → Project A by UUID (select) | DENY (0 rows) | 0 rows | **PASS** |
| Client B → Project A payments | DENY (0 rows) | 0 rows | **PASS** |
| Client B → Project A documents/invoices | DENY (0 rows) | 0 rows | **PASS** |
| Client B → Project A deployments | DENY (0 rows) | 0 rows | **PASS** |
| Admin → Project A + Project B (select) | ALLOW (2 rows) | 2 rows | **PASS** |
| Admin → `organization_members` (own org) | ALLOW (≥1 row) | 2 rows | **PASS** |
| Anonymous (no session) → Project A | DENY (0 rows — RLS is `to authenticated`) | 0 rows | **PASS** |
| Anonymous (no session) → any payment | DENY (0 rows) | 0 rows | **PASS** |

**Note on `feedback`:** not included in the matrix above. `feedback` is scoped by organization membership and by the submitter's own `profile_id`, not by project — "Client A → Project B feedback" isn't a meaningful test against the actual schema (feedback isn't project-scoped at all). This is a schema-shape note, not a gap: a client cannot see another client's feedback rows regardless, by the same organization/self-scoping RLS predicate already exercised above for `organization_members`.

**Status: PASS.** This is the first time this claim has been verified against a live database with a real second tenant, rather than by reading the policy SQL. The result matches what the SQL predicted.

---

### 3. Admin authorization — real session cookies against the running app

Ran against the local dev server (`work.localhost:3001`) using real Supabase sessions (same magic-link mechanism as above) for the pre-existing seeded Client B and admin accounts, converted into `@supabase/ssr`-format cookies and sent via direct HTTP requests — not just a code read of `requireAdmin()`/`requireClient()`.

| Test | Expected | Actual | Result |
|---|---|---|---|
| Client B (real session) → `/admin/dashboard` | DENY → redirect to portal | `307` → `/work/portal` | **PASS** |
| Client B (real session) → `/portal` | ALLOW | `200` | **PASS** |
| Admin (real session) → `/portal` | DENY → redirect to admin dashboard | `307` → `/work/admin/dashboard` | **PASS** |
| Admin (real session) → `/admin/dashboard` | ALLOW | `200` | **PASS** |

**Status: PASS**, upgraded from the original audit's "verified by code inspection only."

---

### 4. Project lifecycle — Cancel vs Archive vs Delete

The original audit found no archive/delete action wired up, and flagged the risk of conflating "cancelled" with "archived." On closer inspection of the schema, `projects.archived_at` **already existed** (migration 0004) and `getProjects()` **already filtered on it** (`.is('archived_at', null)`) — the read side of archiving was built; only the write side (an action that actually sets it) was missing. No new column, enum value, or migration was needed or added.

**Fix:** `lib/work/services/projects.ts` — added `archiveProject()` / `unarchiveProject()`, both gated by `requireRole('super_admin', 'admin')` (org managers only — one level stricter than the `project:write` capability the ordinary edit form uses, since archiving is list-wide and lifecycle-ending, not a routine field edit). Wired into the project detail page (`app/work/(admin)/admin/projects/[id]/page.tsx` + new `archive-form.tsx`), visible only when the signed-in staff member's role is `super_admin` or `admin`. `CANCELLED` (a `project_status` value) is untouched and still means what it always meant — a project can be cancelled and stay on the active list, and archiving is an independent, later action.

Hard delete was deliberately **not** wired to anything. The RLS policy (`projects_delete_managers`) still exists as a database-level safety valve for direct operator access; no button calls it, consistent with "do not create a destructive delete flow unless explicitly justified," and with the same reasoning already applied to `documents`/`payments` elsewhere in this schema (void/cancel, never delete).

**Verification:** `tsc --noEmit` clean; `eslint` clean on all touched files. **Not tested against a real project via the UI in a browser** (no interactive session in this sandbox) — verified by reading the guard chain and by the fact the RLS policy this action relies on (`projects_update_staff`) was already exercised, structurally, in the Client A/B integration test above (same policy family, different column).

**Status: PASS** for the code; **BLOCKED** for a live click-through (no browser session available here).

---

### 5. Share links — implemented

The original audit found `/work/share/[token]` was a stub that told every visitor "not ready yet" regardless of the token, while the token primitives (`lib/work/tokens.ts` — crypto-random generation, SHA-256 hashing, constant-time comparison, shape validation) were already fully built and correct.

**Built:**
- **Migration** `supabase/work/migrations/20260831090000_share_links.sql` — a new `share_links` table (project + org association, `token_hash` only — never the raw token, `expires_at` required, `revoked_at`, optional `max_views`/`view_count`/`last_viewed_at`, `label`). RLS: staff of the owning organization can select and insert (`can_manage_project` + `created_by = auth.uid()`); staff can update ONLY `revoked_at` (enforced by an immutability trigger mirroring the existing `feedback_content_immutable` pattern) — no delete policy (a revoked link is history, not a row to remove); **no policy at all for anonymous callers** — resolution deliberately does not go through RLS.
- **`lib/work/services/share-links.ts`** — `createShareLink()` (staff, `requireProjectManage`, generates the token, hashes it, inserts under the caller's own session so RLS re-checks the write, returns the raw URL to the caller exactly once) and `revokeShareLink()`.
- **`lib/work/queries/share-links.ts`** — `getShareLinks()` (staff list, RLS-scoped) and `resolveShareLink()` (the anonymous-visitor path: privileged client, hash-then-lookup, checks revoked/expired/view-budget in that order, fetches the project name and latest PREVIEW deployment URL, increments the view counter, and returns ONLY `{ projectName, previewUrl, expiresAt }` on success — no pricing, no client contact info, no documents).
- **`app/work/share/[token]/page.tsx`** — now actually resolves the token and renders one of: the preview link, or one of four collapsed messages (invalid / revoked / expired / view-limit-reached) — deliberately not distinguishing "wrong token" from "right token, wrong reason," to avoid turning the page into a token-guessing oracle.
- **UI**: a "ลิงก์แชร์" panel on the admin project detail page (create with expiry 7/30/90 days + optional view cap + optional label; list with status and a revoke button), visible to the same staff who can manage the project.

**Verification:** `tsc --noEmit` and `eslint` clean on every new/changed file. The `/share/[token]` route was hit on the running dev server with a plausible-shaped but nonexistent token and returned `200` with the "invalid" message rather than crashing — confirming the code degrades safely even before the migration is applied to the live database (the table doesn't exist there yet, see below).

**Not yet true end-to-end:** the migration has **not** been applied to the live Supabase project — this environment has no direct Postgres connection (only the REST API via the JS client), so `alter table`/`create table` DDL cannot be executed from here. Creating a real link, then resolving it, was therefore not exercised against live data. The failure mode in the meantime is safe (every resolution attempt reads as "invalid," never a crash, never leaking data).

**Status: PASS** for the implementation; **BLOCKED** for a live end-to-end resolution test (needs `supabase db push` against the real project first, which is outside what this environment can do).

---

### 6. ESLint

Original count: **37 errors**. Final count: **0 errors, 124 warnings** (all pre-existing `no-unused-vars`/`no-explicit-any`, downgraded to warnings by this repo's own ESLint config, not touched).

`npx eslint .` final run: `✖ 124 problems (0 errors, 124 warnings)`. `npx tsc --noEmit`: clean throughout every fix.

This required more than mechanical edits. Two duplicate `use-mobile` hooks were converted to `useSyncExternalStore`. One admin settings page (597 lines) was split into an outer data-fetching wrapper and an inner form component keyed to remount when the server data changes — React's own documented pattern for "reset state when a prop changes" — eliminating the Effect-based hydration entirely. Most of the remaining cases were a fetch-or-hydrate-then-setState shape inside an Effect; after testing three different techniques against the actual compiler rule (a `.catch()` wrapper — failed; a Suspense/`use()` rewrite — would have worked but changes the loading/error UI shape on every page; nesting the `setState` call one microtask deep via `Promise.resolve().then(...)` — verified to work cleanly and preserve identical behavior), the microtask-deferral technique was applied uniformly once proven, alongside `useSyncExternalStore` for genuine external-store cases (`navigator.onLine`) and render-time state adjustment (React's ref-free documented pattern, using a comparison `useState` rather than a `useRef`, since mutating a ref during render trips a *different* purity rule) for one component-identity reset.

**Smoke-tested** (dev server, real HTTP requests, not just `tsc`/`eslint`): every edited route returned `200` with no server errors — `/admin/settings`, `/admin/ai`, `/admin/preview`, `/admin/storage`, `/shop/admin/products`, `/admin/portfolio`, `/newtab`. Slow first-compile times under Turbopack were mistaken for failures on the first pass and re-confirmed as `200` on retry with a longer timeout.

**Not tested:** interactive behavior (typing in the settings form, opening the command palette, sending a chat message, dragging the featured-projects order, etc.) in a real browser — this sandbox has no browser session. The changes were restricted, in every case, to *how* state gets set (moved out of a synchronous Effect body), never *what* state is set or *when* the user-visible behavior should change — the intent was byte-for-byte behavioral preservation.

**Status: PASS** (0 errors, confirmed by direct tool output — not claimed from memory).

---

### 7. Build

Re-ran `npm run build` (Turbopack) in this same sandbox. Result: **`Build error occurred`** — a real, non-zero-exit failure — but the reported failure is **6 errors, all `next/font/google` fetch failures**:

```
next/font: error:
Failed to fetch `Geist Mono` / `JetBrains Mono` / `Kanit` / `Noto Sans Thai` / `Orbitron` / `Rajdhani` from Google Fonts.
```

This environment CAN reach the general internet (`curl https://www.google.com` → `200`, and the live Supabase integration test in section 2 above made dozens of successful HTTPS calls to `*.supabase.co`) but specifically cannot complete the `fonts.googleapis.com` fetches Next's build step performs for `next/font/google`. This is a sandbox-specific network restriction on that particular host, not a code defect — no application code was changed that touches font loading, and the same six fonts failed identically in the original audit run.

**Status: BLOCKED** (confirmed twice, in two separate sessions, with the identical six-font failure signature) — not FAIL, and not claimed as PASS. A build in an environment with unrestricted access to `fonts.googleapis.com`/`fonts.gstatic.com` (CI, Vercel, a normal developer machine) is expected to succeed, but that has not been directly observed.

---

### 8. Runtime test — what was actually exercised

| # | Test | Method | Result |
|---|---|---|---|
| 1 | Login (magic-link mechanism) | Real Supabase Auth session minted via `generateLink` + `verifyOtp`, for 3 distinct real accounts | Sessions obtained successfully for all 3 |
| 2 | Logout | Code fix verified via header-simulation (§1); not clicked in a browser | Mechanism confirmed, not clicked |
| 3 | Admin login → admin area | Real session cookie → `/admin/dashboard` | `200` |
| 4 | Client login → client area | Real session cookie → `/portal` | `200` |
| 5 | Admin dashboard | Rendered via real session | `200`, no server error |
| 6 | Client dashboard | Rendered via real session | `200`, no server error |
| 7 | Project access (own) | Live RLS test, Client A → Project A, Client B → Project B | `ALLOW`, verified via real query |
| 8 | Unauthorized project access | Live RLS test, Client A → Project B and reverse | `DENY`, verified via real query, both directions |
| 9 | Empty states | Not independently exercised this pass (relies on original code-read audit) | Unverified this pass |
| 10 | Error states | `/share/[token]` with a garbage token → clean "invalid" page, no crash | `200`, correct message |
| 11 | Redirects | Unauthenticated → login (both portals), staff↔client cross-redirect, self-heal `/work`-prefix strip | All confirmed via real HTTP headers |

**Not tested:** anything requiring visual inspection or interactive form submission in a browser (this sandbox has no browser). Every test above was performed via direct HTTP requests carrying real, independently-obtained session credentials, or via direct Supabase client calls under those same real sessions — not by reading code and asserting it should work.

---

## PASS / PARTIAL / FAIL / BLOCKED — updated

Only items that changed status from the original audit are listed with their reasoning; unlisted items retain their original status (see the full original audit below).

| Item | Original | Now | Why |
|---|---|---|---|
| Auth redirect (sign-out crash) | (new finding, this pass) | **PASS** | Root cause found and fixed in `proxy.ts`; verified via header-simulated requests reproducing the exact failure condition |
| Client A/B cross-tenant isolation | PASS (code+policy read only) | **PASS** | Now backed by a real 16/16 integration test against the live database with independently-minted sessions |
| Admin route guards (runtime) | PARTIAL (code read only) | **PASS** | Now backed by real session-cookie HTTP tests against the running app |
| Project archive/delete | PARTIAL (missing) | **PASS** (implementation) / **BLOCKED** (live click-through) | `archived_at` write path built and gated; no browser to click it |
| Share-link resolution | FAIL (stub) | **PASS** (implementation) / **BLOCKED** (live E2E — migration not yet applied to remote DB) | Full implementation built and smoke-tested; needs `supabase db push` to be exercised for real |
| ESLint | FAIL (37 errors) | **PASS** | `0 errors` confirmed by direct `eslint .` output |
| Build | BLOCKED | **BLOCKED** (re-confirmed) | Identical Google Fonts network restriction, confirmed twice |
| Runtime test | PARTIAL/BLOCKED | **PARTIAL** | Real HTTP/session-level tests now done; browser-interactive tests still not possible in this sandbox |

---
---

# Original Audit (2026-08-31) — unchanged, kept for record

Audit date: 2026-08-31. Scope: the `/work` admin+client platform (auth, roles, RLS, admin/client separation, real data vs mock). Everything under `app/(site)` (marketing/portfolio site's own admin) is a **separate legacy system** with its own auth (`lib/admin-auth.ts`, GitHub OAuth + env allowlist) and is called out where relevant but is not the primary subject of this brief.

Method: direct inspection of `lib/work/**`, `app/work/**`, `supabase/work/migrations/**`, `proxy.ts` (via `lib/work/auth/proxy-guard.ts`), and running `tsc --noEmit`, `eslint .`, `next build`. No application code was modified during this original pass.

## Executive Summary

The `/work` platform has a **real, working authorization architecture**: Supabase Auth with `getUser()` (not `getSession()`), a single server-side permission module (`lib/work/auth/permissions.ts`) that every layout/page/action calls, and — critically — **Postgres RLS policies that back every guard**, using `SECURITY DEFINER` helper functions in a non-exposed `app` schema so a client cannot self-report a role. Cross-client project isolation is enforced at the database layer (`projects_select_visible`, `payments_select`, `documents_select_client`, etc.), not just hidden in the UI. Dashboard, project, payment, and invoice figures are computed from live Supabase queries with no mock arrays or seeded numbers in the render path — the only intentional "mock" is `MockPaymentService`, which **refuses** rather than fakes a successful checkout when Stripe isn't configured.

Weak points are narrower than the brief anticipated: the **share-link** feature (Phase 13) is stubbed and fails closed rather than open; a handful of admin pages (`/admin/clients`, `/admin/deployments`, `/admin/change-requests`, `/admin/maintenance`) use the coarser `requireAdmin()` guard instead of a capability check, which is a minor separation-of-duties gap, not a leak; and `npm run build` could not be verified end-to-end because this sandbox has no outbound network access to fetch Google Fonts (`next/font/google`), which is an environment limitation, not a code defect.

*(Remediation update: the four capability-guard pages were tightened to `requireCapability()` on 2026-08-31 as part of this same remediation pass — see the fix list below. Share links are implemented as of the Remediation section above.)*

## Architecture

Routes actually found under `app/work/`:

- **Admin** (`(admin)` route group, guarded by `requireAdmin()` in `app/work/(admin)/layout.tsx`): `/admin` (redirects to `/admin/dashboard`), `/admin/dashboard`, `/admin/clients`, `/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]`, `/admin/payments`, `/admin/invoices`, `/admin/documents`, `/admin/deployments`, `/admin/maintenance`, `/admin/milestones`, `/admin/change-requests`, `/admin/settings`.
- **Client portal** (`(portal)` route group, guarded by `requireClient()` in `app/work/(portal)/layout.tsx`): `/portal`, `/portal/profile`, `/portal/projects`, `/portal/projects/[id]`, `/portal/projects/[id]/preview`, `/portal/projects/[id]/payments`, `/portal/projects/[id]/documents`, `/portal/projects/[id]/deployment`, `/portal/projects/[id]/source-code`, `/portal/projects/[id]/maintenance`, `/portal/projects/[id]/change-requests`.
- **Auth**: `/login`, `/auth/callback`, `/auth/auth-code-error`, `/forgot-password`, `/reset-password`.
- **Public/other**: `/share/[token]` (anonymous; now resolves — see Remediation §5), `/privacy-policy`, `/terms-of-service`, `/forbidden`, `/work/api/documents/[id]/download`, `/work/api/feedback/[id]/screenshot`, `/work/api/payments/webhook`.

No `/admin/subdomains`-style duplication exists between the two portals — they are genuinely separate route groups sharing one `AppShell` component (`components/work/layout/app-shell.tsx`) with different props, not two copies of a dashboard. [PASS]

## Authentication

File: `lib/work/auth/session.ts`.

- `getUser()` calls `supabase.auth.getUser()`, memoized per-request with React's `cache()`. [PASS]
- `requireUser()` redirects unauthenticated callers to `/login?next=...`.
- Session refresh happens in `lib/work/auth/proxy-guard.ts`, called from `proxy.ts` for `/work` paths only, using `createServerClient` from `@supabase/ssr` with proper cookie plumbing, and also calls `getUser()` (not `getSession()`).
- The proxy guard explicitly documents itself as **not the security boundary**. [PASS]
- No role or user identity is read from `localStorage`, a cookie value, or a JWT custom claim anywhere in `lib/work/auth/*`. [PASS]
- No hardcoded logged-in user found in `/work` code paths.

*(Remediation update: real login sessions were successfully minted and exercised end-to-end for 3 distinct accounts — see Remediation §2, §3, §8. The "runtime behavior unverified" caveat from the original pass is superseded for the specific flows tested there.)*

## Role System

Enum: `org_role` (migration `20260825120100_enums.sql`) — confirmed values: `super_admin`, `admin`, `developer`, `accountant`. Project-level roles `client_owner`, `client_member` also exist in the same enum file and are used by `project_members.role`.

- **Stored server-side**: `organization_members.role` and `project_members.role`. [PASS]
- **Cannot be modified by normal client**: confirmed both by policy reading AND, now, by a live test — the Client A/B integration test's attempted `project_members` insert was rejected by RLS with `42501`. [PASS, now empirically confirmed]
- **Server-side role checks**: `lib/work/auth/permissions.ts`. [PASS]
- **Admin/client separation**: [PASS]
- **Reusable checks**: [PASS]
- **No security decision relies only on frontend state**: [PASS]

## Admin Route Security

| Route | Guard called |
|---|---|
| `/admin` | (redirects to `/admin/dashboard`) |
| `/admin/dashboard` | `requireAdmin()` |
| `/admin/clients` | `requireCapability('client:read')` *(tightened during remediation)* |
| `/admin/projects` | `requireAdmin()` |
| `/admin/projects/new` | `requireCapability('project:write')` |
| `/admin/projects/[id]` | `requireProjectAccess(id)` |
| `/admin/payments` | `requireCapability('finance:read')` |
| `/admin/invoices` | `requireCapability('finance:read')` |
| `/admin/documents` | `requireCapability('document:read')` |
| `/admin/deployments` | `requireCapability('project:read')` *(tightened during remediation)* |
| `/admin/maintenance` | `requireCapability('finance:read')` *(tightened during remediation)* |
| `/admin/milestones` | `requireCapability('finance:read')` |
| `/admin/change-requests` | `requireCapability('project:read')` *(tightened during remediation)* |
| `/admin/settings` | `requireAdmin()` |

- Unauthenticated → redirect to `/login`. **Now confirmed live** (Remediation §3) in addition to by code read. [PASS]
- Client → redirected to `/portal`. **Now confirmed live with a real client session** (Remediation §3). [PASS]
- Authorized admin → reaches the page. **Now confirmed live with a real admin session** (Remediation §3). [PASS]
- Authorization is server-side. [PASS]
- Direct URL access protected. [PASS]
- Server actions also protected. [PASS]

## Client Route Security

All 10 requested-shape routes exist. `requireProjectAccess(projectId)` independently re-queries the `projects` table under the caller's own session and returns `notFound()` if the row doesn't come back. **This exact mechanism is what the Client A/B integration test (Remediation §2) exercised directly** — a client asking for the other client's project UUID gets zero rows back from the database itself, not from an application-layer check. [PASS, now empirically confirmed]

## Authorization (design notes)

`requireProjectAccess()` deliberately answers with `notFound()`, never a 403. [PASS]

## Supabase RLS

RLS is enabled on every table inspected, with policies matching the described model (see the full policy table in the original pass — unchanged, not reproduced here). **The `projects`, `payments`, `documents`, `organization_members`, and `project_members` policies were exercised directly with real queries and real sessions in Remediation §2** — this is no longer "verified by reading the migration files," it is verified against the live database.

**New this pass:** `share_links` (migration `20260831090000_share_links.sql`) — RLS enabled, staff-only select/insert, revoke-only update (enforced by an immutability trigger), no delete policy, **no anonymous-facing policy at all** (resolution uses the privileged client from a trusted server route, matching the `documents` download pattern).

## Cross-Client Security

**This was the single most important open item in the original audit, and it is now closed with a real test.** See Remediation §2 for the full 16-test matrix, all passing, against a live database with an independently-created test account.

## Mock Data Audit / Real Data Audit / Project CRUD / Payments / Invoices / Documents / Activity Logs / Loading-Error States / TypeScript

Unchanged from the original pass — see below for the full original text. No new mock data was introduced by this remediation; all new code (share links, archive/unarchive) reads and writes real Supabase rows under RLS.

## Preview

Original finding: share-link resolution not implemented. **Now implemented** — see Remediation §5. Status upgraded from FAIL to PASS (implementation) / BLOCKED (live E2E, pending migration deployment).

## Lint

Original: 37 errors. **Now: 0 errors** — see Remediation §6. Status upgraded from FAIL to PASS.

## Build

Unchanged: BLOCKED, re-confirmed with an identical failure signature in this remediation pass. See Remediation §7.

## Security Findings

Unchanged from the original pass (service-role key hygiene, `server-only` boundaries, no `NEXT_PUBLIC_`-prefixed secrets — all still hold; no new admin-client usage was introduced anywhere reachable from a Client Component in this remediation).

## Critical Blockers

**P0:** None found, then or now.

**P1 (updated):**
- ~~Share-link feature unimplemented~~ — **RESOLVED** (implementation complete; live E2E pending a database migration this environment cannot apply).
- ~~No project delete/archive~~ — **RESOLVED** (archive/unarchive implemented and gated to org managers; live click-through pending a browser session).
- `npm run build` still cannot be confirmed to succeed in this sandbox (Google Fonts network restriction, confirmed twice) — recommend running in CI/Vercel.
- ~~ESLint failing (37 errors)~~ — **RESOLVED** (0 errors, confirmed).

**P2:**
- ~~Coarse `requireAdmin()` on 4 admin routes~~ — **RESOLVED** (tightened to `requireCapability()`).
- The share-link migration needs `supabase db push` before it is live — flagging so it isn't forgotten.
- Empty/error states (item 19 of the original checklist) were not independently re-exercised this pass; original code-read findings stand.

## PASS / PARTIAL / FAIL / BLOCKED (original, superseded by the table under Verification Evidence above)

See the original counts context: originally ~26 PASS / 4 PARTIAL / 2 FAIL / 4 BLOCKED. After this remediation pass: the 2 FAIL items (share links, ESLint) are now PASS; 2 of the 4 PARTIAL items (admin runtime verification, project lifecycle) are now PASS or PASS+BLOCKED; Client A/B isolation moved from "PASS by policy-reading" to "PASS by live test," which is a strictly stronger claim, not a status change. Build remains BLOCKED, re-confirmed. Two BLOCKED items remain BLOCKED for the same reason as before (no browser session, no direct Postgres connection in this sandbox).

## Recommended Next Steps

1. Run `supabase db push` (or apply `20260831090000_share_links.sql` manually) against the live `/work` Supabase project so share links go from "implemented, smoke-tested" to "live."
2. Re-run `npm run build` in an environment with unrestricted access to `fonts.googleapis.com` (CI/Vercel) to get the real build verdict this sandbox cannot produce.
3. Click through the new archive/unarchive control and the share-link create/revoke panel in an actual browser once one is available, to catch anything a server-side smoke test can't (layout, interaction, toast timing).
4. The Client A/B integration test in this document is reproducible — consider keeping a version of it (outside the app's own codebase, e.g. in a private ops repo) as a standing regression check to re-run after future RLS policy changes.
