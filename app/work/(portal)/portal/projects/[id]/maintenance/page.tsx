import { Clock3 } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  BILLING_CYCLE_LABELS,
  MAINTENANCE_STATUS_LABELS,
  formatDate,
  formatMoney,
} from '@/lib/work/format'
import { getMaintenancePlan } from '@/lib/work/queries/maintenance'

export const metadata = { title: 'การดูแลรักษา' }

/** The maintenance retainer for one project, if there is one. */
export default async function PortalMaintenancePage(
  props: PageProps<'/work/portal/projects/[id]/maintenance'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const plan = await getMaintenancePlan(id)

  return (
    <>
      <PageHeading
        eyebrow="โปรเจกต์"
        title="การดูแลรักษา"
        description="แพ็กเกจดูแลรักษาและรอบการเรียกเก็บเงิน"
      />

      {plan ? (
        <Panel className="maintenance">
          <PanelHead
            title={plan.name}
            description="แพ็กเกจดูแลรักษาของคุณ"
            action={
              <Status tone={plan.status === 'ACTIVE' ? 'green' : 'orange'}>
                {MAINTENANCE_STATUS_LABELS[plan.status]}
              </Status>
            }
          />
          <div className="maintenance-price">
            <strong>{formatMoney(plan.priceAmount, plan.currency)}</strong>
            <span>{BILLING_CYCLE_LABELS[plan.billingCycle]}</span>
          </div>
          <div className="next-billing">
            <Clock3 size={15} />
            <span>
              รอบบิลถัดไป <strong>{formatDate(plan.nextBillingDate)}</strong>
            </span>
          </div>
          {plan.services.length > 0 && (
            <div className="service-tags">
              {plan.services.map((service) => (
                <span key={service}>{service}</span>
              ))}
            </div>
          )}
        </Panel>
      ) : (
        <Panel className="maintenance">
          <PanelHead title="ยังไม่มีแพ็กเกจ" description="โปรเจกต์นี้ยังไม่ได้เปิดแพ็กเกจดูแลรักษา" />
          <p className="muted empty-inline">หากสนใจแพ็กเกจดูแลรักษา กรุณาติดต่อทีมงาน</p>
        </Panel>
      )}
    </>
  )
}
