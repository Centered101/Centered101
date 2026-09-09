import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type {
  DeliveryMethod,
  ProjectRole,
  ProjectStatus,
  ProjectType,
  SourceCodeOwnership,
} from '@/lib/work/types/enums'
import { parseProjectBrand, type ProjectBrand } from '@/lib/work/validation/documents'
import { sumBy, tallyBy, unwrapOr } from './internal'

/**
 * Project reads.
 *
 * EVERY query here runs through the request-scoped client, so RLS is applied
 * to all of them. There is no `getProjectsForOrganization(orgId)` and no
 * organization filter in application code, because a filter is not a
 * permission — passing the wrong id would be a bug, whereas RLS returning
 * nothing is a guarantee. Staff see their organization; clients see the
 * projects they are members of; the same function serves both.
 */

export type ProjectListItem = {
  id: string
  projectCode: string
  name: string
  clientId: string
  clientName: string
  status: ProjectStatus
  type: ProjectType
  progress: number
  totalAmount: number
  paidAmount: number
  currency: string
  expectedDelivery: string | null
  updatedAt: string
  archivedAt: string | null
  /** The client's own uploaded LOGO/ICON/FAVICON, for the list icon. Null
      when they uploaded none, or none of them is an image. */
  logoAssetId: string | null
}

export type ProjectDetail = ProjectListItem & {
  description: string | null
  startDate: string | null
  actualDelivery: string | null
  deliveryMethod: DeliveryMethod
  sourceCodeOwnership: SourceCodeOwnership
  maintenanceEnabled: boolean
  organizationId: string
  createdAt: string
  /** Who entered this project. Null when that account has since been deleted. */
  createdByName: string | null
  createdByEmail: string | null
  /** Null for an agency-created project — see migration 0025b, projects.owner_id. */
  ownerId: string | null
}

type ProjectRow = {
  id: string
  organization_id: string
  client_id: string
  project_code: string
  name: string
  description: string | null
  type: ProjectType
  status: ProjectStatus
  progress: number
  start_date: string | null
  expected_delivery: string | null
  actual_delivery: string | null
  total_amount: number
  currency: string
  delivery_method: DeliveryMethod
  source_code_ownership: SourceCodeOwnership
  maintenance_enabled: boolean
  created_at: string
  updated_at: string
  archived_at: string | null
  clients: { id: string; name: string } | null
  profiles: { full_name: string | null; email: string } | null
}

/**
 * A NOTE ON THE `!constraint` HINTS BELOW.
 *
 * `projects` has TWO foreign keys to `clients`: the plain `client_id` and the
 * composite (client_id, organization_id) that pins a project to a client in
 * the same organization (migration 0005). PostgREST refuses an ambiguous
 * embed, so the relationship is named explicitly. Same reason for
 * payment_milestones -> payment_plans.
 *
 * `profiles` is the same story since migration 0025: `projects` now has two
 * FKs to it — `created_by` and `owner_id` — so a bare `profiles(...)` embed is
 * ambiguous (PGRST201). The base columns want the creator, named explicitly;
 * getMyProjectsWithCollaboration adds the `owner_id` side under its own alias.
 */
const PROJECT_COLUMNS =
  'id, organization_id, client_id, project_code, name, description, type, status, progress, ' +
  'start_date, expected_delivery, actual_delivery, total_amount, currency, delivery_method, ' +
  'source_code_ownership, maintenance_enabled, created_at, updated_at, archived_at, ' +
  'clients!projects_client_id_fkey(id, name), profiles!projects_created_by_fkey(full_name, email)'

/**
 * Paid totals for a set of projects, in one query.
 *
 * PostgREST cannot group-and-sum in a single embedded select without a
 * database view, and adding a `paid_amount` column to projects would
 * denormalise money into two places that can disagree — precisely what the
 * brief warns against. So: one extra round trip, summed here. The read is
 * RLS-scoped like everything else, so it can only ever see payments on
 * projects the caller may already read.
 */
