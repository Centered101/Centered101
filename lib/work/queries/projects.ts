import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type {
  DeliveryMethod,
  ProjectStatus,
  ProjectType,
  SourceCodeOwnership,
} from '@/lib/work/types/enums'
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
  clients: { id: string; name: string } | null
}

/**
 * A NOTE ON THE `!constraint` HINTS BELOW.
 *
 * `projects` has TWO foreign keys to `clients`: the plain `client_id` and the
 * composite (client_id, organization_id) that pins a project to a client in
 * the same organization (migration 0005). PostgREST refuses an ambiguous
 * embed, so the relationship is named explicitly. Same reason for
 * payment_milestones -> payment_plans.
 */
const PROJECT_COLUMNS =
  'id, organization_id, client_id, project_code, name, description, type, status, progress, ' +
  'start_date, expected_delivery, actual_delivery, total_amount, currency, delivery_method, ' +
  'source_code_ownership, maintenance_enabled, created_at, updated_at, ' +
  'clients!projects_client_id_fkey(id, name)'

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

function toListItem(row: ProjectRow, paid: number): ProjectListItem {
  return {
    id: row.id,
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
  }
}

/** Every project the caller may see, newest activity first. */
export async function getProjects(options: { limit?: number } = {}): Promise<ProjectListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select(PROJECT_COLUMNS)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })

  if (options.limit) query = query.limit(options.limit)

  const rows = unwrapOr<ProjectRow[]>(await query, 'โปรเจกต์', [])
  const paid = await paidByProject(rows.map((row) => row.id))

  return rows.map((row) => toListItem(row, paid.get(row.id) ?? 0))
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

/** One project, or null when it does not exist for this caller. */
export async function getProjectById(id: string): Promise<ProjectDetail | null> {
  const supabase = await createClient()

  const result = await supabase.from('projects').select(PROJECT_COLUMNS).eq('id', id).maybeSingle()
  const row = unwrapOr<ProjectRow | null>(result, 'โปรเจกต์', null)
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
  }
}

export type ProjectFeature = {
  id: string
  name: string
  description: string | null
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OUT_OF_SCOPE'
  isIncluded: boolean
}

/** Scope items for a project, used as the delivery timeline. */
export async function getProjectFeatures(projectId: string): Promise<ProjectFeature[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_features')
    .select('id, name, description, status, is_included, sort_order')
    .eq('project_id', projectId)
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

// A getProjectMembers() lived here with no callers — no screen lists project
// members yet. Bring it back with the screen that needs it, rather than
// leaving an untested query to rot.

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
