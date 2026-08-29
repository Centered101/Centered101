import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import { unwrapOr } from './internal'

/**
 * The activity feed, read from `activity_logs`.
 *
 * Entries are written by `app.log_activity()` inside the same transaction as
 * the mutation they describe (migration 0012), so this feed cannot show an
 * event that did not happen or miss one that did. It is append-only in the
 * database; there is no write function here on purpose — writes go through
 * `logActivity()` in the services layer, next to the mutation.
 */

export type ActivityItem = {
  id: number
  action: string
  entityType: string
  entityId: string | null
  projectId: string | null
  actorEmail: string | null
  actorName: string | null
  metadata: Record<string, unknown>
  createdAt: string
  /** Presentation, derived from `action` — see ACTION_LABELS. */
  title: string
  icon: 'payment' | 'check' | 'branch' | 'file'
  tone: 'blue' | 'green' | 'violet' | 'orange'
}

type ActivityRow = {
  id: number
  action: string
  entity_type: string
  entity_id: string | null
  project_id: string | null
  actor_email: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  profiles: { full_name: string | null } | null
  projects: { name: string } | null
}

/**
 * How each action reads in the feed.
 *
 * Keyed by the dotted verb the database stores. An unknown action still
 * renders — with its raw verb — rather than being dropped: a missing audit
 * entry is worse than an ugly one.
 */
const ACTION_LABELS: Record<string, { title: string; icon: ActivityItem['icon']; tone: ActivityItem['tone'] }> = {
  'project.created': { title: 'สร้างโปรเจกต์', icon: 'file', tone: 'violet' },
  'project.updated': { title: 'อัปเดตโปรเจกต์', icon: 'file', tone: 'blue' },
  'project.status_changed': { title: 'เปลี่ยนสถานะโปรเจกต์', icon: 'check', tone: 'blue' },
  'client.created': { title: 'เพิ่มลูกค้าใหม่', icon: 'file', tone: 'violet' },
  'member.invited': { title: 'เชิญสมาชิกทีม', icon: 'check', tone: 'violet' },
  'member.role_changed': { title: 'เปลี่ยนบทบาทสมาชิก', icon: 'check', tone: 'blue' },
  'member.removed': { title: 'นำสมาชิกออกจากทีม', icon: 'check', tone: 'orange' },
  'payment.created': { title: 'สร้างรายการชำระเงิน', icon: 'payment', tone: 'blue' },
  'payment.succeeded': { title: 'ได้รับการชำระเงิน', icon: 'payment', tone: 'green' },
  'payment.failed': { title: 'การชำระเงินไม่สำเร็จ', icon: 'payment', tone: 'orange' },
  'milestone.completed': { title: 'ไมล์สโตนเสร็จสมบูรณ์', icon: 'check', tone: 'green' },
  'invoice.created': { title: 'ออกใบแจ้งหนี้', icon: 'file', tone: 'blue' },
  'document.created': { title: 'เพิ่มเอกสาร', icon: 'file', tone: 'blue' },
  'deployment.created': { title: 'เผยแพร่สำเร็จ', icon: 'branch', tone: 'violet' },
  'change_request.created': { title: 'คำขอเปลี่ยนแปลงใหม่', icon: 'file', tone: 'orange' },
  'maintenance.updated': { title: 'อัปเดตแพ็กเกจดูแลรักษา', icon: 'check', tone: 'green' },
}

function toActivity(row: ActivityRow): ActivityItem {
  const label = ACTION_LABELS[row.action] ?? {
    title: row.action,
    icon: 'file' as const,
    tone: 'blue' as const,
  }

  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    projectId: row.project_id,
    actorEmail: row.actor_email,
    actorName: row.profiles?.full_name ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    title: label.title,
    icon: label.icon,
    tone: label.tone,
  }
}

/** The detail line under an entry: project name, amount, or whoever acted. */
export function activityDetail(item: ActivityItem, projectName?: string | null): string {
  const parts: string[] = []
  if (projectName) parts.push(projectName)

  const name = item.metadata.name ?? item.metadata.title
  if (typeof name === 'string' && name) parts.push(name)

  if (parts.length === 0 && (item.actorName || item.actorEmail)) {
    parts.push(item.actorName ?? item.actorEmail ?? '')
  }

  return parts.join(' · ') || '—'
}

/**
 * Where an entry should take you, or null when there is nowhere useful to go.
 *
 * TWO PORTALS, TWO ANSWERS. The admin project page shows milestones,
 * deployments and the edit form on one screen, so every entry lands there. The
 * client portal splits the same project across tabs, so the entity type
 * decides which tab — sending a client to the overview when they clicked
 * "ได้รับการชำระเงิน" would make them hunt for what they just clicked.
 *
 * Returns null rather than a guess for organization-level entries (a new
 * client, a role change): they have no project, and the admin list pages they
 * belong to are not addressable by entity id yet. A dead link is worse than
 * plain text.
 */
export function activityHref(
  item: Pick<ActivityItem, 'projectId' | 'entityType' | 'metadata'>,
  portal: 'admin' | 'portal',
): string | null {
  if (!item.projectId) return null

  if (portal === 'admin') return `/work/admin/projects/${item.projectId}`

  const base = `/work/portal/projects/${item.projectId}`

  switch (item.entityType) {
    case 'payment':
    case 'milestone':
      return `${base}/payments`
    case 'document':
    case 'invoice':
      return `${base}/documents`
    case 'change_request':
      return `${base}/change-requests`
    case 'deployment': {
      // Preview and production are different tabs for a client. The
      // environment is recorded by createDeployment(); entries written before
      // that, or by a seed, may not carry it — those go to the overview rather
      // than to a guess.
      const environment = item.metadata.environment
      if (environment === 'PRODUCTION') return `${base}/deployment`
      if (environment === 'PREVIEW' || environment === 'STAGING') return `${base}/preview`
      return base
    }
    default:
      return base
  }
}

export async function getActivity(
  options: { projectId?: string; limit?: number } = {},
): Promise<(ActivityItem & { projectName: string | null })[]> {
  const supabase = await createClient()

  let query = supabase
    .from('activity_logs')
    .select(
      'id, action, entity_type, entity_id, project_id, actor_email, metadata, created_at, ' +
        'profiles(full_name), projects(name)',
    )
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 20)

  if (options.projectId) query = query.eq('project_id', options.projectId)

  const rows = unwrapOr<ActivityRow[]>(await query, 'กิจกรรม', [])

  return rows.map((row) => ({
    ...toActivity(row),
    projectName: row.projects?.name ?? null,
  }))
}