async function paidByProject(projectIds: string[]): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map()

  const supabase = await createClient()
  const result = await supabase
    .from('payments')
    .select('project_id, amount')
    .eq('status', 'PAID')
    .in('project_id', projectIds)

  const rows = unwrapOr<{ project_id: string; amount: number }[]>(result, 'การชำระเงิน', [])
  return tallyBy(
    rows,
    (row) => row.project_id,
    (row) => row.amount,
  )
}

/**
 * The client's own uploaded mark for each project, for the list icon.
 *
 * Batched over every project on the page rather than queried per row — the
 * same reason paidByProject exists above.
 *
 * PREFERENCE ORDER: LOGO, then ICON, then FAVICON. A project that uploaded a
 * full logo and a favicon should be recognised by the logo; the favicon is
 * the fallback because it is the least legible at this size.
 *
 * Images only. A brand guideline PDF is a real asset but not something to
 * render as a 34px avatar, so those projects keep the generic icon.
 *
 * RLS-scoped like every other read here: `project_assets_select` is
 * `can_read_project`, so this can only return marks from projects the caller
 * already sees in the list itself.
 */
async function logoByProject(projectIds: string[]): Promise<Map<string, string>> {
  if (projectIds.length === 0) return new Map()

  const supabase = await createClient()
  const result = await supabase
    .from('project_assets')
    .select('id, project_id, kind, storage_path, mime_type, created_at')
    .in('project_id', projectIds)
    .in('kind', ['LOGO', 'ICON', 'FAVICON'])
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: false })

  const rows = unwrapOr<
    {
      id: string
      project_id: string
      kind: string
      storage_path: string | null
      mime_type: string | null
    }[]
  >(result, 'โลโก้โปรเจกต์', [])

  const RANK: Record<string, number> = { LOGO: 0, ICON: 1, FAVICON: 2 }
  const best = new Map<string, { id: string; rank: number }>()

  for (const row of rows) {
    if (!row.mime_type?.startsWith('image/')) continue
    const rank = RANK[row.kind] ?? 9
    const current = best.get(row.project_id)
    // Newest first from the query, so an equal rank keeps the newer upload.
    if (!current || rank < current.rank) best.set(row.project_id, { id: row.id, rank })
  }

  return new Map([...best].map(([projectId, value]) => [projectId, value.id]))
}

function toListItem(row: ProjectRow, paid: number, logoAssetId?: string | null): ProjectListItem {
  return {
    id: row.id,
    logoAssetId: logoAssetId ?? null,
    projectCode: row.project_code,
    name: row.name,
    clientId: row.client_id,
    clientName: row.clients?.name ?? '—',
    status: row.status,
    type: row.type,
    progress: row.progress ?? 0,
    totalAmount: row.total_amount ?? 0,
    paidAmount: paid,
    currency: row.currency ?? 'THB',
    expectedDelivery: row.expected_delivery,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  }
}

/**
 * Every project the caller may see, newest activity first.
 *
 * ARCHIVED PROJECTS ARE EXCLUDED BY DEFAULT, and the default is the important
 * part: archiving exists to take a project out of the active lists
 * (services/projects.ts), and the portal, the project switcher and the admin
 * inbox all depend on that. `includeArchived` is opt-in so a caller has to ask
 * for them deliberately — currently only the admin project list, which offers
 * an explicit "จัดเก็บแล้ว" view.
 *
 * Passing `includeArchived` widens nothing security-wise: RLS
 * (`projects_select_visible`) has never filtered on `archived_at` and does not
 * now, so this only decides which of the caller's OWN projects are listed.
 */
export async function getProjects(
  options: { limit?: number; includeArchived?: boolean } = {},
): Promise<ProjectListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select(PROJECT_COLUMNS)
    .order('updated_at', { ascending: false })

  if (!options.includeArchived) query = query.is('archived_at', null)

  if (options.limit) query = query.limit(options.limit)

  const rows = unwrapOr<ProjectRow[]>(await query, 'โปรเจกต์', [])
  const ids = rows.map((row) => row.id)
  const [paid, logos] = await Promise.all([paidByProject(ids), logoByProject(ids)])

  return rows.map((row) => toListItem(row, paid.get(row.id) ?? 0, logos.get(row.id) ?? null))
}

