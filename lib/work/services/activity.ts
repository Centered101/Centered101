import 'server-only'

import { getUser } from '@/lib/work/auth/session'
import { createClient } from '@/lib/work/supabase/server'
import type { ActivityAction } from '@/lib/work/types/activity-actions'
import { fanOutNotifications } from './notifications'

/**
 * Audit writing.
 *
 * Calls `public.log_activity()`, the authorization-checking wrapper added in
 * migration 0016. The actor is taken from the session inside the function, so
 * nothing here can attribute an action to another user.
 *
 * FAILS QUIETLY, ON PURPOSE. A mutation that succeeded must not be reported to
 * the user as failed because its audit entry did not write — the data is
 * already committed, and an error toast would be a lie. The failure goes to
 * the server log, where an operator can see it.
 *
 * That trade-off is only acceptable because this is a supporting trail, not a
 * financial ledger. Payment records are written as rows, transactionally, and
 * never depend on this path.
 */
export async function logActivity(input: {
  organizationId: string
  /** Union, not string: an action with no label in ACTIVITY_ACTIONS is a
      compile error rather than a raw dotted verb in someone's feed. */
  action: ActivityAction
  entityType: string
  entityId?: string | null
  projectId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('log_activity', {
      p_organization_id: input.organizationId,
      p_action: input.action,
      p_entity_type: input.entityType,
      p_entity_id: input.entityId ?? null,
      p_project_id: input.projectId ?? null,
      p_metadata: input.metadata ?? {},
    })
    if (error) console.error('[activity] failed to log', input.action, error)

    // ONE integration point for notifications (Phase 9), here rather than a
    // notify() call in each of the ~40 service functions that log. A fan-out
    // that must be remembered at every call site is one that gets forgotten at
    // some of them, and the routing table then stops describing reality.
    //
    // Runs AFTER the audit write and never blocks it: most actions route to
    // nobody and return immediately, and fanOutNotifications swallows its own
    // failures for the same reason this function does.
    const user = await getUser()
    await fanOutNotifications({
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      actorId: user?.id ?? null,
    })
  } catch (error) {
    console.error('[activity] failed to log', input.action, error)
  }
}
