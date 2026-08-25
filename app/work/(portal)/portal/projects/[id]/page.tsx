import { Clock3, Code2, GitBranch, ShieldCheck } from 'lucide-react'

import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { Timeline } from '@/components/work/data/timeline'
import { mockClientProject } from '@/lib/work/mock/data'

export const metadata = { title: 'โปรเจกต์ — flowstate' }

/**
 * Project overview in the client portal.
 *
 * Reads from mock data. From Phase 2 this loads the project by UUID through
 * the request-scoped Supabase client, so RLS decides whether the row is
 * visible at all — the `id` segment being guessable is fine precisely because
 * the database, not this component, is the boundary.
 */
export default async function PortalProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = mockClientProject

  return (
    <>
      <PageHeading
        eyebrow={id}
        title={project.name}
        description={project.subtitle}
        action={<Status>{project.status}</Status>}
      />

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

        <Panel className="next-payment">
          <PanelHead title="การชำระเงินถัดไป" description="ยอดที่ต้องชำระเพื่อดำเนินการต่อ" />
          <div className="maintenance-price">
            <strong>{project.remaining}</strong>
            <span>คงเหลือ</span>
          </div>
          <div className="next-billing">
            <Clock3 size={15} />
            <span>ไมล์สโตนสุดท้าย · รอชำระ</span>
          </div>
        </Panel>
      </section>
    </>
  )
}
