# ARCHITECTURE

**Status:** proposed target architecture. Nothing in this document is implemented yet.
**Companion:** [`PROJECT_AUDIT.md`](./PROJECT_AUDIT.md) — what exists today.
**Last updated:** 2026-08-25

---

## 1. Product shape

A Project Management + Client Portal SaaS for freelance web developers and web agencies, covering the full engagement lifecycle:

```
Client → Project → Scope → Pricing → Agreement → Deposit → Milestones
   → Development → Preview → Client Review → Payment → Unlock
   → Handover → Deployment → Maintenance
```

Two audiences, one codebase, **strictly separated by server-enforced authorization**:

| Portal | Route prefix | Audience |
|---|---|---|
| Admin / Developer | `/admin/*` | agency staff — `super_admin`, `admin`, `developer`, `accountant` |
| Client Portal | `/portal/*` | the client — `client_owner`, `client_member` |
| Public share | `/share/[token]` | anyone holding an unguessable token |
| Auth | `/login`, `/auth/*` | unauthenticated |

---

## 2. Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 16 App Router** | already in place |
| Language | **TypeScript, strict** | already in place; `any` disallowed |
| UI | **React 19 Server Components by default** | client components only where interactivity demands |
| Styling | **Tailwind v4 + the existing hand-written CSS layer** | preserves the v0 look; see §9 |
| Primitives | **shadcn (`base-nova`) on `@base-ui/react`** | already configured in `components.json` |
| Icons | **`lucide-react`** | already in use and consistent |
| Database | **Supabase Postgres** | with RLS as the last line of defence |
| Auth | **Supabase Auth** via `@supabase/ssr` | email+password, Google OAuth, magic link |
| Payments | **Stripe** behind a `PaymentService` interface | `MockPaymentService` when unconfigured |
| Toasts | **Sonner** | replaces the hand-rolled toast |
| Charts | **Chart.js** | replaces the hand-rolled CSS bars |
| Validation | **Zod** | one schema per mutation, shared client/server |
| Hosting | **Vercel** | Fluid Compute (Node runtime), not Edge |

> **Deviations from the brief's stack list, and why.** *Font Awesome* is not adopted — the prototype uses Lucide consistently and mixing icon systems costs bundle size and visual coherence for no gain. *AOS / Animate.css* are not adopted — scroll animation libraries fight React's render model and hurt CLS on a data-dense dashboard; `tw-animate-css` (already installed) covers what is needed. Both are cheap to revisit if you want them.

---

## 3. Directory layout

```
app/
  layout.tsx                     root: fonts, providers, Sonner
  (auth)/
    login/page.tsx
    auth/callback/route.ts       OAuth + magic-link exchange
  (admin)/
    layout.tsx                   admin shell (sidebar + topbar) + role guard
    admin/
      dashboard/page.tsx
      clients/[id]/page.tsx
      projects/[id]/…            overview, scope, pricing, milestones,
                                 payments, preview, feedback, documents,
                                 deployments, source-code, maintenance
      projects/new/page.tsx      10-step wizard
      payments/  invoices/  documents/  deployments/
      maintenance/  change-requests/  settings/
  (portal)/
    layout.tsx                   portal shell + client guard
    portal/
      page.tsx                   dashboard — ACTION REQUIRED first
      projects/[id]/…            preview, payments, documents, deployment,
                                 source-code, maintenance, change-requests
  share/[token]/page.tsx         public, token-gated
  api/
    webhooks/stripe/route.ts     signature-verified, idempotent
    documents/[id]/download/route.ts
middleware.ts                    session refresh + coarse route protection

components/
  ui/                            shadcn primitives
  layout/                        Sidebar, Topbar, MobileDrawer, PageHeading
  data/                          StatCard, Panel, DataTable, StatusPill,
                                 ProgressBar, Timeline, ActivityList, RevenueChart
  domain/                        ProjectCard, MilestoneList, PaymentModal,
                                 ActionRequired, UnlockGate, FeedbackThread
  states/                        Loading, Skeleton, Empty, ErrorState,
                                 Unauthorized, NotFound

lib/
  supabase/                      server.ts · client.ts · admin.ts · middleware.ts
  auth/                          session.ts · guards.ts · roles.ts
  authz/                         can-access-project-resource.ts · policies.ts
  payments/                      payment-service.ts · stripe-adapter.ts
                                 mock-adapter.ts · types.ts
  domain/                        project.ts · pricing.ts · milestones.ts
                                 unlock.ts · timeline.ts · change-request.ts
  money.ts                       integer minor units — the only money math
  tokens.ts                      generate / hash / verify share tokens
  activity.ts                    logActivity()
  notifications.ts
  validation/                    Zod schemas
  types/database.ts              GENERATED — never hand-edited

supabase/migrations/             timestamped, forward-only
docs/                            PROJECT_AUDIT.md · ARCHITECTURE.md
tests/                           business-rule tests
```

