import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import { getProjectIntake } from '@/lib/work/queries/projects'
import { getMilestones } from '@/lib/work/queries/payments'
import type { PaymentPlanChangeStatus } from '@/lib/work/types/enums'
import type { MilestoneListItem, PaymentPlan } from './payments'
import { unwrapOr } from './internal'

/**
 * The admin's Payment Plan Comparison (docs/PAYMENT_PLAN.md §1).
 *
 * `clientProposal` is `projects.requested_payment_plan` (migration 0030),
 * captured once by the intake wizard — informational, never written into the
 * real `payment_plans`/`payment_milestones` tables it is compared against.
 * `officialPlan` is the current LIVE plan, if admin has drafted one.
 *
 * This never silently prefers one over the other: both are returned as-is,
 * and it is the UI's job to render them side by side and let a person decide.
 */
export type PaymentPlanComparison = {
  clientProposal: {
    type: string
    milestones: { name: string; percentageBp: number; dueDate: string | null }[]
    notes: string | null
  } | null
  clientBudget: {
    min: number | null
    max: number | null
    preferred: number | null
    currency: string
  }
  officialPlan: (PaymentPlan & { milestones: MilestoneListItem[] }) | null
}

export async function getPaymentPlanComparison(projectId: string): Promise<PaymentPlanComparison> {
  const supabase = await createClient()

  const [intake, planResult, milestones] = await Promise.all([
    getProjectIntake(projectId),
    supabase
      .from('payment_plans')
      .select('id, type, total_amount, currency, status, version, accepted_by, accepted_at')
      .eq('project_id', projectId)
      .not('status', 'in', '(SUPERSEDED,DECLINED)')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getMilestones({ projectId }),
  ])

  const planRow = unwrapOr<{
    id: string
    type: PaymentPlan['type']
    total_amount: number
    currency: string
    status: PaymentPlan['status']
    version: number
    accepted_by: string | null
    accepted_at: string | null
  } | null>(planResult, 'แผนการชำระเงิน', null)

  return {
    clientProposal: intake?.requestedPaymentPlan
      ? {
          type: intake.requestedPaymentPlan.type,
          milestones: intake.requestedPaymentPlan.milestones,
          notes: intake.requestedPaymentPlan.notes ?? null,
        }
      : null,
    clientBudget: {
      min: intake?.requestedBudgetMin ?? null,
      max: intake?.requestedBudgetMax ?? null,
      preferred: intake?.requestedBudgetPreferred ?? null,
      currency: intake?.requestedCurrency ?? 'THB',
    },
    officialPlan: planRow
      ? {
          id: planRow.id,
          type: planRow.type,
          totalAmount: planRow.total_amount,
          currency: planRow.currency,
          status: planRow.status,
          version: planRow.version,
          acceptedBy: planRow.accepted_by,
          acceptedAt: planRow.accepted_at,
          milestones,
        }
      : null,
  }
}

export type PaymentPlanChangeRequestItem = {
  id: string
  projectId: string
  planId: string | null
  planVersion: number | null
  requestedByName: string | null
  message: string
  status: PaymentPlanChangeStatus
  resolvedByName: string | null
  resolvedAt: string | null
  resolutionNote: string | null
  createdAt: string
}

type ChangeRequestRow = {
  id: string
  project_id: string
  plan_id: string | null
  message: string
  status: PaymentPlanChangeStatus
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
  payment_plans: { version: number } | null
  requester: { full_name: string | null; email: string | null } | null
  resolver: { full_name: string | null; email: string | null } | null
}

const CHANGE_REQUEST_COLUMNS =
  'id, project_id, plan_id, message, status, resolved_at, resolution_note, created_at, ' +
  'payment_plans(version), ' +
  'requester:profiles!payment_plan_change_requests_requested_by_fkey(full_name, email), ' +
  'resolver:profiles!payment_plan_change_requests_resolved_by_fkey(full_name, email)'

function toChangeRequest(row: ChangeRequestRow): PaymentPlanChangeRequestItem {
  return {
    id: row.id,
    projectId: row.project_id,
    planId: row.plan_id,
    planVersion: row.payment_plans?.version ?? null,
    requestedByName: row.requester?.full_name ?? row.requester?.email ?? null,
    message: row.message,
    status: row.status,
    resolvedByName: row.resolver?.full_name ?? row.resolver?.email ?? null,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
  }
}

/** Every change request on one project, newest first — open ones surface first in the UI. */
export async function getPaymentPlanChangeRequests(
  projectId: string,
): Promise<PaymentPlanChangeRequestItem[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('payment_plan_change_requests')
    .select(CHANGE_REQUEST_COLUMNS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  const rows = unwrapOr<ChangeRequestRow[]>(result, 'คำขอเปลี่ยนแปลงแผนการชำระเงิน', [])
  return rows.map(toChangeRequest)
}
