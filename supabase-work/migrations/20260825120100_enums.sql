-- =============================================================================
-- 0002 — Enum types
-- =============================================================================
-- Values are UPPER_CASE to match the specification exactly, so there is no
-- translation layer between the brief, the database and the TypeScript types.
--
-- Enums are used instead of text+CHECK because they are self-documenting in
-- generated types and cannot drift. The cost is that adding a value requires a
-- migration — which is the point: statuses are business rules, not free text.
-- =============================================================================

-- Agency-side roles, held in organization_members.
create type org_role as enum (
  'super_admin',
  'admin',
  'developer',
  'accountant'
);

-- Client-side (and per-project developer) roles, held in project_members.
create type project_role as enum (
  'client_owner',
  'client_member',
  'developer'
);

-- The full project lifecycle from the brief (Phase 5).
create type project_status as enum (
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
  'OVERDUE'
);

create type project_type as enum (
  'WEBSITE',
  'WEB_APP',
  'ECOMMERCE',
  'DASHBOARD',
  'LANDING_PAGE',
  'MAINTENANCE',
  'OTHER'
);

create type delivery_method as enum (
  'DEVELOPER_HOSTED',
  'CLIENT_HOSTED',
  'SOURCE_HANDOVER'
);

create type source_code_ownership as enum (
  'DEVELOPER',
  'CLIENT',
  'SHARED'
);

-- Milestone-gated access states (brief Phase 22).
create type source_code_access as enum (
  'LOCKED',
  'PREVIEW',
  'READ_ONLY',
  'FULL_ACCESS'
);

create type scope_item_status as enum (
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'OUT_OF_SCOPE'
);

-- Discounts are a separate kind rather than a negative line amount, so the
-- subtotal/discount/total breakdown in the brief (Phase 7) is derivable and
-- amounts can stay non-negative.
create type pricing_item_kind as enum (
  'LINE_ITEM',
  'DISCOUNT',
  'ADDON'
);

create type agreement_status as enum (
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'SUPERSEDED'
);

create type payment_plan_type as enum (
  'FULL_PAYMENT',
  'DEPOSIT_FINAL',
  'MILESTONE',
  'INSTALLMENT',
  'CUSTOM'
);

create type milestone_status as enum (
  'PENDING',
  'INVOICED',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

-- Brief Phase 9. A payment reaches PAID only via a verified webhook.
create type payment_status as enum (
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
  'CANCELLED'
);

create type payment_method as enum (
  'CARD',
  'PROMPTPAY',
  'BANK_TRANSFER',
  'CASH',
  'OTHER'
);

create type document_type as enum (
  'QUOTATION',
  'INVOICE',
  'RECEIPT',
  'TAX_INVOICE',
  'AGREEMENT',
  'CREDIT_NOTE',
  'DEBIT_NOTE',
  'OTHER'
);

create type document_status as enum (
  'DRAFT',
  'ISSUED',
  'SENT',
  'VOID'
);
