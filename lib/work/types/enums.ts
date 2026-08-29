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

export const PROJECT_ROLES = ['client_owner', 'client_member', 'developer'] as const
export type ProjectRole = (typeof PROJECT_ROLES)[number]

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

export const MILESTONE_STATUSES = [
  'PENDING',
  'INVOICED',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number]

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
] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const DOCUMENT_STATUSES = ['DRAFT', 'ISSUED', 'SENT', 'VOID'] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

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
  milestone_status: MILESTONE_STATUSES,
  payment_status: PAYMENT_STATUSES,
  payment_method: PAYMENT_METHODS,
  document_type: DOCUMENT_TYPES,
  document_status: DOCUMENT_STATUSES,
  deployment_environment: DEPLOYMENT_ENVIRONMENTS,
  deployment_status: DEPLOYMENT_STATUSES,
  maintenance_status: MAINTENANCE_STATUSES,
  maintenance_billing_cycle: MAINTENANCE_BILLING_CYCLES,
  change_request_status: CHANGE_REQUEST_STATUSES,
  change_request_priority: CHANGE_REQUEST_PRIORITIES,
} as const satisfies Record<string, readonly string[]>
