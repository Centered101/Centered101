'use server'

import { revalidatePath } from 'next/cache'

import { getUser } from '@/lib/work/auth/session'
import { createAdminClient } from '@/lib/work/supabase/admin'
import { createClient } from '@/lib/work/supabase/server'
import { audienceFor } from '@/lib/work/notifications/routing'
import type { ActivityAction } from '@/lib/work/types/activity-actions'

export type NotificationActionState = {
  error?: string
  message?: string
}

/**
 * Creates one notification per recipient for an event that has ALREADY
 * happened and already been audited.
 *
 * WHY THE PRIVILEGED CLIENT. `notifications` has no INSERT policy at all — by
 * design, so that no request shape lets a caller choose who gets notified.
 * Only the service client can write here, and it is used strictly to deliver a
 * message about an action the caller was already authorized to perform and
 * that `log_activity` already recorded from their session. It decides nothing.
 *
 * WHO gets it comes from `NOTIFICATION_ROUTING` and from the database — the
 * project's ACTIVE members and the organization's managers — never from
 * anything the caller supplied. `projectId` is the only input, and by the time
 * this runs the caller has already been authorized against that exact project
 * by the action that called it.
 *
 * THE ACTOR IS NEVER NOTIFIED. Being told about your own click is noise.
 *
 * NEVER THROWS. A missing notification must not fail a mutation that already
 * committed — the same rule `logActivity` follows, and for the same reason.
 */
export async function fanOutNotifications(input: {
  organizationId: string
  projectId: string | null
  action: ActivityAction
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
  actorId: string | null
}): Promise<void> {
  try {
    const audience = audienceFor(input.action)
    // Most actions notify nobody. That is the common path.
    if (!audience) return
    // Every routed action is project-scoped; an org-level event has no
    // project audience to resolve.
    if (!input.projectId) return

    const admin = createAdminClient()
    const recipients = new Set<string>()

    if (audience === 'client' || audience === 'both') {
      const { data } = await admin
        .from('project_members')
        .select('profile_id, role, status')
        .eq('project_id', input.projectId)
        .eq('status', 'ACTIVE')
        .in('role', ['OWNER', 'client_owner', 'client_member'])

      for (const row of data ?? []) recipients.add(row.profile_id as string)
    }

    if (audience === 'staff' || audience === 'both') {
      // Project managers, NOT accountants: they do not act on scope and
      // delivery events, and a badge for something you cannot do anything
      // about is noise that teaches people to ignore the badge.
      const { data } = await admin
        .from('organization_members')
        .select('profile_id, role')
        .eq('organization_id', input.organizationId)
        .in('role', ['super_admin', 'admin', 'developer'])

      for (const row of data ?? []) recipients.add(row.profile_id as string)
    }

    if (input.actorId) recipients.delete(input.actorId)
    if (recipients.size === 0) return

    const rows = [...recipients].map((recipientId) => ({
      organization_id: input.organizationId,
      project_id: input.projectId,
      recipient_id: recipientId,
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    }))

    const { error } = await admin.from('notifications').insert(rows)
    if (error) console.error('[notifications] fan-out failed', input.action, error)
  } catch (error) {
    console.error('[notifications] fan-out failed', input.action, error)
  }
}

/**
 * Marks one notification read.
 *
 * Runs under the CALLER'S session on purpose: `notifications_update_own` is
 * what decides the row is theirs, and `guard_notification_update` is what
 * decides only `read_at` may move. Passing an id belonging to somebody else
 * matches no row — not an error, simply nothing — so there is no way to
 * probe another person's inbox by id.
 */
export async function markNotificationRead(
  _prev: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const user = await getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง' }

  const rawId = String(formData.get('notificationId') ?? '')
  const notificationId = Number(rawId)
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return { error: 'คำขอไม่ถูกต้อง' }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() }, { count: 'exact' })
    .eq('id', notificationId)
    // Belt and braces beside the policy: this also makes the intent explicit
    // at the call site rather than only in the migration.
    .eq('recipient_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('[notifications] mark read failed:', error)
    return { error: 'ไม่สามารถอัปเดตการแจ้งเตือนได้' }
  }
  // Zero rows means "not yours, or already read" — both are fine outcomes for
  // an idempotent action, so this is not reported as a failure.
  if (!count) return { message: 'อ่านแล้ว' }

  revalidatePath('/work/admin/dashboard')
  revalidatePath('/work/portal')
  return { message: 'ทำเครื่องหมายว่าอ่านแล้ว' }
}

/** Marks every unread notification of the CURRENT user read. */
export async function markAllNotificationsRead(
  _prev: NotificationActionState,
  _formData: FormData,
): Promise<NotificationActionState> {
  const user = await getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('[notifications] mark all read failed:', error)
    return { error: 'ไม่สามารถอัปเดตการแจ้งเตือนได้' }
  }

  revalidatePath('/work/admin/dashboard')
  revalidatePath('/work/portal')
  return { message: 'ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว' }
}
