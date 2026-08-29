import {
  type ChangeRequestPriority,
  type ChangeRequestStatus,
  type DeploymentEnvironment,
  type DeploymentStatus,
  type DocumentStatus,
  type DocumentType,
  type MaintenanceBillingCycle,
  type MaintenanceStatus,
  type MilestoneStatus,
  type OrgRole,
  type PaymentStatus,
  type ProjectStatus,
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

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PENDING: 'รอชำระ',
  INVOICED: 'ออกใบแจ้งหนี้แล้ว',
  PAID: 'ชำระแล้ว',
  OVERDUE: 'เกินกำหนด',
  CANCELLED: 'ยกเลิก',
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
