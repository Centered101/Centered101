/**
 * TypeScript mirrors of the PostgreSQL enum types.
 *
 * These are hand-written rather than generated, because `supabase gen types`
 * needs a personal access token and a migrated remote project — neither of
 * which exists yet. To stop them drifting from the schema in the meantime,
 * `npm run db:validate` compares every union below against `pg_enum` in a real
 * database and fails if they disagree. They are checked, not merely intended.
 *
 * When the remote project is migrated and typed:
 *   npx supabase gen types typescript --project-id <ref> > lib/types/database.ts
 * `database.ts` then becomes the source of truth for table row shapes; this
 * file stays as the ergonomic, importable enum surface.
 */

export const ORG_ROLES = ['super_admin', 'admin', 'developer', 'accountant'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export const PROJECT_ROLES = [
  'client_owner',
  'client_member',
  'developer',
  'OWNER',
  'MANAGER',
  'MEMBER',
  'VIEWER',
] as const
export type ProjectRole = (typeof PROJECT_ROLES)[number]

/** Self-serve collaboration roles only — the disjoint, uppercase axis added
 * alongside client_owner/client_member/developer (migration 0025a). */
export const PROJECT_COLLABORATION_ROLES = ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'] as const
export type ProjectCollaborationRole = (typeof PROJECT_COLLABORATION_ROLES)[number]

export const PROJECT_MEMBER_STATUSES = ['ACTIVE', 'REMOVED'] as const
export type ProjectMemberStatus = (typeof PROJECT_MEMBER_STATUSES)[number]

export const PROJECT_INVITATION_STATUSES = ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'] as const
export type ProjectInvitationStatus = (typeof PROJECT_INVITATION_STATUSES)[number]

/** The full project lifecycle (brief Phase 5). */
export const PROJECT_STATUSES = [
  'DRAFT',
  'WAITING_FOR_AGREEMENT',
  'WAITING_FOR_DEPOSIT',
  'WAITING_FOR_CLIENT_DATA',
  'READY_TO_START',
  'IN_PROGRESS',
  'WAITING_FOR_CLIENT',
  'CLIENT_REVIEW',
  'REVISION',
  'TESTING',
  'FINAL_APPROVAL',
  'WAITING_FOR_FINAL_PAYMENT',
  'READY_FOR_HANDOVER',
  'DEPLOYED',
  'MAINTENANCE',
  'COMPLETED',
  'PAUSED',
  'CANCELLED',
  'OVERDUE',
  // Everything above is the original 18, in their original order — the
  // validator checks pg_enum's actual order, which for `ALTER TYPE ... ADD
  // VALUE` (no BEFORE/AFTER) is always an append. These four were added by
  // migration 0027a, in this exact order, for the admin project lifecycle
  // (docs/ADMIN_PROJECT_LIFECYCLE.md §1) — nothing existing modeled "waiting
  // on admin to look at a submission" before this. DELIVERED is distinct
  // from DEPLOYED: the client formally ACCEPTED delivery, not merely "the
  // code is live" (docs/PROJECT_WORKSPACE_ARCHITECTURE.md §4).
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_INFORMATION',
  'DELIVERED',
  // Migration 0028a — the quotation-adjacent states, distinct from the
  // unused WAITING_FOR_AGREEMENT/CLIENT_REVIEW/FINAL_APPROVAL/
  // READY_FOR_HANDOVER values above (see that migration's own comment for
  // why these are new values rather than reuses).
  'QUOTATION_DRAFT',
  'QUOTATION_SENT',
  'AWAITING_CLIENT_APPROVAL',
  'IN_REVIEW',
  'CLIENT_APPROVAL',
  'READY_FOR_DELIVERY',
] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

/**
 * Statuses in which the developer SLA clock is paused because the ball is in
 * the client's court (brief Phase 20). Consumed by the timeline work in a
 * later phase; defined here so there is one definition of "waiting on them".
 */
export const CLIENT_WAITING_STATUSES = [
  'WAITING_FOR_AGREEMENT',
  'WAITING_FOR_DEPOSIT',
  'WAITING_FOR_CLIENT_DATA',
  'WAITING_FOR_CLIENT',
  'CLIENT_REVIEW',
  'FINAL_APPROVAL',
  'WAITING_FOR_FINAL_PAYMENT',
] as const satisfies readonly ProjectStatus[]

export const PROJECT_TYPES = [
  'WEBSITE',
  'WEB_APP',
  'ECOMMERCE',
  'DASHBOARD',
  'LANDING_PAGE',
  'MAINTENANCE',
  'OTHER',
] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

export const DELIVERY_METHODS = [
  'DEVELOPER_HOSTED',
  'CLIENT_HOSTED',
  'SOURCE_HANDOVER',
] as const
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]

export const SOURCE_CODE_OWNERSHIPS = ['DEVELOPER', 'CLIENT', 'SHARED'] as const
export type SourceCodeOwnership = (typeof SOURCE_CODE_OWNERSHIPS)[number]

