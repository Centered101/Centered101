import type { ActivityAction } from '@/lib/work/types/activity-actions'

/**
 * WHO should hear about each event.
 *
 * The fan-out is driven by this table and nothing else, which is why
 * `logActivity` needed one integration point rather than a `notify()` call
 * scattered through eight service files: a notification that must be
 * remembered at every call site is a notification that will be forgotten at
 * one of them.
 *
 *   'client' — the project's client side: ACTIVE client_owner / client_member
 *              members, plus the self-serve OWNER.
 *   'staff'  — the organization's project managers: super_admin / admin /
 *              developer. NOT accountants: they are not notified about scope
 *              and delivery events they cannot act on, and Phase 8 already
 *              established they do not decide these.
 *   'both'   — genuinely two-sided moments.
 *
 * ACTIONS ABSENT FROM THIS MAP NOTIFY NOBODY, deliberately. Most of the ~120
 * activity actions are routine bookkeeping; notifying on all of them would
 * train everyone to ignore the badge, which is worse than having none. Only
 * events that need somebody to DO something, or that they would want to know
 * happened to their money or their project, are here.
 */
export type NotificationAudience = 'client' | 'staff' | 'both'

export const NOTIFICATION_ROUTING: Partial<Record<ActivityAction, NotificationAudience>> = {
  // ---- intake and review: the client is waiting on a person -----------------
  'project.submitted': 'staff',
  'project.information_requested': 'client',
  'project.approved_for_quotation': 'client',
  'project.rejected': 'client',

  // ---- quotation and payment plan -----------------------------------------
  'agreement.sent': 'client',
  'agreement.changes_requested': 'staff',
  'payment_plan.created': 'client',
  'payment_plan.accepted': 'staff',
  'payment_plan.changes_requested': 'staff',
  'payment_plan.change_request_resolved': 'client',

  // ---- money. Both sides care, always. ------------------------------------
  'payment.succeeded': 'both',
  'payment.failed': 'both',
  'payment.received': 'both',
  'payment.recorded_manual': 'client',
  'project.payment_requirement_met': 'both',
  'project.ready_to_start': 'both',

  // ---- work milestones (Phase 4) ------------------------------------------
  'work_milestone.submitted_for_review': 'client',
  'work_milestone.approved': 'staff',
  'work_milestone.changes_requested': 'staff',
  'work_milestone.blocked': 'staff',

  // ---- documents and source code (Phases 5-6) ------------------------------
  'document.visibility_changed': 'client',
  'source_code.attached': 'client',
  'publishing.published': 'client',

  // ---- delivery and handover (Phase 7) ------------------------------------
  'deliverable.delivered': 'client',
  'handover.completed': 'client',
  'handover.acknowledged': 'staff',

  // ---- change requests (Phase 8) ------------------------------------------
  'change_request.created': 'staff',
  'change_request.quoted': 'client',
  'change_request.approved': 'client',
  'change_request.rejected': 'client',
  'change_request.information_requested': 'client',
  'change_request.completed': 'client',

  // ---- maintenance (Phase 8) ----------------------------------------------
  'maintenance.record_created': 'client',
  'maintenance.status_changed': 'client',
}

export function audienceFor(action: ActivityAction): NotificationAudience | null {
  return NOTIFICATION_ROUTING[action] ?? null
}
