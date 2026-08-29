import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type { ChangeRequestPriority, ChangeRequestStatus } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

/** Change requests (migration 0014). Clients raise them; staff price and decide. */

export type ChangeRequestItem = {
  id: string
  projectId: string
  projectName: string | null
  requestCode: string | null
  title: string
  description: string | null
  status: ChangeRequestStatus
  priority: ChangeRequestPriority
  estimatedAmount: number | null
  currency: string
  requestedByName: string | null
  requestedByEmail: string | null
  createdAt: string
  resolvedAt: string | null
}

type ChangeRequestRow = {
  id: string
  project_id: string
  request_code: string | null
  title: string
  description: string | null
  status: ChangeRequestStatus
  priority: ChangeRequestPriority
  estimated_amount: number | null
  currency: string
  created_at: string
  resolved_at: string | null
  projects: { name: string } | null
  profiles: { full_name: string | null; email: string } | null
}

// Thai labels for these live in lib/work/format.ts with every other enum's,
// so there is one place to search when auditing user-facing copy. A query
// module is an unexpected home for UI strings.

export async function getChangeRequests(
  options: { projectId?: string; limit?: number } = {},
): Promise<ChangeRequestItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('change_requests')
    .select(
      'id, project_id, request_code, title, description, status, priority, estimated_amount, ' +
        'currency, created_at, resolved_at, projects(name), profiles(full_name, email)',
    )
    .order('created_at', { ascending: false })

  if (options.projectId) query = query.eq('project_id', options.projectId)
  if (options.limit) query = query.limit(options.limit)

  const rows = unwrapOr<ChangeRequestRow[]>(await query, 'คำขอเปลี่ยนแปลง', [])

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    requestCode: row.request_code,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    estimatedAmount: row.estimated_amount,
    currency: row.currency ?? 'THB',
    requestedByName: row.profiles?.full_name ?? null,
    requestedByEmail: row.profiles?.email ?? null,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }))
}
