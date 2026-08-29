import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import type {
  MilestoneStatus,
  PaymentMethod,
  PaymentPlanType,
  PaymentStatus,
} from '@/lib/work/types/enums'
import { sumBy, unwrapOr } from './internal'

/**
 * Payments, plans and milestones.
 *
 * Read-only. Nothing in this file writes, and no UI path exists that lets a
 * client change a payment: RLS gives them SELECT and nothing else (migration
 * 0010), so a client calling PostgREST directly to set status = 'PAID' is
 * refused by the database regardless of what the application does.
 */

export type PaymentListItem = {
  id: string
  projectId: string
  projectName: string
  clientName: string
  milestoneId: string | null
  milestoneName: string | null
  amount: number
  currency: string
  status: PaymentStatus
  method: PaymentMethod | null
  paidAt: string | null
  createdAt: string
}

type PaymentRow = {
  id: string
  project_id: string
  milestone_id: string | null
  amount: number
  currency: string
  status: PaymentStatus
  method: PaymentMethod | null
  paid_at: string | null
  created_at: string
  projects: { name: string; clients: { name: string } | null } | null
  payment_milestones: { name: string } | null
}

const PAYMENT_COLUMNS =
  'id, project_id, milestone_id, amount, currency, status, method, paid_at, created_at, ' +
  'projects(name, clients!projects_client_id_fkey(name)), payment_milestones(name)'

function toPayment(row: PaymentRow): PaymentListItem {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? '—',
    clientName: row.projects?.clients?.name ?? '—',
    milestoneId: row.milestone_id,
    milestoneName: row.payment_milestones?.name ?? null,
    amount: row.amount ?? 0,
    currency: row.currency ?? 'THB',
    status: row.status,
    method: row.method,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  }
}

/** Payments the caller may see. Pass a projectId to narrow to one project. */
export async function getPayments(
  options: { projectId?: string; limit?: number } = {},
): Promise<PaymentListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('payments')
    .select(PAYMENT_COLUMNS)
    .order('created_at', { ascending: false })

  if (options.projectId) query = query.eq('project_id', options.projectId)
  if (options.limit) query = query.limit(options.limit)

  const rows = unwrapOr<PaymentRow[]>(await query, 'การชำระเงิน', [])
  return rows.map(toPayment)
}

export type MilestoneListItem = {
  id: string
  projectId: string
  projectName: string
  clientName: string
  sequence: number
  name: string
  description: string | null
  amount: number
  currency: string
  percentageBp: number | null
  dueDate: string | null
  status: MilestoneStatus
  paidAt: string | null
}

type MilestoneRow = {
  id: string
  project_id: string
  sequence: number
  name: string
  description: string | null
  amount: number
  due_date: string | null
  status: MilestoneStatus
  percentage_bp: number | null
  paid_at: string | null
  payment_plans: { currency: string } | null
  projects: { name: string; clients: { name: string } | null } | null
}

const MILESTONE_COLUMNS =
  'id, project_id, sequence, name, description, amount, due_date, status, percentage_bp, ' +
  'paid_at, payment_plans!payment_milestones_plan_id_fkey(currency), ' +
  'projects(name, clients!projects_client_id_fkey(name))'

function toMilestone(row: MilestoneRow): MilestoneListItem {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? '—',
    clientName: row.projects?.clients?.name ?? '—',
    sequence: row.sequence,
    name: row.name,
    description: row.description,
    amount: row.amount ?? 0,
    currency: row.payment_plans?.currency ?? 'THB',
    percentageBp: row.percentage_bp,
    dueDate: row.due_date,
    status: row.status,
    paidAt: row.paid_at,
  }
}

export async function getMilestones(
  options: { projectId?: string; limit?: number } = {},
): Promise<MilestoneListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('payment_milestones')
    .select(MILESTONE_COLUMNS)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('sequence', { ascending: true })

  if (options.projectId) query = query.eq('project_id', options.projectId)
  if (options.limit) query = query.limit(options.limit)

  const rows = unwrapOr<MilestoneRow[]>(await query, 'ไมล์สโตน', [])
  return rows.map(toMilestone)
}

