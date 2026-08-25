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
import { RangeTabs } from './range-tabs'

export const metadata = { title: 'ภาพรวม — flowstate' }

/**
 * Admin dashboard. Server Component — the prototype's version of this markup
 * lived inside a `'use client'` page, so the whole dashboard shipped to the
 * browser. Only the range tabs need interactivity now.
 */
export default function AdminDashboardPage() {
  return (
    <>
      <PageHeading
        eyebrow="วันจันทร์ที่ 24 สิงหาคม 2569"
        title="สวัสดีตอนเช้า Centered101"
        description="นี่คือความเคลื่อนไหวของโปรเจกต์ทั้งหมดวันนี้"
        action={
          <Link className="primary" href="/work/admin/projects/new">
            <Plus size={17} />
            สร้างโปรเจกต์
          </Link>
        }
      />

      <section className="stats-grid">
        <StatCard label="รายได้รวม" value="฿125,000" change="12.5%" icon={WalletCards} />
        <StatCard
          label="การชำระเงินที่รอดำเนินการ"
          value="฿32,000"
          icon={Clock3}
          tone="orange"
        />
        <StatCard
          label="โปรเจกต์ที่กำลังดำเนินการ"
          value="8"
          icon={FolderKanban}
          tone="violet"
        />
        <StatCard label="การดูแลรักษาที่ใช้งานอยู่" value="12" icon={LifeBuoy} tone="green" />
        <StatCard
          label="การชำระเงินที่เกินกำหนด"
          value="฿5,000"
          icon={AlertCircle}
          tone="red"
        />
      </section>

      <section className="dashboard-grid">
        <Panel className="revenue-panel">
          <PanelHead
            title="ภาพรวมรายได้"
            description="ติดตามรายได้ที่ชำระแล้วและรอชำระ"
            action={<RangeTabs />}
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
              ฿157,000 <small>รวมทั้งหมด</small>
            </strong>
          </div>
          <RevenueChart />
        </Panel>

        <Panel className="activity-panel">
          <PanelHead
            title="กิจกรรมล่าสุด"
            description="ความเคลื่อนไหวล่าสุดในพื้นที่ทำงาน"
            action={<button className="text-btn">ดูทั้งหมด</button>}
          />
          <ActivityList />
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
        <ProjectsTable />
      </Panel>
    </>
  )
}