/**
 * The caller's own projects in the client portal.
 *
 * Identical to getProjects() for a client, because RLS already restricts the
 * result to their memberships. It exists as a separate name so portal code
 * reads as what it means, and so a future "only projects where I am
 * client_owner" refinement has one place to live.
 */
export async function getClientProjects(): Promise<ProjectListItem[]> {
  return getProjects()
}

export type OwnedProjectListItem = ProjectListItem & {
  /** Null for an agency-created project — see migration 0025b, projects.owner_id. */
  ownerId: string | null
  ownerName: string | null
  memberCount: number
  milestonesPaid: number
  milestonesTotal: number
}

/**
 * The client portal's "My Projects" — getClientProjects() enriched with
 * owner and member-count, for the project card grid (migration 0025's
 * frontend). A separate function rather than widening ProjectListItem
 * itself: ProjectsTable is shared with the admin side, which has no concept
 * of a self-serve owner, and every existing caller of getProjects()/
 * getClientProjects() should keep seeing exactly the shape it already does.
 */
export async function getMyProjectsWithCollaboration(): Promise<OwnedProjectListItem[]> {
  const { getMemberCounts } = await import('./collaboration')
  const { getMilestoneCounts } = await import('./payments')

  const supabase = await createClient()
  const result = await supabase
    .from('projects')
    .select(PROJECT_COLUMNS + ', owner_id, owner:profiles!projects_owner_id_fkey(full_name, email)')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })

  type Row = ProjectRow & {
    owner_id: string | null
    owner: { full_name: string | null; email: string } | null
  }

  const rows = unwrapOr<Row[]>(result, 'โปรเจกต์', [])
  const [paid, memberCounts, milestoneCounts] = await Promise.all([
    paidByProject(rows.map((row) => row.id)),
    getMemberCounts(rows.map((row) => row.id)),
    getMilestoneCounts(rows.map((row) => row.id)),
  ])

  return rows.map((row) => ({
    ...toListItem(row, paid.get(row.id) ?? 0),
    ownerId: row.owner_id,
    ownerName: row.owner?.full_name ?? row.owner?.email ?? null,
    memberCount: memberCounts.get(row.id) ?? 1,
    milestonesPaid: milestoneCounts.get(row.id)?.paid ?? 0,
    milestonesTotal: milestoneCounts.get(row.id)?.total ?? 0,
  }))
}

export type AdminInboxItem = ProjectListItem & {
  submittedAt: string | null
  memberCount: number
}

const INBOX_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION'] as const

/**
 * The Admin Project Inbox (docs/ADMIN_PROJECT_LIFECYCLE.md §2) — every
 * project a client has submitted for review, newest first. Staff-only by
 * virtue of the caller's session (RLS: `projects_select_visible` already
 * scopes to the caller's organization for staff); this function adds no
 * filtering RLS does not already enforce, only the status narrowing that
 * makes this "the inbox" rather than "every project".
 */
export async function getAdminProjectInbox(
  statuses: readonly ProjectStatus[] = INBOX_STATUSES,
): Promise<AdminInboxItem[]> {
  const { getMemberCounts } = await import('./collaboration')

  const supabase = await createClient()
  const result = await supabase
    .from('projects')
    .select(PROJECT_COLUMNS + ', submitted_at')
    .in('status', statuses)
    .is('archived_at', null)
    .order('submitted_at', { ascending: false, nullsFirst: false })

  type Row = ProjectRow & { submitted_at: string | null }
  const rows = unwrapOr<Row[]>(result, 'คำขอโปรเจกต์', [])

  const [paid, memberCounts] = await Promise.all([
    paidByProject(rows.map((row) => row.id)),
    getMemberCounts(rows.map((row) => row.id)),
  ])

  return rows.map((row) => ({
    ...toListItem(row, paid.get(row.id) ?? 0),
    submittedAt: row.submitted_at,
    memberCount: memberCounts.get(row.id) ?? 0,
  }))
}

