import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import {
  ACTIVITY_ACTIONS,
  UNKNOWN_ACTIVITY,
  type ActivityPresentation,
} from '@/lib/work/types/activity-actions'
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
  /** Presentation, derived from `action` — see ACTIVITY_ACTIONS. */
  title: string
  icon: ActivityPresentation['icon']
  tone: ActivityPresentation['tone']
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

function toActivity(row: ActivityRow): ActivityItem {
  // A row whose action has no label is one written before that action was
  // renamed or removed; it still renders, minus a title only a developer
  // could read. New actions cannot reach here — ACTIVITY_ACTIONS is what
  // `logActivity()` accepts, so the compiler rejects an unlabelled one.
  const label: ActivityPresentation =
    ACTIVITY_ACTIONS[row.action as keyof typeof ACTIVITY_ACTIONS] ?? UNKNOWN_ACTIVITY

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

  // `metadata.name` is most often the project's own name, which the line
  // above already carries — "5555 · 5555" was the common case rather than
  // the exception.
  const name = item.metadata.name ?? item.metadata.title
  if (typeof name === 'string' && name && name !== projectName) parts.push(name)

  // The raw verb, for the one case where the title had to drop it. Here
  // rather than in the title because this line is already the technical
  // one, and an operator reading the same feed still needs to see it.
  if (!(item.action in ACTIVITY_ACTIONS)) parts.push(item.action)

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

/**
 * Groups of related actions, so a filter can say "payments" rather than
 * listing eleven dotted verbs. Derived from the action PREFIX, which is why
 * the `entity.verb` naming convention is worth keeping.
 */
export const ACTIVITY_CATEGORIES = {
  project: ['project'],
  payment: ['payment', 'payment_plan', 'invoice'],
  work: ['work_milestone', 'milestone'],
  delivery: ['deliverable', 'handover', 'publishing', 'source_code', 'deployment'],
  documents: ['document', 'brand', 'asset'],
  change: ['change_request'],
  maintenance: ['maintenance'],
  people: ['member', 'invitation', 'profile', 'auth'],
} as const

export type ActivityCategory = keyof typeof ACTIVITY_CATEGORIES

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  project: 'โปรเจกต์',
  payment: 'การเงิน',
  work: 'งาน',
  delivery: 'ส่งมอบ/เผยแพร่',
  documents: 'เอกสาร/แบรนด์',
  change: 'คำขอเปลี่ยนแปลง',
  maintenance: 'ดูแลรักษา',
  people: 'ผู้ใช้งาน',
}

/**
 * Activity, optionally filtered and paged.
 *
 * EVERY filter here is a convenience, never a permission. `activity_logs` has
 * two SELECT policies — staff see their organization, a client sees only their
 * own projects' entries (0012, widened to self-serve owners in 0039) — so a
 * caller who passes another project's id gets an empty list from RLS, not from
 * this code. Removing every filter below would not widen what anybody can see.
 *
 * `before` is a keyset cursor on `created_at`, which the existing
 * `activity_logs_project_time_idx` / `activity_logs_org_time_idx` already
 * serve; no OFFSET, so page 50 costs what page 1 costs.
 */
export async function getActivity(
  options: {
    projectId?: string
    limit?: number
    /** Restrict to one category (see ACTIVITY_CATEGORIES). */
    category?: ActivityCategory
    /** Keyset cursor: return entries strictly older than this timestamp. */
    before?: string
  } = {},
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
  if (options.before) query = query.lt('created_at', options.before)

  if (options.category) {
    // `action` is `entity.verb`, so a category is a set of prefixes and this
    // is an OR of `like` patterns rather than a fragile enumeration of every
    // action that exists today.
    const prefixes = ACTIVITY_CATEGORIES[options.category]
    query = query.or(prefixes.map((prefix) => `action.like.${prefix}.%`).join(','))
  }

  const rows = unwrapOr<ActivityRow[]>(await query, 'กิจกรรม', [])

  return rows.map((row) => ({
    ...toActivity(row),
    projectName: row.projects?.name ?? null,
  }))
}

/**
 * The most recent "please provide more information" request on a project
 * (docs/ADMIN_PROJECT_REVIEW.md §6) — read straight from `activity_logs`
 * (`project.information_requested`, written by `requestMoreInformation`)
 * rather than a dedicated column, since this is a message TO the client
 * about ONE past event, not current project state. Null once the project
 * has moved on (a later status means this note is no longer "the reason
 * you're blocked" even if it is still in the log).
 */
export async function getLatestInformationRequest(projectId: string): Promise<string | null> {
  const supabase = await createClient()

  const result = await supabase
    .from('activity_logs')
    .select('metadata')
    .eq('project_id', projectId)
    .eq('action', 'project.information_requested')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ metadata: { note?: string } }>()

  const row = unwrapOr<{ metadata: { note?: string } } | null>(result, 'คำขอข้อมูลเพิ่มเติม', null)
  return row?.metadata?.note ?? null
}
