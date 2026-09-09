import 'server-only'

import type { ProjectStatus } from '@/lib/work/types/enums'

/**
 * The project status state machine (docs/ADMIN_PROJECT_REVIEW.md §2–3).
 *
 * THIS IS THE ONE PLACE the allowed transitions are written down. Every
 * status-changing server action calls `assertValidTransition()` before
 * writing — never a bare `.update({ status })`. "Do not implement these
 * transitions only in the UI" (the brief's own words) means this file has
 * to be the thing that actually refuses an illegal jump, not a disabled
 * button that a direct server-action call could route around.
 *
 * This is enforced in application code, not a database CHECK constraint or
 * trigger — consistent with how every other status field in this schema
 * already works (payment_milestones.status, payments.status,
 * agreement_status): the actions that write status are few, named, and
 * already individually guarded (requireCapability, requireProjectAccess),
 * and RLS is what stops anyone from bypassing those actions entirely, the
 * same belt-and-braces split used everywhere else. A DB-level transition
 * trigger would duplicate this exact table for no additional safety this
 * schema doesn't already have another way.
 */
export const PROJECT_STATUS_TRANSITIONS: Partial<Record<ProjectStatus, readonly ProjectStatus[]>> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'NEEDS_INFORMATION', 'CANCELLED'],
  NEEDS_INFORMATION: ['SUBMITTED'],
  UNDER_REVIEW: ['QUOTATION_DRAFT', 'NEEDS_INFORMATION', 'CANCELLED'],
  QUOTATION_DRAFT: ['QUOTATION_SENT'],
  QUOTATION_SENT: ['AWAITING_CLIENT_APPROVAL'],
  // AWAITING_DEPOSIT in the brief's own vocabulary — this codebase's
  // existing, unrenamed equivalent is WAITING_FOR_DEPOSIT (see the earlier
  // admin-lifecycle audit's mapping table).
  AWAITING_CLIENT_APPROVAL: ['WAITING_FOR_DEPOSIT', 'QUOTATION_DRAFT'],
  WAITING_FOR_DEPOSIT: ['READY_TO_START'],
  READY_TO_START: ['IN_PROGRESS'],
  IN_PROGRESS: ['IN_REVIEW'],
  IN_REVIEW: ['CLIENT_APPROVAL', 'IN_PROGRESS'],
  CLIENT_APPROVAL: ['READY_FOR_DELIVERY', 'IN_REVIEW'],
  READY_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['MAINTENANCE', 'COMPLETED'],
  MAINTENANCE: ['COMPLETED'],
}

/**
 * Admin's own override path — "Admin may archive/cancel according to
 * business rules" (§3). Deliberately SEPARATE from the strict graph above:
 * a normal client-driven or automatic transition must follow the graph
 * exactly, but staff closing out a project for a reason the graph doesn't
 * anticipate (a client went silent mid-development, a dispute) is a real,
 * legitimate need the graph should not have to enumerate every path to.
 * Used only by `rejectProject` today, and only from the states a rejection
 * actually makes sense from.
 */
export const ADMIN_OVERRIDE_TRANSITIONS: Partial<Record<ProjectStatus, readonly ProjectStatus[]>> = {
  SUBMITTED: ['CANCELLED'],
  UNDER_REVIEW: ['CANCELLED'],
  NEEDS_INFORMATION: ['CANCELLED'],
}

export class InvalidStatusTransitionError extends Error {
  constructor(
    public readonly from: ProjectStatus,
    public readonly to: ProjectStatus,
  ) {
    super(`invalid project status transition: ${from} -> ${to}`)
    this.name = 'InvalidStatusTransitionError'
  }
}

/**
 * Throws `InvalidStatusTransitionError` unless `from -> to` is a legal edge
 * in either the normal graph or the admin override table. Callers still
 * scope their own UPDATE with `.eq('status', from)` afterward — this check
 * decides whether the ATTEMPT is legal at all; the database `.eq` is what
 * makes a concurrent status change (someone else moved it in between) fail
 * safely instead of silently overwriting a status this check never saw.
 */
export function assertValidTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  options: { allowAdminOverride?: boolean } = {},
): void {
  const allowed = PROJECT_STATUS_TRANSITIONS[from] ?? []
  if (allowed.includes(to)) return

  if (options.allowAdminOverride) {
    const overrides = ADMIN_OVERRIDE_TRANSITIONS[from] ?? []
    if (overrides.includes(to)) return
  }

  throw new InvalidStatusTransitionError(from, to)
}
