# PROJECT AUDIT

**Audited:** 2026-08-25
**Repo:** `c:\Users\Centered101\Desktop\client-management-platform`
**Stage:** Phase 0 — pre-implementation audit

> Scope: what **actually exists on disk today**, verified by reading every source file in the repository. No aspirational statements. Where the brief and the code disagree, the code is reported and the conflict is flagged.

---

## 1. Executive summary

The repository is a **single-file v0.app visual prototype**, not an application. It contains **4 source files totalling ~160 lines of TypeScript plus one 25-line (but very dense) CSS file**. There is no database, no authentication, no API layer, no routing beyond the index page, and no data model. All content is hard-coded mock data inside one client component.

| Dimension | State |
|---|---|
| Framework | Next.js 16.3.0 (App Router), React 19, TypeScript 5.7.3 |
| Routes | **1** (`/`) |
| Components | **1** unused UI primitive (`Button`) |
| Database | **None** |
| Auth | **None** |
| API routes / server actions | **None** |
| Middleware | **None** |
| Env vars | **None** (no `.env*` file exists) |
| Tests | **None** |
| Git | **Not a git repository** |
| `tsc --noEmit` | **Passes** (exit 0) |

The prototype is genuinely valuable as a **visual and information-architecture reference** — it establishes the sidebar, topbar, stat cards, revenue chart, timeline, project table, payment modal and toast. It is **not** a foundation that can be extended in place; it must be decomposed into routes and components while preserving its rendered appearance.

---

## 2. Current framework & dependencies

### `package.json`

**Runtime dependencies (11):**

| Package | Version | Notes |
|---|---|---|
| `next` | 16.3.0 | App Router |
| `react` / `react-dom` | ^19 | |
| `@base-ui/react` | ^1.5.0 | shadcn `base-nova` style uses Base UI, **not** Radix |
| `lucide-react` | ^1.16.0 | icon library in use |
| `class-variance-authority` | ^0.7.1 | used by `button.tsx` |
| `clsx` + `tailwind-merge` | | used by `lib/utils.ts` |
| `shadcn` | ^4.8.0 | CLI, declared as a runtime dep (should be a devDependency) |
| `tw-animate-css` | ^1.4.0 | imported in `globals.css`, currently unused |
| `@vercel/analytics` | 1.6.1 | mounted in production only |

**Dev dependencies:** `tailwindcss` ^4.3.3 + `@tailwindcss/postcss`, `postcss`, `typescript` 5.7.3, `@types/*`.

### Expected stack vs. installed

| Expected (per brief) | Installed? |
|---|---|
| Next.js / TypeScript / Tailwind | present |
| Supabase (`@supabase/supabase-js`, `@supabase/ssr`) | **absent** |
| Stripe (`stripe`, `@stripe/stripe-js`) | **absent** |
| Chart.js | **absent** (chart is hand-rolled CSS bars) |
| Sonner / Toaster | **absent** (toast is hand-rolled) |
| AOS / Animate | **absent** |
| Font Awesome | **absent** (Lucide is used instead) |
| Zod | present only **transitively**, not a declared dependency |

**Scripts:** only `dev`, `build`, `start`. There is **no `lint`, `typecheck`, or `test` script** — the brief's "run typecheck / lint / tests after each phase" instruction is currently unexecutable without adding them.

### Lockfile conflict

Both `pnpm-lock.yaml` (126 KB, from v0) **and** `package-lock.json` (201 KB, generated locally 2026-08-25) exist. `node_modules` was installed by npm. Two lockfiles desynchronise and can produce different dependency trees between local and CI/Vercel builds. **One must be deleted.**

---

## 3. File inventory

```
app/
  layout.tsx        49 lines  — root layout, Thai font, metadata, Analytics
  page.tsx          73 lines  — the ENTIRE prototype (client component)
  globals.css       25 lines  — ~30 KB of minified hand-written CSS
components/
  ui/button.tsx     58 lines  — shadcn Button (base-nova / Base UI). UNUSED.
lib/
  utils.ts           6 lines  — cn() helper
public/              9 static assets (icons, placeholders)
```