export type ProjectSwitcherItem = { id: string; name: string; projectCode: string }

/**
 * The bare minimum for the sidebar's project switcher — id and name only,
 * no join to `clients`/`payments`/member counts. Deliberately separate from
 * `getMyProjectsWithCollaboration()`, which the "My Projects" page needs in
 * full: the switcher renders on every portal navigation (it lives in the
 * layout), so it stays as cheap as `getProjects()`'s own base query allows.
 */
export async function getMyProjectSwitcherList(): Promise<ProjectSwitcherItem[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('projects')
    .select('id, name, project_code')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })

  const rows = unwrapOr<{ id: string; name: string; project_code: string }[]>(result, 'โปรเจกต์', [])
  return rows.map((row) => ({ id: row.id, name: row.name, projectCode: row.project_code }))
}

/** One project, or null when it does not exist for this caller. */
export async function getProjectById(id: string): Promise<ProjectDetail | null> {
  const supabase = await createClient()

  const result = await supabase
    .from('projects')
    .select(PROJECT_COLUMNS + ', owner_id')
    .eq('id', id)
    .maybeSingle()
  const row = unwrapOr<(ProjectRow & { owner_id: string | null }) | null>(result, 'โปรเจกต์', null)
  if (!row) return null

  const paid = await paidByProject([row.id])

  return {
    ...toListItem(row, paid.get(row.id) ?? 0),
    description: row.description,
    startDate: row.start_date,
    actualDelivery: row.actual_delivery,
    deliveryMethod: row.delivery_method,
    sourceCodeOwnership: row.source_code_ownership,
    maintenanceEnabled: row.maintenance_enabled,
    organizationId: row.organization_id,
    createdAt: row.created_at,
    createdByName: row.profiles?.full_name ?? null,
    createdByEmail: row.profiles?.email ?? null,
    ownerId: row.owner_id,
  }
}

export type ProjectFeature = {
  id: string
  name: string
  description: string | null
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OUT_OF_SCOPE'
  isIncluded: boolean
}

/**
 * Scope items for a project, used as the delivery timeline.
 *
 * `project_features` belongs to one `project_scopes` VERSION, and
 * `saveScope()` (the wizard's Scope step) inserts a brand new version — never
 * updates one in place — on every save, exactly as migration 0006's own
 * design comment intends ("Scope is versioned rather than edited in place").
 * That is correct for the eventual "what did we agree to?" audit trail, but
 * it means every prior save's rows are still sitting in the table. Reading
 * `eq('project_id', ...)` with no version filter returned all of them at
 * once — a scope step re-saved four times during intake showed every item
 * four times over on the review screen. Scoping to the latest version is
 * what `saveScope`'s own docstring already promises ("Replaces the
 * project's scope items"); this is that promise kept on the read side,
 * using the identical "latest version" lookup `saveScope` uses to pick the
 * next one.
 */
export async function getProjectFeatures(projectId: string): Promise<ProjectFeature[]> {
  const supabase = await createClient()

  const { data: latestScope } = await supabase
    .from('project_scopes')
    .select('id')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>()
  if (!latestScope) return []

  const result = await supabase
    .from('project_features')
    .select('id, name, description, status, is_included, sort_order')
    .eq('scope_id', latestScope.id)
    .order('sort_order', { ascending: true })

  const rows = unwrapOr<
    {
      id: string
      name: string
      description: string | null
      status: ProjectFeature['status']
      is_included: boolean
    }[]
  >(result, 'ขอบเขตงาน', [])

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    isIncluded: row.is_included,
  }))
}

export type ProjectMember = {
  id: string
  profileId: string
  role: ProjectRole
  fullName: string | null
  email: string
  createdAt: string
}

