import 'server-only'

import { getAccessContext } from '@/lib/work/auth/permissions'
import { createClient } from '@/lib/work/supabase/server'
import type { UnlockableResource } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

/**
 * Which resources a project's PAID milestones have unlocked.
 *
 * A milestone's `unlock_rules` (migration 0009) is a JSON array of resource
 * keys — "this milestone, once paid, unlocks these tabs". This unions the
 * rules of every milestone whose status is PAID; a milestone that is only
 * INVOICED or PENDING unlocks nothing yet, on purpose — the whole point of a
 * milestone-gated unlock is that it gates.
 *
 * RLS-scoped like every other read here: a client asking about a project they
 * cannot see gets an empty result, not an error.
 */
export async function getUnlockedResources(projectId: string): Promise<Set<UnlockableResource>> {
  const supabase = await createClient()

  const result = await supabase
    .from('payment_milestones')
    .select('unlock_rules')
    .eq('project_id', projectId)
    .eq('status', 'PAID')

  const rows = unwrapOr<{ unlock_rules: UnlockableResource[] }[]>(result, 'เงื่อนไขการปลดล็อก', [])

  const unlocked = new Set<UnlockableResource>()
  for (const row of rows) {
    for (const resource of row.unlock_rules ?? []) unlocked.add(resource)
  }
  return unlocked
}

/**
 * Whether ONE resource is reachable for the CURRENT caller on this project.
 *
 * Staff always see everything — they are the ones doing the work and
 * confirming it is ready, which has to be possible before a client has paid
 * for it. Only a client is actually gated, and only by what their milestones'
 * `unlock_rules` say is paid for. This is a product/billing gate, distinct
 * from `requireProjectAccess()`: failing it means "not yet", not "not
 * yours" — pages that use it show a locked state, never notFound() or a
 * redirect.
 */
export async function isResourceUnlocked(
  projectId: string,
  resource: UnlockableResource,
): Promise<boolean> {
  const context = await getAccessContext()
  if (context?.kind === 'staff') return true

  const unlocked = await getUnlockedResources(projectId)
  return unlocked.has(resource)
}