Configuration: `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `components.json`, `.gitignore`.

---

## 4. Routes

| Route | File | Type | Description |
|---|---|---|---|
| `/` | `app/page.tsx` | Client Component | The whole prototype |

There is no `/admin`, `/portal`, `/share`, `/login`, no route groups, no `loading.tsx`, `error.tsx`, `not-found.tsx`, and no `middleware.ts`.

### How the prototype fakes multi-page behaviour

`app/page.tsx` holds seven pieces of `useState`:

| State | Purpose |
|---|---|
| `active` | which sidebar nav item is selected — **purely cosmetic**, does not change content |
| `role` | `'แอดมิน'` (admin) / `'ลูกค้า'` (client) — the only state that actually swaps the rendered body |
| `range` | revenue chart range tabs — cosmetic |
| `dark` | dark mode, via a `.dark` class on the root `div` |
| `modal` | payment modal visibility |
| `toast` | success toast visibility |
| `mobile` | mobile sidebar drawer |

The **admin / client portal switch is a top-bar toggle button** — not authentication, not routing. Both views ship to every visitor in the same JS bundle.

---

## 5. Components

### `components/ui/button.tsx`

A standard shadcn `Button` in the `base-nova` style, built on `@base-ui/react`. **It is imported by nothing.**

**It also cannot render correctly as written.** It references Tailwind design tokens — `bg-primary`, `text-primary-foreground`, `border-ring`, `ring-ring`, `bg-secondary`, `bg-destructive`, `bg-muted`, `--radius-md`, `dark:border-input` — but `app/globals.css` contains **no `@theme` / `@theme inline` block**, which is how Tailwind v4 turns CSS variables into utility classes. The `:root` variables that do exist are consumed only by hand-written CSS (`var(--primary)`), never by Tailwind. So `bg-primary` compiles to nothing, and `--ring`, `--secondary`, `--destructive`, `--input`, `--accent`, `--popover` are **not defined at all**.

**Consequence:** the project cannot currently use shadcn components or theme-bound Tailwind utilities. This is the single most important blocker to component work.

### In-file components in `page.tsx`

`Status`, `StatCard`, `RevenueChart`, `Timeline`, `PaymentModal`, `ลูกค้าView` — all local to the file, all fed by hard-coded literals. These are the pieces worth extracting.

---

## 6. Styling & design system

### Approach

`app/globals.css` imports Tailwind and `tw-animate-css`, then defines **~30 KB of hand-written, minified, global, semantic-class CSS** (`.sidebar`, `.stat-card`, `.panel`, `.timeline-item`, `.payment-modal`, …). The prototype's markup uses these classes almost exclusively. **Tailwind utilities are effectively not used in application code.**

This is a legitimate approach and it produces the current look, but it is:
- global and unscoped (any new page inherits it and can collide),
- minified into 25 physical lines — near-unreadable and merge-hostile,
- disconnected from the Tailwind token system that `components.json` and `button.tsx` assume.

### CONFLICT: the implemented theme is BLUE, not pink

The brief (Phase 28) specifies a "Soft Pink SaaS" palette. **The code on disk implements a blue palette.**

| Token | Brief says | `globals.css` actually has |
|---|---|---|
| Primary | `#F27FA8` (pink) | **`#409EFE`** (blue) |
| Background | `#FFF9FB` (pink-white) | **`#f7fbff`** (blue-white) |
| Surface | `#FFFFFF` | `#ffffff` — matches |
| Border | `#F4DDE6` (pink) | **`#dbeeff`** (blue) |
| Text | `#292929` | `#1f2937` |
| Muted | `#777777` | `#718096` |

