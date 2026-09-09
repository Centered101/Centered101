import Link from 'next/link'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { StatCard } from '@/components/work/data/stat-card'
import { Status } from '@/components/work/data/status'
import { EmptyState } from '@/components/work/states'
import { requireCapability } from '@/lib/work/auth/permissions'
import {
  BILLING_CYCLE_LABELS,
  MAINTENANCE_STATUS_LABELS,
  formatDate,
  formatMoney,
} from '@/lib/work/format'
import { getMaintenancePlans } from '@/lib/work/queries/maintenance'
import { LifeBuoy, WalletCards } from 'lucide-react'

export const metadata = { title: 'การดูแลรักษา' }

/** Maintenance retainers across every project. */
export default async function AdminMaintenancePage() {
  await requireCapability('finance:read')
  const plans = await getMaintenancePlans()

  const active = plans.filter((plan) => plan.status === 'ACTIVE')

  // Monthly-equivalent, so quarterly and yearly retainers do not inflate the
  // figure by their whole billing amount.
  const monthlyValue = active.reduce((sum, plan) => {
    if (plan.billingCycle === 'YEARLY') return sum + Math.round(plan.priceAmount / 12)
    if (plan.billingCycle === 'QUARTERLY') return sum + Math.round(plan.priceAmount / 3)
    return sum + plan.priceAmount
  }, 0)

  return (
    <>
      <PageHeading title="การดูแลรักษา" description="แพ็กเกจดูแลรักษาของลูกค้าทั้งหมด" />

      <section className="stats-grid">
        <StatCard label="แพ็กเกจที่ใช้งานอยู่" value={String(active.length)} icon={LifeBuoy} tone="green" />
        <StatCard
          label="มูลค่าต่อเดือน"
          value={formatMoney(monthlyValue, active[0]?.currency ?? 'THB')}
          icon={WalletCards}
        />
      </section>

      <Panel className="projects-panel">
        {plans.length === 0 ? (
          <EmptyState
            title="ยังไม่มีแพ็กเกจดูแลรักษา"
            description="เมื่อเปิดแพ็กเกจให้โปรเจกต์แล้ว รายการจะแสดงที่นี่"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>แพ็กเกจ</th>
                  <th>โปรเจกต์</th>
                  <th>ลูกค้า</th>
                  <th>ราคา</th>
                  <th>สถานะ</th>
                  <th>รอบบิลถัดไป</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td>
                      <strong>{plan.name}</strong>
                    </td>
                    <td>
                      <Link href={`/work/admin/projects/${plan.projectId}`}>
                        {plan.projectName ?? '—'}
                      </Link>
                    </td>
                    <td>{plan.clientName ?? '—'}</td>
                    <td>
                      <strong>{formatMoney(plan.priceAmount, plan.currency)}</strong>{' '}
                      <small className="muted">{BILLING_CYCLE_LABELS[plan.billingCycle]}</small>
                    </td>
                    <td>
                      <Status tone={plan.status === 'ACTIVE' ? 'green' : 'orange'}>
                        {MAINTENANCE_STATUS_LABELS[plan.status]}
                      </Status>
                    </td>
                    <td className="muted">{formatDate(plan.nextBillingDate)}</td>
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