/**
 * Who has access to this project, and as what.
 *
 * Reads `project_members` — the table that actually GRANTS a client access,
 * rather than the `clients` company record, which grants nothing. So this list
 * is the honest answer to "who can open this project", not a guess from the
 * customer's name.
 *
 * RLS (`project_members_select_project`) lets anyone who can read the project
 * read its member list, so the same query serves the admin detail page and the
 * client portal — a client sees who else is on their own project and nobody
 * else's.
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_members')
    // project_members has TWO foreign keys to profiles — `profile_id` (the
    // member) and `created_by` (the staffer who added them) — so a bare
    // `profiles(...)` embed is ambiguous and PostgREST rejects it outright
    // (PGRST201). Same reason as the clients hints in PROJECT_COLUMNS.
    .select('id, profile_id, role, created_at, profiles!project_members_profile_id_fkey(full_name, email)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  const rows = unwrapOr<
    {
      id: string
      profile_id: string
      role: ProjectRole
      created_at: string
      profiles: { full_name: string | null; email: string } | null
    }[]
  >(result, 'สมาชิกโปรเจกต์', [])

  return rows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    role: row.role,
    fullName: row.profiles?.full_name ?? null,
    email: row.profiles?.email ?? '',
    createdAt: row.created_at,
  }))
}

/** Portfolio totals used by both dashboards. */
export function summariseProjects(projects: readonly ProjectListItem[]) {
  const active = projects.filter(
    (p) => !['COMPLETED', 'CANCELLED', 'DRAFT'].includes(p.status),
  )
  const overdue = projects.filter(
    (p) =>
      p.status === 'OVERDUE' ||
      (p.expectedDelivery !== null &&
        new Date(p.expectedDelivery) < new Date() &&
        !['COMPLETED', 'CANCELLED'].includes(p.status)),
  )

  const total = sumBy(projects, (p) => p.totalAmount)
  const paid = sumBy(projects, (p) => p.paidAmount)

  return {
    count: projects.length,
    activeCount: active.length,
    overdueCount: overdue.length,
    totalAmount: total,
    paidAmount: paid,
    outstandingAmount: Math.max(0, total - paid),
  }
}

// -----------------------------------------------------------------------------
// Client intake (docs/ADMIN_PROJECT_REVIEW.md §1, migration 0030)
// -----------------------------------------------------------------------------
/**
 * Everything the wizard's steps 2, 4, 5, 6, 7 collected. A separate
 * function rather than widening `ProjectDetail`/`PROJECT_COLUMNS`: those
 * are read on every project page and every list, and the intake jsonb
 * blob has no business riding along on requests that never render it.
 */
export type ProjectIntake = {
  requirements: {
    goals: string | null
    targetAudience: string | null
    requiredFeatures: string[]
    requiredPages: string[]
    integrations: string[]
    authentication: string | null
    adminRequirements: string | null
    userRequirements: string | null
    technicalRequirements: string[]
    technology: string[]
    referenceLinks: string[]
    designPreferences: string | null
    brandColors: string[]
    fonts: string[]
    contentAvailability: string | null
    domainRequirements: string | null
    notes: string | null
  }
  requestedStartDate: string | null
  requestedDeadline: string | null
  proposedDeadline: string | null
  importantLaunchDate: string | null
  requestedDuration: string | null
  requestedPriority: string | null
  requestedBudgetMin: number | null
  requestedBudgetMax: number | null
  requestedBudgetPreferred: number | null
  requestedCurrency: string
  requestedPaymentPlan: {
    type: string
    milestones: { name: string; percentageBp: number; dueDate: string | null }[]
    notes?: string | null
  } | null
  requestedDelivery: string[]
  requestedDeliveryCustom: string[]
  /** Set only once, by submitProject() — see migration 0033. */
  intakeConfirmedAt: string | null
}

const EMPTY_REQUIREMENTS: ProjectIntake['requirements'] = {
  goals: null,
  targetAudience: null,
  requiredFeatures: [],
  requiredPages: [],
  integrations: [],
  authentication: null,
  adminRequirements: null,
  userRequirements: null,
  technicalRequirements: [],
  technology: [],
  referenceLinks: [],
  designPreferences: null,
  brandColors: [],
  fonts: [],
  contentAvailability: null,
  domainRequirements: null,
  notes: null,
}

