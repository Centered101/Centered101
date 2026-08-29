import Link from 'next/link'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { EmptyState } from '@/components/work/states'
import { requireCapability } from '@/lib/work/auth/permissions'
import { formatDate, formatMoney } from '@/lib/work/format'
import {
  INVOICE_STATUS_LABELS,
  getInvoices,
  invoiceStatusTone,
} from '@/lib/work/queries/invoices'

export const metadata = { title: 'ใบแจ้งหนี้' }

/**
 * Invoices — documents of type INVOICE.
 *
 * The status column is DERIVED from the document plus the payments recorded
 * against its project (see queries/invoices.ts), so there is no stored invoice
 * status that can disagree with the money.
 */
export default async function AdminInvoicesPage() {
  await requireCapability('finance:read')
  const invoices = await getInvoices()

  return (
    <>
      <PageHeading title="ใบแจ้งหนี้" description={`ทั้งหมด ${invoices.length} ใบ`} />

      <Panel className="projects-panel">
        {invoices.length === 0 ? (
          <EmptyState
            title="ยังไม่มีใบแจ้งหนี้"
            description="ใบแจ้งหนี้ที่ออกให้ลูกค้าจะแสดงที่นี่"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>เลขที่</th>
                  <th>โปรเจกต์</th>
                  <th>ลูกค้า</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                  <th>วันที่ออก</th>
                  <th>ครบกำหนด</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.documentNumber ?? '—'}</strong>
                      <br />
                      <small className="muted">{invoice.title}</small>
                    </td>
                    <td>
                      {invoice.projectId ? (
                        <Link href={`/work/admin/projects/${invoice.projectId}`}>
                          {invoice.projectName}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{invoice.clientName ?? '—'}</td>
                    <td>
                      <strong>{formatMoney(invoice.amount, invoice.currency)}</strong>
                    </td>
                    <td>
                      <Status tone={invoiceStatusTone(invoice.invoiceStatus)}>
                        {INVOICE_STATUS_LABELS[invoice.invoiceStatus]}
                      </Status>
                    </td>
                    <td className="muted">{formatDate(invoice.issuedAt)}</td>
                    <td className="muted">{formatDate(invoice.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}