/** Milestone-gated source access states (brief Phase 22). */
export const SOURCE_CODE_ACCESS_LEVELS = [
  'LOCKED',
  'PREVIEW',
  'READ_ONLY',
  'FULL_ACCESS',
] as const
export type SourceCodeAccess = (typeof SOURCE_CODE_ACCESS_LEVELS)[number]

export const SCOPE_ITEM_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'OUT_OF_SCOPE',
] as const
export type ScopeItemStatus = (typeof SCOPE_ITEM_STATUSES)[number]

export const PRICING_ITEM_KINDS = ['LINE_ITEM', 'DISCOUNT', 'ADDON'] as const
export type PricingItemKind = (typeof PRICING_ITEM_KINDS)[number]

export const AGREEMENT_STATUSES = [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'SUPERSEDED',
  // Migration 0029 — added after the original 6, appended at the end
  // (matches ALTER TYPE ... ADD VALUE's actual pg_enum order).
  'VIEWED',
] as const
export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number]

export const PAYMENT_PLAN_TYPES = [
  'FULL_PAYMENT',
  'DEPOSIT_FINAL',
  'MILESTONE',
  'INSTALLMENT',
  'CUSTOM',
] as const
export type PaymentPlanType = (typeof PAYMENT_PLAN_TYPES)[number]

/** Payment-plan lifecycle (migration 0034). Mirrors AGREEMENT_STATUSES. */
export const PAYMENT_PLAN_STATUSES = [
  'DRAFT',
  'PROPOSED',
  'ACCEPTED',
  'SUPERSEDED',
  'DECLINED',
] as const
export type PaymentPlanStatus = (typeof PAYMENT_PLAN_STATUSES)[number]

/** State of a client's "propose something else" request against a plan (migration 0034). */
export const PAYMENT_PLAN_CHANGE_STATUSES = ['OPEN', 'ADDRESSED', 'DISMISSED'] as const
export type PaymentPlanChangeStatus = (typeof PAYMENT_PLAN_CHANGE_STATUSES)[number]

export const MILESTONE_STATUSES = [
  'PENDING',
  'INVOICED',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number]

/**
 * WORK milestone lifecycle (migration 0035) — project EXECUTION, entirely
 * separate from MILESTONE_STATUSES above, which is money. A work milestone
 * may be COMPLETED while its payment milestone is still PENDING, and vice
 * versa; that is the point of keeping two enums.
 */
export const WORK_MILESTONE_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'COMPLETED',
  'BLOCKED',
  'CANCELLED',
] as const
export type WorkMilestoneStatus = (typeof WORK_MILESTONE_STATUSES)[number]

/** What the client said about a work milestone — separate axis from its status. */
export const WORK_MILESTONE_REVIEW_STATUSES = [
  'NOT_REQUIRED',
  'PENDING',
  'APPROVED',
  'CHANGES_REQUESTED',
] as const
export type WorkMilestoneReviewStatus = (typeof WORK_MILESTONE_REVIEW_STATUSES)[number]

/**
 * What a milestone's `unlock_rules` (migration 0009) may name. Matches the
 * client portal's own tabs (lib/work/nav.ts) one-for-one — a milestone can
 * only sensibly unlock a page that exists. Data only, at this phase: nothing
 * yet reads these to actually gate a tab (that is the UNLOCK phase); creating
 * a milestone just records which resources it is meant to unlock once paid.
 */
export const UNLOCKABLE_RESOURCES = [
  'preview',
  'source_code',
  'deployment',
  'documents',
  'maintenance',
] as const
export type UnlockableResource = (typeof UNLOCKABLE_RESOURCES)[number]

/** Brief Phase 9. Only a verified webhook may move a payment to PAID. */
export const PAYMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
  'CANCELLED',
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_METHODS = ['CARD', 'PROMPTPAY', 'BANK_TRANSFER', 'CASH', 'OTHER'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const DOCUMENT_TYPES = [
  'QUOTATION',
  'INVOICE',
  'RECEIPT',
  'TAX_INVOICE',
  'AGREEMENT',
  'CREDIT_NOTE',
  'DEBIT_NOTE',
  'OTHER',
  // Phase 5 (migration 0039). Order matches the enum's own sort order: new
  // values are appended, never inserted, so an existing row's meaning cannot
  // shift underneath it.
  'REQUIREMENT',
  'PAYMENT',
  'BRAND',
  'DESIGN',
  'DEVELOPMENT',
  'DELIVERY',
] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const DOCUMENT_STATUSES = ['DRAFT', 'ISSUED', 'SENT', 'VOID'] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

/**
 * Who may read a document (migration 0039). Deliberately NOT derived from
 * `DocumentStatus`: an internal DESIGN document is legitimately ISSUED and
 * must still never reach a client.
 */
/**
 * Phase 7 (migration 0041). The state of ONE agreed deliverable.
 *
 * WAIVED is not a failure: it records that the team and client agreed NOT to
 * deliver something, which is why it does not block a handover from being
 * complete. Without it, "we agreed to skip training" could only be expressed
 * by deleting the row, destroying the record that it was ever discussed.
 */
export const DELIVERABLE_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'READY',
  'DELIVERED',
  'WAIVED',
] as const
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number]