---

## 4. Rendering model

**Server Components by default.** Data fetching happens on the server through the request-scoped Supabase client, so the session travels with the request and RLS applies automatically.

Client Components are confined to genuine interactivity: the wizard, the payment modal, the mobile drawer, the theme toggle, chart canvases, filter controls, and forms. They receive data as props — **they never fetch privileged data themselves**.

**Mutations use Server Actions.** Every action follows the same five steps, in order:

1. `requireUser()` — authenticate
2. Zod-parse the input
3. `requireRole()` / `canAccessProjectResource()` — authorize **on the server**
4. Mutate
5. `logActivity()` + `revalidatePath()`

Route Handlers are reserved for non-form surfaces: the Stripe webhook, file downloads, and OAuth callback.

---

## 5. Data model

### Conventions

- **`uuid` primary keys**, `gen_random_uuid()`. Sequential IDs never appear in URLs.
- **Human-readable codes** (`PRJ-2026-001`, `INV-2026-042`) are a *separate, unique, non-identifying* column — display only, never the lookup key for authorization.
- **Money is `bigint` in minor units** (satang for THB) plus a `currency char(3)`. Floating point is never used for currency, anywhere. All arithmetic goes through `lib/money.ts`.
- **`timestamptz` everywhere**, UTC.
- **Enums are Postgres enum types**, mirrored into TypeScript from generated types.
- **`organization_id` on every tenant-scoped table** — it is the root of every RLS policy.
- **Soft delete** via `archived_at` for projects and clients; hard delete only for drafts.
- Every table: `created_at`, `updated_at`, and `created_by` where an actor exists.

### Entity map

```
organizations
├── organization_members ──> profiles ──> auth.users
├── clients
└── projects  (org + client, uuid + project_code)
    ├── project_members
    ├── project_scopes ──> project_features
    ├── project_pricing_items
    ├── agreements ──> agreement_versions ──> agreement_acceptances
    ├── payment_plans ──> payment_milestones ──> payments
    ├── invoices ──> invoice_items;  receipts;  tax_invoices
    ├── documents ──> files
    ├── preview_deployments ──> preview_links
    ├── feedback
    ├── change_requests
    ├── production_deployments
    ├── source_code_access
    ├── maintenance_plans ──> maintenance_subscriptions
    └── share_links

activity_logs      (polymorphic: entity_type + entity_id)
notifications      (per recipient profile)
```

### Notable fields

**`projects`** — `id`, `project_code`, `organization_id`, `client_id`, `name`, `description`, `type`, `status` (19-value enum), `start_date`, `expected_delivery`, `actual_delivery`, `total_amount` (bigint), `currency`, `delivery_method`, `source_code_ownership`, `maintenance_enabled`, `archived_at`.

