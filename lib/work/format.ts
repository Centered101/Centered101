import {
  type AgreementStatus,
  type ChangeRequestPriority,
  type ChangeRequestStatus,
  type DeploymentEnvironment,
  type DeploymentStatus,
  type DocumentStatus,
  type DocumentType,
  type DeliverableStatus,
  type DocumentVisibility,
  type MaintenanceBillingCycle,
  type MaintenanceStatus,
  type MilestoneStatus,
  type OrgRole,
  type PaymentMethod,
  type PaymentPlanChangeStatus,
  type PaymentPlanStatus,
  type PaymentPlanType,
  type PaymentStatus,
  type ProjectCollaborationRole,
  type ProjectInvitationStatus,
  type ProjectRole,
  type ProjectStatus,
  type UnlockableResource,
  type WorkMilestoneReviewStatus,
  type WorkMilestoneStatus,
} from '@/lib/work/types/enums'

/**
 * Presentation helpers.
 *
 * Money crosses the boundary here and nowhere else. The database stores an
 * integer count of minor units (satang); the UI shows "฿30,000". Every
 * conversion between the two goes through `formatMoney` so there is exactly
 * one place where a factor of 100 can be wrong.
 */

const money = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 })
const moneyWithSatang = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 })

const SYMBOLS: Record<string, string> = { THB: '฿', USD: '$', EUR: '€', GBP: '£' }

/**
 * @param minorUnits satang for THB, cents for USD — never a decimal amount
 */
export function formatMoney(minorUnits: number | null | undefined, currency = 'THB'): string {
  const value = (minorUnits ?? 0) / 100
  const symbol = SYMBOLS[currency] ?? `${currency} `
  // Whole baht is the overwhelmingly common case and reads better without
  // ".00"; sub-unit amounts still show their satang rather than silently
  // rounding a real difference away.
  const formatted = Number.isInteger(value) ? money.format(value) : moneyWithSatang.format(value)
  return `${symbol}${formatted}`
}

/** Compact form for stat cards: ฿125k, ฿1.2M. */
export function formatMoneyCompact(minorUnits: number | null | undefined, currency = 'THB'): string {
  const value = (minorUnits ?? 0) / 100
  const symbol = SYMBOLS[currency] ?? `${currency} `
  if (Math.abs(value) >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 10_000) return `${symbol}${Math.round(value / 1000)}k`
  return `${symbol}${money.format(value)}`
}

const dateFmt = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dateTimeFmt = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFmt.format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFmt.format(date)
}

