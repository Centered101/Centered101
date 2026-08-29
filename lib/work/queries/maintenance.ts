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
