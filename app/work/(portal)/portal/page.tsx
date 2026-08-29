import Link from 'next/link'
import {
  ArrowUpRight,
  Clock3,
  Code2,
  FolderKanban,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { StatCard } from '@/components/work/data/stat-card'
import { Status } from '@/components/work/data/status'
import { Timeline } from '@/components/work/data/timeline'
import { EmptyState } from '@/components/work/states'
import { requireClient } from '@/lib/work/auth/permissions'
import {
  BILLING_CYCLE_LABELS,
  DELIVERY_METHOD_LABELS,
  MAINTENANCE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  SOURCE_OWNERSHIP_LABELS,
  formatDate,
  formatMoney,
  idTone,
  projectStatusTone,
} from '@/lib/work/format'
import { getPortalDashboard } from '@/lib/work/queries/dashboard'

export const metadata = { title: 'พอร์ทัลลูกค้า' }

/**
 * Client portal dashboard.
 *
 * Shows only what belongs to the signed-in client, and it does so without a
 * single "where client_id = ?" in application code: every query runs under the
 * caller's session, and RLS restricts the rows to projects they are a member
 * of. There is no code path here that could be pointed at another client.
 */
export default async function PortalDashboardPage() {
  await requireClient()
  const data = await getPortalDashboard()

  if (!data.featured) {
    return (
      <>
        <PageHeading
          eyebrow="พอร์ทัลลูกค้า"
          title="ยินดีต้อนรับ"
          description="ภาพรวมโปรเจกต์และบัญชีของคุณ"
        />
        <EmptyState
          title="ยังไม่มีโปรเจกต์"
          description="เมื่อทีมงานเพิ่มคุณเข้าโปรเจกต์แล้ว รายละเอียดจะแสดงที่นี่"
        />
      </>
    )
  }

  const featured = data.featured
  const features = data.featuredFeatures
  const remaining = Math.max(0, featured.totalAmount - featured.paidAmount)

  return (
    <>
      <PageHeading
        eyebrow="พอร์ทัลลูกค้า"
        title="ยินดีต้อนรับกลับมา"
        description="ภาพรวมโปรเจกต์และบัญชีของคุณ"
        action={
          <Link className="primary" href={`/work/portal/projects/${featured.id}/payments`}>
            ดูการชำระเงิน <ArrowUpRight size={15} />
          </Link>
        }
      />

      <section className="stats-grid client-stats">
        <StatCard
          label="โปรเจกต์ที่กำลังดำเนินการ"
          value={String(data.activeProjects)}
          icon={FolderKanban}
          tone="violet"
        />
        <StatCard
          label="ชำระแล้วทั้งหมด"
          value={formatMoney(data.totalPaid, data.currency)}
          icon={WalletCards}
        />
        <StatCard
          label="ยอดค้างชำระ"
          value={formatMoney(data.outstanding, data.currency)}
          icon={Clock3}
          tone="orange"
        />
        <StatCard
          label="การดูแลรักษา"
          value={
            data.maintenance ? MAINTENANCE_STATUS_LABELS[data.maintenance.status] : 'ไม่มีแพ็กเกจ'
          }
          icon={ShieldCheck}
          tone="green"
        />
      </section>

      <section className="client-main">
        <Panel className="project-hero">
          <div className="hero-top">
            <div className={`project-icon ${idTone(featured.id)} large`}>
              <Code2 size={22} />
            </div>
            <div>
              <p className="eyebrow">{featured.projectCode}</p>
              <h2>{featured.name}</h2>
              <p className="muted">
                {featured.clientName} · กำหนดส่งมอบ {formatDate(featured.expectedDelivery)}
              </p>
            </div>
            <Status tone={projectStatusTone(featured.status)}>
              {PROJECT_STATUS_LABELS[featured.status]}
            </Status>
          </div>
          <div className="big-progress">
            <div>
              <span>ความคืบหน้าโปรเจกต์</span>
              <strong>{featured.progress}%</strong>
            </div>
            <div className="progress">
              <span style={{ width: `${featured.progress}%` }} />
            </div>
            <small>{PROJECT_STATUS_LABELS[featured.status]}</small>
          </div>
          <div className="hero-details">
            <div>
              <span>มูลค่าโปรเจกต์</span>
              <strong>{formatMoney(featured.totalAmount, featured.currency)}</strong>
            </div>
            <div>
              <span>ชำระแล้ว</span>
              <strong>{formatMoney(featured.paidAmount, featured.currency)}</strong>
            </div>
            <div>
              <span>คงเหลือ</span>
              <strong className="orange-text">
                {formatMoney(remaining, featured.currency)}
              </strong>
            </div>
            <Link className="primary" href={`/work/portal/projects/${featured.id}/payments`}>
              ดูการชำระเงิน <ArrowUpRight size={15} />
            </Link>
          </div>
        </Panel>

        <Panel className="timeline-panel">
          <PanelHead title="ไทม์ไลน์โปรเจกต์" description="ติดตามทุกขั้นตอนจนเปิดใช้งาน" />
          <Timeline items={features} />
        </Panel>
      </section>

      <section className="bottom-grid">
        <Panel className="ownership">
          <PanelHead
            title="ความเป็นเจ้าของและสิทธิ์เข้าถึง"
            description="ข้อมูลการส่งมอบที่ชัดเจน"
            action={<ShieldCheck className="panel-symbol" size={21} />}
          />
          <div className="ownership-rows">
            <div>
              <span>เจ้าของโปรเจกต์</span>
              <strong>{featured.clientName}</strong>
            </div>
            <div>
              <span>ความเป็นเจ้าของซอร์สโค้ด</span>
              <strong>{SOURCE_OWNERSHIP_LABELS[featured.sourceCodeOwnership]}</strong>
            </div>
            <div>
              <span>โฮสติ้ง</span>
              <strong>{DELIVERY_METHOD_LABELS[featured.deliveryMethod]}</strong>
            </div>
            <div>
              <span>เริ่มงาน</span>
              <strong>{formatDate(featured.startDate)}</strong>
            </div>
          </div>
        </Panel>

        {data.maintenance ? (
          <Panel className="maintenance">
            <PanelHead
              title={data.maintenance.name}
              description="แพ็กเกจดูแลรักษาของคุณ"
              action={
                <Status tone={data.maintenance.status === 'ACTIVE' ? 'green' : 'orange'}>
                  {MAINTENANCE_STATUS_LABELS[data.maintenance.status]}
                </Status>
              }
            />
            <div className="maintenance-price">
              <strong>
                {formatMoney(data.maintenance.priceAmount, data.maintenance.currency)}
              </strong>
              <span>{BILLING_CYCLE_LABELS[data.maintenance.billingCycle]}</span>
            </div>
            <div className="next-billing">
              <Clock3 size={15} />
              <span>
                รอบบิลถัดไป <strong>{formatDate(data.maintenance.nextBillingDate)}</strong>
              </span>
            </div>
            <div className="service-tags">
              {data.maintenance.services.map((service) => (
                <span key={service}>{service}</span>
              ))}
            </div>
            <Link
              className="outline full"
              href={`/work/portal/projects/${data.maintenance.projectId}/maintenance`}
            >
              ดูรายละเอียด <ArrowUpRight size={15} />
            </Link>
          </Panel>
        ) : (
          <Panel className="maintenance">
            <PanelHead title="การดูแลรักษา" description="ยังไม่มีแพ็กเกจสำหรับโปรเจกต์นี้" />
            <p className="muted empty-inline">
              หากต้องการแพ็กเกจดูแลรักษา กรุณาติดต่อทีมงาน
            </p>
          </Panel>
        )}
      </section>
    </>
  )
}