const INTAKE_COLUMNS =
  'requirements, requested_start_date, requested_deadline, proposed_deadline, ' +
  'important_launch_date, requested_duration, requested_priority, ' +
  'requested_budget_min, requested_budget_max, requested_budget_preferred, requested_currency, ' +
  'requested_payment_plan, requested_delivery, intake_confirmed_at'

type IntakeRow = {
  requirements: Partial<ProjectIntake['requirements']> | null
  requested_start_date: string | null
  requested_deadline: string | null
  proposed_deadline: string | null
  important_launch_date: string | null
  requested_duration: string | null
  requested_priority: string | null
  requested_budget_min: number | null
  requested_budget_max: number | null
  requested_budget_preferred: number | null
  requested_currency: string
  requested_payment_plan: ProjectIntake['requestedPaymentPlan'] | null
  requested_delivery: string[] | null
  intake_confirmed_at: string | null
}

export async function getProjectIntake(projectId: string): Promise<ProjectIntake | null> {
  const supabase = await createClient()

  const result = await supabase.from('projects').select(INTAKE_COLUMNS).eq('id', projectId).maybeSingle<IntakeRow>()
  const data = unwrapOr<IntakeRow | null>(result, 'ข้อมูลโครงการ', null)
  if (!data) return null

  const rawDelivery = data.requested_delivery ?? []
  const KNOWN_DELIVERY_KEYS = new Set([
    'production_website',
    'source_code',
    'documentation',
    'domain_setup',
    'admin_access',
    'user_access',
    'training',
    'credentials',
    'maintenance',
  ])

  return {
    requirements: { ...EMPTY_REQUIREMENTS, ...(data.requirements ?? {}) },
    requestedStartDate: data.requested_start_date,
    requestedDeadline: data.requested_deadline,
    proposedDeadline: data.proposed_deadline,
    importantLaunchDate: data.important_launch_date,
    requestedDuration: data.requested_duration,
    requestedPriority: data.requested_priority,
    requestedBudgetMin: data.requested_budget_min,
    requestedBudgetMax: data.requested_budget_max,
    requestedBudgetPreferred: data.requested_budget_preferred,
    requestedCurrency: data.requested_currency ?? 'THB',
    requestedPaymentPlan: data.requested_payment_plan,
    // Split back into known keys (rendered via DELIVERY_ITEM_LABELS) and
    // custom free-entry strings (rendered as-is) — both were stored
    // together in the same jsonb array by saveDeliveryRequest.
    requestedDelivery: rawDelivery.filter((key) => KNOWN_DELIVERY_KEYS.has(key)),
    requestedDeliveryCustom: rawDelivery.filter((key) => !KNOWN_DELIVERY_KEYS.has(key)),
    intakeConfirmedAt: data.intake_confirmed_at,
  }
}

/**
 * The project's OFFICIAL brand — the agency's agreed palette and typefaces
 * (`projects.brand`, migration 0039).
 *
 * NOT `requirements.brandColors` / `requirements.fonts`: that is the CLIENT'S
 * ask, captured once at intake, and the two are kept apart for the same
 * reason the timeline keeps requested/proposed/agreed apart — agreeing a
 * different palette must never erase what the client originally asked for.
 *
 * Needs no policy of its own. `brand` rides on the `projects` row, so anyone
 * who can already read the project reads the brand with it, and only
 * `projects_update_staff` can write it.
 */
export async function getProjectBrand(projectId: string): Promise<ProjectBrand> {
  const supabase = await createClient()

  const result = await supabase
    .from('projects')
    .select('brand')
    .eq('id', projectId)
    .maybeSingle<{ brand: unknown }>()

  const data = unwrapOr<{ brand: unknown } | null>(result, 'ข้อมูลแบรนด์', null)
  return parseProjectBrand(data?.brand)
}
