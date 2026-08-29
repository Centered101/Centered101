import 'server-only'

import type { DocumentStatus } from '@/lib/work/types/enums'
import { getDocuments, type DocumentListItem } from './documents'
import { tallyBy } from './internal'

/**
 * Invoices.
 *
 * A thin view over `documents` where type = 'INVOICE'. Deliberately not its
 * own table: it would duplicate numbering, storage, amounts and status, and
 * two sources of "what did we bill?" is one too many.
 *
 * THE STATUS VOCABULARY: the brief asks for DRAFT / OPEN / PAID / OVERDUE /
 * VOID / REFUNDED. The database stores document_status (DRAFT / ISSUED / SENT
 * / VOID) plus the payments actually recorded against the project. Rather than
 * add a second status column that can disagree with the money, the billing
 * status is DERIVED here from the document plus its due date. One fact, one
 * place.
 */

export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'OVERDUE' | 'VOID' | 'REFUNDED'

export type InvoiceListItem = DocumentListItem & {
  invoiceStatus: InvoiceStatus
}

export function deriveInvoiceStatus(
  documentStatus: DocumentStatus,
  dueDate: string | null,
  paidAmount: number,
  amount: number,
  refunded: boolean,
): InvoiceStatus {
  if (documentStatus === 'VOID') return 'VOID'
  if (documentStatus === 'DRAFT') return 'DRAFT'
  if (refunded) return 'REFUNDED'
  if (amount > 0 && paidAmount >= amount) return 'PAID'
  if (dueDate && new Date(dueDate) < new Date()) return 'OVERDUE'
  return 'OPEN'
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'ร่าง',
  OPEN: 'รอชำระ',
  PAID: 'ชำระแล้ว',
  OVERDUE: 'เกินกำหนด',
  VOID: 'ยกเลิก',
  REFUNDED: 'คืนเงินแล้ว',
}

export function invoiceStatusTone(
  status: InvoiceStatus,
): 'blue' | 'green' | 'orange' | 'red' | 'violet' {
  if (status === 'PAID') return 'green'
  if (status === 'OVERDUE') return 'red'
  if (status === 'VOID') return 'violet'
  if (status === 'DRAFT') return 'blue'
  return 'orange'
}

/**
 * Invoices with a billing status derived from the payments behind them.
 *
 * Payment totals are matched by project, not by invoice, because payments
 * reference milestones rather than documents. An invoice for a project whose
 * milestone is paid therefore reads as PAID — which is the intent — while an
 * invoice on a project with several open milestones stays OPEN until the money
 * covering it arrives.
 */
export async function getInvoices(
  options: { projectId?: string; limit?: number } = {},
): Promise<InvoiceListItem[]> {
  const { getPayments } = await import('./payments')

  const [documents, payments] = await Promise.all([
    getDocuments({ ...options, type: 'INVOICE' }),
    getPayments({ projectId: options.projectId }),
  ])

  const paidByProject = tallyBy(
    payments.filter((payment) => payment.status === 'PAID'),
    (payment) => payment.projectId,
    (payment) => payment.amount,
  )
  const refundedProjects = new Set(
    payments.filter((payment) => payment.status === 'REFUNDED').map((p) => p.projectId),
  )

  return documents.map((document) => ({
    ...document,
    invoiceStatus: deriveInvoiceStatus(
      document.status,
      document.dueDate,
      document.projectId ? (paidByProject.get(document.projectId) ?? 0) : 0,
      document.amount,
      document.projectId ? refundedProjects.has(document.projectId) : false,
    ),
  }))
}
