import Link from 'next/link'
import {
  ArrowUpRight,
  Clock3,
  Code2,
  FolderKanban,
  GitBranch,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { StatCard } from '@/components/work/data/stat-card'
import { Status } from '@/components/work/data/status'
import { Timeline } from '@/components/work/data/timeline'
import { mockClientProject, mockMaintenance } from '@/lib/work/mock/data'

export const metadata = { title: 'พอร์ทัลลูกค้า — flowstate' }

/**
 * Client portal dashboard — the prototype's `ClientPortalView`, now a real
 * route and a Server Component.
 *
 * The brief (Phase 27) wants an ACTION REQUIRED block as the most prominent
 * element here. That needs real payment, agreement and review state to be
 * honest about what is actually outstanding, so it lands with the portal work
 * in Phase 9 rather than being faked now.
 */
export default function PortalDashboardPage() {
  const project = mockClientProject

  return (
    <>
      <PageHeading
        eyebrow="พอร์ทัลลูกค้า"
        title="ยินดีต้อนรับกลับมา ABC Company"
        description="ภาพรวมโปรเจกต์และบัญชีของคุณ"
        action={
          <Link className="primary" href={`/work/portal/projects/${project.code}/payments`}>
            ชำระไมล์สโตนถัดไป <ArrowUpRight size={15} />
          </Link>
        }
      />

      <section className="stats-grid client-stats">
        <StatCard
          label="โปรเจกต์ที่กำลังดำเนินการ"
          value="2"
          icon={FolderKanban}
          tone="violet"
        />
        <StatCard label="ชำระแล้วทั้งหมด" value="฿45,000" change="ตามแผน" icon={WalletCards} />
        <StatCard label="ยอดค้างชำระ" value="฿10,000" icon={Clock3} tone="orange" />
        <StatCard label="การดูแลรักษา" value="ใช้งานอยู่" icon={ShieldCheck} tone="green" />
      </section>

      <section className="client-main">
        <Panel className="project-hero">
          <div className="hero-top">
            <div className="project-icon blue large">
              <Code2 size={22} />
            </div>
            <div>
              <p className="eyebrow">{project.code}</p>
              <h2>{project.name}</h2>
              <p className="muted">{project.subtitle}</p>
            </div>
            <Status>{project.status}</Status>
          </div>
          <div className="big-progress">
            <div>
              <span>ความคืบหน้าโปรเจกต์</span>
              <strong>{project.progress}%</strong>
            </div>
            <div className="progress">
              <span style={{ width: `${project.progress}%` }} />
            </div>
            <small>{project.progressNote}</small>
          </div>
          <div className="hero-details">
            <div>
              <span>มูลค่าโปรเจกต์</span>
              <strong>{project.value}</strong>
            </div>
            <div>
              <span>ชำระแล้ว</span>
              <strong>{project.paid}</strong>
            </div>
            <div>
              <span>คงเหลือ</span>
              <strong className="orange-text">{project.remaining}</strong>
            </div>
            <Link className="primary" href={`/work/portal/projects/${project.code}/payments`}>
              ชำระไมล์สโตนถัดไป <ArrowUpRight size={15} />
            </Link>
          </div>
        </Panel>

        <Panel className="timeline-panel">
          <PanelHead title="ไทม์ไลน์โปรเจกต์" description="ติดตามทุกขั้นตอนจนเปิดใช้งาน" />
          <Timeline />
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
              <strong>{project.owner}</strong>
            </div>
            <div>
              <span>ความเป็นเจ้าของซอร์สโค้ด</span>
              <strong>{project.sourceOwnership}</strong>
            </div>
            <div>
              <span>สิทธิ์เข้าถึงซอร์สโค้ด</span>
              <strong className="green-text">{project.sourceAccess}</strong>
            </div>
            <div>
              <span>โฮสติ้ง</span>
              <strong>{project.hosting}</strong>
            </div>
            <div>
              <span>ที่เก็บโค้ด</span>
              <strong className="repo">
                <GitBranch size={14} /> {project.repository}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel className="maintenance">
          <PanelHead
            title={mockMaintenance.planName}
            description="แพ็กเกจดูแลรักษาของคุณ"
            action={<Status tone="green">ใช้งานอยู่</Status>}
          />
          <div className="maintenance-price">
            <strong>{mockMaintenance.price}</strong>
            <span>{mockMaintenance.period}</span>
          </div>
          <div className="next-billing">
            <Clock3 size={15} />
            <span>
              รอบบิลถัดไป <strong>{mockMaintenance.nextBilling}</strong>
            </span>
          </div>
          <div className="service-tags">
            {mockMaintenance.services.map((service) => (
              <span key={service}>{service}</span>
            ))}
          </div>
          <Link className="outline full" href={`/work/portal/projects/${project.code}/maintenance`}>
            จัดการแพ็กเกจ <ArrowUpRight size={15} />
          </Link>
        </Panel>
      </section>
    </>
  )
}
