import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type { MaintenanceBillingCycle, MaintenanceStatus } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

/** Maintenance retainers (migration 0014). One plan per project. */

export type MaintenancePlan = {
  id: string
  projectId: string
  projectName: string | null
  clientName: string | null
  name: string
  status: MaintenanceStatus
  billingCycle: MaintenanceBillingCycle
  priceAmount: number
  currency: string
  services: string[]
  startedOn: string | null
  nextBillingDate: string | null
}

type MaintenanceRow = {
  id: string
  project_id: string
  name: string
  status: MaintenanceStatus
  billing_cycle: MaintenanceBillingCycle
  price_amount: number
  currency: string
  services: unknown
  started_on: string | null
  next_billing_date: string | null
  projects: { name: string; clients: { name: string } | null } | null
}

// Thai labels for these live in lib/work/format.ts with every other enum's.

function toPlan(row: MaintenanceRow): MaintenancePlan {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    clientName: row.projects?.clients?.name ?? null,
    name: row.name,
    status: row.status,
    billingCycle: row.billing_cycle,
    priceAmount: row.price_amount ?? 0,
    currency: row.currency ?? 'THB',
    // jsonb, so the shape is only as good as what was written. Filter to
    // strings rather than trusting it into the DOM.
    services: Array.isArray(row.services) ? row.services.filter((s) => typeof s === 'string') : [],
    startedOn: row.started_on,
    nextBillingDate: row.next_billing_date,
  }
}

const MAINTENANCE_COLUMNS =
  'id, project_id, name, status, billing_cycle, price_amount, currency, services, ' +
  'started_on, next_billing_date, projects(name, clients!projects_client_id_fkey(name))'

export async function getMaintenancePlans(
  options: { projectId?: string } = {},
): Promise<MaintenancePlan[]> {
  const supabase = await createClient()

  let query = supabase
    .from('maintenance_plans')
    .select(MAINTENANCE_COLUMNS)
    .order('next_billing_date', { ascending: true, nullsFirst: false })

  if (options.projectId) query = query.eq('project_id', options.projectId)

  const rows = unwrapOr<MaintenanceRow[]>(await query, 'การดูแลรักษา', [])
  return rows.map(toPlan)
}

export async function getMaintenancePlan(projectId: string): Promise<MaintenancePlan | null> {
  const plans = await getMaintenancePlans({ projectId })
  return plans[0] ?? null
}

export type MaintenanceRecord = {
  id: string
  planId: string | null
  planName: string | null
  title: string
  description: string | null
  performedOn: string
  minutesSpent: number | null
  performedByName: string | null
  createdAt: string
}

type MaintenanceRecordRow = {
  id: string
  plan_id: string | null
  title: string
  description: string | null
  performed_on: string
  minutes_spent: number | null
  created_at: string
  maintenance_plans: { name: string } | null
  performer: { full_name: string | null } | null
}

/**
 * What maintenance work was actually PERFORMED (migration 0042).
 *
 * Distinct from `getMaintenancePlans`, which is what is BILLED. Clients read
 * their own history — `maintenance_records_select` is `app.can_read_project`,
 * so a caller with no access to the project gets an empty list rather than an
 * error, exactly like every other read here.
 */
export async function getMaintenanceRecords(
  projectId: string,
  limit = 100,
): Promise<MaintenanceRecord[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('maintenance_records')
    .select(
      'id, plan_id, title, description, performed_on, minutes_spent, created_at, ' +
        'maintenance_plans(name), performer:profiles!maintenance_records_performed_by_fkey(full_name)',
    )
    .eq('project_id', projectId)
    .order('performed_on', { ascending: false })
    .limit(limit)

  const rows = unwrapOr<MaintenanceRecordRow[]>(result, 'ประวัติงานดูแลรักษา', [])

  return rows.map((row) => ({
    id: row.id,
    planId: row.plan_id,
    planName: row.maintenance_plans?.name ?? null,
    title: row.title,
    description: row.description,
    performedOn: row.performed_on,
    minutesSpent: row.minutes_spent,
    performedByName: row.performer?.full_name ?? null,
    createdAt: row.created_at,
  }))
}
