import 'server-only'

import { createClient } from '@/lib/work/supabase/server'
import { getProjectById, getProjectIntake } from '@/lib/work/queries/projects'
import type { WorkMilestoneReviewStatus, WorkMilestoneStatus } from '@/lib/work/types/enums'
import { unwrapOr } from './internal'

/**
 * Work milestones — the project EXECUTION timeline.
 *
 * Read-only, like every other file here. Nothing in this module writes, and
 * clients have SELECT and nothing else on `project_work_milestones`
 * (migration 0035) — a client calling PostgREST directly to move a deadline
 * matches no policy and the database refuses it.
 *
 * Kept in its own file rather than folded into queries/payments.ts on
 * purpose: payment milestones and work milestones are different entities
 * answering different questions, and one module reading both would be the
 * first step toward treating them as one.
 */

export type WorkMilestoneItem = {
  id: string
  projectId: string
  sequence: number
  title: string
  description: string | null
  /** Optional grouping band. Free text — a project may rename or omit it. */
  phase: string | null
  status: WorkMilestoneStatus
  startDate: string | null
  dueDate: string | null
  /** When work actually began, against which startDate is the plan. */
  startedAt: string | null
  submittedForReviewAt: string | null
  completedAt: string | null
  completedByName: string | null
  responsibleId: string | null
  responsibleName: string | null
  clientReviewRequired: boolean
  clientReviewStatus: WorkMilestoneReviewStatus
  clientReviewNote: string | null
  clientReviewedAt: string | null
  clientReviewedByName: string | null
  overrideReason: string | null
  overriddenAt: string | null
  notes: string | null
  /** OPTIONAL link to the money. Never implies anything about payment status. */
  paymentMilestoneId: string | null
  paymentMilestoneName: string | null
  paymentMilestoneAmount: number | null
  createdAt: string
}

type WorkMilestoneRow = {
  id: string
  project_id: string
  sequence: number
  title: string
  description: string | null
  phase: string | null
  status: WorkMilestoneStatus
  start_date: string | null
  due_date: string | null
  started_at: string | null
  submitted_for_review_at: string | null
  completed_at: string | null
  responsible_id: string | null
  client_review_required: boolean
  client_review_status: WorkMilestoneReviewStatus
  client_review_note: string | null
  client_reviewed_at: string | null
  override_reason: string | null
  overridden_at: string | null
  notes: string | null
  payment_milestone_id: string | null
  created_at: string
  responsible: { full_name: string | null; email: string | null } | null
  completer: { full_name: string | null; email: string | null } | null
  reviewer: { full_name: string | null; email: string | null } | null
  payment_milestones: { name: string; amount: number } | null
}

const WORK_MILESTONE_COLUMNS =
  'id, project_id, sequence, title, description, phase, status, start_date, due_date, ' +
  'started_at, submitted_for_review_at, completed_at, responsible_id, client_review_required, ' +
  'client_review_status, client_review_note, client_reviewed_at, override_reason, ' +
  'overridden_at, notes, payment_milestone_id, created_at, ' +
  'responsible:profiles!project_work_milestones_responsible_id_fkey(full_name, email), ' +
  'completer:profiles!project_work_milestones_completed_by_fkey(full_name, email), ' +
  'reviewer:profiles!project_work_milestones_client_reviewed_by_fkey(full_name, email), ' +
  'payment_milestones(name, amount)'

function personName(person: { full_name: string | null; email: string | null } | null) {
  return person?.full_name ?? person?.email ?? null
}

function toWorkMilestone(row: WorkMilestoneRow): WorkMilestoneItem {
  return {
    id: row.id,
    projectId: row.project_id,
    sequence: row.sequence,
    title: row.title,
    description: row.description,
    phase: row.phase,
    status: row.status,
    startDate: row.start_date,
    dueDate: row.due_date,
    startedAt: row.started_at,
    submittedForReviewAt: row.submitted_for_review_at,
    completedAt: row.completed_at,
    completedByName: personName(row.completer),
    responsibleId: row.responsible_id,
    responsibleName: personName(row.responsible),
    clientReviewRequired: row.client_review_required,
    clientReviewStatus: row.client_review_status,
    clientReviewNote: row.client_review_note,
    clientReviewedAt: row.client_reviewed_at,
    clientReviewedByName: personName(row.reviewer),
    overrideReason: row.override_reason,
    overriddenAt: row.overridden_at,
    notes: row.notes,
    paymentMilestoneId: row.payment_milestone_id,
    paymentMilestoneName: row.payment_milestones?.name ?? null,
    paymentMilestoneAmount: row.payment_milestones?.amount ?? null,
    createdAt: row.created_at,
  }
}