export type PaymentPlan = {
  id: string
  type: PaymentPlanType
  totalAmount: number
  currency: string
}

export type ProjectPaymentSummary = {
  plan: PaymentPlan | null
  milestones: MilestoneListItem[]
  payments: PaymentListItem[]
  total: number
  paid: number
  remaining: number
  currency: string
  /** Earliest milestone still owed — what the portal calls "next payment". */
  nextDue: MilestoneListItem | null
}

/**
 * Everything the payments view of one project needs, in one call.
 *
 * Totals are computed from the rows just read rather than from a stored
 * summary column, so "paid" cannot drift from the payments that make it up.
 */
export async function getProjectPaymentSummary(
  projectId: string,
): Promise<ProjectPaymentSummary> {
  const supabase = await createClient()

  // All three reads are independent — awaiting the plan first cost a round
  // trip of latency for nothing.
  const [planResult, milestones, payments] = await Promise.all([
    supabase
      .from('payment_plans')
      .select('id, type, total_amount, currency')
      .eq('project_id', projectId)
      .maybeSingle(),
    getMilestones({ projectId }),
    getPayments({ projectId }),
  ])

  const planRow = unwrapOr<{
    id: string
    type: PaymentPlanType
    total_amount: number
    currency: string
  } | null>(planResult, 'แผนการชำระเงิน', null)

  const paid = sumBy(
    payments.filter((p) => p.status === 'PAID'),
    (p) => p.amount,
  )

  // Prefer the plan total; fall back to the milestone sum when no plan exists
  // yet, so a project priced only by milestones still reports honestly.
  const total = planRow?.total_amount ?? sumBy(milestones, (m) => m.amount)
  const currency = planRow?.currency ?? milestones[0]?.currency ?? 'THB'

  const nextDue =
    milestones.find((m) => m.status === 'OVERDUE') ??
    milestones.find((m) => m.status === 'INVOICED') ??
    milestones.find((m) => m.status === 'PENDING') ??
    null

  return {
    plan: planRow
      ? {
          id: planRow.id,
          type: planRow.type,
          totalAmount: planRow.total_amount,
          currency: planRow.currency,
        }
      : null,
    milestones,
    payments,
    total,
    paid,
    remaining: Math.max(0, total - paid),
    currency,
    nextDue,
  }
}

/** Revenue rolled up by calendar month, for the dashboard chart. */
export type MonthlyRevenue = {
  /** ISO year-month, e.g. "2026-08". */
  month: string
  label: string
  paid: number
  pending: number
}

const MONTH_LABELS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

/**
 * The last `months` calendar months, including empty ones.
 *
 * Empty months are included deliberately: a chart that silently omits a month
 * with no revenue misrepresents a gap as a shorter timeline.
 */
export async function getMonthlyRevenue(months = 12): Promise<MonthlyRevenue[]> {
  const supabase = await createClient()

  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCMonth(start.getUTCMonth() - (months - 1))

  const result = await supabase
    .from('payments')
    .select('amount, status, paid_at, created_at')
    .gte('created_at', start.toISOString())

  const rows = unwrapOr<
    { amount: number; status: PaymentStatus; paid_at: string | null; created_at: string }[]
  >(result, 'รายได้', [])

  const buckets = new Map<string, { paid: number; pending: number }>()
  for (let i = 0; i < months; i++) {
    const date = new Date(start)
    date.setUTCMonth(start.getUTCMonth() + i)
    buckets.set(monthKey(date), { paid: 0, pending: 0 })
  }

  for (const row of rows) {
    // A paid payment belongs to the month the money arrived; anything else to
    // the month it was raised.
    const when = row.status === 'PAID' ? (row.paid_at ?? row.created_at) : row.created_at
    const bucket = buckets.get(monthKey(new Date(when)))
    if (!bucket) continue

    if (row.status === 'PAID') bucket.paid += row.amount ?? 0
    else if (row.status === 'PENDING' || row.status === 'PROCESSING')
      bucket.pending += row.amount ?? 0
  }

  return [...buckets.entries()].map(([month, value]) => ({
    month,
    label: MONTH_LABELS[Number(month.slice(5, 7)) - 1],
    paid: value.paid,
    pending: value.pending,
  }))
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}
