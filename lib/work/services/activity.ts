import 'server-only'

import { createClient } from '@/lib/work/supabase/server'

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
  action: string
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
  } catch (error) {
    console.error('[activity] failed to log', input.action, error)
  }
}
