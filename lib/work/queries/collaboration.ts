import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type { ProjectInvitationStatus, ProjectMemberStatus, ProjectRole } from '@/lib/work/types/enums'
import { tallyBy, unwrapOr } from './internal'

/**
 * Self-serve project collaboration reads — members and invitations.
 *
 * RLS-scoped like every other query in this codebase: `project_members_select_project`
 * already lets anyone who can read a project see everyone else on it, and
 * `project_invitations_select_managers` / `_select_own` (migration 0026)
 * split "who can see who was invited" the same way.
 */

export type ProjectMemberListItem = {
  id: string
  profileId: string
  name: string
  email: string
  role: ProjectRole
  status: ProjectMemberStatus
  joinedAt: string
}

type MemberRow = {
  id: string
  profile_id: string
  role: ProjectRole
  status: ProjectMemberStatus
  created_at: string
  profiles: { full_name: string | null; email: string } | null
}

export async function getProjectMembersList(projectId: string): Promise<ProjectMemberListItem[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_members')
    .select(
      'id, profile_id, role, status, created_at, ' +
        'profiles!project_members_profile_id_fkey(full_name, email)',
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  const rows = unwrapOr<MemberRow[]>(result, 'สมาชิกโปรเจกต์', [])

  return rows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    name: row.profiles?.full_name ?? row.profiles?.email ?? '—',
    email: row.profiles?.email ?? '—',
    role: row.role,
    status: row.status,
    joinedAt: row.created_at,
  }))
}

/**
 * Member counts for a set of projects in one query — the same batched shape
 * `paidByProject` uses in queries/projects.ts, for the same reason (no
 * per-row round trip on a list page).
 */
export async function getMemberCounts(projectIds: string[]): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map()

  const supabase = await createClient()
  const result = await supabase
    .from('project_members')
    .select('project_id')
    .eq('status', 'ACTIVE')
    .in('project_id', projectIds)

  const rows = unwrapOr<{ project_id: string }[]>(result, 'สมาชิก', [])
  return tallyBy(
    rows,
    (row) => row.project_id,
    () => 1,
  )
}

export type ProjectInvitationListItem = {
  id: string
  projectId: string
  projectName: string
  email: string
  role: ProjectRole
  status: ProjectInvitationStatus
  invitedByName: string | null
  expiresAt: string
  createdAt: string
}

type InvitationRow = {
  id: string
  project_id: string
  email: string
  role: ProjectRole
  status: ProjectInvitationStatus
  expires_at: string
  created_at: string
  projects: { name: string } | null
  profiles: { full_name: string | null; email: string } | null
}

const INVITATION_COLUMNS =
  'id, project_id, email, role, status, expires_at, created_at, ' +
  'projects(name), profiles!project_invitations_invited_by_fkey(full_name, email)'

/** Every invitation issued on one project — for its Members/Invitations tab. */
export async function getProjectInvitations(projectId: string): Promise<ProjectInvitationListItem[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_invitations')
    .select(INVITATION_COLUMNS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  const rows = unwrapOr<InvitationRow[]>(result, 'คำเชิญ', [])
  return rows.map(toInvitation)
}

/**
 * Invitations addressed to the CURRENT user's own verified email — this is
 * what "Login -> Invitations" reads. Never accepts an email parameter: the
 * RLS policy behind this (`project_invitations_select_own`) already scopes
 * to `profiles.email` for `auth.uid()`, so there is nothing for this
 * function to filter by that RLS would not already enforce.
 */
export async function getMyPendingInvitations(): Promise<ProjectInvitationListItem[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_invitations')
    .select(INVITATION_COLUMNS)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  const rows = unwrapOr<InvitationRow[]>(result, 'คำเชิญ', [])
  // Expiry is evaluated here, at read time, the same reasoning
  // queries/share-links.ts documents for its own status computation — a
  // React render must stay pure, so "is this expired yet" cannot live there.
  return rows
    .filter((row) => new Date(row.expires_at).getTime() > Date.now())
    .map(toInvitation)
}

function toInvitation(row: InvitationRow): ProjectInvitationListItem {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? '—',
    email: row.email,
    role: row.role,
    status: row.status,
    invitedByName: row.profiles?.full_name ?? row.profiles?.email ?? null,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}