Evidence this was a **deliberate re-theme from pink to blue**: `globals.css` contains the comment `/* Brand color: #409EFE */` followed by a block of `!important` overrides, and `layout.tsx` sets `themeColor: '#409EFE'`. Two pink values (`#ed82ad`, `#b7d8f8`) survive only in the revenue chart bars — leftovers the override pass missed.

The brief also says "DO NOT replace the existing design" and "preserve the pink visual theme" — **these instructions contradict each other**, because the existing design is blue. Must be resolved before design-system work. See §15.

### Dark mode

Implemented by toggling a `.dark` class on a `<div>` inside the page, driven by `useState`. It is **not** persisted, **not** SSR-aware (guaranteed flash of wrong theme), and does not sit on `<html>`, so `dark:` Tailwind variants would not apply. `layout.tsx` declares `colorScheme: 'light dark'` while `<html>` is hard-coded to the light `bg-background`.

### Responsive

Well covered — breakpoints at 1050 / 700 / 380 px including a mobile sidebar drawer. **This is the strongest asset in the prototype and must be preserved carefully.**

---

## 7. Database

**None.** No Supabase client, no schema, no migrations, no generated types, no `supabase/` directory. Every value on screen is a literal in `page.tsx`:

- `nav` — 9 sidebar entries
- `projects` — 4 rows with `PRJ-2026-00X` codes, client names, statuses, progress %, THB amounts
- `bars` — 12 hard-coded revenue bar heights
- `items` in `Timeline` — 6 hard-coded milestone tuples
- stat card values — inline strings (`฿125,000`, `฿32,000`, …)

Encouragingly, the mock data already anticipates the target model: human-readable project codes, per-project progress, amount vs. paid, milestone timelines with `done` / `active` / `locked` states, and THB currency.

---

## 8. Authentication & authorization

**Neither exists.**

- No Supabase Auth, no session, no cookies, no JWT.
- No `middleware.ts`, therefore no route protection.
- No login page.
- The admin/client distinction is a `useState` toggle in the browser.

Measured against the brief's own rules, the current state violates rule #7 ("never trust client-side authorization") and rule #8 ("a hidden button is NOT authorization"). That is expected of a prototype — but it means **nothing in the current codebase can be carried forward as a security boundary.**

---

## 9. Payments

**None.** No Stripe SDK, no keys, no webhook route.

`PaymentModal` renders a card / PromptPay method chooser and a pay button whose handler is `showToast()` — it closes the modal and shows "Payment successful" with no network call. This is **exactly** the fake-success state the brief's rule #9 prohibits in production code. Acceptable as a prototype; must be replaced by a real `PaymentService` abstraction (mock adapter until Stripe is configured) before it can ship.

---

## 10. Environment variables

**No `.env`, `.env.local`, or `.env.example` exists.** `.gitignore` correctly ignores `.env*.local`. Nothing in the code reads `process.env` except `NODE_ENV` in `layout.tsx`.

`.gitignore` also correctly ignores `.next/`, `node_modules`, `.vercel/`, and v0 sandbox artefacts. It does **not** ignore `.env` (unsuffixed) — worth adding.

---

## 11. Technical debt (ranked)

> **Phase 0.5 status (2026-08-25).** Resolved: **D1** (`@theme` block added), **D2** (`ignoreBuildErrors` off, build enforces types), **D3** (Thai identifiers → ASCII; broken `.workspace` class fixed), **D4** (`pnpm-lock.yaml` deleted), **D5** (git initialised), **D6** (`lint`/`typecheck`/`test` scripts + flat ESLint config), **D11** (`globals.css` un-minified, verified rule-for-rule identical), **D12** (80 English strings translated; Thai-only), **D14** (`shadcn` → devDependencies), **D15** (target ES2022), **D16** (`allowJs: false`), **D18** (`button.tsx` now renders, since D1 is fixed).
>
> Still open: **D7** (monolithic client component) → Phase 1. **D8/D9** (fake payment, client-side authz) → Phases 10 and 4. **D10** (dark mode on `<html>`) → Phase 1. **D13** (`images.unoptimized`) → Phase 21. **D17, D19–D23** → tracked, non-blocking.

