import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type { DeploymentEnvironment, DeploymentStatus } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

/**
 * Deployment records (migration 0014).
 *
 * These are records ENTERED BY STAFF, not readings from a hosting provider.
 * No Vercel API call happens anywhere in this phase — when one is added it
 * fills these same columns, so nothing downstream changes.
 */

export type DeploymentListItem = {
  id: string
  projectId: string
  projectName: string | null
  environment: DeploymentEnvironment
  status: DeploymentStatus
  version: string | null
  url: string | null
  commitSha: string | null
  notes: string | null
  deployedAt: string | null
  createdAt: string
}

type DeploymentRow = {
  id: string
  project_id: string
  environment: DeploymentEnvironment
  status: DeploymentStatus
  version: string | null
  url: string | null
  commit_sha: string | null
  notes: string | null
  deployed_at: string | null
  created_at: string
  projects: { name: string } | null
}

export async function getDeployments(
  options: {
    projectId?: string
    environment?: DeploymentEnvironment | DeploymentEnvironment[]
    limit?: number
  } = {},
): Promise<DeploymentListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('project_deployments')
    .select(
      'id, project_id, environment, status, version, url, commit_sha, notes, deployed_at, ' +
        'created_at, projects(name)',
    )
    .order('created_at', { ascending: false })

  if (options.projectId) query = query.eq('project_id', options.projectId)
  if (Array.isArray(options.environment)) query = query.in('environment', options.environment)
  else if (options.environment) query = query.eq('environment', options.environment)
  if (options.limit) query = query.limit(options.limit)

  const rows = unwrapOr<DeploymentRow[]>(await query, 'การเผยแพร่', [])

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    environment: row.environment,
    status: row.status,
    version: row.version,
    url: row.url,
    commitSha: row.commit_sha,
    notes: row.notes,
    deployedAt: row.deployed_at,
    createdAt: row.created_at,
  }))
}
