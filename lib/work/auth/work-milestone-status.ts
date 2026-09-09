import 'server-only'

import type { WorkMilestoneStatus } from '@/lib/work/types/enums'

/**
 * The WORK milestone state machine (docs/PROJECT_TIMELINE.md §9).
 *
 * Same shape and same reasoning as lib/work/auth/project-status.ts: this file
 * is the ONE place the allowed transitions are written down, every action
 * that changes a work milestone's status calls `assertValidWorkTransition()`
 * before writing, and the UI hiding a button is never the rule — a direct
 * server-action call has to hit this too.
 *
 * Enforced in application code rather than a database trigger, consistent
 * with how project_status, payment_status and milestone_status already work
 * in this schema: the writers are few and individually guarded, and RLS is
 * what stops anyone bypassing them.
 */
export const WORK_MILESTONE_TRANSITIONS: Record<
  WorkMilestoneStatus,
  readonly WorkMilestoneStatus[]
> = {
  PENDING: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
  // COMPLETED is reachable directly ONLY when no client review is required —
  // that extra condition is not expressible in this table, so
  // completeWorkMilestone checks it separately. The edge exists here because
  // a milestone nobody has to sign off on legitimately goes straight to done.
  IN_PROGRESS: ['IN_REVIEW', 'COMPLETED', 'BLOCKED', 'CANCELLED'],
  IN_REVIEW: ['APPROVED', 'CHANGES_REQUESTED', 'BLOCKED', 'CANCELLED'],
  CHANGES_REQUESTED: ['IN_PROGRESS', 'CANCELLED'],
  APPROVED: ['COMPLETED', 'IN_PROGRESS', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  // Terminal. Reopening a completed milestone is a new milestone, not a
  // status change — otherwise "when was this done" stops meaning anything.
  COMPLETED: [],
  CANCELLED: [],
}

export class InvalidWorkMilestoneTransitionError extends Error {
  constructor(
    public readonly from: WorkMilestoneStatus,
    public readonly to: WorkMilestoneStatus,
  ) {
    super(`invalid work milestone transition: ${from} -> ${to}`)
    this.name = 'InvalidWorkMilestoneTransitionError'
  }
}

export function assertValidWorkTransition(
  from: WorkMilestoneStatus,
  to: WorkMilestoneStatus,
): void {
  if (WORK_MILESTONE_TRANSITIONS[from]?.includes(to)) return
  throw new InvalidWorkMilestoneTransitionError(from, to)
}

/** Statuses that still count as open work — what the deadline view asks about. */
export const OPEN_WORK_MILESTONE_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'BLOCKED',
] as const satisfies readonly WorkMilestoneStatus[]