### Blockers — fix before feature work

**D1. Tailwind theme tokens are not wired.** No `@theme` block; `--ring`, `--secondary`, `--destructive`, `--input`, `--accent`, `--popover` undefined. Any shadcn component added today renders unstyled. *(§5, §6)*

**D2. `typescript.ignoreBuildErrors: true` in `next.config.mjs`.** Production builds ship with type errors silently ignored. `tsc --noEmit` currently passes, so **this flag can be removed right now at zero cost** — and must be, before the codebase grows.

**D3. Corrupted identifiers from an automated Thai localisation pass.** A find-and-replace translated English → Thai **inside code identifiers and CSS class names**, not only user-facing strings:
- `function ลูกค้าView(...)` — a React component named with Thai characters (`ลูกค้า` = "client"). Legal TS, but breaks conventions, tooling and searchability.
- `<div className="พื้นที่ทำงาน">` — the class was `workspace`; the rule in `globals.css` is still `.workspace`. **This element is unstyled — a live visual bug.**
- Comparisons against Thai literals throughout: `role === 'แอดมิน'`, `active === 'ภาพรวม'`, `range === '1 ปี'` — display strings used as state keys. These must become stable enum values with a separate label layer.

**D4. Two lockfiles** (`pnpm-lock.yaml` + `package-lock.json`). Non-deterministic installs. *(§2)*

**D5. Not a git repository.** No history, no rollback, no safe branching. Every subsequent phase is unprotected. `git init` should happen **before** any code is modified.

### High

**D6. No `lint` / `typecheck` / `test` scripts** and no ESLint config. The brief's per-phase verification loop cannot run.