/** One project's timeline, in its stored order. RLS-scoped like everything here. */
export async function getWorkMilestones(projectId: string): Promise<WorkMilestoneItem[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('project_work_milestones')
    .select(WORK_MILESTONE_COLUMNS)
    .eq('project_id', projectId)
    .order('sequence', { ascending: true })

  const rows = unwrapOr<WorkMilestoneRow[]>(result, 'ไทม์ไลน์งาน', [])
  return rows.map(toWorkMilestone)
}

export type WorkProgress = {
  /** 0–100, COMPLETED over non-CANCELLED. Mirrors app.project_work_progress. */
  percent: number
  completed: number
  total: number
  /** Earliest still-open milestone — what the UI calls "next milestone". */
  next: WorkMilestoneItem | null
  /** Open milestones the client is currently being asked to sign off. */
  awaitingReview: WorkMilestoneItem[]
}

/**
 * Work progress, computed from the milestones in hand.
 *
 * DELIBERATELY NOT payment progress, and deliberately not written back into
 * `projects.progress` (a staff-set number, migration 0013). All three figures
 * are separate and may legitimately disagree — a project can be 60% built and
 * 40% paid, and the UI shows both rather than reconciling them.
 */
export function computeWorkProgress(milestones: WorkMilestoneItem[]): WorkProgress {
  const counted = milestones.filter((m) => m.status !== 'CANCELLED')
  const completed = counted.filter((m) => m.status === 'COMPLETED').length
  const total = counted.length

  const next =
    counted.find((m) => m.status === 'IN_REVIEW') ??
    counted.find((m) => m.status === 'IN_PROGRESS') ??
    counted.find((m) => m.status === 'CHANGES_REQUESTED') ??
    counted.find((m) => m.status === 'BLOCKED') ??
    counted.find((m) => m.status === 'PENDING') ??
    null

  return {
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    completed,
    total,
    next,
    awaitingReview: counted.filter(
      (m) => m.clientReviewRequired && m.clientReviewStatus === 'PENDING' && m.status === 'IN_REVIEW',
    ),
  }
}

/**
 * CLIENT REQUESTED vs ADMIN PROPOSED vs FINAL AGREED (§5).
 *
 * All three already exist as project columns — the intake wizard writes the
 * `requested_*` set once (migrations 0030/0033) and never rewrites it, admin's
 * counter-offer is `proposed_deadline`, and the agreed date is
 * `expected_delivery`. This only reads them side by side; nothing here
 * overwrites the client's original request.
 */
export type TimelineComparison = {
  clientRequested: {
    startDate: string | null
    deadline: string | null
    duration: string | null
    launchDate: string | null
  }
  adminProposed: { deadline: string | null }
  finalAgreed: { startDate: string | null; deadline: string | null }
}

export async function getTimelineComparison(projectId: string): Promise<TimelineComparison> {
  const [intake, project] = await Promise.all([getProjectIntake(projectId), getProjectById(projectId)])

  return {
    clientRequested: {
      startDate: intake?.requestedStartDate ?? null,
      deadline: intake?.requestedDeadline ?? null,
      duration: intake?.requestedDuration ?? null,
      launchDate: intake?.importantLaunchDate ?? null,
    },
    adminProposed: { deadline: intake?.proposedDeadline ?? null },
    finalAgreed: {
      startDate: project?.startDate ?? null,
      deadline: project?.expectedDelivery ?? null,
    },
  }
}

/**
 * Staff assignable to a milestone — the agency members on this project's
 * organization. Read under the caller's session, so a non-staff caller gets
 * nothing and the assign control simply has no options.
 */
export type AssignableMember = { id: string; name: string }

export async function getAssignableMembers(organizationId: string): Promise<AssignableMember[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('organization_members')
    .select('profile_id, profiles(full_name, email)')
    .eq('organization_id', organizationId)

  const rows = unwrapOr<
    { profile_id: string; profiles: { full_name: string | null; email: string | null } | null }[]
  >(result, 'สมาชิกทีมงาน', [])

  return rows.map((row) => ({
    id: row.profile_id,
    name: personName(row.profiles) ?? 'ไม่ทราบชื่อ',
  }))
}
