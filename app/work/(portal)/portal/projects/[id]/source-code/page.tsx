import { notFound } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { LockedState } from '@/components/work/states'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DELIVERY_METHOD_LABELS,
  MILESTONE_STATUS_LABELS,
  SOURCE_OWNERSHIP_LABELS,
  formatDate,
} from '@/lib/work/format'
import { getProjectPaymentSummary } from '@/lib/work/queries/payments'
import { getProjectById } from '@/lib/work/queries/projects'

export const metadata = { title: 'ซอร์สโค้ด' }

/**
 * Source code ownership and handover terms.
 *
 * WHAT THIS PAGE DOES NOT DO: hand over a repository. The milestone-gated
 * unlock system — which decides when credentials and repository access become
 * available — is a later phase, and there is no repository column in the
 * schema yet. So this shows the AGREED TERMS, read from the project row, and
 * says plainly what is still outstanding.
 *
 * The alternative would be a page inventing a repository URL, which is exactly
 * the kind of plausible fiction this phase exists to remove.
 */
export default async function PortalSourceCodePage(
  props: PageProps<'/work/portal/projects/[id]/source-code'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const payments = await getProjectPaymentSummary(id)
  const fullyPaid = payments.total > 0 && payments.remaining === 0

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="ซอร์สโค้ด"
        description="สิทธิ์เข้าถึงซอร์สโค้ดและเงื่อนไขการส่งมอบ"
      />

      <Panel className="ownership">
        <PanelHead
          title="เงื่อนไขที่ตกลงไว้"
          description="ตามที่ระบุในโปรเจกต์"
          action={<ShieldCheck className="panel-symbol" size={21} />}
        />
        <div className="ownership-rows">
          <div>
            <span>ความเป็นเจ้าของซอร์สโค้ด</span>
            <strong>{SOURCE_OWNERSHIP_LABELS[project.sourceCodeOwnership]}</strong>
          </div>
          <div>
            <span>วิธีส่งมอบ</span>
            <strong>{DELIVERY_METHOD_LABELS[project.deliveryMethod]}</strong>
          </div>
          <div>
            <span>สถานะการชำระเงิน</span>
            <strong className={fullyPaid ? 'green-text' : 'orange-text'}>
              {fullyPaid ? 'ชำระครบแล้ว' : 'ยังมียอดค้างชำระ'}
            </strong>
          </div>
          {payments.nextDue && (
            <div>
              <span>งวดถัดไป</span>
              <strong>
                {payments.nextDue.name} · {MILESTONE_STATUS_LABELS[payments.nextDue.status]} ·{' '}
                {formatDate(payments.nextDue.dueDate)}
              </strong>
            </div>
          )}
        </div>
      </Panel>

      {!fullyPaid && (
        <LockedState
          title="ยังไม่ปลดล็อกการส่งมอบซอร์สโค้ด"
          description="การส่งมอบซอร์สโค้ดจะดำเนินการหลังชำระเงินครบตามแผน กรุณาติดต่อทีมงานหากมีข้อสงสัย"
        />
      )}
    </>
  )
}
