import 'server-only'

import { ACTIVITY_ACTIONS, type ActivityAction } from '@/lib/work/types/activity-actions'
import { createClient } from '@/lib/work/supabase/server'
import { unwrapOr } from './internal'

export type NotificationItem = {
  id: number
  action: ActivityAction
  /** Rendered from the SAME map activity entries use — one vocabulary. */
  title: string
  tone: string
  icon: string
  projectId: string | null
  projectName: string | null
  actorName: string | null
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

type NotificationRow = {
  id: number
  action: string
  entity_type: string
  entity_id: string | null
  project_id: string | null
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string
  projects: { name: string } | null
  actor: { full_name: string | null } | null
}

const COLUMNS =
  'id, action, entity_type, entity_id, project_id, metadata, read_at, created_at, ' +
  'projects(name), actor:profiles!notifications_actor_id_fkey(full_name)'

const FALLBACK = { title: 'มีความเคลื่อนไหวใหม่', icon: 'file', tone: 'blue' } as const

function present(action: string) {
  return ACTIVITY_ACTIONS[action as ActivityAction] ?? FALLBACK
}

/**
 * The current user's notifications.
 *
 * NO recipient filter is passed, deliberately. `notifications_select_own` is
 * `recipient_id = auth.uid()`, so the policy IS the filter — adding one in the
 * query would be a second answer that could drift from the first, and would
 * read as though the security lived here. A caller sees their own inbox and
 * nothing else, including on projects they share with colleagues.
 */
export async function getNotifications(
  options: { unreadOnly?: boolean; limit?: number } = {},
): Promise<NotificationItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('notifications')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 30)

  if (options.unreadOnly) query = query.is('read_at', null)

  const rows = unwrapOr<NotificationRow[]>(await query, 'การแจ้งเตือน', [])

  return rows.map((row) => {
    const presentation = present(row.action)
    return {
      id: row.id,
      action: row.action as ActivityAction,
      title: presentation.title,
      tone: presentation.tone,
      icon: presentation.icon,
      projectId: row.project_id,
      projectName: row.projects?.name ?? null,
      actorName: row.actor?.full_name ?? null,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: row.metadata ?? {},
      readAt: row.read_at,
      createdAt: row.created_at,
    }
  })
}

/**
 * Unread count for the badge.
 *
 * `head: true` so no rows cross the wire — this runs on every layout render.
 * RLS scopes it to the caller, same as above.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)

  if (error) {
    console.error('[notifications] unread count failed:', error)
    return 0
  }
  return count ?? 0
}
