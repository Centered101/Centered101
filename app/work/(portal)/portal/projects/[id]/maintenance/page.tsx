import { Clock3 } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  BILLING_CYCLE_LABELS,
  MAINTENANCE_STATUS_LABELS,
  formatDate,
  formatMinutes,
  formatMoney,
} from '@/lib/work/format'
import { getMaintenancePlan, getMaintenanceRecords } from '@/lib/work/queries/maintenance'

export const metadata = { title: 'การดูแลรักษา' }

/** The maintenance retainer for one project, if there is one. */
export default async function PortalMaintenancePage(
  props: PageProps<'/work/portal/projects/[id]/maintenance'>,
) {
  const { id } = await props.params
  await requireProjectAccess(id)

  const [plan, records] = await Promise.all([
    getMaintenancePlan(id),
    getMaintenanceRecords(id),
  ])

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

      {/* What the fee actually bought. Read-only: maintenance_records writes
          are `app.can_manage_project`, so there is nothing here a client could
          submit even if the page offered it. */}
      <Panel className="projects-panel">
        <PanelHead title="ประวัติงานที่ทำ" description="งานดูแลรักษาที่ทีมงานดำเนินการให้" />
        {records.length === 0 ? (
          <p className="muted empty-inline">ยังไม่มีบันทึกงานดูแลรักษา</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>งาน</th>
                  <th>เวลาที่ใช้</th>
                  <th>โดย</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="muted">{formatDate(record.performedOn)}</td>
                    <td>
                      <strong>{record.title}</strong>
                      {record.description && (
                        <>
                          <br />
                          <small className="muted">{record.description}</small>
                        </>
                      )}
                    </td>
                    <td className="muted">{formatMinutes(record.minutesSpent)}</td>
                    <td className="muted">{record.performedByName ?? '—'}</td>
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
