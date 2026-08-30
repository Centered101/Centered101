import Link from 'next/link'
import {
  AlertCircle,
  ArrowUpRight,
  Clock3,
  FolderKanban,
  LifeBuoy,
  Plus,
  WalletCards,
} from 'lucide-react'

import { ActivityList } from '@/components/work/data/activity-list'
import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { ProjectsTable } from '@/components/work/data/projects-table'
import { RevenueChart } from '@/components/work/data/revenue-chart'
import { StatCard } from '@/components/work/data/stat-card'
import { requireAdmin } from '@/lib/work/auth/permissions'
import { formatMoney, formatDate } from '@/lib/work/format'
import { getAdminDashboard } from '@/lib/work/queries/dashboard'

export const metadata = { title: 'ภาพรวม' }

/**
 * Admin dashboard.
 *
 * Server Component. Every figure is computed from rows read under the caller's
 * session — there is no hardcoded revenue, no seeded chart, and no number that
 * cannot be traced back to a payment or a project.
 */
export default async function AdminDashboardPage() {
  const staff = await requireAdmin()
  const data = await getAdminDashboard()

  const totalInWindow = data.revenue.reduce(
    (sum, month) => sum + month.paid + month.pending,
    0,
  )

  return (
    <>
      <PageHeading
        eyebrow={formatDate(new Date().toISOString())}
        title={`สวัสดี ${staff.organizationName}`}
        description="นี่คือความเคลื่อนไหวของโปรเจกต์ทั้งหมดวันนี้"
        action={
          staff.can('project:write') ? (
            <Link className="primary" href="/work/admin/projects/new">
              <Plus size={17} />
              สร้างโปรเจกต์
            </Link>
          ) : undefined
        }
      />

      <section className="stats-grid">
        <StatCard
          label="รายได้รวม"
          value={formatMoney(data.totalRevenue, data.currency)}
          icon={WalletCards}
        />
        <StatCard
          label="การชำระเงินที่รอดำเนินการ"
          value={formatMoney(data.pendingAmount, data.currency)}
          icon={Clock3}
          tone="orange"
        />
        <StatCard
          label="โปรเจกต์ที่กำลังดำเนินการ"
          value={String(data.activeProjects)}
          icon={FolderKanban}
          tone="violet"
        />
        <StatCard
          label="การดูแลรักษาที่ใช้งานอยู่"
          value={String(data.maintenanceCount)}
          icon={LifeBuoy}
          tone="green"
        />
        <StatCard
          label="การชำระเงินที่เกินกำหนด"
          value={formatMoney(data.overdueAmount, data.currency)}
          icon={AlertCircle}
          tone="red"
        />
      </section>

      <section className="dashboard-grid">
        <Panel className="revenue-panel">
          {/* The prototype's range tabs are gone. They never refetched
              anything — with mock data that was harmless, but a control that
              does nothing next to real figures tells the reader the window
              changed when it did not. The window is stated instead. */}
          <PanelHead
            title="ภาพรวมรายได้"
            description="รายได้ที่ชำระแล้วและรอชำระ ย้อนหลัง 12 เดือน"
          />
          <div className="chart-key">
            <span>
              <i className="key-paid" />
              ชำระแล้ว
            </span>
            <span>
              <i className="key-pending" />
              รอชำระ
            </span>
            <strong>
              {formatMoney(totalInWindow, data.currency)} <small>รวม 12 เดือน</small>
            </strong>
          </div>
          <RevenueChart data={data.revenue} currency={data.currency} />
        </Panel>

        <Panel className="activity-panel">
          <PanelHead
            title="กิจกรรมล่าสุด"
            description="ความเคลื่อนไหวล่าสุดในพื้นที่ทำงาน"
          />
          <ActivityList items={data.activity} />
        </Panel>
      </section>

      <Panel className="projects-panel">
        <PanelHead
          title="โปรเจกต์ล่าสุด"
          description="ภาพรวมงานลูกค้าที่กำลังดำเนินการ"
          action={
            <Link className="outline" href="/work/admin/projects">
              ดูโปรเจกต์ <ArrowUpRight size={15} />
            </Link>
          }
        />
        <ProjectsTable projects={data.recentProjects} />
      </Panel>
    </>
  )
}