**D7. Entire application in one 73-line client component** with all state, data and markup co-located. Nothing is reusable; `'use client'` at the root forfeits Server Components entirely (brief rule #5).

**D8. Fake payment success** in `PaymentModal`. *(§9, brief rule #9)*

**D9. Client-side-only "authorization"** via role toggle. *(§8, brief rules #7–8)*

### Medium

**D10. Dark mode is not persisted and not SSR-safe** — guaranteed theme flash. *(§6)*

**D11. `globals.css` is minified into 25 lines** — unreadable, unmaintainable, merge-hostile.

**D12. Hard-coded Thai UI strings** with no i18n layer, while `layout.tsx` sets `lang="th"` and some strings remain English (`"Welcome back, ABC Company"`, `"Payment successful"`, `"Total paid"`, `"Outstanding"`). The UI is currently **inconsistently bilingual**.

**D13. `images.unoptimized: true`** disables Next.js image optimisation globally.

**D14. `shadcn` CLI declared as a runtime dependency** rather than a devDependency.

**D15. `target: "ES6"`** in `tsconfig.json` is unnecessarily old for Next 16 / React 19; `ES2022` is appropriate.

**D16. `allowJs: true`** with zero JS files — permits accidental untyped code.

**D17. `tw-animate-css` imported but unused.**

**D18. `button.tsx` is dead code** while D1 stands.

### Low

**D19.** Leftover pink chart bars (`#ed82ad`, `#b7d8f8`) inconsistent with the blue theme. *(§6)*
**D20.** `!important` override block in `globals.css` — the re-theme was done by overriding rather than by changing source values.
**D21.** No `error.tsx`, `not-found.tsx`, or `loading.tsx` anywhere. *(brief Phase 29)*
**D22.** No accessibility pass: no focus trap or `aria-modal` on the modal, no `Escape` handler, no skip link.
**D23.** Placeholder assets (`placeholder-logo.png`, `placeholder-user.jpg`) still present.

---

## 12. What is already implemented

Honestly assessed, the following is done and worth keeping:

- Next.js 16 App Router + React 19 + TS project that builds and typechecks clean
- Thai font loading (`Noto_Sans_Thai`) with CSS variable
- Favicon set, metadata, viewport with light/dark theme colours
- A complete, coherent **visual language**: sidebar, topbar, cards, panels, tables, status pills, progress bars, timeline, modal, toast
- A well-executed **responsive system** (1050 / 700 / 380 px + mobile drawer)
- A dark palette
- **Information architecture**: the 9 nav sections and the admin/client split match the target product closely
- Admin dashboard layout: 5 stat cards, revenue chart, activity feed, projects table
- Client portal layout: project hero, progress, timeline, ownership panel, maintenance panel
- Payment modal with card / PromptPay selection
- Vercel Analytics wired

---

## 13. What is missing

Everything below the presentation layer. Grouped against the brief's phases:

**Foundation:** git repo, lint/test tooling, `@theme` wiring, env scaffolding, route structure (`/admin`, `/portal`, `/share`, `/login`), per-section layouts, Server Component architecture.

**Data (Phase 2):** all entities — `profiles`, `organizations`, `organization_members`, `clients`, `projects`, `project_members`, `project_scopes`, `project_features`, `project_pricing_items`, `agreements`, `agreement_versions`, `agreement_acceptances`, `payment_plans`, `payment_milestones`, `payments`, `invoices`, `invoice_items`, `receipts`, `tax_invoices`, `documents`, `preview_deployments`, `preview_links`, `feedback`, `change_requests`, `production_deployments`, `source_code_access`, `maintenance_plans`, `maintenance_subscriptions`, `activity_logs`, `notifications`, `share_links`, `files`. Plus migrations, indexes, constraints and generated types.

**Auth & authz (Phases 3–4):** Supabase Auth (email/password, Google OAuth, magic link), middleware route protection, the six roles, RLS policies, server-side guards.

**Domain (Phases 5–12):** project CRUD, the 19 lifecycle statuses, the 10-step creation wizard, integer-based itemised pricing, the 5 payment-plan types, the 7 payment states, `PaymentService` abstraction + `MockPaymentService`, Stripe integration, idempotent webhook handling, and `canAccessProjectResource()` as the single unlock authority.

**Client-facing (Phases 13–20):** client dashboard with the **ACTION REQUIRED** panel, preview deployments + secure/expiring/revocable share tokens, review & feedback, change requests with deadline history (`original_deadline` / `new_deadline` / `reason` / `approved_by` / `approved_at`), documents, timeline with developer-working vs. client-waiting SLA pausing.

**Ops (Phases 21–25):** deployment tracking, source-code access states, maintenance plans + recurring billing, activity log, notifications (Sonner now, email later).

**Quality (Phases 29, 31, 32):** loading/skeleton/empty/error/unauthorized/404 states, the full security checklist, and the ten critical business-rule tests.

---

## 14. Recommended implementation order

The brief's ordering is sound. I propose inserting a **Phase 0.5 — Foundation Hardening** before it, because five of the blockers above make everything after them harder or unsafe, and all five are cheap to fix now.

| # | Phase | Deliverable | Est. sessions |
|---|---|---|---|
| **0** | Audit | this document + `ARCHITECTURE.md` | done |
| **0.5** | **Foundation hardening** | `git init` + initial commit; delete one lockfile; remove `ignoreBuildErrors`; add `@theme` wiring existing vars to Tailwind + define missing tokens; add `lint`/`typecheck`/`test` scripts + ESLint; fix D3 corrupted identifiers; un-minify `globals.css`; `.env.example`; `tsconfig` target → ES2022 | 1 |
| 1 | Route architecture | route groups `(auth)` / `(admin)` / `(portal)` / `share`; per-section layouts; extract sidebar, topbar, stat card, panel, status pill, progress, timeline, table, modal, toast into `components/`; **pixel-identical output**; mock data moved to `lib/mock/` | 1–2 |
| 2 | Data model | Supabase project; migrations for all entities; PK/FK/index/unique/check constraints; UUID + `project_code`; money as `bigint` minor units; generated TS types | 2–3 |
| 3 | Auth | `@supabase/ssr`, server/browser/admin clients, `/login`, callback route, `middleware.ts`, sign-out | 1–2 |
| 4 | Authorization | roles, RLS on every table, server-side guards, `canAccessProjectResource()` | 2 |
| 5 | Project CRUD | list / detail / create / edit / archive / duplicate on real data; the 19 lifecycle statuses | 2 |
| 6 | Wizard | 10-step creation flow with draft persistence | 2 |
| 7–8 | Pricing & payment plans | itemised integer pricing; 5 plan types; milestone generation | 1–2 |
| 9 | Client portal | dashboard + **ACTION REQUIRED**; project detail tabs | 2 |
| 10 | Payments | `PaymentService` + `MockPaymentService`; 7 states; invoices | 2 |
| 11 | Stripe + webhooks | real adapter, signature verification, **idempotency**, card + PromptPay one-time | 2 |
| 12 | Unlock system | milestone-gated access through the single permission function | 1 |
| 13 | Preview & share | preview deployments; hashed, random, expiring, revocable tokens; `/share/[token]` | 2 |
| 14 | Review & change requests | feedback lifecycle; CR approval with deadline history | 2 |
| 15 | Documents | quotation / invoice / receipt / agreement; secure delivery *(no e-Tax claims)* | 2 |
| 16 | Deployment & source code | Vercel deployment records; 4 access states | 1–2 |
| 17 | Maintenance | plans, subscriptions, recurring billing *(card only — **not** PromptPay)* | 1–2 |
| 18 | Activity & notifications | append-only log; notifications + Sonner; email-ready | 1 |
| 19 | States & a11y | loading / skeleton / empty / error / 401 / 404 / payment-failure / network-failure | 1 |
| 20 | Testing | the brief's 10 critical business-rule tests | 2 |
| 21 | Hardening | full security checklist §31; performance; remove `images.unoptimized` | 1–2 |

**Critical-path rule:** phases 2 → 3 → 4 must complete before any real data is exposed. Phase 12 (unlock) must not begin before phase 4 (RLS), or the unlock logic will rest on an unenforced foundation.

---

## 15. Decisions

Resolved 2026-08-25:

| # | Question | **Decision** | Consequence |
|---|---|---|---|
| 1 | Theme colour — blue or pink? | **Blue `#409EFE`** — the code is authoritative | The brief's pink palette (Phase 28) is **superseded**. The `!important` override block and the leftover pink chart bars (D19, D20) get cleaned up so blue is the single source of truth. |
| 2 | Language | **Thai only** | Leftover English strings (`"Welcome back, ABC Company"`, `"Payment successful"`, `"Total paid"`, `"Outstanding"`) get translated. No i18n layer. **Note:** this does *not* excuse D3 — Thai belongs in display strings, never in identifiers or class names. |
| 3 | Package manager | **npm** | Delete `pnpm-lock.yaml`, keep `package-lock.json`. |
| 4 | Supabase project | **None yet — one will be created** | Phase 0.5 prepares the connection scaffolding (`.env.example`, client modules, `@supabase/ssr`) but targets no live project. Phase 2 begins once the URL and keys exist. |

### Still open

- **Currency scope** — THB only, or genuinely multi-currency? A `currency` column ships either way, so this does not block Phase 2, but it decides whether the UI exposes a currency selector.
- **Organizations / multi-tenancy** — not answered. **Working assumption:** single agency for now, with `organization_id` present on every tenant-scoped table so multi-tenancy later is a configuration change rather than a migration. This is the reversible choice; flag it if you want true multi-tenant from day one.

### Authoritative palette

```
--primary:    #409EFE     --card:         #ffffff
--background: #f7fbff     --foreground:   #1f2937
--border:     #dbeeff     --muted-fg:     #718096
```