/** "12 นาที", "2 ชม.", "3 วัน" — the activity feed's time column. */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return '—'

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 60) return 'เมื่อสักครู่'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} นาที`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ชม.`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} วัน`
  return formatDate(value)
}

/**
 * First letter of a name, for an avatar chip.
 *
 * Lives here rather than beside <Avatar> because that file is `'use client'`,
 * and every export of a client module is a client reference — a Server
 * Component calling one gets "Attempted to call initialFor() from the server".
 * A pure helper has no business being pinned to one side of that boundary.
 */
export function initialFor(name: string | null | undefined, fallback = ''): string {
  return ((name || fallback).trim()[0] ?? '?').toUpperCase()
}

/** The payment milestones a work milestone may optionally reference. */
export type PaymentMilestoneOption = { id: string; label: string }

/**
 * Labels for the payment-milestone dropdown on the admin timeline.
 *
 * Here for the same reason as initialFor: it is called from the Server
 * Component that renders <WorkTimelineAdmin>, and defining it in that
 * `'use client'` file made it a client reference the server could not call.
 */
export function toPaymentMilestoneOptions(
  milestones: { id: string; sequence: number; name: string; amount: number; currency: string }[],
): PaymentMilestoneOption[] {
  return milestones.map((m) => ({
    id: m.id,
    label: `${m.sequence}. ${m.name} — ${formatMoney(m.amount, m.currency)}`,
  }))
}

// -----------------------------------------------------------------------------
// Enum labels
// -----------------------------------------------------------------------------
/**
 * Thai labels for the database enums.
 *
 * The enum value is the source of truth and travels through the app as-is;
 * only the label is translated. The prototype stored Thai strings AS the
 * status, which made every comparison a string-matching guess.
 */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'ร่าง',
  WAITING_FOR_AGREEMENT: 'รอเซ็นสัญญา',
  WAITING_FOR_DEPOSIT: 'รอมัดจำ',
  WAITING_FOR_CLIENT_DATA: 'รอข้อมูลจากลูกค้า',
  READY_TO_START: 'พร้อมเริ่มงาน',
  IN_PROGRESS: 'กำลังดำเนินการ',
  WAITING_FOR_CLIENT: 'รอลูกค้า',
  CLIENT_REVIEW: 'ลูกค้ากำลังตรวจ',
  REVISION: 'กำลังแก้ไข',
  TESTING: 'กำลังทดสอบ',
  FINAL_APPROVAL: 'รออนุมัติขั้นสุดท้าย',
  WAITING_FOR_FINAL_PAYMENT: 'รอชำระงวดสุดท้าย',
  READY_FOR_HANDOVER: 'พร้อมส่งมอบ',
  DEPLOYED: 'เผยแพร่แล้ว',
  MAINTENANCE: 'ดูแลรักษา',
  COMPLETED: 'เสร็จสมบูรณ์',
  PAUSED: 'พักไว้',
  CANCELLED: 'ยกเลิก',
  OVERDUE: 'เกินกำหนด',
  SUBMITTED: 'ส่งคำขอแล้ว',
  UNDER_REVIEW: 'ทีมงานกำลังตรวจสอบ',
  NEEDS_INFORMATION: 'รอข้อมูลเพิ่มเติม',
  DELIVERED: 'ส่งมอบแล้ว',
  QUOTATION_DRAFT: 'กำลังจัดทำใบเสนอราคา',
  QUOTATION_SENT: 'ส่งใบเสนอราคาแล้ว',
  AWAITING_CLIENT_APPROVAL: 'รอลูกค้ายืนยันใบเสนอราคา',
  IN_REVIEW: 'ทีมงานกำลังตรวจงาน',
  CLIENT_APPROVAL: 'รอลูกค้าตรวจรับงาน',
  READY_FOR_DELIVERY: 'พร้อมส่งมอบ',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'รอชำระ',
  PROCESSING: 'กำลังดำเนินการ',
  PAID: 'ชำระแล้ว',
  FAILED: 'ไม่สำเร็จ',
  EXPIRED: 'หมดอายุ',
  REFUNDED: 'คืนเงินแล้ว',
  CANCELLED: 'ยกเลิก',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: 'บัตรเครดิต/เดบิต',
  PROMPTPAY: 'พร้อมเพย์',
  BANK_TRANSFER: 'โอนเงินผ่านธนาคาร',
  CASH: 'เงินสด',
  OTHER: 'อื่น ๆ',
}

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PENDING: 'รอชำระ',
  INVOICED: 'ออกใบแจ้งหนี้แล้ว',
  PAID: 'ชำระแล้ว',
  OVERDUE: 'เกินกำหนด',
  CANCELLED: 'ยกเลิก',
}

export const PAYMENT_PLAN_TYPE_LABELS: Record<PaymentPlanType, string> = {
  FULL_PAYMENT: 'จ่ายครั้งเดียว',
  DEPOSIT_FINAL: 'มัดจำ + จ่ายส่วนที่เหลือ',
  MILESTONE: 'แบ่งตามไมล์สโตน',
  INSTALLMENT: 'ผ่อนหลายงวด',
  CUSTOM: 'กำหนดเอง',
}

export const WORK_MILESTONE_STATUS_LABELS: Record<WorkMilestoneStatus, string> = {
  PENDING: 'รอเริ่มงาน',
  IN_PROGRESS: 'กำลังดำเนินการ',
  IN_REVIEW: 'รอตรวจรับ',
  CHANGES_REQUESTED: 'ขอแก้ไข',
  APPROVED: 'ลูกค้าอนุมัติแล้ว',
  COMPLETED: 'เสร็จสิ้น',
  BLOCKED: 'ติดปัญหา',
  CANCELLED: 'ยกเลิก',
}

export const WORK_MILESTONE_REVIEW_STATUS_LABELS: Record<WorkMilestoneReviewStatus, string> = {
  NOT_REQUIRED: 'ไม่ต้องตรวจรับ',
  PENDING: 'รอลูกค้าตรวจรับ',
  APPROVED: 'ลูกค้าอนุมัติแล้ว',
  CHANGES_REQUESTED: 'ลูกค้าขอแก้ไข',
}

export const PAYMENT_PLAN_STATUS_LABELS: Record<PaymentPlanStatus, string> = {
  DRAFT: 'ร่าง',
  PROPOSED: 'ส่งแล้ว รอลูกค้ายืนยัน',
  ACCEPTED: 'ลูกค้ายืนยันแล้ว',
  SUPERSEDED: 'ถูกแทนที่แล้ว',
  DECLINED: 'ปฏิเสธ',
}

export const PAYMENT_PLAN_CHANGE_STATUS_LABELS: Record<PaymentPlanChangeStatus, string> = {
  OPEN: 'รอพิจารณา',
  ADDRESSED: 'จัดทำแผนใหม่แล้ว',
  DISMISSED: 'ปฏิเสธคำขอ',
}

export const UNLOCKABLE_RESOURCE_LABELS: Record<UnlockableResource, string> = {
  preview: 'ตัวอย่างงาน',
  source_code: 'ซอร์สโค้ด',
  deployment: 'การเผยแพร่',
  documents: 'เอกสาร',
  maintenance: 'การดูแลรักษา',
}

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  DRAFT: 'ร่าง',
  SENT: 'ส่งแล้ว รอยืนยัน',
  ACCEPTED: 'ยืนยันแล้ว',
  DECLINED: 'ปฏิเสธ',
  EXPIRED: 'หมดอายุ',
  SUPERSEDED: 'ถูกแทนที่แล้ว',
  VIEWED: 'ลูกค้าเปิดดูแล้ว',
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: 'ร่าง',
  ISSUED: 'ออกแล้ว',
  SENT: 'ส่งแล้ว',
  VOID: 'ยกเลิก',
}

export const DEPLOYMENT_STATUS_LABELS: Record<DeploymentStatus, string> = {
  QUEUED: 'เข้าคิว',
  BUILDING: 'กำลังบิลด์',
  READY: 'พร้อมใช้งาน',
  FAILED: 'ล้มเหลว',
  CANCELLED: 'ยกเลิก',
}

export const CHANGE_REQUEST_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  OPEN: 'เปิดอยู่',
  UNDER_REVIEW: 'กำลังพิจารณา',
  QUOTED: 'เสนอราคาแล้ว',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
}

export const CHANGE_REQUEST_PRIORITY_LABELS: Record<ChangeRequestPriority, string> = {
  LOW: 'ต่ำ',
  NORMAL: 'ปกติ',
  HIGH: 'สูง',
  URGENT: 'ด่วนมาก',
}

export const DEPLOYMENT_ENVIRONMENT_LABELS: Record<DeploymentEnvironment, string> = {
  PREVIEW: 'ตัวอย่าง',
  STAGING: 'ทดสอบ',
  PRODUCTION: 'ใช้งานจริง',
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  QUOTATION: 'ใบเสนอราคา',
  INVOICE: 'ใบแจ้งหนี้',
  RECEIPT: 'ใบเสร็จ',
  TAX_INVOICE: 'ใบกำกับภาษี',
  AGREEMENT: 'สัญญา',
  CREDIT_NOTE: 'ใบลดหนี้',
  DEBIT_NOTE: 'ใบเพิ่มหนี้',
  OTHER: 'อื่น ๆ',
  // Phase 5 categories (migration 0039) — non-financial documents that live
  // in the same table rather than a second one.
  REQUIREMENT: 'เอกสารความต้องการ',
  PAYMENT: 'หลักฐานการชำระเงิน',
  BRAND: 'แบรนด์',
  DESIGN: 'งานออกแบบ',
  DEVELOPMENT: 'งานพัฒนา',
  DELIVERY: 'การส่งมอบ',
}

/**
 * Who may read a document. Reads as a promise to the client, not a filing
 * label: CLIENT_VISIBLE means it IS in their portal right now.
 */
export const DOCUMENT_VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  INTERNAL: 'ภายในทีม',
  CLIENT_VISIBLE: 'ลูกค้าเห็นได้',
}

/**
 * File size for a download link. Sizes here come from Supabase Storage
 * metadata, so a null is a real possibility (an older row, or a document with
 * no file) and reads as an em dash rather than "0 B".
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Phase 7 deliverable states. WAIVED reads as a neutral decision, not a
 * problem — it is something the team and client agreed to skip.
 */
export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  PENDING: 'รอดำเนินการ',
  IN_PROGRESS: 'กำลังจัดเตรียม',
  READY: 'พร้อมส่งมอบ',
  DELIVERED: 'ส่งมอบแล้ว',
  WAIVED: 'ตกลงไม่ส่งมอบ',
}

export function deliverableStatusTone(status: DeliverableStatus): Tone {
  if (status === 'DELIVERED') return 'green'
  if (status === 'READY') return 'blue'
  if (status === 'IN_PROGRESS') return 'orange'
  return 'violet'
}

export function documentVisibilityTone(visibility: DocumentVisibility): Tone {
  return visibility === 'CLIENT_VISIBLE' ? 'blue' : 'violet'
}

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  ACTIVE: 'ใช้งานอยู่',
  PAUSED: 'พักไว้',
  CANCELLED: 'ยกเลิก',
  EXPIRED: 'หมดอายุ',
}

/** Rendered after the price, so these read as "฿1,500 / เดือน". */
export const BILLING_CYCLE_LABELS: Record<MaintenanceBillingCycle, string> = {
  MONTHLY: '/ เดือน',
  QUARTERLY: '/ ไตรมาส',
  YEARLY: '/ ปี',
}

/** Agency roles, shown in the sidebar and on the settings page. */
export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  super_admin: 'ผู้ดูแลระบบสูงสุด',
  admin: 'แอดมิน',
  developer: 'นักพัฒนา',
  accountant: 'บัญชี',
}

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  WEBSITE: 'เว็บไซต์',
  WEB_APP: 'เว็บแอปพลิเคชัน',
  ECOMMERCE: 'อีคอมเมิร์ซ',
  DASHBOARD: 'แดชบอร์ด',
  LANDING_PAGE: 'แลนดิ้งเพจ',
  MAINTENANCE: 'ดูแลรักษา',
  OTHER: 'อื่น ๆ',
}

export const DELIVERY_METHOD_LABELS: Record<string, string> = {
  DEVELOPER_HOSTED: 'ดูแลโดยผู้พัฒนา',
  CLIENT_HOSTED: 'ลูกค้าดูแลเอง',
  SOURCE_HANDOVER: 'ส่งมอบซอร์สโค้ด',
}

export const SOURCE_OWNERSHIP_LABELS: Record<string, string> = {
  DEVELOPER: 'ผู้พัฒนาเป็นเจ้าของ',
  CLIENT: 'ลูกค้าเป็นเจ้าของ',
  SHARED: 'เป็นเจ้าของร่วมกัน',
}

// -----------------------------------------------------------------------------
// Tones
// -----------------------------------------------------------------------------
export type Tone = 'blue' | 'green' | 'orange' | 'red' | 'violet'

/** Status pill colour, driven by the enum value rather than its translation. */
export function projectStatusTone(status: ProjectStatus): Tone {
  switch (status) {
    case 'COMPLETED':
    case 'DEPLOYED':
    case 'READY_FOR_HANDOVER':
    case 'DELIVERED':
    case 'READY_FOR_DELIVERY':
      return 'green'
    case 'OVERDUE':
    case 'CANCELLED':
      return 'red'
    case 'DRAFT':
    case 'PAUSED':
    case 'WAITING_FOR_AGREEMENT':
    case 'WAITING_FOR_DEPOSIT':
    case 'WAITING_FOR_CLIENT_DATA':
    case 'WAITING_FOR_CLIENT':
    case 'WAITING_FOR_FINAL_PAYMENT':
    case 'NEEDS_INFORMATION':
    case 'QUOTATION_DRAFT':
    case 'QUOTATION_SENT':
    case 'AWAITING_CLIENT_APPROVAL':
      return 'orange'
    case 'MAINTENANCE':
      return 'violet'
    default:
      return 'blue'
  }
}

export function paymentStatusTone(status: PaymentStatus): Tone {
  if (status === 'PAID') return 'green'
  if (status === 'FAILED' || status === 'EXPIRED') return 'red'
  if (status === 'REFUNDED' || status === 'CANCELLED') return 'violet'
  return 'orange'
}

export function milestoneStatusTone(status: MilestoneStatus): Tone {
  if (status === 'PAID') return 'green'
  if (status === 'OVERDUE') return 'red'
  if (status === 'CANCELLED') return 'violet'
  return 'orange'
}

export function workMilestoneStatusTone(status: WorkMilestoneStatus): Tone {
  if (status === 'COMPLETED' || status === 'APPROVED') return 'green'
  if (status === 'BLOCKED' || status === 'CHANGES_REQUESTED') return 'red'
  if (status === 'CANCELLED') return 'violet'
  if (status === 'IN_PROGRESS' || status === 'IN_REVIEW') return 'blue'
  return 'orange'
}

/**
 * How a milestone's deadline is doing, for the deadline view (§14).
 * Presentational only — a passed deadline never changes any status by itself.
 */
export type DeadlineState = 'none' | 'completed' | 'overdue' | 'due_today' | 'upcoming'

export function workMilestoneDeadlineState(
  dueDate: string | null,
  status: WorkMilestoneStatus,
  now: Date = new Date(),
): DeadlineState {
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'completed'
  if (!dueDate) return 'none'

  // Compared as calendar days in UTC: `due_date` is a DATE column with no
  // time, so comparing it against a timestamp would make "due today" flip at
  // midnight UTC rather than at the end of the day.
  const due = new Date(`${dueDate}T00:00:00Z`).getTime()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

  if (due < today) return 'overdue'
  if (due === today) return 'due_today'
  return 'upcoming'
}

export const DEADLINE_STATE_LABELS: Record<DeadlineState, string> = {
  none: 'ไม่ได้กำหนด',
  completed: 'เสร็จแล้ว',
  overdue: 'เกินกำหนด',
  due_today: 'ครบกำหนดวันนี้',
  upcoming: 'กำลังจะถึง',
}

export function deadlineStateTone(state: DeadlineState): Tone {
  if (state === 'overdue') return 'red'
  if (state === 'due_today') return 'orange'
  if (state === 'completed') return 'green'
  return 'blue'
}

export function paymentPlanStatusTone(status: PaymentPlanStatus): Tone {
  if (status === 'ACCEPTED') return 'green'
  if (status === 'DECLINED') return 'red'
  if (status === 'SUPERSEDED') return 'violet'
  return 'orange'
}

export function paymentPlanChangeStatusTone(status: PaymentPlanChangeStatus): Tone {
  if (status === 'ADDRESSED') return 'green'
  if (status === 'DISMISSED') return 'red'
  return 'orange'
}

export function documentStatusTone(status: DocumentStatus): Tone {
  if (status === 'ISSUED' || status === 'SENT') return 'green'
  if (status === 'VOID') return 'red'
  return 'orange'
}

export function deploymentStatusTone(status: DeploymentStatus): Tone {
  if (status === 'READY') return 'green'
  if (status === 'FAILED') return 'red'
  if (status === 'CANCELLED') return 'violet'
  return 'orange'
}

/** Maintenance plan state. PAUSED reads as a decision, not a fault. */
export function maintenanceStatusTone(status: MaintenanceStatus): Tone {
  if (status === 'ACTIVE') return 'green'
  if (status === 'PAUSED') return 'orange'
  if (status === 'EXPIRED') return 'violet'
  return 'red'
}

/** Minutes as a human duration: 45 นาที, 2 ชม. 30 นาที. */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${minutes} นาที`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} ชม.` : `${hours} ชม. ${rest} นาที`
}

export function changeRequestStatusTone(status: ChangeRequestStatus): Tone {
  if (status === 'COMPLETED' || status === 'APPROVED') return 'green'
  if (status === 'REJECTED' || status === 'CANCELLED') return 'red'
  if (status === 'IN_PROGRESS') return 'blue'
  return 'orange'
}

/**
 * Stable per-project accent colour.
 *
 * The prototype stored a `tone` on each mock project. Real projects have no
 * such column and should not gain one for decoration, so the colour is derived
 * from the id: the same project is always the same colour, without a round
 * trip or a migration.
 */
const TONES: Tone[] = ['blue', 'violet', 'green', 'orange']

export function idTone(id: string): Tone {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return TONES[hash % TONES.length]
}

export const PROJECT_COLLABORATION_ROLE_LABELS: Record<ProjectCollaborationRole, string> = {
  OWNER: 'เจ้าของ',
  MANAGER: 'ผู้จัดการ',
  MEMBER: 'สมาชิก',
  VIEWER: 'ผู้ดูเท่านั้น',
}

/**
 * Every `project_role` value, old and new — for a member/invitation list
 * that may contain either axis (components/work/data/project-people.tsx's
 * own ROLE_LABELS covers the same ground for its own display, kept separate
 * because that component predates this one and has its own Thai wording).
 */
export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  client_owner: 'เจ้าของฝั่งลูกค้า',
  client_member: 'ทีมงานฝั่งลูกค้า',
  developer: 'นักพัฒนา',
  ...PROJECT_COLLABORATION_ROLE_LABELS,
}

export const PROJECT_INVITATION_STATUS_LABELS: Record<ProjectInvitationStatus, string> = {
  PENDING: 'รอตอบรับ',
  ACCEPTED: 'ตอบรับแล้ว',
  EXPIRED: 'หมดอายุ',
  REVOKED: 'ยกเลิกแล้ว',
}

export function invitationStatusTone(status: ProjectInvitationStatus): Tone {
  if (status === 'ACCEPTED') return 'green'
  if (status === 'REVOKED') return 'red'
  if (status === 'EXPIRED') return 'violet'
  return 'orange'
}

/**
 * "Next action" hint for the client's My Projects card (§11) — what the
 * client should expect next, in plain language. Not exhaustive: statuses
 * with no obvious single next step (IN_PROGRESS, MAINTENANCE, ...) render
 * nothing rather than a vague guess.
 */
export const PROJECT_NEXT_ACTION_LABELS: Partial<Record<ProjectStatus, string>> = {
  DRAFT: 'ส่งคำขอให้ทีมงานตรวจสอบ',
  SUBMITTED: 'รอทีมงานตรวจสอบ',
  UNDER_REVIEW: 'รอทีมงานตรวจสอบ',
  NEEDS_INFORMATION: 'ต้องให้ข้อมูลเพิ่มเติม',
  QUOTATION_DRAFT: 'รอใบเสนอราคา',
  QUOTATION_SENT: 'ตรวจสอบใบเสนอราคา',
  AWAITING_CLIENT_APPROVAL: 'ยืนยันใบเสนอราคา',
  WAITING_FOR_DEPOSIT: 'ชำระเงินมัดจำ',
  READY_TO_START: 'รอเริ่มงาน',
  IN_REVIEW: 'รอทีมงานตรวจงาน',
  CLIENT_APPROVAL: 'ตรวจรับงาน',
  READY_FOR_DELIVERY: 'รับมอบงาน',
}

export const PROJECT_ASSET_KIND_LABELS: Record<string, string> = {
  LOGO: 'โลโก้',
  ICON: 'ไอคอน',
  FAVICON: 'Favicon',
  IMAGE: 'รูปภาพ',
  FONT: 'ฟอนต์',
  BRAND_GUIDELINE: 'คู่มือแบรนด์',
  REFERENCE: 'ตัวอย่างอ้างอิง',
  OTHER: 'อื่น ๆ',
}

export const PROJECT_ASSET_REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING: 'รอตรวจสอบ',
  APPROVED: 'อนุมัติแล้ว',
  NEEDS_REPLACEMENT: 'ต้องเปลี่ยนไฟล์',
  NEEDS_CLARIFICATION: 'ต้องการคำชี้แจงเพิ่มเติม',
}

export function assetReviewStatusTone(status: string): Tone {
  if (status === 'APPROVED') return 'green'
  if (status === 'NEEDS_REPLACEMENT' || status === 'NEEDS_CLARIFICATION') return 'orange'
  return 'blue'
}

export const DELIVERY_ITEM_LABELS: Record<string, string> = {
  production_website: 'เว็บไซต์ที่ใช้งานจริง',
  source_code: 'ซอร์สโค้ด',
  documentation: 'เอกสารประกอบ',
  domain_setup: 'ตั้งค่าโดเมน',
  admin_access: 'สิทธิ์เข้าถึงระบบแอดมิน',
  user_access: 'สิทธิ์เข้าถึงสำหรับผู้ใช้งาน',
  training: 'การฝึกอบรมการใช้งาน',
  credentials: 'ข้อมูลรับรองต่าง ๆ',
  maintenance: 'การดูแลรักษา',
}
