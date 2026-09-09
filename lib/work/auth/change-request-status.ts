import 'server-only'

import type { ChangeRequestStatus } from '@/lib/work/types/enums'

/**
 * The change-request state machine.
 *
 * Same shape and same reasoning as lib/work/auth/project-status.ts and
 * work-milestone-status.ts: this file is the ONE place the allowed transitions
 * are written down, every action that moves a request calls
 * `assertValidChangeRequestTransition()` first, and no action writes `status`
 * from a form field.
 *
 * The eight statuses were defined in migration 0016 and are unchanged — this
 * only says which moves between them are legal:
 *
 *      OPEN ──────────► UNDER_REVIEW ──► QUOTED ──► APPROVED ──► IN_PROGRESS
 *        │                   │  │            │          │             │
 *        │                   │  └────────────┴──────────┴──► REJECTED │
 *        │                   ▼                                        ▼
 *        │                 OPEN  (more information needed)        COMPLETED
 *        ▼
 *    CANCELLED
 *
 * UNDER_REVIEW -> OPEN is "we need more information from you": it deliberately
 * returns the request to the client's court rather than inventing a ninth
 * status, and the reason travels in `decision_reason` where the client reads
 * it.
 *
 * QUOTED is skippable. A change with no cost goes straight to APPROVED; making
 * every request carry a price would force a fictitious zero onto work that was
 * never billed.
 */
export const CHANGE_REQUEST_TRANSITIONS: Record<ChangeRequestStatus, ChangeRequestStatus[]> = {
  OPEN: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['QUOTED', 'APPROVED', 'REJECTED', 'OPEN', 'CANCELLED'],
  QUOTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  // Terminal. Re-opening a decided request would make "when was this rejected"
  // stop meaning anything; the answer is a new request that references it.
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
}

/** Statuses that end the request's life — used to decide what to still offer. */
export const TERMINAL_CHANGE_REQUEST_STATUSES: ChangeRequestStatus[] = [
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
]

export class InvalidChangeRequestTransitionError extends Error {
  constructor(
    public readonly from: ChangeRequestStatus,
    public readonly to: ChangeRequestStatus,
  ) {
    super(`invalid change request transition: ${from} -> ${to}`)
    this.name = 'InvalidChangeRequestTransitionError'
  }
}

export function assertValidChangeRequestTransition(
  from: ChangeRequestStatus,
  to: ChangeRequestStatus,
): void {
  if (!CHANGE_REQUEST_TRANSITIONS[from]?.includes(to)) {
    throw new InvalidChangeRequestTransitionError(from, to)
  }
}

export function canTransitionChangeRequest(
  from: ChangeRequestStatus,
  to: ChangeRequestStatus,
): boolean {
  return CHANGE_REQUEST_TRANSITIONS[from]?.includes(to) ?? false
}