export const DOCUMENT_VISIBILITIES = ['INTERNAL', 'CLIENT_VISIBLE'] as const
export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number]

/** Deploy records (0014). One table covers preview and production. */
export const DEPLOYMENT_ENVIRONMENTS = ['PREVIEW', 'STAGING', 'PRODUCTION'] as const
export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number]

export const DEPLOYMENT_STATUSES = [
  'QUEUED',
  'BUILDING',
  'READY',
  'FAILED',
  'CANCELLED',
] as const
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number]

export const MAINTENANCE_STATUSES = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'] as const
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number]

export const MAINTENANCE_BILLING_CYCLES = ['MONTHLY', 'QUARTERLY', 'YEARLY'] as const
export type MaintenanceBillingCycle = (typeof MAINTENANCE_BILLING_CYCLES)[number]

export const CHANGE_REQUEST_STATUSES = [
  'OPEN',
  'UNDER_REVIEW',
  'QUOTED',
  'APPROVED',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number]

export const CHANGE_REQUEST_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const
export type ChangeRequestPriority = (typeof CHANGE_REQUEST_PRIORITIES)[number]

/**
 * In-app feedback (migration 0017). Two kinds only: the person typing knows
 * whether something is broken or merely missing, and asking them is cheaper
 * than triaging it later.
 */
export const FEEDBACK_KINDS = ['ISSUE', 'IDEA'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

export const FEEDBACK_STATUSES = ['NEW', 'TRIAGED', 'PLANNED', 'SHIPPED', 'DECLINED'] as const
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]

export const PROJECT_ASSET_KINDS = [
  'LOGO',
  'ICON',
  'FAVICON',
  'IMAGE',
  'FONT',
  'BRAND_GUIDELINE',
  'REFERENCE',
  'OTHER',
] as const
export type ProjectAssetKind = (typeof PROJECT_ASSET_KINDS)[number]

export const PROJECT_ASSET_REVIEW_STATUSES = [
  'PENDING',
  'APPROVED',
  'NEEDS_REPLACEMENT',
  'NEEDS_CLARIFICATION',
] as const
export type ProjectAssetReviewStatus = (typeof PROJECT_ASSET_REVIEW_STATUSES)[number]

/**
 * Maps each TS union to its PostgreSQL enum type name, so the validation
 * harness can diff them. Adding an enum above without adding it here is caught
 * by the harness's completeness check.
 */
export const PG_ENUM_MAP = {
  org_role: ORG_ROLES,
  project_role: PROJECT_ROLES,
  project_status: PROJECT_STATUSES,
  project_type: PROJECT_TYPES,
  delivery_method: DELIVERY_METHODS,
  source_code_ownership: SOURCE_CODE_OWNERSHIPS,
  source_code_access: SOURCE_CODE_ACCESS_LEVELS,
  scope_item_status: SCOPE_ITEM_STATUSES,
  pricing_item_kind: PRICING_ITEM_KINDS,
  agreement_status: AGREEMENT_STATUSES,
  payment_plan_type: PAYMENT_PLAN_TYPES,
  payment_plan_status: PAYMENT_PLAN_STATUSES,
  payment_plan_change_status: PAYMENT_PLAN_CHANGE_STATUSES,
  milestone_status: MILESTONE_STATUSES,
  work_milestone_status: WORK_MILESTONE_STATUSES,
  work_milestone_review_status: WORK_MILESTONE_REVIEW_STATUSES,
  payment_status: PAYMENT_STATUSES,
  payment_method: PAYMENT_METHODS,
  document_type: DOCUMENT_TYPES,
  document_status: DOCUMENT_STATUSES,
  document_visibility: DOCUMENT_VISIBILITIES,
  deliverable_status: DELIVERABLE_STATUSES,
  deployment_environment: DEPLOYMENT_ENVIRONMENTS,
  deployment_status: DEPLOYMENT_STATUSES,
  maintenance_status: MAINTENANCE_STATUSES,
  maintenance_billing_cycle: MAINTENANCE_BILLING_CYCLES,
  change_request_status: CHANGE_REQUEST_STATUSES,
  change_request_priority: CHANGE_REQUEST_PRIORITIES,
  feedback_kind: FEEDBACK_KINDS,
  feedback_status: FEEDBACK_STATUSES,
  project_member_status: PROJECT_MEMBER_STATUSES,
  invitation_status: PROJECT_INVITATION_STATUSES,
  project_asset_kind: PROJECT_ASSET_KINDS,
  project_asset_review_status: PROJECT_ASSET_REVIEW_STATUSES,
} as const satisfies Record<string, readonly string[]>