**`payment_milestones`** — `name`, `sequence`, `percentage`, `amount` (bigint), `due_date`, `unlock_rules` (jsonb), `status`. Percentages must sum to 100 and amounts must sum to the project total — enforced by a check constraint plus a server-side assertion, because rounding is where money bugs live.

**`change_requests`** — `title`, `description`, `additional_amount`, `additional_days`, `status`, and the deadline audit trail: **`original_deadline`, `new_deadline`, `reason`, `approved_by`, `approved_at`**. A deadline is never silently overwritten; the original is preserved and the change is attributable.

**`share_links`** — stores a **`token_hash`** (SHA-256), never the token. Plus `resource_type`, `resource_id`, `password_hash` (nullable), `expires_at`, `revoked_at`, `view_only`, `max_views`, `view_count`. The plaintext token is shown to the creator exactly once.

### Migrations

Forward-only, timestamped, in `supabase/migrations/`. Every migration ships its own indexes, foreign keys, unique and check constraints, and **its RLS policies in the same file** — so a table can never land unprotected. Production schema is never edited by hand.

---

## 6. Authentication

`@supabase/ssr` with three clients, deliberately separated:

| Client | Used in | Key |
|---|---|---|
| `lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers | anon key + user session |
| `lib/supabase/client.ts` | Client Components | anon key (public, safe) |
| `lib/supabase/admin.ts` | **webhook handler only** | service role — `import 'server-only'` at the top of the file |

The **service role key never reaches the browser**. It is not prefixed `NEXT_PUBLIC_`, and the module that holds it is marked `server-only` so an accidental client import fails at build time.

`middleware.ts` refreshes the session cookie and performs **coarse** redirects (unauthenticated `/admin/*` or `/portal/*` → `/login`). This is a convenience, **not a security boundary** — middleware can be bypassed and is never the only check.

Methods: email + password, Google OAuth, magic link. All land on `/auth/callback`.

---

## 7. Authorization — three enforced layers

Defence in depth. Each layer assumes the others may fail.

**Layer 1 — RLS in Postgres (the real boundary).** Every table has RLS enabled and policies rooted in organization membership or client linkage. Even a leaked anon key with a stolen UUID returns zero rows. This layer holds regardless of application bugs.

**Layer 2 — server-side guards.** Every Server Action and Route Handler calls `requireUser()`, then `requireRole()` or `canAccessProjectResource()` before touching data. Gives clean 403s and catches logic errors above the database.

**Layer 3 — UI.** Hiding buttons and disabling controls. **This is UX, never security** — it is assumed bypassed. (Brief rule #8.)

### Roles

`super_admin` · `admin` · `developer` · `accountant` · `client_owner` · `client_member`

Roles are held in `organization_members` (agency side) and `project_members` (client side), never in a JWT claim the client can influence.

### The single unlock authority

```ts
canAccessProjectResource(
  user: SessionUser,
  projectId: string,
  resource: ProjectResource,   // 'workspace' | 'preview' | 'production_preview'
                               // | 'source_code' | 'documents' | 'credentials' | …
): Promise<AccessDecision>     // { allowed, reason, requiredMilestone? }
```

**One function. Every caller — page, action, API route, RLS helper — goes through it.** Unlock rules are never re-implemented inline in components (brief Phase 12), because duplicated permission logic drifts, and drifted permission logic is a breach.

Milestone-gated resources, per the brief:

| Paid milestone | Unlocks |
|---|---|
| 1 (deposit) | workspace, requirements, initial design |
| 2 | UI design, preview |
| 3 | production preview, admin preview |
| **Final** | **source code, GitHub, DB export, documentation, ownership transfer, credentials** |

`requiredMilestone` in the decision drives the UI's locked-state messaging, so a client always sees *why* something is locked and *what unlocks it* — never a blank or a dead end.

---

## 8. Payments

### Abstraction

```
PaymentService (interface)
├── createCheckout(input): CheckoutSession
├── createPayment(input): Payment
├── verifyPayment(id): PaymentStatus
├── handleWebhook(raw, signature): WebhookResult
└── refundPayment(id, amount?): Refund
```

Two implementations behind one interface:

- **`StripeAdapter`** — used when `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are present.
- **`MockAdapter`** — used otherwise. It simulates the *full* state machine including `PROCESSING`, `FAILED` and delay. It is selected by environment, is loudly labelled in the UI as mock, and **refuses to run when `NODE_ENV === 'production'`** — the fake-success path in the current prototype (audit D8) must not survive into production.

The UI depends on `PaymentService`, never on the Stripe SDK. Swapping providers touches one directory.

### Payment states

`PENDING → PROCESSING → PAID | FAILED | EXPIRED | REFUNDED | CANCELLED`

**A payment is marked `PAID` only by a verified webhook event.** No client interaction, no optimistic update, and no server action ever writes `PAID` directly. The browser returning from checkout triggers a *poll*, not a state change.

### Methods

**Card** — one-time and recurring. **PromptPay** — **one-time only**. PromptPay is not a recurring subscription method; maintenance subscriptions are card-only, and the UI must not offer PromptPay for them.

### Webhook — `/api/webhooks/stripe`

Runs on the Node runtime with body parsing disabled (raw body required for signature verification).

1. Verify the signature with `STRIPE_WEBHOOK_SECRET` — reject unsigned or mismatched immediately.
2. **Idempotency:** insert `event.id` into `stripe_events` with a unique constraint. A duplicate insert means already processed → return 200 and stop. This is the mechanism, not a convention — Stripe retries, and retries must be harmless.
3. In a single transaction: mark payment `PAID` → update milestone → update invoice → recompute unlock state → write `activity_logs` → enqueue notification.
4. Return 200 quickly; unexpected failures return 5xx so Stripe retries.

---

## 9. Design system — preservation strategy

**The existing v0 visual output is the baseline and must not be redesigned.** The refactor is structural, not visual: markup moves into components while producing the same DOM and the same classes.

Three-step approach:

1. **Un-minify `globals.css`** into readable, ordered sections (base → layout → components → utilities → responsive). Zero rule changes — pure reformatting, verifiable by diffing computed styles.
2. **Add a Tailwind v4 `@theme inline` block** mapping the existing CSS variables to Tailwind tokens and defining the missing ones (`--ring`, `--secondary`, `--destructive`, `--input`, `--accent`, `--popover`). This fixes audit **D1** and makes shadcn components usable **without changing any existing rendered pixel**.
3. **Extract components** so they emit the existing semantic classes (`.stat-card`, `.panel`, `.timeline-item`). New surfaces may use Tailwind utilities; existing surfaces keep their classes. The two coexist because both read the same tokens.

Also in scope: fix the corrupted `className="พื้นที่ทำงาน"` → `workspace` (audit D3 — currently an unstyled element), and move dark mode to a persisted, SSR-safe `class` on `<html>` to eliminate the theme flash.

### Authoritative palette — decided 2026-08-25

**Blue `#409EFE` is the brand colour.** The code is the design baseline; the brief's pink palette (Phase 28) is superseded. The `@theme` block in step 2 is built from these values:

```
--primary:    #409EFE     --card:         #ffffff
--background: #f7fbff     --foreground:   #1f2937
--border:     #dbeeff     --muted-fg:     #718096
```

Cleanup that follows from this: retire the `!important` override block in favour of correct source values, and repaint the two leftover pink chart bars (`#ed82ad`, `#b7d8f8`) into the blue scale.

### Language — decided 2026-08-25

**Thai only.** `lang="th"` stands; the leftover English strings get translated; no i18n layer is introduced. This applies to **display strings only** — identifiers, component names, CSS classes, enum values and database columns stay in English ASCII. The current `function ลูกค้าView` and `className="พื้นที่ทำงาน"` are bugs, not localization, and are fixed in Phase 0.5.

---

## 10. Timeline & SLA

Each milestone tracks `name`, `description`, `start_date`, `due_date`, `status`, `completed_at`, plus derived health: `on_track` | `at_risk` | `paused` | `overdue` | `completed`.

**Dual clocks.** Elapsed time is attributed to either **developer working time** or **client waiting time**. When a project enters `WAITING_FOR_CLIENT` / `WAITING_FOR_CLIENT_DATA`, the developer SLA timer **pauses**; it resumes when the client responds. Both intervals are stored as an append-only ledger of state transitions, never as mutated date fields — so the timeline is reconstructible and auditable, and a delivery date is never silently rewritten.

---

## 11. Share links

- Token = 32 random bytes from `crypto.randomBytes`, base64url — cryptographically random, never sequential or derived.
- **Only the SHA-256 hash is stored.** The plaintext is displayed once at creation.
- The token encodes nothing: no project id, no client name, no metadata. Lookup is hash → row.
- Every request validates, in order: exists → not revoked → not expired → view budget remaining → password (if set, bcrypt) — **before** any project data is loaded.
- Revocation is immediate (`revoked_at`), and every access is logged.
- Share pages send `noindex` and never render more than the specific shared resource.

---

## 12. Error, loading and empty states

Every route ships `loading.tsx` (skeletons matching the real layout, to avoid CLS) and `error.tsx` (recoverable, with a retry). Plus dedicated `Unauthorized`, `NotFound`, `Empty`, `PaymentFailure` and `NetworkFailure` components in `components/states/`.

**No blank screens, ever** (brief Phase 29). A locked resource explains what unlocks it. An empty list offers the action that fills it. A failed payment says what to do next.

---

## 13. Observability

`activity_logs` is **append-only** — no updates, no deletes — recording `actor_id`, `action`, `entity_type`, `entity_id`, `metadata` (jsonb), `created_at`. It is written inside the same transaction as the mutation it describes, so the log cannot disagree with the data.

Notifications are rows first, delivery channels second: Sonner for immediate in-session feedback, with the table shaped so email delivery is an added consumer rather than a rewrite.

---

## 14. Environment variables

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | anon key (safe — RLS-constrained) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | webhook handler exclusively |
| `STRIPE_SECRET_KEY` | **server only** | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | **server only** | signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | Stripe.js |
| `NEXT_PUBLIC_APP_URL` | public | absolute URLs for share links, redirects |

Only `NEXT_PUBLIC_*` may be read in client code. A committed `.env.example` documents every key with placeholder values; real values live in `.env.local` (already gitignored) and Vercel project settings.

---

## 15. Testing

Business-rule tests come first, because these are the rules whose failure is a breach rather than a bug (brief Phase 32):

1. Client A cannot access Client B's project — with a valid session and the correct UUID
2. An unauthenticated user cannot reach `/portal/*` or `/admin/*`
3. Final payment unlocks source code
4. **Partial payment does not unlock source code**
5. An expired share link is rejected
6. A revoked share link is rejected
7. Webhook processing is idempotent — the same event twice produces one state change
8. An approved change request updates the deadline **and preserves `original_deadline`**
9. Client waiting time pauses the developer SLA
10. An unauthorized user cannot download a document

Tests 1, 4, 5, 6 and 10 are asserted **against RLS with the anon key**, not only against application guards — otherwise they test the layer most likely to be bypassed.

---

## 16. Non-goals and honest limits

- **e-Tax Invoice.** Documents may be *labelled* tax invoices, but no claim of legal validity is made until actual Thai Revenue Department requirements (RDMS certification, digital signatures, submission) are implemented (brief Phase 18).
- **PromptPay recurring billing.** Not supported by the payment rails; maintenance subscriptions are card-only.
- **Automated deployment execution.** Deployment records *track* Vercel deployments; the platform does not trigger builds in the first iteration.
- **Email delivery.** Architected for, not implemented in the first pass.
