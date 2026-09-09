import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { assertValidTransition, InvalidStatusTransitionError } from '@/lib/work/auth/project-status'
import type { ProjectStatus } from '@/lib/work/types/enums'
import type { ActivityAction } from '@/lib/work/types/activity-actions'

/**
 * Closes a milestone once the PAID payments recorded against it cover its
 * amount.
 *
 * Shared by the two places money can settle a milestone: the Stripe webhook
 * (app/work/api/payments/webhook/route.ts) and a staff-recorded out-of-band
 * payment (recordManualPayment, services/payments.ts). One function means
 * "when is a milestone actually paid" has exactly one answer regardless of
 * which path the money came through — a bank transfer entered by staff
 * settles a milestone by the same rule a card payment does.
 *
 * Derived from the payment rows rather than assumed from the one just
 * inserted, so a milestone split across a deposit and a top-up (one via
 * Stripe, one by bank transfer) settles correctly, and a part-payment leaves
 * the milestone honestly outstanding.
 */
export async function settleMilestoneIfCovered(
  client: SupabaseClient,
  milestoneId: string,
): Promise<void> {
  const { data: milestone } = await client
    .from('payment_milestones')
    .select('id, amount, status')
    .eq('id', milestoneId)
    .maybeSingle<{ id: string; amount: number; status: string }>()

  if (!milestone || milestone.status === 'PAID' || milestone.status === 'CANCELLED') return

  const { data: paid } = await client
    .from('payments')
    .select('amount')
    .eq('milestone_id', milestoneId)
    .eq('status', 'PAID')

  const total = ((paid ?? []) as { amount: number }[]).reduce(
    (sum, row) => sum + (row.amount ?? 0),
    0,
  )

  if (total < (milestone.amount ?? 0)) return

  const { error } = await client
    .from('payment_milestones')
    .update({ status: 'PAID', paid_at: new Date().toISOString() })
    .eq('id', milestoneId)

  if (error) throw new Error(`failed to settle milestone: ${error.message}`)
}

/**
 * The ฿250 rule (docs/PAYMENT_PLAN.md §3/§7): once the start-payment milestone
 * is actually PAID, a project sitting in WAITING_FOR_DEPOSIT advances to
 * READY_TO_START. The final READY_TO_START -> IN_PROGRESS step stays a
 * deliberate admin action (startProject) — this only clears the payment gate.
 *
 * Runs from BOTH money paths, always with a privileged client:
 *   - the Stripe webhook (no session; already uses the admin client)
 *   - verifyManualPayment (an accountant, whose own session cannot UPDATE
 *     projects — can_manage_project is admin/developer only)
 *
 * so the caller passes `admin` explicitly rather than this reaching for a
 * session. Idempotent: the `.eq('status', 'WAITING_FOR_DEPOSIT')` guard means
 * a second call (Stripe retry, re-verification) is a no-op, and a project
 * already further along is never dragged backwards.
 *
 * Writes its own audit entries directly (actor_id may be null — the same
 * "system-originated" shape activity_logs already documents for webhooks).
 */
export async function advanceProjectOnStartPayment(
  admin: SupabaseClient,
  milestoneId: string,
  actorId?: string | null,
): Promise<{ advanced: boolean }> {
  const { data: milestone } = await admin
    .from('payment_milestones')
    .select('id, project_id, status, is_start_payment')
    .eq('id', milestoneId)
    .maybeSingle<{
      id: string
      project_id: string
      status: string
      is_start_payment: boolean
    }>()

  if (!milestone || !milestone.is_start_payment || milestone.status !== 'PAID') {
    return { advanced: false }
  }

  const { data: project } = await admin
    .from('projects')
    .select('id, organization_id, status')
    .eq('id', milestone.project_id)
    .maybeSingle<{ id: string; organization_id: string; status: ProjectStatus }>()

  if (!project) return { advanced: false }

  const paidAmount = await verifiedPaidAmount(admin, project.id)

  // The requirement is "met" the moment ฿250 has verifiably arrived, whatever
  // the project status — logged once so the timeline shows it even if the
  // status transition below is a no-op (project already past the gate).
  await logSystemActivity(admin, {
    organizationId: project.organization_id,
    projectId: project.id,
    actorId,
    action: 'project.payment_requirement_met',
    entityType: 'project',
    entityId: project.id,
    metadata: { milestoneId, verifiedPaidAmount: paidAmount, minimum: 25000 },
  })

  if (project.status !== 'WAITING_FOR_DEPOSIT') return { advanced: false }

  try {
    assertValidTransition('WAITING_FOR_DEPOSIT', 'READY_TO_START')
  } catch (error) {
    if (error instanceof InvalidStatusTransitionError) return { advanced: false }
    throw error
  }

  const { error, count } = await admin
    .from('projects')
    .update({ status: 'READY_TO_START' }, { count: 'exact' })
    .eq('id', project.id)
    .eq('status', 'WAITING_FOR_DEPOSIT')

  if (error) throw new Error(`failed to advance project after start payment: ${error.message}`)
  if (!count) return { advanced: false }

  await logSystemActivity(admin, {
    organizationId: project.organization_id,
    projectId: project.id,
    actorId,
    action: 'project.ready_to_start',
    entityType: 'project',
    entityId: project.id,
    metadata: { via: 'start_payment', milestoneId },
  })

  return { advanced: true }
}

/** PAID-payment total for a project, minor units — mirrors app.project_verified_paid_amount. */
async function verifiedPaidAmount(client: SupabaseClient, projectId: string): Promise<number> {
  const { data } = await client
    .from('payments')
    .select('amount')
    .eq('project_id', projectId)
    .eq('status', 'PAID')

  return ((data ?? []) as { amount: number }[]).reduce((sum, row) => sum + (row.amount ?? 0), 0)
}

/**
 * Append an audit entry from a context that has no user session (webhook) or
 * whose session cannot reach `public.log_activity` (an accountant advancing a
 * project). Inserts straight into `activity_logs` with the privileged client —
 * `actor_id` nullable is the documented "system-originated" case (migration
 * 0012). Never throws: a missed audit line must not fail the payment that
 * already settled (same rule as services/activity.ts).
 */
async function logSystemActivity(
  admin: SupabaseClient,
  input: {
    organizationId: string
    projectId: string
    actorId?: string | null
    action: ActivityAction
    entityType: string
    entityId?: string | null
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  try {
    const actorId = input.actorId ?? null
    const { data: profile } = actorId
      ? await admin.from('profiles').select('email').eq('id', actorId).maybeSingle<{ email: string }>()
      : { data: null }

    const { error } = await admin.from('activity_logs').insert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      actor_id: actorId,
      actor_email: profile?.email ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    })
    if (error) console.error('[settle] failed to log', input.action, error)
  } catch (error) {
    console.error('[settle] failed to log', input.action, error)
  }
}
